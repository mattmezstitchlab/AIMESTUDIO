// AIME · module Temps, partie serveur : la base, la transaction, la vue de chacun. Le moteur pur (modules/temps/moteur.js)
// décide ; ici on lit, on verrouille, on écrit, on filtre. db : un pg.Pool (query + connect), jamais une connexion HTTP sans transaction.
//
// Garanties (docs/TEMPS.md) :
//  * la personne vient de la session, son rôle de space_members (date de fin comprise), relu DANS la transaction de chaque geste ;
//  * un geste = une transaction : verrou du projet (temps_espaces … for update), règles, conflit, moments, live_journal, audit ;
//    tout ou rien. Deux instances du serveur se rangent derrière le même verrou ; l'index unique (espace, rev) en est le filet ;
//  * le navigateur ne reçoit que la vue calculée pour lui (et la Comparaison, coupée à ce que le demandeur lit lui-même) ;
//  * un projet de démonstration (origine « demo ») n'est ouvert qu'aux comptes de démonstration, et réciproquement.
import { createRequire } from 'module';
import { role, enTransaction, relationPrete, duree, Refus } from '../_auth/espaces.mjs';
import { inscrire } from '../_auth/journal.mjs';
const require = createRequire(import.meta.url);
const P = require('../../synchroview/permissions.js');
const T = require('../../modules/temps/moteur.js');
const MODELES = { mariage: require('../../vitrine/donnees/mariage.json'), seminaire: require('../../vitrine/donnees/seminaire.json') };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const DOMAINE_DEMO = 'demo.aime.test';
export const estDemo = u => !!(u && typeof u.email === 'string' && u.email.toLowerCase().endsWith('@' + DOMAINE_DEMO));
const refus = (code, raison) => { throw new Refus(code, raison); };

/* le module est-il installé sur cette base ? (migration 2026-10-24-07) ; sinon 503, et rien d'autre ne change */
/* « installé » est retenu ; « pas installé » seulement une minute, pour qu'une instance chaude voie la migration dès qu'elle est passée */
let PRET = null, VU = 0;
export function _oublier() { PRET = null; }
export async function pret(db) {
  if (PRET === true || (PRET === false && Date.now() - VU < 60000)) return PRET;
  try { const { rows } = await db.query("select to_regclass('public.temps_espaces') as e, to_regclass('public.moments') as m, exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'live_journal' and column_name = 'effets') as j"); PRET = !!(rows[0].e && rows[0].m && rows[0].j); }
  catch { PRET = false; }
  VU = Date.now(); return PRET;
}
async function exigerPret(db) { if (!(await pret(db))) refus(503, 'Le module Programme n\'est pas encore installé sur cet environnement.'); }

/* le contexte : membre actif (sinon 404, comme un projet inconnu), état du module, et l'isolation de la démonstration */
async function contexte(db, u, espace) {
  if (!UUID.test(String(espace || ''))) refus(404, 'Projet introuvable.');
  const r = await role(db, espace, u.id);
  if (!r) refus(404, 'Projet introuvable.');
  const { rows } = await db.query('select rev, origine from temps_espaces where space_id = $1', [espace]);
  const t = rows[0] || null;
  if (t && t.origine === 'demo' && !estDemo(u)) refus(404, 'Projet introuvable.');
  if (estDemo(u) && (!t || t.origine !== 'demo')) refus(404, 'Projet introuvable.');
  return { s: { id: u.id, role: r }, actif: !!t, rev: t ? Number(t.rev) : 0, origine: t ? t.origine : null };
}

const ligneMoment = m => ({ id: m.id, titre: m.titre, lieu: m.lieu, debut: m.debut_min, fin: m.fin_min, decalage: m.decalage_min, audience: m.audience, responsable: m.responsable,
  planB: m.plan_b, planBActif: m.plan_b_actif, fait: m.fait, note: m.note_equipe, position: m.position, majRev: Number(m.maj_rev) });

