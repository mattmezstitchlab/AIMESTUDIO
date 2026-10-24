// AIME · la composition serveur des pages (docs/GABARITS.md, lot 1 : Mon accès, Journal, Personnes).
// Une fonction de projection réutilisable : (base, personne, { espace, gabarit }) → { gabarit, domaine, mots, blocs, dock, vide }.
// Le navigateur ne reçoit que ce que la personne peut lire, champ par champ. Aucune règle n'est réécrite ici : les droits
// viennent de synchroview/permissions.js et du rôle lu dans space_members (role() dans ./espaces.mjs), jamais de la requête.
// Le Dock de la réponse est composé dans api/page.mjs (dock/modele.js composerReel), à partir de gestes() ci-dessous.
import { createRequire } from 'module';
import { role, membres, ROLES_INVITES, duree, relationPrete, Refus } from './espaces.mjs';
import { lire } from './journal.mjs';
const require = createRequire(import.meta.url);
const P = require('../../synchroview/permissions.js');
const REG = require('../../modules/registre.js');     /* le registre des modules : la seule liste des pages servies (et donc du Dock) */

export const GABARITS = ['acces', 'journal', 'personnes', 'projet', 'deroule', 'documents', 'messages'];
/* lot 1 : seuls ces gabarits sont servis dans un vrai espace ; les autres répondent 404 (leur bouton n'apparaît pas) */
export const SERVIS = REG.servis({});      /* ['acces', 'journal', 'personnes'] : sans module activé, exactement les pages d'avant */
/* les pages d'un rôle : UNE règle, lue à la fois par la page (projeter : 404 sinon) et par le Dock (api/page.mjs → composerReel).
   docs/GABARITS.md § 5 : chaque rôle a Mon accès, son Journal et sa page Personnes (réduite pour contributor et viewer :
   lui-même, l'organisation, des effectifs sans noms ; pour guest : lui-même seulement). Ce qu'elles contiennent reste décidé bloc par bloc. */
/* actifs : les modules activés dans CE projet ({ temps: true } quand son programme est importé) ; le registre dit lesquels ajoutent une page */
export function pagesDe(s, actifs) {
  if (!P.can(s, 'read', { type: 'space' }).allow) return [];
  return REG.servis(actifs || {});
}
export const TITRES = { acces: 'Mon accès', journal: 'Journal', personnes: 'Personnes', deroule: REG.module('temps').nom };
/* les modules activés dans un projet : une ligne dans temps_espaces (migration 2026-10-24-07) ; sans la table, aucun */
export async function actifsDe(db, espace) {
  try { const { rows } = await db.query("select to_regclass('public.temps_espaces') as t"); if (!rows[0] || !rows[0].t) return {};
    const { rows: r } = await db.query('select 1 from temps_espaces where space_id = $1', [espace]); return r.length ? { temps: true } : {}; }
  catch { return {}; }
}

/* les mots d'un domaine (§ 8) : un mot par rôle serveur ; un modèle n'accorde aucun droit, il nomme.
   Le témoin et le prestataire partagent le rôle contributor : la relation enregistrée pour le membre (space_members.relation,
   choisie à l'invitation) les distingue ; sans elle, le mot est celui du rôle dans le domaine. */
export const MOTS = {
  mariage: { owner: 'le couple', editor: 'la coordination', contributor: 'prestataire', viewer: 'parent', guest: 'invité', projet: 'du mariage', anonyme: 'une personne' },
  seminaire: { owner: 'l\'organisation', editor: 'l\'agence', contributor: 'intervenant', viewer: 'direction', guest: 'participant', projet: 'du séminaire', anonyme: 'une personne' },
  /* hors mariage et séminaire, les places universelles (décision de Matt, 24/10) : J'organise · Je coordonne · Je contribue · Je participe ; les droits ne changent pas */
  _: { owner: 'l\'organisation', editor: 'la coordination', contributor: 'contributeur', viewer: 'un proche', guest: 'participant', projet: 'du projet', anonyme: 'une personne de l\'organisation' }
};
/* des relations proposées à l'invitation (un mot libre reste possible) : elles nomment, elles n'accordent rien */
export const SUGGESTIONS = {
  mariage: { editor: ['coordinatrice', 'coordinateur'], contributor: ['témoin', 'fleuriste', 'traiteur', 'musicien', 'photographe', 'vidéaste', 'DJ', 'lieu'], viewer: ['parent'], guest: ['invité'] },
  seminaire: { editor: ['agence'], contributor: ['intervenant', 'traiteur', 'lieu'], viewer: ['direction'], guest: ['participant'] },
  _: {}
};
const RELATION = { owner: 'Propriétaire', editor: 'Coordination', contributor: 'Contribution', viewer: 'Lecture seule', guest: 'Invité' };

