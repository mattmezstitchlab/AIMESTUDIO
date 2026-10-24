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
export function _oublier() { PRETE = null; }
export async function pretes(db) {
  if (PRETE !== null) return PRETE;
  try { const { rows } = await db.query("select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'activites'"); PRETE = rows[0].n === 1; }
  catch { PRETE = false; }
  return PRETE;
}
const exigerPretes = async db => { if (!(await pretes(db))) refus(503, 'Les activités ne sont pas encore installées sur cette base (migration à exécuter).'); };
const vue = r => ({ metier: r.metier, nom: NOMS[r.metier] || r.metier, publiee: !!r.publiee });

/* enregistrer une activité : une fois par métier ; la seconde fois rend la même, sans doublon */
export async function activite(db, u, b) {
  const metier = String(b.metier == null ? '' : b.metier);
  if (!IDS.includes(metier)) refus(400, 'Ce métier n\'est pas proposé.');
  await exigerPretes(db);
  const deja = async () => (await db.query('select metier, publiee from activites where user_id = $1 and metier = $2', [u.id, metier])).rows[0];
  const d = await deja(); if (d) return Object.assign(vue(d), { existante: true });
  const { rows: n } = await db.query('select count(*)::int as n from activites where user_id = $1', [u.id]);
  if (n[0].n >= MAX_ACTIVITES) refus(429, 'Trop d\'activités pour ce compte.');
  const { rows } = await db.query('insert into activites (user_id, metier) values ($1, $2) on conflict (user_id, metier) do nothing returning metier, publiee', [u.id, metier]);
  return rows[0] ? Object.assign(vue(rows[0]), { existante: false }) : Object.assign(vue(await deja()), { existante: true });   /* deux envois simultanés : l'index unique tranche */
}

/* ses activités, et seulement les siennes */
export async function activites(db, u) {
  if (!(await pretes(db))) return { activites: [] };
  const { rows } = await db.query('select metier, publiee from activites where user_id = $1 order by created_at', [u.id]);
  return { activites: rows.map(vue) };
}

export const ACTIONS_ACTIVITES = { activite, activites };
