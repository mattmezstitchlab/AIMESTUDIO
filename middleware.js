/* AIME · Routing Middleware Vercel : il passe avant les fichiers statiques. Il garde les deux écrans réservés au propriétaire
   du site, /regie/ et /maitre/ : 404 pour toute autre personne, comme /api/maitre. La logique et sa liste (ECRANS) sont dans
   api/_auth/ecrans.mjs ; le matcher ci-dessous doit rester une valeur littérale (Vercel le lit sans exécuter le fichier) et
   identique à ECRANS (tests/ecrans-gardes.test.cjs). Les scripts et styles de regie/ et maitre/ ne passent pas ici. */
import { garder } from './api/_auth/ecrans.mjs';

export const config = {
  matcher: ['/regie', '/regie/', '/regie/index', '/regie/index.html', '/maitre', '/maitre/', '/maitre/index', '/maitre/index.html'],
  runtime: 'nodejs',
};

export default function middleware(request) {
  return garder(request);
}
