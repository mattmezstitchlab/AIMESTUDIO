// Tests d'authentification sur une vraie base PostgreSQL (jamais la base Neon).
// Lancement : DATABASE_URL_TEST=postgres://… npm test   (ignoré si la variable est absente)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { betterAuth } from 'better-auth';
import { authOptions, siteURL, rpID, origins } from '../lib/auth.mjs';
import { migrate } from '../scripts/migrate.mjs';
import { restorePath } from '../api/auth.mjs';

const DB = process.env.DATABASE_URL_TEST;
const URL0 = 'https://aime-test.example';
const ENV = { DATABASE_URL: DB, BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdefghij', BETTER_AUTH_URL: URL0 };
let pool, auth, sent = [];

const call = (path, { method = 'GET', body, cookie, origin = URL0 } = {}) => auth.handler(new Request(URL0 + '/api/auth' + path, {
  method,
  headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}) },
  body: body ? JSON.stringify(body) : undefined,
  redirect: 'manual'
}));
const cookieOf = (res) => (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]).filter(Boolean).map((c) => c.split(';')[0]).join('; ');
async function signIn(email) {
  const r = await call('/sign-in/magic-link', { method: 'POST', body: { email, callbackURL: '/bureau/' } });
  assert.equal(r.status, 200);
  const link = sent.pop();
  assert.equal(link.email, email);
  const v = await auth.handler(new Request(link.url, { redirect: 'manual' }));
  return { v, cookie: cookieOf(v), url: link.url };
}

test('configuration : adresses et passkeys par environnement', () => {
  assert.equal(siteURL({ VERCEL_ENV: 'production' }), 'https://www.lemondeaime.com');
  assert.equal(rpID({ VERCEL_ENV: 'production' }), 'lemondeaime.com');
  assert.deepEqual(origins({ VERCEL_ENV: 'production' }).sort(), ['https://lemondeaime.com', 'https://www.lemondeaime.com']);
  const prev = { VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'aimestudio-git-auth.vercel.app' };
  assert.equal(siteURL(prev), 'https://aimestudio-git-auth.vercel.app');
  assert.equal(rpID(prev), 'aimestudio-git-auth.vercel.app', 'preview isolée : pas de passkey partagée avec la production');
});

test('réécriture : le chemin d\'origine est rétabli', () => {
  const req = { url: '/api/auth?__p=sign-in/magic-link&x=1' };
  restorePath(req);
  assert.equal(req.url, '/api/auth/sign-in/magic-link?x=1');
});

if (!DB) {
  test('base de test absente : tests de session ignorés', { skip: 'DATABASE_URL_TEST non défini' }, () => {});
} else {
  before(async () => {
    pool = new pg.Pool({ connectionString: DB });
    await pool.query('drop schema public cascade; create schema public;');
    await migrate(ENV, () => {});
    await migrate(ENV, () => {}); // rejouable sans erreur
    auth = betterAuth(authOptions(ENV, { pool, rateLimit: false, sendMagicLink: async (d) => { sent.push(d); } }));
  });
  after(async () => { await pool.end(); });

  test('migrations : tables Better Auth et AIME présentes', async () => {
    const { rows } = await pool.query("select table_name from information_schema.tables where table_schema='public'");
    const t = rows.map((r) => r.table_name);
    for (const n of ['user', 'session', 'account', 'verification', 'passkey', 'spaces', 'space_members', 'invitations', 'items', 'user_data', 'vault', 'audit']) assert.ok(t.includes(n), 'table ' + n);
  });

  test('accès anonyme : aucune session', async () => {
    const r = await call('/get-session');
    assert.equal(await r.json(), null);
  });

  test('lien par e-mail : connexion, rôle membre, jeton stocké haché', async () => {
    const { v, cookie, url } = await signIn('lea@example.com');
    assert.equal(v.status, 302);
    assert.match(v.headers.get('location'), /\/bureau\/$/);
    const s = await (await call('/get-session', { cookie })).json();
    assert.equal(s.user.email, 'lea@example.com');
    assert.equal(s.user.role, 'member');
    const token = new URL(url).searchParams.get('token');
    const { rows } = await pool.query('select identifier, value from verification');
    assert.ok(!rows.some((r) => r.identifier === token || r.value === token), 'le jeton n\'est pas stocké en clair');
  });

  test('lien réutilisé : refusé, aucune nouvelle session', async () => {
    const { url } = await signIn('tom@example.com');
    const again = await auth.handler(new Request(url, { redirect: 'manual' }));
    assert.ok(!cookieOf(again).includes('session_token=') || /error/i.test(again.headers.get('location') || ''), 'pas de nouvelle session');
    assert.match(again.headers.get('location') || '', /error/i);
  });

  test('origine étrangère : refusée', async () => {
    const r = await call('/sign-in/magic-link', { method: 'POST', body: { email: 'x@example.com' }, origin: 'https://evil.example' });
    assert.equal(r.status, 403);
    assert.equal(sent.length, 0);
  });

  test('le rôle ne s\'attribue pas depuis le navigateur', async () => {
    const { cookie } = await signIn('mallory@example.com');
    await call('/update-user', { method: 'POST', body: { role: 'creator', name: 'M' }, cookie });
    const s = await (await call('/get-session', { cookie })).json();
    assert.equal(s.user.role, 'member');
  });

  test('deux comptes isolés', async () => {
    const a = await signIn('a@example.com');
    const b = await signIn('b@example.com');
    assert.equal((await (await call('/get-session', { cookie: a.cookie })).json()).user.email, 'a@example.com');
    assert.equal((await (await call('/get-session', { cookie: b.cookie })).json()).user.email, 'b@example.com');
  });

  test('déconnexion : la session est révoquée côté serveur', async () => {
    const { cookie } = await signIn('sam@example.com');
    const out = await call('/sign-out', { method: 'POST', cookie, body: {} });
    assert.equal(out.status, 200);
    assert.equal(await (await call('/get-session', { cookie })).json(), null);
  });

  test('session expirée : refusée', async () => {
    const { cookie } = await signIn('old@example.com');
    await pool.query("update session set \"expiresAt\" = now() - interval '1 minute' where \"userId\" = (select id from \"user\" where email='old@example.com')");
    assert.equal(await (await call('/get-session', { cookie })).json(), null);
  });

  test('passkey : enregistrement réservé aux personnes connectées', async () => {
    const r = await call('/passkey/generate-register-options');
    assert.equal(r.status, 401);
    const { cookie } = await signIn('pk@example.com');
    const ok = await call('/passkey/generate-register-options', { cookie });
    assert.equal(ok.status, 200);
    const o = await ok.json();
    assert.equal(o.rp.id, 'aime-test.example');
    assert.equal(o.rp.name, 'AIME');
  });
}
