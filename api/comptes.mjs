// /api/auth/* : les routes de Better Auth (lien de connexion, clés d'accès, session, déconnexion).
// Vercel n'achemine pas les chemins à plusieurs segments vers une fonction simple : vercel.json réécrit
// /api/auth/<chemin> vers /api/comptes?__chemin=<chemin>, et l'adresse d'origine est reconstruite ici.
import { toNodeHandler } from 'better-auth/node';
import { auth, envoiPret, oublier, schemaManquant } from './_auth/auth.mjs';
let gestion = null;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
export function adresseOrigine(url) {
  const u = new URL(url || '/', 'http://x');
  if (u.pathname.startsWith('/api/auth/')) return u.pathname + u.search;
  const c = u.searchParams.get('__chemin') || ''; u.searchParams.delete('__chemin');
  if (!/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+){0,5}$/.test(c)) return null;
  const q = u.searchParams.toString(); return '/api/auth/' + c + (q ? '?' + q : '');
}
export default async function comptes(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origine = adresseOrigine(req.url); if (!origine) return json(res, 404, { ok: false }); req.url = origine;
  const a = auth();
  if (!a) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  if (/\/sign-in\/magic-link$/.test((req.url || '').split('?')[0]) && !envoiPret()) return json(res, 503, { ok: false, raison: 'L\'envoi des e-mails n\'est pas encore configuré : utilisez une clé d\'accès, ou réessayez plus tard.' });
  gestion = gestion || toNodeHandler(a);
  try { return await gestion(req, res); }
  catch (e) {
    const manque = schemaManquant(e); if (manque) { oublier(); gestion = null; }   /* la base vient peut-être d'être migrée : on réessaiera à neuf */
    if (!res.headersSent) return json(res, 503, { ok: false, raison: manque ? 'Les comptes ne sont pas encore installés sur cette base (migration à exécuter).' : 'Service des comptes indisponible : réessayez.' }); }
}
