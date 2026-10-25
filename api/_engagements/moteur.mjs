// AIME · les engagements d'un projet (V1, PR P6) : « qui doit quoi à qui, pour quand ». Partie serveur : lire, verrouiller, écrire,
// filtrer. Les droits viennent de synchroview/engagements.js, adossé à synchroview/permissions.js (fichier protégé, inchangé) ; le rôle, de space_members (date de fin
// comprise), relu dans la transaction de chaque geste. Le navigateur ne reçoit jamais un identifiant de compte : les personnes sont
// désignées par une référence opaque, propre au projet (ref), recalculée ici.
// db : un pg.Pool (query + connect).
import { createRequire } from 'module';
import crypto from 'crypto';
import { role, enTransaction, duree, Refus } from '../_auth/espaces.mjs';
const require = createRequire(import.meta.url);
const P = require('../../synchroview/permissions.js');          /* la source des droits : qui voit qui (member.read) */
const ER = require('../../synchroview/engagements.js');         /* les règles des engagements, adossées à permissions.js */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLE = /^[A-Za-z0-9_-]{16,32}$/, REF = /^[a-f0-9]{16}$/;
const MAX_PAR_PROJET = 300, MAX_JOURS = 3 * 366;
export const ETATS = ['propose', 'accepte', 'refuse', 'tenu', 'annule'];
/* les gestes et leur règle : un geste n'est proposé que si permissions.js l'accorde, et revérifié à l'exécution */
export const GESTES = { accepter: ['accept', 'accepte'], refuser: ['refuse', 'refuse'], tenir: ['keep', 'tenu'], annuler: ['cancel', 'annule'] };
const REQUIS = { accepter: ['propose'], refuser: ['propose'], tenir: ['accepte'], annuler: ['propose', 'accepte'] };   /* l'état où chaque geste a un sens */
const refus = (code, raison) => { throw new Refus(code, raison); };
const texte = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1);

/* le journal du projet (table audit, en ajout seul) : une ligne « engagement » par geste, avec son échéance, jamais le texte.
   api/_auth/journal.mjs est un fichier protégé (sa liste d'actions ne change pas) : on écrit ici la même forme de ligne,
   que sa lecture (lire) et la page Journal (pages.mjs) savent déjà rendre. Sans la table du journal, rien n'est écrit. */
let JOURNAL = null;
async function journaliser(db, { qui, espace, cible, detail }) {
  if (JOURNAL === null) { try { const r = await db.query("select to_regclass('public.audit') as t, exists(select 1 from pg_trigger where tgname = 'audit_ajout_seul') as g"); JOURNAL = !!(r.rows[0] && r.rows[0].t && r.rows[0].g); } catch { JOURNAL = false; } }
  if (!JOURNAL) return false;
  await db.query('insert into audit (user_id, space_id, action, detail) values ($1, $2, $3, $4::jsonb)', [qui || null, espace, 'engagement', JSON.stringify(Object.assign({}, detail, cible ? { cible } : {}))]);
  return true;
}

/* installé ? (migration 2026-10-25-15) ; « pas installé » n'est retenu qu'une minute */
let PRET = null, VU = 0;
export function _oublier() { PRET = null; }
export async function pret(db) {
  if (PRET === true || (PRET === false && Date.now() - VU < 60000)) return PRET;
  try { const { rows } = await db.query("select to_regclass('public.engagements') as t"); PRET = !!(rows[0] && rows[0].t); } catch { PRET = false; }
  VU = Date.now(); return PRET;
}
async function exigerPret(db) { if (!(await pret(db))) refus(503, 'Les engagements ne sont pas encore installés sur cet environnement.'); }

/* la date du jour à Paris (AAAA-MM-JJ) : une échéance est un jour, pas un instant */
export function aujourdhui(t = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t); }
const jourIso = d => (typeof d === 'string' ? d.slice(0, 10) : aujourdhui(new Date(d)));
function echeance(v) {
  const t = String(v == null ? '' : v).trim(), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) refus(400, 'Indiquez une échéance (une date).');
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) refus(400, 'Échéance invalide.');
  const auj = aujourdhui();
  if (t < auj) refus(400, 'L\'échéance doit être aujourd\'hui ou plus tard.');
  if (d.getTime() - Date.parse(auj + 'T00:00:00Z') > MAX_JOURS * 864e5) refus(400, 'Échéance trop lointaine (trois ans au plus).');
  return t;
}
/* une référence opaque pour une personne, propre à ce projet : jamais l'identifiant du compte */
export const refDe = (espace, id) => crypto.createHash('sha256').update('engagement|' + espace + '|' + id).digest('hex').slice(0, 16);

