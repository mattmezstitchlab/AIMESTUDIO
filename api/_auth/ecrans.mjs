// Les écrans Régie (/regie/) et Cube Maître (/maitre/) : servis au seul propriétaire du site, 404 pour tout autre,
// comme /api/maitre (audit Vercel, PR 1, point 3). Le droit reste décidé côté serveur (AIME_PROPRIETAIRES), par
// /api/identite : ce module ne lit aucune base et ne connaît aucun identifiant ; il ne fait que demander « oui / non »
// pour le cookie de la requête. Toute erreur, toute absence de session, toute réponse inattendue = 404 (fermé par défaut).
// Seules les pages HTML sont gardées : les scripts et styles de regie/ et maitre/ restent publics (l'accueil, Sites, Live,
// le monde et le Canevas les chargent). Utilisé par middleware.js (Routing Middleware Vercel, avant les fichiers statiques).
export const ECRANS = ['/regie', '/regie/', '/regie/index', '/regie/index.html', '/maitre', '/maitre/', '/maitre/index', '/maitre/index.html'];

const PAGE_404 = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<meta name="robots" content="noindex"><title>Page introuvable · AIME</title>'
  + '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0C;color:#EDEDF0;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:24px}a{color:#EDEDF0}</style>'
  + '</head><body><main><h1>Page introuvable</h1><p><a href="/">Revenir à la Page Zéro</a></p></main></body></html>';

export function introuvable() {
  return new Response(PAGE_404, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

/* le propriétaire ? On pose la question à /api/identite avec le seul cookie de la requête ; rien d'autre n'est transmis. */
export async function estProprietaire(request, f = fetch) {
  const cookie = request.headers.get('cookie');
  if (!cookie) return false;
  try {
    const r = await f(new URL('/api/identite', request.url), { headers: { cookie, accept: 'application/json' }, cache: 'no-store', redirect: 'manual' });
    if (!r || r.status !== 200) return false;
    const j = await r.json();
    return !!j && j.connecte === true && j.proprietaire === true;
  } catch { return false; }
}

/* undefined : la requête continue (le fichier statique est servi) ; sinon, la réponse 404 */
export async function garder(request, verifier = estProprietaire) {
  let p; try { p = new URL(request.url).pathname; } catch { return introuvable(); }
  if (!ECRANS.includes(p)) return undefined;
  let ok = false; try { ok = (await verifier(request)) === true; } catch { ok = false; }
  return ok ? undefined : introuvable();
}
