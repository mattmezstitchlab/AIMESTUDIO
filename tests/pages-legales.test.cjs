/* Mentions légales, pied légal et Speed Insights (demande de Matt, 24/10).
   Chaque page publique : le script Speed Insights dans <head>, et la ligne « Mentions légales · Confidentialité · Contact ».
   La page /mentions-legales/ : l'éditeur, le directeur de la publication, l'hébergeur et le stockage, rien d'inventé. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const PUBLIQUES = {
  'accueil': 'index.html',
  'Exemples': 'exemples/index.html',
  'Exemples · mosaïque': 'exemples/mosaique/index.html',
  'Contact': 'contact/index.html',
  'Compte et Mes projets (/projets/ sert /compte/)': 'compte/index.html',
  'Confidentialité': 'confidentialite/index.html',
  'Mentions légales': 'mentions-legales/index.html',
};
const tete = s => s.slice(0, s.indexOf('</head>'));

test('Speed Insights : les deux lignes sont dans le <head> de chaque page publique', () => {
  for (const [nom, f] of Object.entries(PUBLIQUES)) {
    const h = tete(lire(f));
    assert.ok(h.includes('<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>'), nom + ' : la file window.si');
    assert.ok(h.includes('<script defer src="/_vercel/speed-insights/script.js"></script>'), nom + ' : le script, différé');
  }
});

test('/projets/ sert bien la page Compte (donc le même <head>)', () => {
  const v = JSON.parse(lire('vercel.json'));
  assert.ok(v.rewrites.some(r => r.source === '/projets/' && r.destination === '/compte/'));
});

test('pied légal : « Mentions légales · Confidentialité · Contact » sur chaque page publique, avec sa feuille de style', () => {
  for (const [nom, f] of Object.entries(PUBLIQUES)) {
    const s = lire(f), m = s.match(/<nav class="pied-legal" aria-label="Informations légales">([\s\S]*?)<\/nav>/);
    assert.ok(m, nom + ' : la ligne existe');
    assert.deepEqual([...m[1].matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(x => [x[1], x[2]]), [['/mentions-legales/', 'Mentions légales'], ['/confidentialite/', 'Confidentialité'], ['/contact/', 'Contact']], nom);
    assert.ok(tete(s).includes('<link rel="stylesheet" href="/nav/pied-legal.css">'), nom + ' : la feuille de style');
    assert.equal(s.match(/class="pied-legal"/g).length, 1, nom + ' : une seule fois');
  }
  assert.ok(!/class="pied-liens"/.test(lire('index.html')), 'l\'ancienne ligne de l\'accueil a disparu');
});

test('mentions légales : l\'éditeur, le directeur de la publication, l\'hébergeur, le stockage', () => {
  const s = lire('mentions-legales/index.html'), t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(t, /Éditeur Matthieu Lecointre Pl des combattants 59236 Frelinghien, France/);
  assert.match(t, /SIRET : 798 582 342 00035/);
  assert.ok(s.includes('href="mailto:matthieu.lecointre@gmail.com"'));
  assert.match(t, /Directeur de la publication Matthieu Lecointre\./);
  assert.match(t, /Hébergeur Vercel Inc\. 440 N Barranca Avenue #4133 Covina, CA 91723, États-Unis/);
  assert.match(t, /Neon , en région Europe \(Francfort\)/);
  assert.ok(s.includes('<a href="/confidentialite/">Confidentialité</a>'), 'renvoi vers /confidentialite/');
  assert.ok(s.includes('<a href="/mentions-legales/" aria-current="page">'), 'la page courante est marquée');
});

test('confidentialité : le formulaire de contact (Resend, rien d\'enregistré, pour un devis), pas de bandeau, Speed Insights, Neon à Francfort', () => {
  const t = lire('confidentialite/index.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(t, /formulaire de contact .*envoyés par e-mail \(Resend\) à Matthieu Lecointre, pour que AIME puisse vous répondre et vous proposer un devis\. Rien n'est enregistré sur le site\./);
  assert.match(t, /strictement nécessaires.*pas de bandeau de cookies/);
  assert.ok(t.includes('Nous mesurons la vitesse d\'affichage des pages, sans cookie ni identifiant personnel (Vercel Speed Insights).'));
  assert.match(t, /Neon , en région Europe \(Francfort\)/);
  assert.match(t, /mentions légales/);
});

test('contact : le texte de confidentialité ne promet que ce que fait api/contact.js (un e-mail, sans stockage)', () => {
  const c = lire('api/contact.js');
  assert.match(c, /un e-mail, sans stockage/); assert.match(c, /CONTACT_TO/); assert.ok(!/pool|query\(|INSERT/i.test(c), 'aucune écriture en base');
});
