// /api/auth/* : toutes les routes Better Auth (le chemin arrive par la réécriture de vercel.json).
import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../lib/auth.mjs';

let handle;
export function restorePath(req) {
  const u = new URL(req.url, 'http://local');
  const p = u.searchParams.get('__p');
  if (p === null) return;
  u.searchParams.delete('__p');
  const q = u.searchParams.toString();
  req.url = '/api/auth/' + p.replace(/^\/+/, '') + (q ? '?' + q : '');
}

export default async function auth(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  restorePath(req);
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end('{"ok":false}');
  }
  handle = handle || toNodeHandler(getAuth());
  return handle(req, res);
}