/* le programme d'un projet, tel que la base le tient (dans la transaction quand il y en a une) */
async function charger(db, espace, rev) {
  const d = await duree(db);
  const [{ rows: M }, { rows: mb }, { rows: cf }, { rows: im }] = await Promise.all([
    db.query('select * from moments where space_id = $1 order by position, id', [espace]),
    db.query('select user_id, role from space_members m where m.space_id = $1' + (d ? ' and (m.jusqu_au is null or m.jusqu_au > now())' : ''), [espace]),
    db.query("select qui, p->>'moment' as moment, max(rev) as rev from live_journal where espace = $1 and action = 'confirmer' and rev is not null group by 1, 2", [espace]),
    db.query("select min(rev) as rev from live_journal where espace = $1 and action = 'importer'", [espace])]);
  const membres = {}, confirmations = {};
  mb.forEach(x => { membres[x.user_id] = x.role; });
  cf.forEach(x => { (confirmations[x.qui] = confirmations[x.qui] || {})[x.moment] = Number(x.rev); });
  return { rev, moments: M.map(ligneMoment), membres, confirmations, revImport: im[0] && im[0].rev ? Number(im[0].rev) : 0 };
}

/* GET : la vue de la personne connectée ; « depuis » = la révision qu'elle a déjà : rien d'autre ne repart si rien n'a changé */
export async function lire(db, u, { espace, depuis }) {
  await exigerPret(db);
  const c = await contexte(db, u, espace);
  if (!c.actif) return { actif: false, rev: 0, peutActiver: P.can(c.s, 'manage_members', { type: 'space' }).allow && !estDemo(u) };
  if (depuis != null && Number(depuis) === c.rev) return { actif: true, rev: c.rev, inchange: true };
  const prog = await charger(db, espace, c.rev);
  return { actif: true, rev: c.rev, demo: c.origine === 'demo', vue: T.vue(prog, c.s, P) };
}

/* les noms que cette personne a le droit de voir (member.read), pour le journal et la Comparaison */
async function noms(db, s, espace) {
  const { rows } = await db.query('select m.user_id, m.role, u.name, u.email from space_members m join "user" u on u.id = m.user_id where m.space_id = $1', [espace]);
  const n = {}, rel = (await relationPrete(db)) ? Object.fromEntries((await db.query('select user_id, relation from space_members where space_id = $1 and relation is not null', [espace])).rows.map(x => [x.user_id, x.relation])) : {};
  rows.forEach(x => { if (P.can(s, 'read', { type: 'member', subjectId: x.user_id, role: x.role }).allow) n[x.user_id] = x.name || (x.email || '').split('@')[0]; });
  return { noms: n, relations: rel };
}

export async function historique(db, u, { espace }) {
  await exigerPret(db);
  const c = await contexte(db, u, espace); if (!c.actif) return { actif: false, lignes: [] };
  const prog = await charger(db, espace, c.rev);
  const { rows } = await db.query('select rev, qui, action, p, effets, cree_le from live_journal where espace = $1 and rev is not null order by rev desc limit 200', [espace]);
  const { noms: n } = await noms(db, c.s, espace);
  return { actif: true, rev: c.rev, lignes: T.historique(rows.map(l => ({ rev: Number(l.rev), qui: l.qui, action: l.action, p: l.p, effets: l.effets, le: new Date(l.cree_le).toISOString() })), prog, c.s, P, n) };
}

/* la Comparaison : réservée au propriétaire, sur les membres de ce projet, jamais au-delà de sa propre vue */
export async function comparer(db, u, { espace, cible }) {
  await exigerPret(db);
  const c = await contexte(db, u, espace); if (!c.actif) refus(404, 'Aucun programme dans ce projet.');
  const d = P.can(c.s, 'compare', { type: 'space' }); if (!d.allow) refus(403, d.reason);
  const prog = await charger(db, espace, c.rev), { noms: n, relations } = await noms(db, c.s, espace);
  const personnes = Object.keys(prog.membres).filter(id => id !== u.id).map(id => ({ id, nom: n[id] || 'une personne', relation: relations[id] || null, role: prog.membres[id] }));
  if (!cible) return { rev: c.rev, personnes };
  const r = T.comparer(prog, c.s, String(cible), P); if (!r.ok) refus(r.code, r.raison);
  return { rev: c.rev, personnes, cible: Object.assign({ nom: n[r.cible.id] || 'une personne', relation: relations[r.cible.id] || null }, r.cible), vue: r.vue };
}

