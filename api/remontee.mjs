// POST /api/remontee { projet } : l'orbe remonte à AIME (CONTACT_TO) le résumé structuré d'un projet en préparation.
// Session obligatoire (la personne vient du cookie vérifié, jamais du corps). Jamais d'image : elle reste sur l'appareil.
// Le résumé est revalidé ici, champ par champ ; l'adresse de la personne n'est utilisée qu'en Reply-To.
import { auth, personne, envoyer } from './_auth/auth.mjs';
const vus = new Map(); const FENETRE = 10 * 60 * 1000, MAX = 5;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 32768) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, n);
const nb = (v, a, b) => { const x = Number(v); return Number.isFinite(x) ? Math.max(a, Math.min(b, x)) : null; };
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);
export function nettoyer(p) {
  p = p && typeof p === 'object' ? p : {};
  const c = p.choix && typeof p.choix === 'object' ? p.choix : {}, g = p.grille && typeof p.grille === 'object' ? p.grille : null;
  return {
    type: p.type === 'broderie' ? 'broderie' : 'demande', titre: txt(p.titre, 120) || 'Projet sans titre', statut: txt(p.statut, 40), progression: nb(p.progression, 0, 100),
    source: { nom: txt(p.source && p.source.nom, 120), l: nb(p.source && p.source.l, 0, 100000), h: nb(p.source && p.source.h, 0, 100000) },
    choix: { largeurCm: nb(c.largeurCm, 1, 300), usage: txt(c.usage, 20), toile: txt(c.toile, 20), finesse: txt(c.finesse, 20), couleurs: txt(c.couleurs, 20) },
    grille: g ? { l: nb(g.l, 1, 1000), h: nb(g.h, 1, 1000), cm: Array.isArray(g.cm) ? g.cm.slice(0, 2).map(v => nb(v, 0, 1000)) : [] } : null,
    palette: (Array.isArray(p.palette) ? p.palette : []).slice(0, 60).map(x => ({ dmc: txt(x && x.dmc, 12), nom: txt(x && x.nom, 60), points: nb(x && x.points, 0, 1e7) })),
    confirme: Object.fromEntries(['format', 'toile', 'points', 'couleurs', 'conversion', 'dmc'].map(k => [k, !!(p.confirme && p.confirme[k])])),
    message: txt(p.message, 4000)
  };
}
export function texte(p, u) {
  const L = [`Projet : ${p.titre} (${p.type})`, `De : ${u.nom || '—'} <${u.email}>`, `Statut : ${p.statut || '—'} · ${p.progression ?? '—'} %`];
  if (p.source.nom) L.push(`Matière : ${p.source.nom}${p.source.l ? ` (${p.source.l} × ${p.source.h} px)` : ''}`);
  if (p.choix.largeurCm) L.push(`Format : ${p.choix.largeurCm} cm de large · usage ${p.choix.usage || '—'}`);
  if (p.choix.toile) L.push(`Toile : ${p.choix.toile} · finesse ${p.choix.finesse || '—'} · palette ${p.choix.couleurs || '—'}`);
  if (p.grille) L.push(`Grille : ${p.grille.l} × ${p.grille.h} points (${(p.grille.cm || []).join(' × ')} cm)`);
  L.push('Confirmé : ' + Object.entries(p.confirme).map(([k, v]) => `${k} ${v ? 'oui' : 'non'}`).join(', '));
  if (p.palette.length) L.push('Fils DMC : ' + p.palette.map(x => `${x.dmc}${x.nom ? ' ' + x.nom : ''} (${x.points})`).join(' · '));
  if (p.message) L.push('', p.message);
  return L.join('\n');
}
export default async function remontee(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { ok: false }); }
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  let u = null; try { u = await personne(req); } catch { u = null; }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous pour transmettre votre projet à AIME.' });
  const dest = process.env.CONTACT_TO; if (!dest) return json(res, 503, { ok: false, raison: 'La transmission n\'est pas encore configurée : votre projet reste enregistré ici.' });
  const t = Date.now(), l = (vus.get(u.id) || []).filter(x => t - x < FENETRE); if (l.length >= MAX) return json(res, 429, { ok: false, raison: 'Vous avez déjà transmis plusieurs fois : patientez quelques minutes.' });
  l.push(t); vus.set(u.id, l);
  const p = nettoyer((await corps(req)).projet), corpsTexte = texte(p, u);
  try { await envoyer({ to: dest, subject: `[AIME · Point Zéro] ${p.titre}`, text: corpsTexte, html: '<pre style="font:14px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap">' + esc(corpsTexte) + '</pre>', replyTo: u.email }); }
  catch { return json(res, 502, { ok: false, raison: 'Transmission impossible pour le moment : réessayez.' }); }
  return json(res, 200, { ok: true });
}
export function _reinitialiser() { vus.clear(); }
