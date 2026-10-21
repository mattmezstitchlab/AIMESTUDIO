// /travaux/ et /travaux/<projet>/ : les pages du portfolio, rendues côté serveur depuis regie/site.json (la version PUBLIÉE).
// Titre, description et aperçu de partage propres à chaque projet ; l'appareil est monté ensuite par regie/scene.js.
// Les brouillons n'existent pas ici : seul ce qui est publié est servi. Tout le texte est échappé.
const R = require('../regie/donnees.js');
const SITE = require('../regie/site.json');
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);

let cache = null;
function donnees() { if (cache) return cache; const c = R.config(SITE); cache = { cfg: c, liste: c.realisations.filter(r => r.publie) }; return cache; }
function origine(req) { const h = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').split(',')[0].trim(); return /^[A-Za-z0-9.-]+(:\d+)?$/.test(h) ? (/^localhost|^127\./.test(h) ? 'http://' : 'https://') + h : ''; }
function image(r, cfg) { if (r.couverture) return R.resoudre(r.couverture, cfg); return r.contenu.type === 'image' ? R.resoudre(r.contenu.src, cfg) : null; }
function meta(r) { return [r.client, r.annee, R.CATEGORIES[r.categorie]].filter(Boolean).join(' · '); }

function page({ titre, description, url, img, corps, scripts }) {
  return '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<title>' + esc(titre) + '</title>\n<meta name="description" content="' + esc(description) + '">\n<link rel="canonical" href="' + esc(url) + '">\n' +
    '<meta property="og:type" content="website">\n<meta property="og:title" content="' + esc(titre) + '">\n<meta property="og:description" content="' + esc(description) + '">\n<meta property="og:url" content="' + esc(url) + '">\n' +
    (img ? '<meta property="og:image" content="' + esc(img) + '">\n<meta name="twitter:card" content="summary_large_image">\n' : '') +
    '<meta name="theme-color" content="#0A0A0C">\n<link rel="icon" href="data:,">\n<link rel="preload" href="/fonts/InterVariable-latin.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/fonts/CalSans-latin.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="/travaux/travaux.css">\n</head>\n<body>\n' +
    '<a class="evite" href="#contenu">Aller au contenu</a>\n<header class="tete"><a class="mk" href="/" aria-label="AIME, Page Zéro">AIME<sup>®</sup></a><nav aria-label="Portfolio"><a href="/travaux/">Toutes les réalisations</a><a class="b" href="/#contact">Parler d\'un projet</a></nav></header>\n' +
    '<main id="contenu" tabindex="-1">' + corps + '</main>\n<footer class="pied"><a href="/">← Page Zéro</a><span>AIME®</span></footer>\n' + (scripts || '') + '</body>\n</html>\n';
}
function carte(r, cfg) { const im = image(r, cfg);
  return '<li><a class="carte" href="/travaux/' + esc(r.slug) + '/"><span class="vig p-' + esc(r.presentation) + '">' + (im ? '<img src="' + esc(im) + '" alt="" loading="lazy" decoding="async">' : '<b>' + esc(R.CATEGORIES[r.categorie]) + '</b>') + '</span><span class="t">' + esc(r.titre) + '</span><span class="m">' + esc(meta(r)) + '</span></a></li>'; }

function index(req) { const { cfg, liste } = donnees(), o = origine(req);
  const cats = Object.keys(R.CATEGORIES).filter(k => liste.some(r => r.categorie === k));
  const corps = '<section class="intro"><p class="k">Portfolio</p><h1>Réalisations</h1><p>' + liste.length + ' projet' + (liste.length > 1 ? 's' : '') + ', des sites, des outils, des univers.</p></section>' +
    cats.map(k => '<section class="cat" aria-labelledby="c-' + k + '"><h2 id="c-' + k + '">' + esc(R.CATEGORIES[k]) + '</h2><ul class="grille">' + liste.filter(r => r.categorie === k).map(r => carte(r, cfg)).join('') + '</ul></section>').join('') +
    (liste.length ? '' : '<p class="vide">Aucune réalisation publiée pour l\'instant.</p>');
  const prem = liste.map(r => image(r, cfg)).filter(Boolean)[0];
  return page({ titre: 'Réalisations · AIME', description: 'Les réalisations d\'AIME : sites, applications, identités et événements.', url: o + '/travaux/', img: prem ? o + prem : null, corps });
}

function projet(req, r) { const { cfg, liste } = donnees(), o = origine(req), im = image(r, cfg), i = liste.indexOf(r);
  const prec = liste[(i - 1 + liste.length) % liste.length], suiv = liste[(i + 1) % liste.length], autres = liste.filter(x => x !== r && x.categorie === r.categorie).slice(0, 3);
  const corps = '<article class="projet"><header class="p-tete"><p class="k">' + esc(meta(r)) + '</p><h1>' + esc(r.titre) + '</h1>' + (r.resume ? '<p class="resume">' + esc(r.resume) + '</p>' : '') +
    '<p class="actions">' + (r.lien ? '<a class="b b-p" href="' + esc(r.lien) + '"' + (/^https:/.test(r.lien) ? ' target="_blank" rel="noopener"' : '') + '>Voir le projet en ligne <span aria-hidden="true">→</span></a>' : '') + '<a class="b" href="/#contact">Un projet comme celui-ci ?</a></p></header>' +
    '<div class="scene p-' + esc(r.presentation) + (r.paysage ? ' paysage' : '') + '" id="oeuvre" data-id="' + esc(r.id) + '" role="img" aria-label="' + esc(r.alt || r.titre) + '">' + (im ? '<noscript><img src="' + esc(im) + '" alt=""></noscript>' : '') + '</div></article>' +
    (liste.length > 1 ? '<nav class="suite" aria-label="Autres réalisations"><a href="/travaux/' + esc(prec.slug) + '/"><span>← Précédente</span><b>' + esc(prec.titre) + '</b></a><a href="/travaux/' + esc(suiv.slug) + '/"><span>Suivante →</span><b>' + esc(suiv.titre) + '</b></a></nav>' : '') +
    (autres.length ? '<section class="cat"><h2>Dans la même catégorie</h2><ul class="grille">' + autres.map(x => carte(x, cfg)).join('') + '</ul></section>' : '');
  const scripts = '<script src="/regie/donnees.js"></script>\n<script src="/nav/registre.js"></script>\n<script src="/regie/scene.js"></script>\n<script src="/travaux/travaux.js"></script>\n';
  return page({ titre: r.titre + ' · Réalisation · AIME', description: r.resume || ('Une réalisation AIME : ' + r.titre + '.'), url: o + '/travaux/' + r.slug + '/', img: im ? o + im : null, corps, scripts });
}

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; return res.end(); }
  const u = new URL(req.url || '/', 'http://x'), p = String(u.searchParams.get('p') || '').replace(/\/+$/, '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  if (!p) { res.statusCode = 200; return res.end(index(req)); }
  const r = /^[a-z0-9][a-z0-9-]{1,59}$/.test(p) ? donnees().liste.filter(x => x.slug === p)[0] : null;
  if (!r) { res.statusCode = 404; return res.end(page({ titre: 'Réalisation introuvable · AIME', description: 'Cette réalisation n\'existe pas ou n\'est plus publiée.', url: origine(req) + '/travaux/', corps: '<section class="intro"><h1>Réalisation introuvable</h1><p>Elle n\'existe pas, ou n\'est plus publiée. <a href="/travaux/">Voir toutes les réalisations</a>.</p></section>' })); }
  res.statusCode = 200; return res.end(projet(req, r));
}
module.exports = handler;
module.exports._reinitialiser = () => { cache = null; };