/* POST geste : tout se joue dans UNE transaction, derrière le verrou du projet */
export async function geste(pool, u, { espace, geste: g, rev }) {
  await exigerPret(pool);
  const vu = Number(rev);
  if (!Number.isInteger(vu) || vu < 0) refus(400, 'Révision vue manquante : rechargez le programme.');
  const action = g && g.action, p = g && g.p && typeof g.p === 'object' ? g.p : {};
  return enTransaction(pool, async db => {
    if (!UUID.test(String(espace || ''))) refus(404, 'Projet introuvable.');
    const { rows: lk } = await db.query('select rev from temps_espaces where space_id = $1 for update', [espace]);
    const c = await contexte(db, u, espace);                       /* le rôle relu sous le verrou : un retrait concurrent compte */
    if (!c.actif || !lk[0]) refus(404, 'Aucun programme dans ce projet.');
    const prog = await charger(db, espace, Number(lk[0].rev));
    const d = T.decider(prog, c.s, { action, p }, P);
    if (!d.ok) { const e = new Refus(d.code, d.raison); e.regle = d.regle; throw e; }
    const cf = T.conflit(prog, d, vu);
    if (cf) { const e = new Refus(409, 'Le programme a changé entre-temps : voici la version à jour, rien n\'a été enregistré.'); e.conflit = cf; throw e; }
    const nouveau = prog.rev + 1;
    const pj = action === 'confirmer' ? { moment: p.moment } : action === 'retarder' ? { moment: p.moment, minutes: Math.round(Number(p.minutes)), cascade: p.cascade === true } : action === 'planB' ? { moment: p.moment, actif: p.actif !== false } : { moment: p.moment };
    await db.query('insert into live_journal (espace, qui, action, p, t, rev, effets) values ($1, $2, $3, $4::jsonb, 0, $5, $6::jsonb)', [espace, u.id, action, JSON.stringify(pj), nouveau, JSON.stringify(d.effets)]);
    for (const f of d.effets) {
      const r = await db.query('update moments set decalage_min = $3, fait = $4, plan_b_actif = $5, maj_rev = $6 where space_id = $1 and id = $2 and decalage_min = $7 and fait = $8 and plan_b_actif = $9',
        [espace, f.id, f.apres.decalage, f.apres.fait, f.apres.planBActif, nouveau, f.avant.decalage, f.avant.fait, f.avant.planBActif]);
      if (r.rowCount !== 1) throw new Error('état du moment inattendu sous verrou : ' + f.id);   /* ne doit jamais arriver : tout est annulé */
    }
    await db.query('update temps_espaces set rev = $2 where space_id = $1', [espace, nouveau]);
    await inscrire(db, { qui: u.id, espace, action: 'programme', detail: { geste: action, rev: nouveau, moments: d.touches } });
    return { rev: nouveau, regle: d.regle, touches: d.touches };
  });
}

/* les lignes d'un programme de départ, insérées avec le journal « importer » (rev 1) : une seule fois par projet */
async function installer(db, u, espace, origine, lignes) {
  await db.query('insert into temps_espaces (space_id, rev, origine, active_par) values ($1, 1, $2, $3)', [espace, origine, u.id]);
  for (const m of lignes) {
    await db.query('insert into moments (space_id, id, titre, lieu, debut_min, fin_min, decalage_min, audience, responsable, plan_b, plan_b_actif, fait, note_equipe, position, maj_rev) values ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, false, false, $10, $11, 1)',
      [espace, m.id, m.titre, m.lieu, m.debut, m.fin, m.audience, m.responsable, m.planB, m.note, m.position]);
  }
  await db.query("insert into live_journal (espace, qui, action, p, t, rev, effets) values ($1, $2, 'importer', $3::jsonb, 0, 1, null)", [espace, u.id, JSON.stringify({ moments: lignes })]);
  await inscrire(db, { qui: u.id, espace, action: 'programme', detail: { geste: 'importer', rev: 1, moments: lignes.map(m => m.id) } });
}

