const { neon } = require('@neondatabase/serverless');

// Public readiness probe: no user data, schema details or connection errors.
module.exports = async function health(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`select 1`;
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ ok: false });
  }
};
