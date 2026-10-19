const { test } = require('node:test');
const assert = require('node:assert/strict');
const { neonConfig } = require('@neondatabase/serverless');
const health = require('../api/health.js');

function response() {
  return {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('readiness probe fails closed and does not expose database details', async () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalFetch = neonConfig.fetchFunction;
  try {
    delete process.env.DATABASE_URL;
    let res = response();
    await health({ method: 'GET' }, res);
    assert.equal(res.code, 503);
    assert.deepEqual(res.body, { ok: false });
    assert.equal(res.headers['Cache-Control'], 'no-store');

    res = response();
    await health({ method: 'POST' }, res);
    assert.equal(res.code, 405);
    assert.equal(res.headers.Allow, 'GET');

    process.env.DATABASE_URL = 'postgresql://test:test@unit-test.neon.tech/test';
    neonConfig.fetchFunction = async (_url, options) => {
      assert.equal(JSON.parse(options.body).query, 'select 1');
      return new Response(JSON.stringify({ fields: [{ name: '?column?', dataTypeID: 23 }], rows: [['1']], rowCount: 1, command: 'SELECT' }));
    };
    res = response();
    await health({ method: 'GET' }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, { ok: true });

    neonConfig.fetchFunction = async () => { throw new Error('private database detail'); };
    res = response();
    await health({ method: 'GET' }, res);
    assert.equal(res.code, 503);
    assert.deepEqual(res.body, { ok: false });
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    neonConfig.fetchFunction = originalFetch;
  }
});
