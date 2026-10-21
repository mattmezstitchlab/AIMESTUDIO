// Vercel Node functions parse req.body; adapt it to the standard Web handler.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { configuration, getAuth } = await import('../../lib/auth.mjs');
    const { origin } = configuration();
    // Require an explicit same-origin header for every mutating request.
    if (req.method === 'POST' && req.headers.origin !== origin) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
    const path = new URL(req.url, origin);
    if (!path.pathname.startsWith('/api/auth/')) return res.status(404).json({ error: 'Not found' });
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value && !['host', 'content-length'].includes(key)) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    const body = req.method === 'POST' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})) : undefined;
    const response = await getAuth().handler(new Request(origin + path.pathname + path.search, { method: req.method, headers, body }));
    for (const [key, value] of response.headers) {
      if (!['set-cookie', 'cache-control'].includes(key)) res.setHeader(key, value);
    }
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  } catch {
    // Never send connection strings, tokens or provider error messages to clients.
    return res.status(503).json({ error: 'Authentication temporarily unavailable' });
  }
};
