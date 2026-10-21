// /api/auth/* : les routes de Better Auth (lien de connexion, clés d'accès, session, déconnexion).
import { toNodeHandler } from 'better-auth/node';
import { auth, envoiPret } from '../_auth/auth.mjs';
let gestion = null;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
export default async function comptes(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV === 'production') return json(res, 404, { ok: false });
  const a = auth();
  if (!a) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  if (/\/sign-in\/magic-link$/.test((req.url || '').split('?')[0]) && !envoiPret()) return json(res, 503, { ok: false, raison: 'L\'envoi des e-mails n\'est pas encore configuré : utilisez une clé d\'accès, ou réessayez plus tard.' });
  gestion = gestion || toNodeHandler(a);
  return gestion(req, res);
}
