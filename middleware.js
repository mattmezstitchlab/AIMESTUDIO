/* AIME · Routing Middleware Vercel : il passe avant les fichiers statiques. Il garde les deux écrans réservés au propriétaire
   du site, /regie/ et /maitre/ : 404 pour toute autre personne, comme /api/maitre. La logique est dans api/_auth/ecrans.cjs
   (en CommonJS, pour tout runtime Node) : le chemin y est normalisé (décodé, minuscules, « // », « . » et « .. ») avant
   d'être comparé. Le matcher compare, lui, le chemin BRUT : /%72egie/ n'aurait jamais atteint un matcher « /regie/ »
   (revue de Matt sur #123). Il prend donc toute requête, sauf /api/ et /_vercel/, et sauf les fichiers dont le chemin
   brut, sans aucun « % », finit par une extension de ressource (scripts, styles, images, polices, médias) : ceux-là ne
   peuvent pas désigner une page HTML. Il doit rester une valeur littérale (Vercel le lit sans exécuter le fichier). */
import ecrans from './api/_auth/ecrans.cjs';

export const config = {
  matcher: ['/((?!api/|_vercel/|[^%]*\\.(?:js|mjs|cjs|css|json|map|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp4|webm|mp3|vtt|txt|xml|pdf)$).*)'],
  runtime: 'nodejs',
};

export default function middleware(request) {
  return ecrans.garder(request);
}
