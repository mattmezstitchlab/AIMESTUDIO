// Serveur local pour les tests navigateur (CI et poste) : fichiers statiques, pages /travaux/ et routes /api/sv/*,
// comme sur Vercel. Aucune base, aucun secret : les routes de compte répondent 404, les pages se replient comme prévu.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '..')), PORT = +(process.env.PORT || 8771), HOST = process.env.HOST || '0.0.0.0';
const VERCEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const REWRITES = new Map((VERCEL.rewrites || []).filter(r => !r.source.includes(':') && !r.destination.startsWith('/api/')).map(r => [r.source, r.destination]));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.xml': 'application/xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8' };
/* les écrans gardés (middleware.js sur Vercel) : la même fonction garder(), mais le « propriétaire » est ici un cookie de test,
   aime_test_proprietaire=oui, que seuls les tests navigateur posent. Ce serveur ne part jamais en production (.vercelignore : /scripts). */
const ECRANS = import(require('url').pathToFileURL(path.join(ROOT, 'api/_auth/ecrans.mjs')).href);
const proprietaireDeTest = r => /(?:^|;\s*)aime_test_proprietaire=oui(?:;|$)/.test(r.headers.get('cookie') || '');
http.createServer((req, res) => {
  const u0 = new URL(req.url, 'http://x');
  ECRANS.then(E => E.garder(new Request('http://localhost' + u0.pathname, { headers: { cookie: req.headers.cookie || '' } }), proprietaireDeTest)).then(async r => {
    if (!r) return servir(req, res);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text());
  }, () => { res.writeHead(500); res.end(); });
}).listen(PORT, HOST, () => console.log('serveur de test sur ' + HOST + ':' + PORT));
function servir(req, res) {
  const u = new URL(req.url, 'http://x'); let p; try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end(); }
  const pCle = p.length > 1 ? p.replace(/\/+$/, '') : p;
  if (REWRITES.has(p)) p = REWRITES.get(p);
  else if (REWRITES.has(pCle)) p = REWRITES.get(pCle);
  const m = /^\/travaux\/?([^/]*)\/?$/.exec(p), f0 = path.join(ROOT, p);
  if (m && !(fs.existsSync(f0) && fs.statSync(f0).isFile())) { const h = require(path.join(ROOT, 'api/travaux.js')); req.url = '/api/travaux' + (m[1] ? '?p=' + m[1] : ''); return h(req, res); }
  if (p === '/api/contact') { const h = require(path.join(ROOT, 'api/contact.js')); return h(req, res); }
  if (p.startsWith('/api/sv/')) {
    let b = ''; req.on('data', c => (b += c)); req.on('end', () => {
      let h; try { h = require(path.join(ROOT, 'api/sv', path.basename(p) + '.js')); } catch { res.writeHead(404); return res.end(); }
      const r = { statusCode: 200, setHeader: (k, v) => res.setHeader(k, v), status(c) { this.statusCode = c; return this; }, json(o) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); } };
      let body = {}; try { body = JSON.parse(b || '{}'); } catch {} Promise.resolve(h({ method: req.method, body, headers: req.headers }, r)).catch(() => { res.writeHead(500); res.end(); });
    }); return;
  }
  if (p.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{}'); }
  let f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}
