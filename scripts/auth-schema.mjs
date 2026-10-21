// Explicit operator action only: never run this from a request or build.
import { getMigrations } from 'better-auth/db/migration';
import { options } from '../lib/auth.mjs';
const config = options();
try {
  const migration = await getMigrations(config);
  if (process.argv.includes('--apply')) {
    await migration.runMigrations();
    console.log('Auth schema migration completed.');
  } else {
    console.log(await migration.compileMigrations());
  }
} finally {
  await config.database.end();
}
