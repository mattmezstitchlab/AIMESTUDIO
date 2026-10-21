// AIME · formulaire de contact (devis, projet) → un e-mail, sans stockage.
// La clé Resend, le destinataire et l'expéditeur vivent dans les variables d'environnement du serveur
// (RESEND_API_KEY, CONTACT_TO, CONTACT_FROM) ; rien de tout cela n'atteint le navigateur.
// L'adresse du visiteur n'est utilisée qu'en Reply-To : l'expéditeur est toujours celui du domaine vérifié.
// Protections : même origine, JSON seulement, taille bornée, champs validés, piège à robots, délai minimal de saisie,
// limitation des envois par adresse IP. Les journaux ne contiennent jamais de données personnelles.
const crypto = require('crypto');

const LIMITE_OCTETS = 16 * 1024;
const PROJETS = {
  site: 'Création de site',
  refonte: 'Refonte ou évolution d\'un site',
  supports: 'Supports (faire-part, affiches, signalétique…)',
  projet: 'Parler d\'un projet',
  autre: 'Autre demande',
};
const FENETRE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PAR_IP = 3; // envois par adresse IP et par fenêtre
const MAX_GLOBAL = 30; // envois par instance et par heure
const DELAI_MIN_MS = 3000; // un humain met plus de 3 s à remplir le formulaire

const parIp = new Map();
let globaux = [];

function propre(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g, '')
    .trim()
    .slice(0, max + 1);
}
function uneLigne(v) { return !/[\r\n]/.test(v); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Renvoie { ok: true, valeurs } ou { ok: false, erreurs: { champ: message } }.
function valider(corps, maintenant) {
  const b = corps && typeof corps === 'object' ? corps : {};
  const e = {};
  const v = {
    prenom: propre(b.prenom, 80),
    nom: propre(b.nom, 80),
    email: propre(b.email, 160),
    tel: propre(b.tel, 30),
    adresse: propre(b.adresse, 300),
    projet: propre(b.projet, 20),
    livraison: propre(b.livraison, 10),
    message: propre(b.message, 4000),
  };
  if (!v.prenom) e.prenom = 'Indiquez votre prénom.';
  else if (v.prenom.length > 80 || !uneLigne(v.prenom)) e.prenom = 'Prénom trop long.';
  if (!v.nom) e.nom = 'Indiquez votre nom.';
  else if (v.nom.length > 80 || !uneLigne(v.nom)) e.nom = 'Nom trop long.';
  if (!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/.test(v.email) || v.email.length > 160) e.email = 'Adresse e-mail invalide.';
  if (v.tel && (v.tel.length > 30 || !/^[0-9+().\s-]{6,30}$/.test(v.tel))) e.tel = 'Numéro de téléphone invalide.';
  if (v.adresse.length > 300) e.adresse = 'Adresse trop longue (300 caractères au plus).';
  if (!Object.prototype.hasOwnProperty.call(PROJETS, v.projet)) e.projet = 'Choisissez le type de demande.';
  if (v.livraison) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(v.livraison) && !isNaN(Date.parse(v.livraison + 'T12:00:00Z'));
    const hier = new Date((maintenant || Date.now()) - 86400000).toISOString().slice(0, 10);
    const max = new Date((maintenant || Date.now()) + 3 * 365 * 86400000).toISOString().slice(0, 10);
    if (!ok) e.livraison = 'Date de livraison invalide.';
    else if (v.livraison < hier) e.livraison = 'La date de livraison est déjà passée.';
    else if (v.livraison > max) e.livraison = 'Date de livraison trop lointaine.';
  }
  if (v.message.length < 20) e.message = 'Décrivez votre demande en quelques phrases (20 caractères au moins).';
  else if (v.message.length > 4000) e.message = 'Message trop long (4 000 caractères au plus).';
  if (b.consentement !== true) e.consentement = 'Cochez la case pour que nous puissions vous répondre.';
  return Object.keys(e).length ? { ok: false, erreurs: e } : { ok: true, valeurs: v };
}

// Limitation des envois. Mémoire de l'instance seulement : elle freine les rafales, mais une limite stricte
// sur toutes les instances demande un stockage partagé (non activé pour l'instant).
function limiter(ip, maintenant) {
  const t = maintenant || Date.now();
  globaux = globaux.filter((x) => t - x < 3600000);
  const l = (parIp.get(ip) || []).filter((x) => t - x < FENETRE_MS);
  if (l.length >= MAX_PAR_IP) return Math.ceil((FENETRE_MS - (t - l[0])) / 1000);
  if (globaux.length >= MAX_GLOBAL) return Math.ceil((3600000 - (t - globaux[0])) / 1000);
  l.push(t); parIp.set(ip, l); globaux.push(t);
  if (parIp.size > 5000) parIp.clear();
  return 0;
}

