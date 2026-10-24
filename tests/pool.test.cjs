/* La connexion à la base (api/_auth/auth.mjs, _pool) : l'adresse passée à pg.Pool ne porte plus « sslmode » (pg l'avertit à chaque
   démarrage, et Vercel compte l'avertissement comme une erreur), et la sécurité reste réglée explicitement : hors local,
   ssl.rejectUnauthorized vaut true (l'équivalent de verify-full). La variable d'environnement n'est pas modifiée.
   Aucune connexion n'est ouverte : pg.Pool ne se connecte qu'à la première requête. */
const test = require('node:test'), assert = require('node:assert/strict');
const SECRET = 'x'.repeat(40);

test('production (Neon) : sans sslmode dans l\'adresse du pool, ssl.rejectUnauthorized = true, la variable intacte', async () => {
  const A = await import('../api/_auth/auth.mjs');
  const env = { DATABASE_URL: 'postgresql://aime:mot%2Fde%3Apasse@ep-exemple-123.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: 'https://www.lemondeaime.com' };
  const avant = env.DATABASE_URL;
  assert.ok(A.auth(env), 'les comptes démarrent');
  const o = A._pool().options;
  assert.ok(!/sslmode/i.test(o.connectionString), 'plus de sslmode : ' + o.connectionString);
  assert.match(o.connectionString, /channel_binding=require/, 'les autres paramètres restent');
  assert.match(o.connectionString, /^postgresql:\/\/aime:mot%2Fde%3Apasse@ep-exemple-123\.eu-central-1\.aws\.neon\.tech\/neondb\?/, 'identifiants, hôte et base inchangés');
  assert.deepEqual(o.ssl, { rejectUnauthorized: true }, 'TLS vérifié (verify-full)');
  assert.equal(env.DATABASE_URL, avant, 'la variable d\'environnement n\'est pas touchée');
  await A._pool().end();
});

test('local (base de test) : sslmode=disable retiré lui aussi, ssl reste désactivé', () => {
  const { execFileSync } = require('child_process'), path = require('path');
  const code = "const A=await import(" + JSON.stringify('file://' + path.join(__dirname, '..', 'api', '_auth', 'auth.mjs')) + ");A.auth({DATABASE_URL:'postgresql://postgres:test@localhost:5432/aime_test?sslmode=disable',BETTER_AUTH_SECRET:'" + SECRET + "',BETTER_AUTH_URL:'http://localhost:8771'});const o=A._pool().options;console.log(JSON.stringify({c:o.connectionString,s:o.ssl}));await A._pool().end();";
  const r = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
  assert.equal(r.c, 'postgresql://postgres:test@localhost:5432/aime_test'); assert.equal(r.s, false);
});