/* POST activer : le propriétaire importe le programme type de son domaine (mariage, séminaire). Rien ne change avant ce geste. */
export async function activer(pool, u, { espace }) {
  await exigerPret(pool);
  if (estDemo(u)) refus(403, 'Un compte de démonstration n\'active rien.');
  try {
    return await enTransaction(pool, async db => {
      const c = await contexte(db, u, espace);
      const d = P.can(c.s, 'manage_members', { type: 'space' }); if (!d.allow) refus(403, 'Importer le programme est réservé au propriétaire.');
      if (c.actif) refus(409, 'Ce projet a déjà son programme.');
      const { rows } = await db.query("select data->>'modele' as modele from spaces where id = $1 for update", [espace]);
      const modele = rows[0] && MODELES[rows[0].modele] ? rows[0].modele : null; if (!modele) refus(400, 'Aucun programme type pour ce projet.');
      const lignes = T.importer(MODELES[modele], {});
      await installer(db, u, espace, 'import', lignes);
      return { rev: 1, moments: lignes.length };
    });
  } catch (e) { if (e && e.code === '23505') throw new Refus(409, 'Ce projet a déjà son programme.'); throw e; }
}

/* le projet de démonstration (scripts/temps-demo.mjs et tests) : des comptes de démonstration seulement, jamais en production */
export async function semerDemo(pool, donnees, comptes) {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') throw new Error('démonstration refusée en production');
  await exigerPret(pool);
  const ids = {};
  for (const p of donnees.personnes) { const u = comptes[p.cle]; if (!u || !estDemo(u)) throw new Error('compte de démonstration attendu pour ' + p.cle); ids[p.cle] = u.id; }
  const owner = donnees.personnes.find(p => p.role === 'owner'), proprio = comptes[owner.cle];
  return enTransaction(pool, async db => {
    const { rows } = await db.query("insert into spaces (kind, title, owner_id, data) values ('evenement', $1, $2, $3::jsonb) returning id", [donnees.titre, proprio.id, JSON.stringify({ modele: donnees.modele })]);
    const espace = rows[0].id, rp = await relationPrete(db);
    for (const p of donnees.personnes) {
      if (rp) await db.query('insert into space_members (space_id, user_id, role, relation) values ($1, $2, $3, $4)', [espace, ids[p.cle], p.role, p.relation]);
      else await db.query('insert into space_members (space_id, user_id, role) values ($1, $2, $3)', [espace, ids[p.cle], p.role]);
    }
    await inscrire(db, { qui: proprio.id, espace, action: 'creation', cible: proprio.id, detail: { role: 'owner', demo: true } });
    await installer(db, proprio, espace, 'demo', T.importer(donnees, ids));
    return { espace, ids };
  });
}

/* la cohérence : le journal rejoué doit redonner exactement la table moments (et le compteur du projet) */
export async function verifier(db, espace) {
  const { rows: t } = await db.query('select rev from temps_espaces where space_id = $1', [espace]);
  if (!t[0]) return { ok: false, ecarts: ['module non activé'] };
  const { rows: L } = await db.query('select rev, qui, action, p, effets from live_journal where espace = $1 and rev is not null order by rev', [espace]);
  const { rows: M } = await db.query('select id, decalage_min, fait, plan_b_actif, maj_rev from moments where space_id = $1', [espace]);
  let r; try { r = T.reconstruire(L.map(l => ({ rev: Number(l.rev), qui: l.qui, action: l.action, p: l.p, effets: l.effets }))); } catch (e) { return { ok: false, ecarts: [e.message] }; }
  const ecarts = [];
  if (r.rev !== Number(t[0].rev)) ecarts.push('révision ' + t[0].rev + ' ≠ journal ' + r.rev);
  M.forEach(m => { const x = r.moments[m.id]; if (!x) return ecarts.push(m.id + ' absent du journal');
    if (x.decalage !== m.decalage_min || x.fait !== m.fait || x.planBActif !== m.plan_b_actif || x.majRev !== Number(m.maj_rev)) ecarts.push(m.id + ' diffère du journal'); });
  if (Object.keys(r.moments).length !== M.length) ecarts.push('nombre de moments différent');
  return { ok: !ecarts.length, ecarts, rev: r.rev };
}
