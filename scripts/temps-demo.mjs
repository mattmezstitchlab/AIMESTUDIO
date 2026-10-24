// Le projet de démonstration du module Temps : « Mariage Camille & Gabriel » (modules/temps/demo-camille-gabriel.json).
// Six comptes FICTIFS sur le domaine réservé demo.aime.test (aucun courrier ne peut y arriver), le projet, leurs rôles et le
// programme, marqué « demo » : un vrai compte ne l'ouvre pas, ces comptes n'ouvrent aucun vrai projet (api/_temps/moteur.mjs).
// Refuse la production. À lancer contre une base de test ou une branche de preview :
//   DATABASE_URL=postgresql://… node scripts/temps-demo.mjs
// Les comptes déjà créés (par exemple par une connexion) sont repris ; les autres sont créés, sans mot de passe ni clé d'accès.
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') { console.error('Refusé : jamais en production.'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL manquant (une base de test).'); process.exit(1); }
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const DEMO = require('../modules/temps/demo-camille-gabriel.json');
const A = await import('../api/_auth/auth.mjs'), M = await import('../api/_temps/moteur.mjs');
A.auth(); const pool = A._pool();
try {
  const comptes = {};
  for (const p of DEMO.personnes) {
    if (!p.email.endsWith('@' + M.DOMAINE_DEMO)) throw new Error('adresse hors du domaine de démonstration : ' + p.email);
    let { rows } = await pool.query('select id, email from "user" where email = $1', [p.email]);
    if (!rows[0]) rows = (await pool.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true) returning id, email', [crypto.randomBytes(16).toString('hex'), p.nom, p.email])).rows;
    comptes[p.cle] = rows[0];
  }
  const { espace } = await M.semerDemo(pool, DEMO, comptes);
  console.log(JSON.stringify({ espace, comptes: Object.fromEntries(Object.entries(comptes).map(([k, u]) => [k, u.email])) }));
} finally { await pool.end(); }