/* le contexte : membre actif (sinon 404, comme un projet inconnu) */
async function contexte(db, u, espace) {
  if (!UUID.test(String(espace || ''))) refus(404, 'Projet introuvable.');
  const r = await role(db, espace, u.id);
  if (!r) refus(404, 'Projet introuvable.');
  return { id: u.id, role: r };
}
/* les membres actifs, et les noms que CETTE personne a le droit de voir (member.read) */
async function membres(db, s, espace) {
  const d = await duree(db);
  const { rows } = await db.query(`select m.user_id, m.role, u.name, u.email from space_members m join "user" u on u.id = m.user_id
    where m.space_id = $1 ${d ? 'and (m.jusqu_au is null or m.jusqu_au > now())' : ''}`, [espace]);
  const noms = {}, actifs = {};
  rows.forEach(x => { actifs[x.user_id] = x.role; if (P.can(s, 'read', { type: 'member', subjectId: x.user_id, role: x.role }).allow) noms[x.user_id] = x.name || (x.email || '').split('@')[0]; });
  return { noms, actifs };
}
const ressource = e => ({ deQui: e.de_qui, pourQui: e.pour_qui, creePar: e.cree_par, etat: e.etat });
const ANONYME = 'une personne du projet';
function vue(e, s, noms, auj) {
  const r = ressource(e), qui = id => (id === s.id ? 'vous' : (noms[id] || ANONYME));
  const ech = jourIso(e.echeance);
  return {
    ref: e.id, titre: e.titre, echeance: ech, etat: e.etat, enRetard: e.etat === 'accepte' && ech < auj,
    deQui: qui(e.de_qui), pourQui: e.pour_qui ? qui(e.pour_qui) : 'l\'organisation du projet',
    moi: e.de_qui === s.id ? 'de' : e.pour_qui === s.id ? 'pour' : null,
    gestes: Object.keys(GESTES).filter(g => ER.can(s, GESTES[g][0], r).allow)
  };
}
/* l'ordre de lecture : d'abord ce qui attend une réponse, puis ce qui est en cours (par échéance), puis ce qui est clos */
const RANG = { propose: 0, accepte: 1, tenu: 2, refuse: 3, annule: 3 };
const trier = (a, b) => RANG[a.etat] - RANG[b.etat] || (a.echeance < b.echeance ? -1 : a.echeance > b.echeance ? 1 : 0);

