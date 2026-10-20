// Migrations, lancées à chaque déploiement Vercel (commande de build) :
// 1. tables de Better Auth (comptes, sessions, passkeys, vérifications, limites) ;
// 2. schéma AIME (db/schema.sql), écrit pour être rejoué sans effet.
import { readFile } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import pg from 'pg';
import { authOptions } from '../lib/auth.mjs';

export async function migrate(env = process.env, log = console.log) {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 2 });
  try {
    const options = authOptions({ ...env, BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET || 'migration-only' }, { pool, sendMagicLink: () => {} });
    const m = await getMigrations(options);
    log('[migrate] Better Auth : ' + m.toBeCreated.length + ' table(s) à créer, ' + m.toBeAdded.length + ' table(s) à compléter');
    await m.runMigrations();
    const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    await pool.query(sql);
    log('[migrate] schéma AIME à jour');
  } finally {
    await pool.end();
  }
}

if (import.meta.url === 'file://' + process.argv[1]) {
  if (!process.env.DATABASE_URL) {
    console.log('[migrate] pas de DATABASE_URL : rien à faire');
  } else {
    await migrate();
  }
}
