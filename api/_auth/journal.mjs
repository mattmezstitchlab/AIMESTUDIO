// AIME · le journal des espaces (règle 11) : qui a fait quoi, sur quel espace, envers qui. En ajout seul (db/migrations/2026-10-24-01-journal.sql).
// Jamais de contenu sensible : des identifiants, un rôle, un nombre de jours ; ni adresse e-mail, ni jeton, ni nom.
// Tant que la migration n'est pas appliquée sur une base, rien n'est écrit et la réponse le dit (journal: false) ; l'action, elle, se fait.
export const ACTIONS_JOURNAL = ['creation', 'invitation', 'acceptation', 'retrait', 'annulation', 'changement_role', 'ouverture', 'fermeture', 'signalement'];
let pret = null;
async function table(db) {
  if (pret !== null) return pret;
  try { const r = await db.query("select to_regclass('public.audit') as t, exists(select 1 from pg_trigger where tgname = 'audit_ajout_seul') as g"); pret = !!(r.rows[0] && r.rows[0].t && r.rows[0].g); }
  catch { pret = false; }
  return pret;
}
export function _oublier() { pret = null; }
/* inscrire : une ligne, jamais modifiée ; cible = la personne concernée (qui pourra la lire) */
export async function inscrire(db, { qui, espace, action, cible = null, detail = {} }) {
  if (!ACTIONS_JOURNAL.includes(action)) throw new Error('action de journal inconnue');
  if (!(await table(db))) return false;
  await db.query('insert into audit (user_id, space_id, action, detail) values ($1, $2, $3, $4::jsonb)', [qui || null, espace || null, action, JSON.stringify(Object.assign({}, detail, cible ? { cible } : {}))]);
  return true;
}
/* lire : le propriétaire de l'espace lit tout son journal ; les autres, les lignes où ils agissent ou sont concernés */
export async function lire(db, { espace, moi, tout }) {
  if (!(await table(db))) return null;
  const { rows } = await db.query(`select at, user_id, action, detail from audit where space_id = $1 ${tout ? '' : "and (user_id = $2 or detail->>'cible' = $2)"} order by at desc, id desc limit 200`, tout ? [espace] : [espace, moi]);
  return rows.map(r => ({ le: new Date(r.at).toISOString(), qui: r.user_id, action: r.action, detail: r.detail || {} }));
}