/* GET : les engagements d'un projet que cette personne peut lire, et ce qu'elle peut y créer */
export async function lister(db, u, { espace }) {
  await exigerPret(db);
  const s = await contexte(db, u, espace);
  const { noms, actifs } = await membres(db, s, espace), auj = aujourdhui();
  const { rows } = await db.query('select * from engagements where space_id = $1 order by echeance, cree_le limit $2', [espace, MAX_PAR_PROJET]);
  const liste = rows.filter(e => ER.can(s, 'read', ressource(e)).allow).map(e => vue(e, s, noms, auj)).sort(trier);
  const peutPrendre = ER.can(s, 'create', { deQui: s.id }).allow;
  const peutDemander = ER.can(s, 'create', { deQui: '\u0000autre' }).allow;
  /* les personnes proposées : celles dont cette personne voit le nom (jamais d'identifiant de compte) */
  const personnes = Object.keys(noms).filter(id => id !== s.id && actifs[id]).map(id => ({ ref: refDe(espace, id), nom: noms[id] })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return { engagements: liste, peutPrendre, peutDemander, personnes: peutPrendre || peutDemander ? personnes : [], aujourdhui: auj };
}

/* GET sans projet : MES engagements ouverts, dans tous mes projets actifs (pour AI : « ce qui me concerne ») */
export async function miens(db, u) {
  await exigerPret(db);
  const d = await duree(db);
  const { rows } = await db.query(`select e.*, s.title as projet, m.role from engagements e join spaces s on s.id = e.space_id
      join space_members m on m.space_id = e.space_id and m.user_id = $1 ${d ? 'and (m.jusqu_au is null or m.jusqu_au > now())' : ''}
      where (e.de_qui = $1 or e.pour_qui = $1) and e.etat in ('propose', 'accepte') order by e.echeance limit 100`, [u.id]);
  const auj = aujourdhui(), parProjet = {};
  const sortie = [];
  for (const e of rows) {
    const s = { id: u.id, role: e.role };
    if (!ER.can(s, 'read', ressource(e)).allow) continue;
    if (!parProjet[e.space_id]) parProjet[e.space_id] = (await membres(db, s, e.space_id)).noms;
    sortie.push(Object.assign(vue(e, s, parProjet[e.space_id], auj), { espace: e.space_id, projet: e.projet }));
  }
  return { engagements: sortie.sort(trier), aujourdhui: auj };
}

/* POST creer : { espace, titre, echeance, de?: ref (l'organisation demande à quelqu'un), pour?: ref } */
export async function creer(db, u, b) {
  await exigerPret(db);
  const titre = texte(b.titre, 120);
  if (titre.length < 2) refus(400, 'Décrivez l\'engagement en quelques mots.');
  if (titre.length > 120) refus(400, 'Description trop longue (120 caractères au plus).');
  const ech = echeance(b.echeance);
  if (b.de != null && !REF.test(String(b.de))) refus(400, 'Personne inconnue.');
  if (b.pour != null && !REF.test(String(b.pour))) refus(400, 'Personne inconnue.');
  return enTransaction(db, async c => {
    const s = await contexte(c, u, b.espace);
    const { noms, actifs } = await membres(c, s, b.espace);
    /* une référence n'est valable que pour une personne active que l'auteur a le droit de voir */
    const trouver = ref => Object.keys(actifs).find(id => id !== s.id && noms[id] && refDe(b.espace, id) === ref) || null;
    const deQui = b.de != null ? trouver(String(b.de)) : s.id;
    if (!deQui) refus(400, 'Cette personne n\'est pas (ou plus) dans le projet.');
    const pourQui = b.pour != null ? trouver(String(b.pour)) : null;
    if (b.pour != null && !pourQui) refus(400, 'Cette personne n\'est pas (ou plus) dans le projet.');
    if (pourQui && pourQui === deQui) refus(400, 'On ne s\'engage pas envers soi-même.');
    const d = ER.can(s, 'create', { deQui, pourQui, creePar: s.id });
    if (!d.allow) refus(403, d.reason);
    const { rows: n } = await c.query("select count(*)::int as n from engagements where space_id = $1 and etat in ('propose', 'accepte')", [b.espace]);
    if (n[0].n >= MAX_PAR_PROJET) refus(429, 'Trop d\'engagements ouverts dans ce projet.');
    /* s'engager soi-même : accepté d'emblée ; à la demande de l'organisation : proposé, en attente de la réponse de la personne */
    const etat = deQui === s.id ? 'accepte' : 'propose', id = crypto.randomBytes(16).toString('base64url').slice(0, 22);
    await c.query('insert into engagements (id, space_id, titre, de_qui, pour_qui, echeance, etat, cree_par) values ($1, $2, $3, $4, $5, $6::date, $7, $8)',
      [id, b.espace, titre, deQui, pourQui, ech, etat, s.id]);
    /* le journal : un geste et une échéance, jamais le texte de l'engagement ; la personne qui s'engage peut le lire */
    await journaliser(c, { qui: s.id, espace: b.espace, cible: deQui, detail: { geste: etat === 'accepte' ? 'pris' : 'demande', echeance: ech } });
    return { ref: id, etat };
  });
}

/* POST un geste : { espace, ref, geste: accepter | refuser | tenir | annuler, rev? } ; la ligne est verrouillée, la règle relue */
export async function agir(db, u, b) {
  await exigerPret(db);
  const g = GESTES[b.geste]; if (!g) refus(400, 'Geste inconnu.');
  if (!CLE.test(String(b.ref || ''))) refus(404, 'Engagement introuvable.');
  return enTransaction(db, async c => {
    const s = await contexte(c, u, b.espace);
    const { rows } = await c.query('select * from engagements where id = $1 and space_id = $2 for update', [b.ref, b.espace]);
    const e = rows[0];
    /* inconnu ou hors de sa portée : la même réponse */
    if (!e || !ER.can(s, 'read', ressource(e)).allow) refus(404, 'Engagement introuvable.');
    if (b.rev != null && Number(b.rev) !== e.rev) refus(409, 'Cet engagement a changé entre-temps : voici la version à jour.');
    const d = ER.can(s, g[0], ressource(e));
    /* le mauvais moment (déjà accepté, déjà clos…) : 409 ; la mauvaise personne : 403 */
    if (!d.allow) refus(REQUIS[b.geste].includes(e.etat) ? 403 : 409, d.reason);
    await c.query('update engagements set etat = $2, maj_le = now(), rev = rev + 1 where id = $1', [e.id, g[1]]);
    await journaliser(c, { qui: s.id, espace: b.espace, cible: e.de_qui === s.id ? (e.pour_qui || e.cree_par) : e.de_qui, detail: { geste: g[1], echeance: jourIso(e.echeance) } });
    return { ref: e.id, etat: g[1], rev: e.rev + 1 };
  });
}
