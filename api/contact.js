// AIME · formulaire de contact (devis, projet) → la demande est enregistrée, puis un e-mail part.
// Deux événements distincts, chacun avec son statut : la demande (table « demandes », api/_demandes/depot.cjs) et l'e-mail
// (Resend, api/_demandes/courriel.cjs). Une panne d'e-mail laisse la demande enregistrée (email_statut = 'echec'), visible
// et renvoyable par le propriétaire du site (api/demandes.mjs). Une base absente ou injoignable laisse le comportement
// d'avant : l'e-mail seul. Seule la panne des deux ensemble renvoie une erreur au visiteur, dont le texte reste dans la page.
// La clé Resend, le destinataire et l'expéditeur vivent dans les variables d'environnement du serveur
// (RESEND_API_KEY, CONTACT_TO, CONTACT_FROM) ; rien de tout cela n'atteint le navigateur.
// L'adresse du visiteur n'est utilisée qu'en Reply-To : l'expéditeur est toujours celui du domaine vérifié.
// Protections : même origine, JSON seulement, taille bornée, champs validés, piège à robots, délai minimal de saisie,
// limitation des envois par adresse IP, partagée entre instances (api/_auth/quotas.cjs). Aucune adresse IP n'est enregistrée.
// Les journaux ne contiennent jamais de données personnelles.
const Q = require('./_auth/quotas.cjs');      /* quotas partagés entre instances (audit Vercel, PR 2) */
const R = require('./_auth/requete.cjs');     /* même origine et corps JSON, comme toutes les écritures */
const C = require('./_demandes/courriel.cjs'); /* l'e-mail d'une demande : composition et envoi */
const D = require('./_demandes/depot.cjs');   /* les demandes enregistrées (migration 2026-10-25-09) */

const LIMITE_OCTETS = 16 * 1024;
const PROJETS = C.PROJETS;
const DELAI_MIN_MS = 3000; // un humain met plus de 3 s à remplir le formulaire


function propre(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g, '')
    .trim()
    .slice(0, max + 1);
}
function uneLigne(v) { return !/[\r\n]/.test(v); }

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

// Les quotas (3 envois par adresse IP et par 10 minutes, 30 par heure pour tout le site) sont partagés entre les instances :
// api/_auth/quotas.cjs (table « quotas » ; en mémoire tant que la migration n'est pas appliquée).

function ipDe(req) {
  return String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'inconnue').trim().slice(0, 64);
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const repondre = (code, corps) => res.status(code).json(corps);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return repondre(405, { ok: false, erreur: 'methode' }); }
  const refus = R.ecriture(req); if (refus) return repondre(refus[0], { ok: false, erreur: refus[1].erreur });
  const taille = Number(req.headers['content-length'] || 0);
  let corps = req.body;
  if (typeof corps === 'string') { if (corps.length > LIMITE_OCTETS) return repondre(413, { ok: false, erreur: 'taille' }); try { corps = JSON.parse(corps); } catch { return repondre(400, { ok: false, erreur: 'format' }); } }
  if (taille > LIMITE_OCTETS || Buffer.byteLength(JSON.stringify(corps || {})) > LIMITE_OCTETS) return repondre(413, { ok: false, erreur: 'taille' });
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return repondre(400, { ok: false, erreur: 'format' });

  // Pièges à robots : on répond « reçu » sans rien envoyer, pour ne rien leur apprendre.
  if (propre(corps.site_web, 200) || !(Number(corps.duree) >= DELAI_MIN_MS)) return repondre(200, { ok: true });

  const r = valider(corps);
  if (!r.ok) return repondre(422, { ok: false, erreur: 'champs', champs: r.erreurs });

  const q = await Q.quota('contact:ip', ipDe(req)), qt = q.ok ? await Q.quota('contact:tous', 'site') : q;
  if (!q.ok || !qt.ok) { const attente = q.ok ? qt.attente : q.attente; res.setHeader('Retry-After', String(attente)); return repondre(429, { ok: false, erreur: 'limite', attente }); }

  // 1. La demande, d'abord. Même demande renvoyée deux fois (double clic, réseau) : une seule ligne (empreinte unique).
  const emp = D.empreinte(r.valeurs), db = handler.db !== undefined ? handler.db : D.base();
  const enr = await D.enregistrer(db, r.valeurs, emp);
  const enregistree = enr.etat !== 'indisponible';
  if (!enregistree) console.error('contact: demande non enregistrée (base indisponible), l\'e-mail seul est tenté');
  if (enr.etat === 'existante' && enr.email_statut === 'envoye') return repondre(200, { ok: true });   /* déjà reçue et transmise */

  // 2. L'e-mail, ensuite. La même Idempotency-Key qu'avant : Resend ne l'envoie qu'une fois.
  const conf = C.configuration();
  if (!conf) {
    console.error('contact: configuration incomplète');
    if (enregistree) { await D.noterEnvoi(db, enr.id, { nonConfigure: true }); return repondre(200, { ok: true }); }
    return repondre(503, { ok: false, erreur: 'indisponible' });
  }
  const envoi = await C.envoyer(r.valeurs, 'contact-' + emp, conf, handler.fetch);
  if (enregistree) await D.noterEnvoi(db, enr.id, envoi);
  if (envoi.ok) return repondre(200, { ok: true });
  console.error(envoi.code === 'reseau' ? 'contact: service d\'envoi injoignable' : 'contact: envoi refusé, statut ' + envoi.code);
  if (enregistree) return repondre(200, { ok: true });   /* la demande est gardée : rien n'est perdu, le propriétaire la voit en échec */
  return repondre(502, { ok: false, erreur: 'envoi' });
}

module.exports = handler;
module.exports.valider = valider;
module.exports.PROJETS = PROJETS;
module.exports._reinitialiser = () => { Q._oublier(); D._oublier(); };
