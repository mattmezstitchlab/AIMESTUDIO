const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const env = {
  DATABASE_URL: 'postgresql://localhost/test', BETTER_AUTH_URL: 'https://example.test',
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), RESEND_API_KEY: 'test-only', AUTH_EMAIL_FROM: 'AIME <test@example.test>'
};
test('auth configuration fails closed and requires a single secure origin', async () => {
  const { configuration } = await import('../lib/auth.mjs');
  assert.throws(() => configuration({}));
  for (const url of ['http://example.test', 'https://example.test/path', 'https://example.test/?redirect=1', 'https://user@example.test']) {
    assert.throws(() => configuration({ ...env, BETTER_AUTH_URL: url }));
  }
  assert.equal(configuration(env).origin, 'https://example.test');
});
test('magic links are single-use; sessions are isolated and revoked on sign-out', async () => {
  const { options } = await import('../lib/auth.mjs');
  const { betterAuth } = await import('better-auth');
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  const config = options(env);
  await config.database.end();
  const db = { aime_auth_user: [], aime_auth_account: [], aime_auth_session: [], aime_auth_verification: [] };
  const auth = betterAuth({ ...config, database: memoryAdapter(db), rateLimit: { enabled: false } });
  const previousFetch = global.fetch;
  const links = [];
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    links.push(JSON.parse(init.body).text.match(/https:\/\/[^\s]+/)[0]);
    return new Response('{}', { status: 200 });
  };
  const call = (path, body, cookie) => auth.handler(new Request('https://example.test/api/auth/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { origin: 'https://example.test', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  }));
  try {
    assert.equal(await (await call('get-session')).json(), null);
    const cookies = [];
    for (const email of ['one@example.test', 'two@example.test']) {
      assert.equal((await call('sign-in/magic-link', { email, callbackURL: '/compte/' })).status, 200);
      const link = links.at(-1);
      const verified = await auth.handler(new Request(link));
      assert.equal(verified.status, 302);
      const cookie = verified.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      assert.match(verified.headers.get('set-cookie'), /HttpOnly/i);
      assert.match(verified.headers.get('set-cookie'), /Secure/i);
      cookies.push(cookie);
      const session = await (await call('get-session', null, cookie)).json();
      assert.equal(session.user.email, email);
      const replay = await auth.handler(new Request(link));
      assert.equal(replay.headers.getSetCookie().length, 0);
    }
    assert.notEqual((await (await call('get-session', null, cookies[0])).json()).user.id,
      (await (await call('get-session', null, cookies[1])).json()).user.id);
    await call('sign-out', {}, cookies[0]);
    assert.equal(await (await call('get-session', null, cookies[0])).json(), null);
    assert.ok((await (await call('get-session', null, cookies[1])).json()).user);
    // Expired server-side sessions must not authenticate even with a valid cookie.
    db.aime_auth_session.forEach(row => { row.expiresAt = new Date(Date.now() - 60000); });
    assert.equal(await (await call('get-session', null, cookies[1])).json(), null);
    await call('sign-in/magic-link', { email: 'expired@example.test', callbackURL: '/compte/' });
    db.aime_auth_verification.forEach(row => { row.expiresAt = new Date(Date.now() - 60000); });
    const expired = await auth.handler(new Request(links.at(-1)));
    assert.equal(expired.headers.getSetCookie().length, 0);
    const rejected = await auth.handler(new Request('https://example.test/api/auth/sign-out', {
      method: 'POST', headers: { origin: 'https://evil.test', cookie: cookies[1], 'content-type': 'application/json' }, body: '{}'
    }));
    assert.equal(rejected.status, 403);
  } finally { global.fetch = previousFetch; }
});
test('Vercel handler rejects unsupported methods and missing/foreign origins', async () => {
  const handler = require('../api/auth/[...path].js');
  function response() {
    return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  }
  const res = response();
  await handler({ method: 'DELETE' }, res);
  assert.equal(res.code, 405);
  const saved = { ...process.env };
  try {
    Object.assign(process.env, env);
    for (const origin of [undefined, 'https://evil.test']) {
      const denied = response();
      await handler({ method: 'POST', headers: { origin }, url: '/api/auth/sign-out', body: {} }, denied);
      assert.equal(denied.code, 403);
      assert.equal(denied.headers['Cache-Control'], 'no-store');
    }
    delete process.env.BETTER_AUTH_SECRET;
    const unavailable = response();
    await handler({ method: 'GET', headers: {}, url: '/api/auth/get-session' }, unavailable);
    assert.equal(unavailable.code, 503);
    assert.deepEqual(unavailable.body, { error: 'Authentication temporarily unavailable' });
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