function origineAutorisee(req) {
  const o = req.headers.origin;
  if (!o) return false;
  let u;
  try { u = new URL(o); } catch { return false; }
  const hote = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (u.host.toLowerCase() === hote && (u.protocol === 'https:' || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(hote))) return true;
  const liste = String(process.env.CONTACT_ORIGINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return liste.includes(o.toLowerCase());
}

function ipDe(req) {
  return String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'inconnue').trim().slice(0, 64);
}

function message(v) {
  const lignes = [
    ['Type de demande', PROJETS[v.projet]],
    ['Prénom et nom', v.prenom + ' ' + v.nom],
    ['E-mail', v.email],
    ['Téléphone', v.tel || '—'],
    ['Adresse', v.adresse || '—'],
    ['Livraison souhaitée', v.livraison ? v.livraison.split('-').reverse().join('/') : '—'],
  ];
  const text = lignes.map(([k, x]) => k + ' : ' + x).join('\n') + '\n\nMessage :\n' + v.message +
    '\n\n—\nEnvoyé depuis le formulaire de contact AIME. Répondez directement à ce message pour écrire à la personne.';
  const html = '<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 sans-serif">' +
    lignes.map(([k, x]) => '<tr><th align="left" style="color:#555;font-weight:600">' + esc(k) + '</th><td>' + esc(x) + '</td></tr>').join('') +
    '</table><p style="font:14px/1.6 sans-serif;white-space:pre-wrap;border-left:3px solid #7C5CFF;padding-left:12px">' + esc(v.message) + '</p>' +
    '<p style="font:12px sans-serif;color:#777">Envoyé depuis le formulaire de contact AIME. Répondez directement à ce message pour écrire à la personne.</p>';
  const sujet = ('Demande · ' + PROJETS[v.projet] + ' · ' + v.prenom + ' ' + v.nom).replace(/[\r\n]+/g, ' ').slice(0, 180);
  return { sujet, text, html };
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const repondre = (code, corps) => res.status(code).json(corps);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return repondre(405, { ok: false, erreur: 'methode' }); }
  if (!origineAutorisee(req)) return repondre(403, { ok: false, erreur: 'origine' });
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return repondre(415, { ok: false, erreur: 'format' });
  const taille = Number(req.headers['content-length'] || 0);
  let corps = req.body;
  if (typeof corps === 'string') { if (corps.length > LIMITE_OCTETS) return repondre(413, { ok: false, erreur: 'taille' }); try { corps = JSON.parse(corps); } catch { return repondre(400, { ok: false, erreur: 'format' }); } }
  if (taille > LIMITE_OCTETS || Buffer.byteLength(JSON.stringify(corps || {})) > LIMITE_OCTETS) return repondre(413, { ok: false, erreur: 'taille' });
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return repondre(400, { ok: false, erreur: 'format' });

  // Pièges à robots : on répond « reçu » sans rien envoyer, pour ne rien leur apprendre.
  if (propre(corps.site_web, 200) || !(Number(corps.duree) >= DELAI_MIN_MS)) return repondre(200, { ok: true });

  const r = valider(corps);
  if (!r.ok) return repondre(422, { ok: false, erreur: 'champs', champs: r.erreurs });

  const cle = process.env.RESEND_API_KEY, a = process.env.CONTACT_TO, de = process.env.CONTACT_FROM;
  if (!cle || !a || !de) { console.error('contact: configuration incomplète'); return repondre(503, { ok: false, erreur: 'indisponible' }); }

  const attente = limiter(ipDe(req));
  if (attente) { res.setHeader('Retry-After', String(attente)); return repondre(429, { ok: false, erreur: 'limite', attente }); }

  const m = message(r.valeurs);
  // Même demande renvoyée deux fois (double clic, réseau) : Resend ne l'envoie qu'une fois.
  const idem = 'contact-' + crypto.createHash('sha256').update([r.valeurs.email, r.valeurs.message, Math.floor(Date.now() / 600000)].join('|')).digest('hex').slice(0, 48);
  try {
    const envoi = await (handler.fetch || fetch)('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json', 'Idempotency-Key': idem },
      body: JSON.stringify({ from: de, to: a.split(',').map((s) => s.trim()).filter(Boolean), reply_to: r.valeurs.email, subject: m.sujet, text: m.text, html: m.html }),
    });
    if (!envoi.ok) { console.error('contact: envoi refusé, statut ' + envoi.status); return repondre(502, { ok: false, erreur: 'envoi' }); }
    return repondre(200, { ok: true });
  } catch {
    console.error('contact: service d\'envoi injoignable');
    return repondre(502, { ok: false, erreur: 'envoi' });
  }
}

module.exports = handler;
module.exports.valider = valider;
module.exports.PROJETS = PROJETS;
module.exports._reinitialiser = () => { parIp.clear(); globaux = []; };
