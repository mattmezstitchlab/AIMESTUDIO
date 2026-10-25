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
  'Tarifs': 'tarifs/index.html',
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

test('pied légal : « Tarifs · Mentions légales · Confidentialité · Contact » sur chaque page publique, avec sa feuille de style', () => {
  for (const [nom, f] of Object.entries(PUBLIQUES)) {
    const s = lire(f), m = s.match(/<nav class="pied-legal" aria-label="Informations légales">([\s\S]*?)<\/nav>/);
    assert.ok(m, nom + ' : la ligne existe');
    assert.deepEqual([...m[1].matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(x => [x[1], x[2]]), [['/tarifs/', 'Tarifs'], ['/mentions-legales/', 'Mentions légales'], ['/confidentialite/', 'Confidentialité'], ['/contact/', 'Contact']], nom);
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

test('confidentialité : le formulaire de contact (enregistré, Resend, pour un devis, 24 mois), pas de bandeau, Speed Insights, Neon à Francfort', () => {
  const t = lire('confidentialite/index.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(t, /formulaire de contact .*sont enregistrés sur le site puis envoyés par e-mail \(Resend\) à Matthieu Lecointre, pour que AIME puisse vous répondre, vous proposer un devis et suivre votre demande\. Seul le propriétaire du site peut les lire\. Votre adresse IP n'est pas enregistrée\. Ils sont effacés 24 mois après notre dernier échange/);
  assert.ok(!/Rien n'est enregistré sur le site/.test(t), 'l\'ancienne promesse a disparu');
  assert.match(t, /strictement nécessaires.*pas de bandeau de cookies/);
  assert.ok(t.includes('Nous mesurons la vitesse d\'affichage des pages, sans cookie ni identifiant personnel (Vercel Speed Insights).'));
  assert.match(t, /Neon , en région Europe \(Francfort\)/);
  assert.match(t, /mentions légales/);
});

test('contact : les textes ne promettent que ce que fait le code (demande enregistrée, puis e-mail ; durée = celle du code)', () => {
  const c = lire('api/contact.js'), D = require('../api/_demandes/depot.cjs');
  assert.match(c, /D\.enregistrer\(/); assert.ok(c.indexOf('D.enregistrer(') < c.indexOf('C.envoyer('), 'la demande est écrite avant l\'e-mail');
  assert.match(c, /CONTACT_TO/);
  assert.equal(D.CONSERVATION_DEFAUT, 24, 'si la durée change dans le code, changer aussi la page Confidentialité et le formulaire');
  for (const f of ['contact/index.html', 'lab/grande-partition/index.html'])
    assert.ok(lire(f).includes('Elles sont transmises par e-mail et conservées sur ce site au plus ' + D.CONSERVATION_DEFAUT + ' mois après notre dernier échange'), f + ' : le consentement dit la vérité');
  assert.ok(lire('confidentialite/index.html').includes('Une demande envoyée par le formulaire de contact : ' + D.CONSERVATION_DEFAUT + ' mois après notre dernier échange'));
});

test('pied légal : toutes les pages du site qui en ont un portent la même ligne, Tarifs en premier', () => {
  const { execSync } = require('child_process');
  const fichiers = execSync("grep -rl 'class=\"pied-legal\"' --include=*.html . --exclude-dir=node_modules", { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.ok(fichiers.length >= 8);
  for (const f of fichiers) { const m = lire(f.replace(/^\.\//, '')).match(/<nav class="pied-legal"[^>]*>([\s\S]*?)<\/nav>/); assert.deepEqual([...m[1].matchAll(/href="([^"]+)"/g)].map(x => x[1]), ['/tarifs/', '/mentions-legales/', '/confidentialite/', '/contact/'], f); }
});

test('tarifs : la page, ses trois offres et la bêta ; aucun appel serveur ni paiement', () => {
  const s = lire('tarifs/index.html'), t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(s, /<meta name="robots" content="noindex">/);
  assert.match(t, /AIME est gratuit pendant la bêta\./);
  for (const x of [/Découverte 0 €/, /Projet 79 € TTC, une seule fois 59 € pour les 50 premiers projets/, /Pro 390 € HT par an ou 39 € HT par mois/]) assert.match(t, x);
  assert.ok(!/fetch\(|XMLHttpRequest|\/api\/|stripe|<form/i.test(s), 'aucun appel, aucun formulaire, aucun paiement');
  assert.ok(s.includes('src="/media/visuels/traiteur.webp"'));
});

test('visuels : chaque image citée existe ; la photo du Point Zéro est la seule en fetchpriority="high"', () => {
  for (const f of ['index.html', 'tarifs/index.html', 'compte/index.html', 'coeur/coeur.css']) for (const x of lire(f).matchAll(/\/media\/visuels\/([\w.-]+\.webp)/g)) assert.ok(fs.existsSync(path.join(__dirname, '..', 'media/visuels', x[1])), f + ' : ' + x[1]);
  const a = lire('index.html');
  assert.ok((a.match(/fetchpriority="high"/g) || []).length <= 1, 'au plus une image prioritaire');
  assert.ok(!/cour-trio\.webp/.test(a), 'l\'accueil clair (25/10) n\'a plus de photo de nuit en tête');
});