/* ce qu'un rôle peut faire, en verbes : chaque phrase est adossée à une règle de permissions.js, évaluée pour ce rôle */
const CAPACITES = [
  ['space', 'read', {}, 'consulter ce projet'],
  ['event', 'read', { public: true }, 'lire le programme'],
  ['event', 'create', {}, 'composer le déroulé'],
  ['summary', 'read', {}, 'voir les effectifs, sans les noms'],
  ['document', 'upload', {}, 'déposer vos documents'],
  ['space', 'manage_members', {}, 'gérer les membres et les invitations'],
  ['space', 'delete', {}, 'supprimer le projet']
];
const NOMS_ROLES = { editor: 'la coordination', contributor: 'des contributeurs', viewer: 'des lecteurs', guest: 'des invités' };

const refus = (code, raison) => { throw new Refus(code, raison); };
const iso = d => (d ? new Date(d).toISOString() : null);
const jour = d => (d ? new Date(d).toISOString().slice(0, 10) : null);
function dateFr(d, annee) { if (!d) return ''; return new Date(d).toLocaleDateString('fr-FR', annee ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' } : { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }); }
function premierMot(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

/* les gestes accordés, calculés par permissions.js pour ce rôle (et seulement ceux que le serveur sait exécuter au lot 1) */
export function gestes(s) {
  const peutInviter = ROLES_INVITES.filter(r => P.can(s, 'invite', { type: 'space', role: r }).allow);
  return {
    lire: P.can(s, 'read', { type: 'space' }).allow,
    inviter: peutInviter,                                   /* rôles que cette personne peut inviter (vide : aucun) */
    gerer: P.can(s, 'manage_members', { type: 'space' }).allow,
    signaler: P.can(s, 'read', { type: 'space' }).allow     /* tout membre peut signaler un accès inattendu */
  };
}

async function contexte(db, u, espace) {
  const r = await role(db, espace, u.id);
  if (!r) refus(404, 'Espace introuvable.');               /* inconnu, interdit ou échu : la même réponse */
  const { rows } = await db.query('select title, data->>\'modele\' as modele from spaces where id = $1', [espace]);
  if (!rows[0]) refus(404, 'Espace introuvable.');
  const domaine = rows[0].modele && MOTS[rows[0].modele] ? rows[0].modele : null;
  return { s: { id: u.id, role: r }, titre: rows[0].title, domaine, mots: MOTS[domaine || '_'] };
}

/* les noms que cette personne peut voir : membres dont member.read l'autorise ; les autres restent anonymes.
   Un membre dont l'accès a pris fin n'est plus nommé, sauf pour le propriétaire (revue de #104) ; un membre retiré ne l'est plus du tout. */
async function annuaire(db, s, espace) {
  const d = await duree(db), proprio = P.can(s, 'manage_members', { type: 'space' }).allow;
  const { rows } = await db.query(`select m.user_id, m.role, u.name, u.email${d ? ', (m.jusqu_au is not null and m.jusqu_au <= now()) as fini' : ''} from space_members m join "user" u on u.id = m.user_id where m.space_id = $1`, [espace]);
  const noms = {};
  rows.forEach(x => { if (x.fini && !proprio && x.user_id !== s.id) return; if (P.can(s, 'read', { type: 'member', subjectId: x.user_id, role: x.role }).allow) noms[x.user_id] = x.name || (x.email || '').split('@')[0]; });
  return { noms, d };
}
/* les relations des membres (le mot métier), quand la colonne existe : jamais un droit, seulement un nom */
async function relations(db, espace) {
  if (!(await relationPrete(db))) return {};
  const { rows } = await db.query('select user_id, relation from space_members where space_id = $1 and relation is not null', [espace]);
  const r = {}; rows.forEach(x => { r[x.user_id] = x.relation; }); return r;
}
/* un nom qu'on ne peut pas voir : « une personne » dans les domaines mariage et séminaire (test réel du 24/10), sinon « une personne de l'organisation » */
/* la relation choisie à chaque invitation (pour les phrases du journal) : jamais un droit, seulement un mot */
async function relationsInvitations(db, espace) {
  if (!(await relationPrete(db))) return {};
  const { rows } = await db.query('select id, relation from invitations where space_id = $1 and relation is not null', [espace]);
  const r = {}; rows.forEach(x => { r[x.id] = x.relation; }); return r;
}
const ANONYME = 'une personne de l\'organisation', anonyme = mots => (mots && mots.anonyme) || ANONYME;

/* ---------- Journal ---------- */
/* chaque phrase commence par « Le 24 octobre, » : les noms gardent leur casse, « une personne » reste en minuscules */
function phrase(l, moi, nom, mots, rel, proprio) {
  const qui = l.qui === moi ? 'vous' : (l.qui ? nom(l.qui) : 'AIME'), cible = l.detail.cible, vous = cible === moi;
  /* la relation (« photographe ») quand elle existe : celle de l'invitation, sinon celle du membre ; sinon le mot du rôle dans le domaine */
  const relation = rel ? (rel.invitations[l.detail.invitation] || (l.action === 'acceptation' && rel.membres[cible]) || '') : '';
  const role = relation || (l.detail.role ? (mots[l.detail.role] || l.detail.role) : ''), fin = l.detail.jusqu_au ? ', jusqu\'au ' + dateFr(l.detail.jusqu_au, true) : '';
  const le = 'Le ' + dateFr(l.le) + ', ';
  /* un membre retiré ou dont l'accès a pris fin : nommé, avec sa relation, pour le propriétaire seulement ; pour les autres, anonyme */
  const qui_part = () => { const n = nom(cible), r = rel && (rel.membres[cible] || rel.parCible[cible]); return n + (r && n !== anonyme(mots) ? ', ' + r + ',' : ''); };
  switch (l.action) {
    case 'creation': return le + (l.qui === moi ? 'vous avez créé le projet.' : qui + ' a créé le projet.');
    case 'invitation': return le + (l.qui === moi ? 'vous avez préparé une invitation (' + role + ')' : qui + ' a préparé une invitation (' + role + ')') + fin + '.';
    case 'acceptation': return le + (vous ? 'vous avez rejoint le projet comme ' + role : nom(cible) + ' a rejoint le projet comme ' + role) + fin + '.';
    case 'retrait': return le + (vous ? qui + ' vous a retiré du projet.' : !proprio ? 'une personne a quitté le projet.' : (l.qui === moi ? 'vous avez retiré ' : qui + ' a retiré ') + qui_part() + ' du projet.');
    case 'annulation': return le + qui + ' a annulé une invitation.';
    case 'changement_role': return le + qui + ' a changé un rôle (' + role + ').';
    case 'ouverture': return le + 'un accès a été ouvert' + fin + '.';
    case 'fermeture': return le + (vous ? 'votre accès a pris fin (' + (l.detail.raison || 'fin du rôle') + ').' : proprio && cible ? 'l\'accès ' + (/^[aeiouyhâàéèêîïôû]/i.test(qui_part()) ? 'd\'' : 'de ') + qui_part() + ' a pris fin.' : 'un accès a pris fin.');
    case 'programme': return le + (l.qui === moi ? 'vous avez ' : qui + ' a ') + (l.detail.geste === 'importer' ? 'importé le programme.' : 'modifié le programme.');
    case 'signalement': return le + (l.qui === moi ? 'vous avez signalé un accès inattendu.' : 'un accès inattendu a été signalé.');
    default: return le + 'une action a été inscrite.';
  }
}
async function pageJournal(db, c, espace) {
  const tout = P.can(c.s, 'manage_members', { type: 'space' }).allow;
  const lignes = await lire(db, { espace, moi: c.s.id, tout });
  if (lignes === null) return { blocs: [], vide: 'Le journal n\'est pas encore installé sur cette base.' };
  const { noms } = await annuaire(db, c.s, espace);
  /* le propriétaire garde les noms de ceux qui sont partis (retrait, fin d'accès) : ils ne sont plus dans space_members */
  const partis = {};
  if (tout) { const ids = [...new Set(lignes.filter(l => (l.action === 'retrait' || l.action === 'fermeture' || l.action === 'acceptation') && l.detail.cible && !noms[l.detail.cible]).map(l => l.detail.cible))];
    if (ids.length) { const { rows } = await db.query('select id, name, email from "user" where id = any($1)', [ids]); rows.forEach(x => { partis[x.id] = x.name || (x.email || '').split('@')[0]; }); } }
  const nom = id => (id === c.s.id ? 'vous' : (noms[id] || partis[id] || anonyme(c.mots)));
  const rel = { membres: await relations(db, espace), invitations: await relationsInvitations(db, espace), parCible: {} };
  lignes.forEach(l => { if (l.action === 'acceptation' && l.detail.cible && rel.invitations[l.detail.invitation]) rel.parCible[l.detail.cible] = rel.invitations[l.detail.invitation]; });
  const blocs = lignes.map((l, i) => {
    const signal = l.action === 'signalement', mienne = l.qui === c.s.id;
    /* l'auteur d'un signalement est protégé (décision de Matt) : pour tout autre que lui, ni identifiant, ni rôle, ni heure exacte */
    const le = signal && !mienne ? jour(l.le) : l.le;
    const b = { id: 'journal-' + i, type: 'ligne', action: l.action, le, texte: phrase(signal && !mienne ? { le: l.le, action: l.action, qui: null, detail: {} } : l, c.s.id, nom, c.mots, rel, tout) };
    if (signal && l.detail.motif) b.motif = l.detail.motif;
    if (mienne) b.moi = true;
    return b;
  });
  return { blocs, vide: blocs.length ? null : 'Rien ne vous concerne pour l\'instant.' };
}

/* ---------- Mon accès ---------- */
async function pageAcces(db, c, espace) {
  const { s, mots } = c, d = await duree(db);
  const { rows: m } = await db.query('select role, added_at' + (d ? ', jusqu_au' : '') + ' from space_members where space_id = $1 and user_id = $2', [espace, s.id]);
  const moi = m[0], g = gestes(s), blocs = [];
  const nomRole = (await relations(db, espace))[s.id] || mots[s.role] || RELATION[s.role];
  blocs.push({ id: 'acces-role', type: 'role', role: s.role, relation: nomRole,
    texte: s.role === 'owner' ? 'Vous êtes ' + nomRole + ' : « ' + c.titre + ' » est votre projet.' : 'Vous êtes ' + nomRole + ' ' + mots.projet + ' « ' + c.titre + ' ».' });
  const peut = CAPACITES.filter(([type, action, r]) => P.can(s, action, Object.assign({ type }, r)).allow).map(x => x[3]);
  if (g.inviter.length) peut.push('inviter ' + g.inviter.map(r => NOMS_ROLES[r]).join(', ').replace(/, ([^,]*)$/, ' et $1'));
  blocs.push({ id: 'acces-gestes', type: 'gestes', verbes: peut });
  /* qui me l'a accordé, et quand : la ligne d'acceptation, puis l'invitation qui la précède */
  const lignes = (await lire(db, { espace, moi: s.id, tout: false })) || [];
  const { noms } = await annuaire(db, s, espace);
  if (s.role === 'owner') {
    const cr = lignes.find(l => l.action === 'creation' && l.qui === s.id);
    blocs.push({ id: 'acces-origine', type: 'origine', texte: cr ? 'Vous avez créé ce projet le ' + dateFr(cr.le, true) + '.' : 'Vous avez créé ce projet.' });
  } else {
    const ac = lignes.find(l => l.action === 'acceptation' && l.detail.cible === s.id);
    let par = null;
    if (ac && ac.detail.invitation) {
      const { rows: inv } = await db.query("select user_id, at from audit where space_id = $1 and action = 'invitation' and detail->>'invitation' = $2 limit 1", [espace, String(ac.detail.invitation)]).catch(() => ({ rows: [] }));
      if (inv[0]) par = { nom: noms[inv[0].user_id] || anonyme(mots), le: iso(inv[0].at) };
    }
    blocs.push({ id: 'acces-origine', type: 'origine', texte: par ? premierMot(par.nom) + ' vous a invité le ' + dateFr(par.le, true) + (ac ? ' ; vous avez rejoint le ' + dateFr(ac.le, true) + '.' : '.') : (ac ? 'Vous avez rejoint ce projet le ' + dateFr(ac.le, true) + '.' : 'Vous avez rejoint ce projet le ' + dateFr(moi.added_at, true) + '.') });
  }
  const fin = d && moi.jusqu_au ? iso(moi.jusqu_au) : null;
  blocs.push({ id: 'acces-fin', type: 'fin', jusquau: fin, texte: fin ? 'Votre accès dure jusqu\'au ' + dateFr(fin, true) + '.' : 'Votre accès n\'a pas de date de fin.' });
  if (s.role === 'owner') {
    const { rows: n } = await db.query('select count(*)::int as n from space_members m where m.space_id = $1' + (d ? ' and (m.jusqu_au is null or m.jusqu_au > now())' : ''), [espace]);
    blocs.push({ id: 'acces-membres', type: 'compte', nombre: n[0].n, texte: n[0].n > 1 ? n[0].n + ' personnes partagent ce projet.' : 'Vous êtes seul dans ce projet pour l\'instant.' });
  }
  /* jamais masqué (§ 2) */
  blocs.push({ id: 'acces-signaler', type: 'geste', geste: 'signaler', texte: 'Je vois un accès inattendu', aide: 'Le propriétaire lira votre message, pas votre nom.' });
  return { blocs, vide: null };
}

/* ---------- Personnes ---------- */
async function pagePersonnes(db, c, espace) {
  const { s, mots } = c, g = gestes(s);
  const m = await membres(db, { id: s.id }, { espace });       /* même portée que l'action « membres » (règle 2) */
  const rel = await relations(db, espace), mot = x => rel[x.id] || mots[x.role] || RELATION[x.role];
  const blocs = [];
  if (s.role === 'guest') {
    const moi = m.membres.find(x => x.id === s.id);
    blocs.push({ id: 'personnes-moi', type: 'personne', nom: moi ? moi.nom : 'vous', relation: rel[s.id] || mots.guest, moi: true });
    return { blocs, vide: null };
  }
  blocs.push({ id: 'personnes-liste', type: 'liste', personnes: m.membres.map(x => Object.assign({ nom: x.nom, relation: mot(x), role: x.role }, x.image ? { image: x.image } : {}, x.jusquau ? { jusquau: x.jusquau } : {}, x.email ? { email: x.email } : {}, x.id === s.id ? { moi: true } : {}, g.gerer && x.id !== s.id ? { ref: x.id } : {})) });
  if (m.effectif) blocs.push({ id: 'personnes-effectif', type: 'effectif', effectif: m.effectif, texte: 'Des effectifs, sans les noms.' });
  /* invitations en cours : le propriétaire les voit toutes ; la coordination, seulement celles qu'elle peut émettre (décision de Matt) */
  let inv = [];
  if (g.gerer) inv = (m.invitations || []).filter(i => !i.utilisee && new Date(i.expire) > new Date());
  else if (g.inviter.length) {
    const d = await duree(db);
    const { rows } = await db.query(`select id, role, email, expires_at${d ? ', role_jusqu_au' : ''} from invitations where space_id = $1 and used_at is null and expires_at > now() and role = any($2) order by expires_at desc limit 50`, [espace, g.inviter]);
    inv = rows.map(i => ({ id: i.id, role: i.role, email: i.email, expire: i.expires_at, jusquau: iso(i.role_jusqu_au) }));
  }
  if (g.gerer || g.inviter.length) blocs.push({ id: 'personnes-invitations', type: 'invitations', invitations: inv.map(i => Object.assign({ ref: i.id, role: i.role, relation: mots[i.role] || RELATION[i.role], nominative: !!i.email, expire: iso(i.expire), jusquau: i.jusquau || null }, g.gerer && i.email ? { email: i.email } : {}, g.gerer ? { annulable: true } : {})) });
  const sug = SUGGESTIONS[c.domaine || '_'] || {};
  if (g.inviter.length) blocs.push({ id: 'personnes-inviter', type: 'geste', geste: 'inviter', roles: g.inviter.map(r => ({ role: r, relation: mots[r] || RELATION[r], suggestions: sug[r] || [] })), sensible: true });
  const seul = m.membres.length === 1 && !m.effectif;
  return { blocs, vide: seul && g.gerer ? 'Invitez les personnes de votre projet.' : null };
}

/* ---------- Programme (module Temps) ---------- */
/* la page ne porte qu'un bloc : le module, que l'écran charge depuis /api/temps (vue calculée pour cette personne, au serveur) */
async function pageDeroule(db, c, espace) {
  return { blocs: [{ id: 'deroule-module', type: 'module', module: 'temps', api: REG.module('temps').api + '?espace=' + encodeURIComponent(espace) }], vide: null };
}

const PAGES = { acces: pageAcces, journal: pageJournal, personnes: pagePersonnes, deroule: pageDeroule };

/* la projection : personne, projet, gabarit → page. Sans personne (visiteur), rien du lot 1 n'est publié : aucun bloc. */
export async function projeter(db, u, { espace, gabarit }) {
  if (!GABARITS.includes(gabarit)) refus(400, 'Gabarit inconnu.');
  if (!u) return { gabarit, domaine: null, mots: { titre: TITRES[gabarit] || gabarit }, visuel: null, blocs: [], dock: null, vide: null, public: true };
  const c = await contexte(db, u, espace);
  if (!pagesDe(c.s, await actifsDe(db, espace)).includes(gabarit)) refus(404, 'Cette page n\'existe pas encore dans ce projet.');   /* la même règle que le Dock */
  const p = await PAGES[gabarit](db, c, espace), maRelation = (await relations(db, espace))[u.id];
  return { gabarit, domaine: c.domaine, mots: { titre: TITRES[gabarit], projet: c.titre, role: premierMot(maRelation || c.mots[c.s.role] || RELATION[c.s.role]) }, visuel: null, blocs: p.blocs, dock: null, vide: p.vide || null };
}
