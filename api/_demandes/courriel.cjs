// AIME · l'e-mail d'une demande (formulaire Contact) : sa composition et son envoi par Resend, en un seul endroit.
// Utilisé par api/contact.js (premier envoi) et par api/demandes.mjs (« Renvoyer » après un échec), pour que les deux
// envois soient identiques. La clé Resend, le destinataire et l'expéditeur restent dans les variables d'environnement du
// serveur (RESEND_API_KEY, CONTACT_TO, CONTACT_FROM). L'adresse du visiteur n'est utilisée qu'en Reply-To.
// En CommonJS, comme api/contact.js (un module .mjs y casserait sous Node 20).
'use strict';

const PROJETS = {
  site: 'Création de site',
  refonte: 'Refonte ou évolution d\'un site',
  supports: 'Supports (faire-part, affiches, signalétique…)',
  projet: 'Parler d\'un projet',
  autre: 'Autre demande',
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* v : { projet, prenom, nom, email, tel, adresse, livraison (AAAA-MM-JJ ou vide), message, via? ('carte' : reçue par une Carte AIME, V1 P3) } */
function message(v) {
  const origine = v.via === 'carte' ? 'Envoyé depuis votre Carte AIME' : 'Envoyé depuis le formulaire de contact AIME';
  const lignes = [
    ['Type de demande', PROJETS[v.projet]],
    ['Prénom et nom', v.prenom + ' ' + v.nom],
    ['E-mail', v.email],
    ['Téléphone', v.tel || '—'],
    ['Adresse', v.adresse || '—'],
    ['Livraison souhaitée', v.livraison ? v.livraison.split('-').reverse().join('/') : '—'],
  ];
  const text = lignes.map(([k, x]) => k + ' : ' + x).join('\n') + '\n\nMessage :\n' + v.message +
    '\n\n—\n' + origine + '. Répondez directement à ce message pour écrire à la personne.';
  const html = '<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 sans-serif">' +
    lignes.map(([k, x]) => '<tr><th align="left" style="color:#555;font-weight:600">' + esc(k) + '</th><td>' + esc(x) + '</td></tr>').join('') +
    '</table><p style="font:14px/1.6 sans-serif;white-space:pre-wrap;border-left:3px solid #7C5CFF;padding-left:12px">' + esc(v.message) + '</p>' +
    '<p style="font:12px sans-serif;color:#777">' + esc(origine) + '. Répondez directement à ce message pour écrire à la personne.</p>';
  const sujet = ((v.via === 'carte' ? 'Demande via votre Carte · ' : 'Demande · ' + PROJETS[v.projet] + ' · ') + v.prenom + ' ' + v.nom).replace(/[\r\n]+/g, ' ').slice(0, 180);
  return { sujet, text, html };
}

/* la configuration d'envoi, ou null si elle est incomplète */
function configuration(env = process.env) {
  const cle = env.RESEND_API_KEY, a = env.CONTACT_TO, de = env.CONTACT_FROM;
  return cle && a && de ? { cle, a: a.split(',').map((s) => s.trim()).filter(Boolean), de } : null;
}

/* envoie l'e-mail d'une demande ; ne lève jamais d'exception.
   → { ok: true } | { ok: false, code: '403' | 'reseau' | … }
   idem : Idempotency-Key (Resend n'envoie qu'une fois la même clé pendant 24 heures). f : fetch (remplaçable en test). */
async function envoyer(v, idem, conf, f) {
  const m = message(v);
  try {
    const envoi = await (f || fetch)('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + conf.cle, 'Content-Type': 'application/json', 'Idempotency-Key': idem },
      body: JSON.stringify({ from: conf.de, to: conf.a, reply_to: v.email, subject: m.sujet, text: m.text, html: m.html }),
    });
    if (!envoi.ok) return { ok: false, code: String(Number(envoi.status) || 'refus').slice(0, 16) };
    return { ok: true };
  } catch {
    return { ok: false, code: 'reseau' };
  }
}

module.exports = { PROJETS, message, configuration, envoyer, esc };
