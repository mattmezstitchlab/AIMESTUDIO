// AIME · espaces partagés : créer, inviter par rôle, rejoindre, voir les membres, retirer.
// Toutes les décisions passent par synchroview/permissions.js ; le rôle vient TOUJOURS de space_members, jamais de la requête.
// db : un objet { query(texte, valeurs) → { rows } } (pg.Pool en vrai, une base de test sinon).
import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
import { inscrire, lire } from './journal.mjs';
import { envoyer, envoiPret } from './auth.mjs';
const P = require('../../synchroview/permissions.js');

export const KINDS = ['evenement', 'projet', 'atelier'];
export const MODELES = ['mariage', 'seminaire'];
export const ROLES_INVITES = ['editor', 'contributor', 'viewer', 'guest'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[^\s@<>"]{2,24}$/;
const JOURS_INVITATION = 7, MAX_ESPACES = 20, MAX_INVITATIONS = 50;

export class Refus extends Error { constructor(code, raison) { super(raison); this.code = code; this.raison = raison; } }
const refus = (code, raison) => { throw new Refus(code, raison); };
const texte = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const hacher = t => crypto.createHash('sha256').update(String(t)).digest('hex');

/* la durée des rôles (db/migrations/2026-10-24-duree.sql) : tant que la colonne n'existe pas sur une base, aucun rôle n'expire */
let DUREE = null;
export function _oublierDuree() { DUREE = null; }
export async function duree(db) {
  if (DUREE !== null) return DUREE;
  try { const { rows } = await db.query("select count(*)::int as n from information_schema.columns where table_schema = 'public' and ((table_name = 'space_members' and column_name = 'jusqu_au') or (table_name = 'invitations' and column_name = 'role_jusqu_au'))"); DUREE = rows[0].n === 2; }
  catch { DUREE = false; }
  return DUREE;
}
export const ACTIF = 'and (m.jusqu_au is null or m.jusqu_au > now())';
const MAX_JOURS_ROLE = 3 * 366;
/* le rôle actif : après sa date de fin, un rôle vaut absence (même réponse qu'un non-membre) ; la fermeture est inscrite une fois */
export async function role(db, espace, userId) {
  if (!UUID.test(String(espace || ''))) return null;
  const d = await duree(db);
  const { rows } = await db.query('select m.role' + (d ? ', m.jusqu_au, (m.jusqu_au is not null and m.jusqu_au <= now()) as fini' : '') + ' from space_members m where m.space_id = $1 and m.user_id = $2', [espace, userId]);
  if (!rows[0]) return null;
  if (rows[0].fini) {
    const { rows: deja } = await db.query("select 1 from audit where space_id = $1 and action = 'fermeture' and detail->>'cible' = $2 and (detail->>'jusqu_au')::timestamptz = $3 limit 1", [espace, userId, rows[0].jusqu_au]).catch(() => ({ rows: [1] }));
    if (!deja.length) await inscrire(db, { qui: null, espace, action: 'fermeture', cible: userId, detail: { role: rows[0].role, jusqu_au: rows[0].jusqu_au, raison: 'date de fin atteinte' } }).catch(() => {});
    return null;
  }
  return rows[0].role;
}
const iso = d => (d ? new Date(d).toISOString() : null);
/* une date de fin demandée : au plus tôt dans une heure, au plus tard dans trois ans */
function fin(v) {
  if (v == null || v === '') return null;
  const t = Date.parse(String(v)); if (!Number.isFinite(t)) refus(400, 'Date de fin invalide.');
  if (t <= Date.now() + 3600e3) refus(400, 'La date de fin doit être dans le futur.');
  if (t > Date.now() + MAX_JOURS_ROLE * 864e5) refus(400, 'Date de fin trop lointaine (trois ans au plus).');
  return new Date(t).toISOString();
}
async function exiger(db, u, espace, action, ressource) {
  const r = await role(db, espace, u.id);
  if (!r) refus(404, 'Espace introuvable.');   /* même réponse qu'un espace qui n'existe pas : on ne révèle rien */
  const d = P.can({ id: u.id, role: r }, action, Object.assign({ type: 'space', id: espace }, ressource || {}));
  if (!d.allow) refus(403, d.reason);
  return r;
}

export async function mes(db, u) {
  const d = await duree(db);
  const { rows } = await db.query(`select s.id, s.title, s.kind, s.data->>'modele' as modele, m.role, s.created_at${d ? ', m.jusqu_au' : ''}
    from space_members m join spaces s on s.id = m.space_id where m.user_id = $1 ${d ? ACTIF : ''} order by s.created_at desc limit 100`, [u.id]);
  return { espaces: rows.map(r => ({ id: r.id, titre: r.title, kind: r.kind, modele: r.modele || null, role: r.role, jusquau: iso(r.jusqu_au) })) };
}

export async function creer(db, u, b) {
  const titre = texte(b.titre, 120); if (!titre) refus(400, 'Donnez un nom à l\'espace.');
  const kind = KINDS.includes(b.kind) ? b.kind : 'evenement', modele = MODELES.includes(b.modele) ? b.modele : null;
  const { rows: n } = await db.query('select count(*)::int as n from spaces where owner_id = $1', [u.id]);
  if (n[0].n >= MAX_ESPACES) refus(429, 'Vous avez atteint le nombre maximal d\'espaces.');
  const { rows } = await db.query('insert into spaces (kind, title, owner_id, data) values ($1, $2, $3, $4::jsonb) returning id', [kind, titre, u.id, JSON.stringify(modele ? { modele } : {})]);
  await db.query('insert into space_members (space_id, user_id, role) values ($1, $2, \'owner\')', [rows[0].id, u.id]);
  const journal = await inscrire(db, { qui: u.id, espace: rows[0].id, action: 'creation', cible: u.id, detail: { role: 'owner' } });
  return { id: rows[0].id, titre, kind, modele, role: 'owner', journal };
}

/* inviter : un jeton aléatoire, dont seule l'empreinte est gardée ; rôle fixé ici ; usage unique ; 7 jours */
export async function inviter(db, u, b, base) {
  const cible = String(b.role || '');
  if (!ROLES_INVITES.includes(cible)) refus(400, 'Rôle inconnu.');
  await exiger(db, u, b.espace, 'invite', { role: cible });
  const email = b.email ? texte(b.email, 254).toLowerCase() : null;
  if (email && !EMAIL.test(email)) refus(400, 'Adresse e-mail invalide.');
  const jusquau = fin(b.jusquau), d = await duree(db);
  if (jusquau && !d) refus(503, 'La durée des rôles n\'est pas encore installée sur cette base (migration à exécuter).');
  const { rows: n } = await db.query('select count(*)::int as n from invitations where space_id = $1 and used_at is null and expires_at > now()', [b.espace]);
  if (n[0].n >= MAX_INVITATIONS) refus(429, 'Trop d\'invitations en attente pour cet espace.');
  const jeton = crypto.randomBytes(32).toString('base64url');
  const { rows: inv } = await db.query(`insert into invitations (space_id, role, token_hash, email, created_by, expires_at${d ? ', role_jusqu_au' : ''}) values ($1, $2, $3, $4, $5, now() + interval '${JOURS_INVITATION} days'${d ? ', $6' : ''}) returning id`,
    [b.espace, cible, hacher(jeton), email, u.id].concat(d ? [jusquau] : []));
  const journal = await inscrire(db, { qui: u.id, espace: b.espace, action: 'invitation', detail: Object.assign({ role: cible, invitation: inv[0].id, nominative: !!email, jours: JOURS_INVITATION }, jusquau ? { jusqu_au: jusquau } : {}) });
  return { lien: base + '/compte/?invitation=' + jeton, role: cible, email, jours: JOURS_INVITATION, jusquau, journal };
}

/* rejoindre : consommation atomique (une seule fois, avant expiration, et par la bonne adresse si l'invitation en nomme une) */
export async function rejoindre(db, u, b) {
  const jeton = String(b.jeton || ''); if (!/^[A-Za-z0-9_-]{20,100}$/.test(jeton)) refus(400, 'Invitation invalide, expirée ou déjà utilisée.');
  const { rows } = await db.query(`update invitations set used_at = now(), used_by = $1
    where token_hash = $2 and used_at is null and expires_at > now() and (email is null or lower(email) = lower($3))
    returning *`, [u.id, hacher(jeton), u.email || '']);
  if (!rows[0]) refus(410, 'Invitation invalide, expirée, déjà utilisée ou destinée à une autre adresse.');
  /* déjà membre : on garde le rôle existant (une invitation n'abaisse ni n'élève personne) */
  const d = await duree(db);
  /* un rôle échu ne bloque pas une nouvelle invitation : la ligne échue est remplacée ; un rôle actif est gardé tel quel */
  if (d) { await db.query('delete from space_members where space_id = $1 and user_id = $2 and jusqu_au is not null and jusqu_au <= now()', [rows[0].space_id, u.id]);
    await db.query('insert into space_members (space_id, user_id, role, jusqu_au) values ($1, $2, $3, $4) on conflict (space_id, user_id) do nothing', [rows[0].space_id, u.id, rows[0].role, rows[0].role_jusqu_au || null]); }
  else await db.query('insert into space_members (space_id, user_id, role) values ($1, $2, $3) on conflict (space_id, user_id) do nothing', [rows[0].space_id, u.id, rows[0].role]);
  const r = await role(db, rows[0].space_id, u.id);
  const journal = await inscrire(db, { qui: u.id, espace: rows[0].space_id, action: 'acceptation', cible: u.id, detail: Object.assign({ role: r, invitation: rows[0].id }, rows[0].role_jusqu_au ? { jusqu_au: iso(rows[0].role_jusqu_au) } : {}) });
  const { rows: s } = await db.query('select title from spaces where id = $1', [rows[0].space_id]);
  return { espace: rows[0].space_id, titre: s[0] ? s[0].title : '', role: r, journal };
}

/* les membres : chacun selon sa portée (règle 2, synchroview/permissions.js « member.read ») ; les adresses e-mail et les invitations,
   seulement le propriétaire ; les effectifs (sans noms), à qui en a le droit (« summary.read »). Hors portée = absent de la réponse. */
function effectif(rows) { const n = {}; rows.forEach(x => { n[x.role] = (n[x.role] || 0) + 1; }); return n; }
export async function membres(db, u, b) {
  const r = await exiger(db, u, b.espace, 'read'), s = { id: u.id, role: r };
  const gerer = P.can(s, 'manage_members', { type: 'space' }).allow;
  const d = await duree(db);
  const { rows } = await db.query(`select m.user_id, m.role, u.name, u.email, u.image${d ? ', m.jusqu_au' : ''} from space_members m join "user" u on u.id = m.user_id where m.space_id = $1 ${d ? ACTIF : ''} order by m.added_at`, [b.espace]);
  const vus = rows.filter(x => P.can(s, 'read', { type: 'member', subjectId: x.user_id, role: x.role }).allow);
  const out = { moi: { id: u.id, role: r }, gerer, membres: vus.map(x => ({ id: x.user_id, role: x.role, nom: x.name || (x.email || '').split('@')[0], image: x.image || null, jusquau: iso(x.jusqu_au), email: gerer || x.user_id === u.id ? x.email : undefined })) };
  if (vus.length < rows.length && P.can(s, 'read', { type: 'summary' }).allow) out.effectif = effectif(rows);
  if (gerer) { const { rows: inv } = await db.query(`select id, role, email, expires_at, used_at${d ? ', role_jusqu_au' : ''} from invitations where space_id = $1 order by expires_at desc limit 50`, [b.espace]);
    out.invitations = inv.map(i => ({ id: i.id, role: i.role, email: i.email, expire: i.expires_at, utilisee: !!i.used_at, jusquau: iso(i.role_jusqu_au) })); }
  return out;
}

export async function retirer(db, u, b) {
  await exiger(db, u, b.espace, 'manage_members');
  const cible = String(b.membre || '');
  const { rows } = await db.query('select role from space_members where space_id = $1 and user_id = $2', [b.espace, cible]);
  if (!rows[0]) refus(404, 'Ce membre n\'est pas dans l\'espace.');
  if (rows[0].role === 'owner') { const { rows: o } = await db.query('select count(*)::int as n from space_members where space_id = $1 and role = \'owner\'', [b.espace]); if (o[0].n <= 1) refus(409, 'L\'espace doit garder au moins un propriétaire.'); }
  await db.query('delete from space_members where space_id = $1 and user_id = $2', [b.espace, cible]);
  const journal = await inscrire(db, { qui: u.id, espace: b.espace, action: 'retrait', cible, detail: { role: rows[0].role } });
  return { retire: cible, journal };
}

export async function annuler(db, u, b) {
  await exiger(db, u, b.espace, 'manage_members');
  const { rows } = await db.query('update invitations set expires_at = now() where id = $1 and space_id = $2 and used_at is null returning id', [String(b.invitation || ''), b.espace]);
  if (!rows[0]) refus(404, 'Invitation introuvable ou déjà utilisée.');
  const journal = await inscrire(db, { qui: u.id, espace: b.espace, action: 'annulation', detail: { invitation: rows[0].id } });
  return { annulee: rows[0].id, journal };
}

/* pour le direct : le modèle de l'espace et la carte membres → rôles, sans adresses.
   Les noms suivent la même portée que « membres ». La carte des rôles ne garde que les personnes visibles et celles dont
   les actions arrivent dans le journal de cette personne (il faut leur rôle pour rejouer) : identifiants seulement, aucun nom. */
async function acteurs(db, espace) {
  const t = await db.query("select to_regclass('public.live_journal') as t"); if (!(t.rows[0] && t.rows[0].t)) return [];
  const { rows } = await db.query('select distinct qui from live_journal where espace = $1', [espace]); return rows.map(x => x.qui);
}
export async function acces(db, u, b) {
  const r = await exiger(db, u, b.espace, 'read'), s = { id: u.id, role: r };
  const { rows: e } = await db.query('select title, data->>\'modele\' as modele from spaces where id = $1', [b.espace]);
  const d = await duree(db);
  const { rows } = await db.query(`select m.user_id, m.role, u.name, u.email, u.image from space_members m join "user" u on u.id = m.user_id where m.space_id = $1 ${d ? ACTIF : ''}`, [b.espace]);
  const vus = rows.filter(x => P.can(s, 'read', { type: 'member', subjectId: x.user_id, role: x.role }).allow), act = new Set(await acteurs(db, b.espace));
  const M = {}; rows.forEach(x => { if (vus.includes(x) || act.has(x.user_id)) M[x.user_id] = x.role; });
  return { titre: e[0].title, modele: e[0].modele || null, moi: { id: u.id, role: r, jusquau: d ? iso((await db.query('select jusqu_au from space_members where space_id = $1 and user_id = $2', [b.espace, u.id])).rows[0].jusqu_au) : null }, membres: M, personnes: vus.map(x => ({ id: x.user_id, nom: x.name || (x.email || '').split('@')[0], image: x.image || null })) };
}

/* le journal : le propriétaire lit celui de l'espace ; chaque membre, les lignes où il agit ou est concerné (jamais modifiable) */
export async function journal(db, u, b) {
  const r = await exiger(db, u, b.espace, 'read');
  const tout = P.can({ id: u.id, role: r }, 'manage_members', { type: 'space' }).allow;
  const lignes = await lire(db, { espace: b.espace, moi: u.id, tout });
  return { tout, journal: lignes === null ? null : lignes };
}

/* « Je vois un accès inattendu » : tout membre, invité compris, peut le dire, sans fournir de preuve.
   Le signalement est inscrit au journal (visible du propriétaire et de la personne qui signale) et le propriétaire est prévenu
   par e-mail, sans le texte du signalement ni le nom de la personne : il lit le journal, connecté. Cinq par jour et par personne. */
const MAX_SIGNALEMENTS = 5;
export async function signaler(db, u, b) {
  const r = await exiger(db, u, b.espace, 'read');
  const motif = texte(b.motif, 280);
  const { rows: n } = await db.query("select count(*)::int as n from audit where space_id = $1 and user_id = $2 and action = 'signalement' and at > now() - interval '1 day'", [b.espace, u.id]).catch(() => ({ rows: [{ n: 0 }] }));
  if (n[0].n >= MAX_SIGNALEMENTS) refus(429, 'Vous avez déjà signalé plusieurs fois aujourd\'hui : le propriétaire de l\'espace a été prévenu.');
  const journal = await inscrire(db, { qui: u.id, espace: b.espace, action: 'signalement', cible: u.id, detail: Object.assign({ role: r, objet: 'acces_inattendu' }, motif ? { motif } : {}) });
  let prevenu = false;
  if (envoiPret()) {
    const d = await duree(db);
    const { rows: o } = await db.query(`select u.email, s.title from space_members m join "user" u on u.id = m.user_id join spaces s on s.id = m.space_id where m.space_id = $1 and m.role = 'owner' ${d ? ACTIF : ''}`, [b.espace]);
    for (const x of o) { try { await envoyer({ to: x.email, subject: 'AIME · un accès inattendu est signalé', text: 'Bonjour,\n\nUn membre de votre espace « ' + x.title + ' » signale un accès inattendu.\nConnectez-vous à AIME et ouvrez le journal de l\'espace pour en savoir plus.\n', html: '<p>Bonjour,</p><p>Un membre de votre espace « ' + x.title.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) + ' » signale un accès inattendu.</p><p>Connectez-vous à AIME et ouvrez le journal de l\'espace pour en savoir plus.</p>' }); prevenu = true; } catch { /* le signalement reste au journal */ } }
  }
  if (!journal && !prevenu) refus(503, 'Le signalement n\'a pas pu être enregistré : réessayez plus tard, ou écrivez à AIME.');
  return { signale: true, journal, prevenu };
}

export const ACTIONS = { mes, creer, inviter, rejoindre, membres, retirer, annuler, acces, journal, signaler };
