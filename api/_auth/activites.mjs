// AIME · les activités d'un prestataire (db/migrations/2026-10-24-04-activites.sql, brief unique du 24/10, PR C).
// « Je suis fleuriste » enregistre une activité : un métier, non publié. Elle ne crée aucun projet et ne donne aucun droit
// dans aucun projet : les missions arrivent par invitation, et le rôle vient toujours de space_members (espaces.mjs).
// Le métier n'est accepté que s'il figure dans vitrine/metiers.json (un seul fichier de données).
import { createRequire } from 'module';
import { Refus } from './espaces.mjs';
const require = createRequire(import.meta.url);
const METIERS = require('../../vitrine/metiers.json').metiers;
export const IDS = METIERS.map(m => m.id);
const NOMS = Object.fromEntries(METIERS.map(m => [m.id, m.nom]));
const MAX_ACTIVITES = 12;
const refus = (code, raison) => { throw new Refus(code, raison); };

/* la table existe-t-elle sur cette base ? Tant que la migration n'est pas passée, on le dit (503), sans rien écrire */
let PRETE = null;
export function _oublier() { PRETE = null; SUR_CARTE = null; }
export async function pretes(db) {
  if (PRETE !== null) return PRETE;
  try { const { rows } = await db.query("select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'activites'"); PRETE = rows[0].n === 1; }
  catch { PRETE = false; }
  return PRETE;
}
const exigerPretes = async db => { if (!(await pretes(db))) refus(503, 'Les activités ne sont pas encore installées sur cette base (migration à exécuter).'); };
const vue = r => ({ metier: r.metier, nom: NOMS[r.metier] || r.metier, publiee: !!r.publiee, sur_carte: !!r.sur_carte });
export const nomMetier = id => NOMS[id] || id;

/* la colonne « sur_carte » (migration 2026-10-25-13) existe-t-elle ? Sans elle, rien ne casse : rien n'est montré, et le réglage le dit */
let SUR_CARTE = null;
export async function surCartePrete(db) {
  if (SUR_CARTE === true) return true;
  try { const { rows } = await db.query("select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = 'activites' and column_name = 'sur_carte'"); SUR_CARTE = rows[0].n === 1; }
  catch { SUR_CARTE = false; }
  return SUR_CARTE;
}
const colonnes = async db => (await surCartePrete(db)) ? 'metier, publiee, sur_carte' : 'metier, publiee';

/* enregistrer une activité : une fois par métier ; la seconde fois rend la même, sans doublon */
export async function activite(db, u, b) {
  const metier = String(b.metier == null ? '' : b.metier);
  if (!IDS.includes(metier)) refus(400, 'Ce métier n\'est pas proposé.');
  await exigerPretes(db);
  const cols = await colonnes(db), deja = async () => (await db.query('select ' + cols + ' from activites where user_id = $1 and metier = $2', [u.id, metier])).rows[0];
  const d = await deja(); if (d) return Object.assign(vue(d), { existante: true });
  const { rows: n } = await db.query('select count(*)::int as n from activites where user_id = $1', [u.id]);
  if (n[0].n >= MAX_ACTIVITES) refus(429, 'Trop d\'activités pour ce compte.');
  const { rows } = await db.query('insert into activites (user_id, metier) values ($1, $2) on conflict (user_id, metier) do nothing returning ' + cols, [u.id, metier]);
  return rows[0] ? Object.assign(vue(rows[0]), { existante: false }) : Object.assign(vue(await deja()), { existante: true });   /* deux envois simultanés : l'index unique tranche */
}

/* ses activités, et seulement les siennes */
export async function activites(db, u) {
  if (!(await pretes(db))) return { activites: [] };
  const { rows } = await db.query('select ' + (await colonnes(db)) + ' from activites where user_id = $1 order by created_at', [u.id]);
  return { activites: rows.map(vue), presentation: (await surCartePrete(db)) ? 'disponible' : 'indisponible' };
}

/* montrer (ou non) une de MES activités sur ma Carte (V1, P4) ; jamais celle d'un autre : la ligne est cherchée avec MON identifiant */
export async function activiteCarte(db, u, b) {
  const metier = String(b.metier == null ? '' : b.metier);
  if (!IDS.includes(metier)) refus(400, 'Ce métier n\'est pas proposé.');
  if (typeof b.montrer !== 'boolean') refus(400, 'Réglage invalide.');
  await exigerPretes(db);
  if (!(await surCartePrete(db))) refus(503, 'Montrer une activité sur votre Carte n\'est pas encore disponible ici (migration 2026-10-25-13 à appliquer).');
  const { rows } = await db.query('update activites set sur_carte = $3 where user_id = $1 and metier = $2 returning metier, publiee, sur_carte', [u.id, metier, b.montrer]);
  if (!rows[0]) refus(404, 'Vous n\'avez pas cette activité.');
  return vue(rows[0]);
}

/* retirer une de MES activités : elle disparaît aussi de ma Carte ; aucun projet n'est touché (une activité ne donne aucun droit) */
export async function retirerActivite(db, u, b) {
  const metier = String(b.metier == null ? '' : b.metier);
  if (!IDS.includes(metier)) refus(400, 'Ce métier n\'est pas proposé.');
  await exigerPretes(db);
  const { rowCount } = await db.query('delete from activites where user_id = $1 and metier = $2', [u.id, metier]);
  return { metier, retiree: rowCount > 0 };
}

/* ce que montre le lien public d'une Carte : les activités cochées « sur ma Carte » de cette personne, rien d'autre (ni « publiee ») */
export async function surCarte(db, userId) {
  if (!(await pretes(db)) || !(await surCartePrete(db))) return [];
  const { rows } = await db.query('select metier from activites where user_id = $1 and sur_carte order by created_at', [userId]);
  return rows.map(r => ({ metier: r.metier, nom: NOMS[r.metier] || r.metier }));
}

export const ACTIONS_ACTIVITES = { activite, activites, activiteCarte, retirerActivite };
