// Serveur local pour les tests navigateur (CI et poste) : fichiers statiques, pages /travaux/ et routes /api/sv/*,
// comme sur Vercel. Aucune base, aucun secret : les routes de compte répondent 404, les pages se replient comme prévu.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '..')), PORT = +(process.env.PORT || 8771), HOST = process.env.HOST || '0.0.0.0';
const VERCEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const REDIRECTS = (VERCEL.redirects || []).map(r => ({ re: new RegExp('^' + r.source.replace(/:[a-z]+\*/gi, '\0').replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\0/g, '.*') + '$'), dst: r.destination, code: r.permanent ? 308 : 307 }));
const REWRITES = new Map((VERCEL.rewrites || []).filter(r => !r.source.includes(':') && !r.destination.startsWith('/api/')).map(r => [r.source, r.destination]));
/* les en-têtes de tout le site (vercel.json, source « /(.*) ») : CSP, Referrer-Policy, nosniff, Permissions-Policy, comme sur Vercel */
const GLOBAUX = (VERCEL.headers || []).filter(h => h.source === '/(.*)').flatMap(h => h.headers);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.xml': 'application/xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8' };
/* les écrans gardés (middleware.js sur Vercel) : la même fonction garder(), mais le « propriétaire » est ici un cookie de test,
   aime_test_proprietaire=oui, que seuls les tests navigateur posent. Ce serveur ne part jamais en production (.vercelignore : /scripts). */
const ECRANS = Promise.resolve(require(path.join(ROOT, 'api/_auth/ecrans.cjs')));
const COMPTES = process.env.AIME_COMPTES_TEST === '1' && process.env.TEST_DATABASE_URL ? (async () => {
  Object.assign(process.env, { DATABASE_URL: process.env.TEST_DATABASE_URL, BETTER_AUTH_URL: 'http://localhost:' + PORT, BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || require('crypto').randomBytes(32).toString('hex') });
  delete process.env.VERCEL_ENV;
  const A = await import(path.join(ROOT, 'api/_auth/auth.mjs'));
  A._envoyeur(m => fs.appendFileSync(process.env.AIME_LIENS || path.join(require('os').tmpdir(), 'aime-liens.txt'), JSON.stringify({ to: m.to, lien: (String(m.text).match(/https?:\/\/\S+/) || [''])[0] }) + '\n'));
})() : null;
const proprietaireDeTest = r => /(?:^|;\s*)aime_test_proprietaire=oui(?:;|$)/.test(r.headers.get('cookie') || '');
http.createServer((req, res) => {
  for (const h of GLOBAUX) {
    // Only the explicitly requested sandbox preview may be framed by Arena.
    // Production headers and normal CI responses stay identical to vercel.json.
    const previewCsp = process.env.AIME_PREVIEW_ENTRY === '/studio/verticalites/' && h.key.toLowerCase() === 'content-security-policy';
    res.setHeader(h.key, previewCsp ? h.value + ' https://arena.ai https://*.arena.ai https://lmarena.ai https://*.lmarena.ai https://*.e2b.app' : h.value);
  }
  // Local visual preview must not retain earlier HTML, styles or module versions.
  res.setHeader('Cache-Control', 'no-store');
  const brut = '/' + String(req.url || '/').split(/[?#]/)[0].replace(/^\/+/, m => m.slice(1));   /* le chemin brut : « //regie/ » reste un chemin, pas un hôte */
  ECRANS.then(E => E.garder(new Request('http://localhost' + brut, { headers: { cookie: req.headers.cookie || '' } }), proprietaireDeTest)).then(async r => {
    if (!r) return servir(req, res);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text());
  }, () => { res.writeHead(500); res.end(); });
}).listen(PORT, HOST, () => console.log('serveur de test sur ' + HOST + ':' + PORT));
function servir(req, res) {
  const u = new URL(req.url, 'http://x');
  // Optional development-only entry; historical/production root routes are unchanged.
  if (u.pathname === '/' && !u.search && process.env.AIME_PREVIEW_ENTRY === '/studio/verticalites/') { res.writeHead(302, { Location: process.env.AIME_PREVIEW_ENTRY }); return res.end(); }
  let p; try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end(); }
  const red = REDIRECTS.find(r => r.re.test(p));
  if (red) { res.writeHead(red.code, { Location: red.dst }); return res.end(); }
  const pCle = p.length > 1 ? p.replace(/\/+$/, '') : p;
  if (REWRITES.has(p)) p = REWRITES.get(p);
  else if (REWRITES.has(pCle)) p = REWRITES.get(pCle);
  const m = /^\/travaux\/?([^/]*)\/?$/.exec(p), f0 = path.join(ROOT, p);
  if (m && !(fs.existsSync(f0) && fs.statSync(f0).isFile())) { const h = require(path.join(ROOT, 'api/travaux.js')); req.url = '/api/travaux' + (m[1] ? '?p=' + m[1] : ''); return h(req, res); }
  /* le formulaire Contact : comme sur Vercel, un corps JSON lu d'avance et res.status().json() ; avec AIME_COMPTES_TEST, la demande
     est enregistrée dans la base de TEST (jamais la production) ; sans clé Resend, l'e-mail est noté « non configuré » */
  if (p === '/api/contact') { let b = ''; req.on('data', c => (b += c)); req.on('end', () => { const h = require(path.join(ROOT, 'api/contact.js'));
    const r = { statusCode: 200, setHeader: (k, v) => res.setHeader(k, v), status(c) { this.statusCode = c; return this; }, json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); } };
    Promise.resolve(COMPTES).then(() => h({ method: req.method, body: b, headers: req.headers, socket: req.socket }, r)).catch(() => { res.writeHead(500); res.end(); }); }); return; }
  if (p.startsWith('/api/sv/')) {
    let b = ''; req.on('data', c => (b += c)); req.on('end', () => {
      let h; try { h = require(path.join(ROOT, 'api/sv', path.basename(p) + '.js')); } catch { res.writeHead(404); return res.end(); }
      const r = { statusCode: 200, setHeader: (k, v) => res.setHeader(k, v), status(c) { this.statusCode = c; return this; }, json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); } };
      let body = {}; try { body = JSON.parse(b || '{}'); } catch {} Promise.resolve(h({ method: req.method, body, headers: req.headers }, r)).catch(() => { res.writeHead(500); res.end(); });
    }); return;
  }
  /* Speed Insights : Vercel sert ce script ; ici, un script vide, en JavaScript (avec nosniff, un 404 sans type est refusé en console) */
  if (p === '/_vercel/speed-insights/script.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(''); }
  /* les routes de compte et de projet, SEULEMENT pour les parcours à plusieurs comptes contre une base de test (AIME_COMPTES_TEST=1 et
     TEST_DATABASE_URL) : jamais la base de production ; les liens de connexion sont écrits dans AIME_LIENS au lieu d'être envoyés */
  if (COMPTES && (p.startsWith('/api/auth/') || ['/api/temps', '/api/page', '/api/espaces', '/api/identite', '/api/demandes', '/api/carte', '/api/carte-publique', '/api/engagements'].includes(p))) {
    const nom = p.startsWith('/api/auth/') ? 'comptes' : p.slice(5);
    return COMPTES.then(() => import(path.join(ROOT, 'api', nom + '.mjs'))).then(m => m.default(req, res)).catch(() => { res.writeHead(500); res.end(); });
  }
  if (p.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{}'); }
  let f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}
