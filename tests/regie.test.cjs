const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const R = require('../regie/donnees.js');

test('régie · les adresses sont filtrées : chemins du site, bibliothèque, médias, https seulement', () => {
  for (const ok of ['/', '/g44/', '/vitrine/site/?u=mariage', 'biblio:fonds-01-06', 'media:m-abc12', 'https://exemple.fr/x.mp4']) assert.ok(R.sourceOk(ok), ok);
  for (const ko of ['javascript:alert(1)', '//evil.com/x', 'http://exemple.fr', 'data:text/html,x', '/a b', '/"><script>', 'biblio:../x', 'https://a" onerror="x']) assert.ok(!R.sourceOk(ko), ko);
  assert.ok(R.cibleOk('#entrer') && !R.cibleOk('#"x'));
  assert.equal(R.cleDePage('/studio'), '/studio/'); assert.equal(R.cleDePage('/studio/index.html'), '/studio/'); assert.equal(R.cleDePage('/'), '/'); assert.equal(R.cleDePage('/g44/?v=2#lab'), '/g44/');
});

test('régie · un appareil mal formé est ramené à des valeurs sûres', () => {
  const a = R.appareil({ type: 'tv', x: 9999, l: -5, rot: 400, ancre: '<img>', contenu: { type: 'url', src: 'javascript:x' }, lien: 'javascript:y' });
  assert.equal(a.type, 'iphone'); assert.equal(a.x, 140); assert.equal(a.l, 3); assert.equal(a.rot, 45); assert.equal(a.ancre, 'body');
  assert.equal(a.contenu.type, 'vide', 'une source refusée vide l\'écran'); assert.equal(a.lien, '');
  const p = R.appareil({ type: 'ipad', contenu: { type: 'page', src: 'https://ailleurs.fr' } }); assert.equal(p.contenu.type, 'vide', 'une « page du site » ne peut pas être un autre site');
  assert.equal(R.texte({ sel: 'h1', texte: 'x' }).sel, 'h1'); assert.equal(R.texte({ sel: '<b>' }), null);
});

test('régie · la configuration publiée est valide, et chaque visuel existe', () => {
  const c = R.config(JSON.parse(fs.readFileSync('regie/site.json', 'utf8')));
  assert.ok(c.pages['/'] && c.pages['/'].appareils.length >= 3, 'la Page Zéro a ses appareils');
  assert.ok(c.pages['/studio/'] && c.pages['/studio/'].appareils.length >= 1, 'la landing AIME Studio aussi');
  for (const k of Object.keys(c.pages)) for (const a of c.pages[k].appareils) {
    if (a.contenu.type === 'image' || a.contenu.type === 'video') { const u = R.resoudre(a.contenu.src, c); assert.ok(u && fs.existsSync('.' + u), k + ' → ' + a.contenu.src) }
    assert.ok(a.alt.length > 10, 'texte de remplacement : ' + a.id);
  }
  assert.ok(!/siren|iban|facture/i.test(JSON.stringify(c)), 'aucune donnée de comptabilité dans la configuration publique');
  assert.throws(() => R.config({ format: 'autre' }));
});

test('régie · l\'orbe se règle par site, avec repli sur le réglage commun', () => {
  const c = R.config({ orbe: { '*': { presence: 'bouton', suggestions: [{ libelle: 'Voir', cible: '/g44/' }, { libelle: 'x', cible: 'javascript:1' }] }, g44: { presence: 'aucune' } } });
  assert.equal(R.orbeDe(c, 'g44').presence, 'aucune'); assert.equal(R.orbeDe(c, 'stitch').presence, 'bouton');
  assert.equal(R.orbeDe(c, 'stitch').suggestions.length, 1, 'la suggestion dangereuse est retirée');
  const E = [{ id: 'zero', adresse: '/' }, { id: 'sites', adresse: '/sites/' }, { id: 'mariage', adresse: '/vitrine/site/?u=mariage' }, { id: 'world', adresse: '/vitrine/world/' }];
  assert.equal(R.siteDe('/', E), 'zero'); assert.equal(R.siteDe('/sites/', E), 'sites'); assert.equal(R.siteDe('/vitrine/world/', E), 'world'); assert.equal(R.siteDe('/inconnu/', E), null);
});

function base() {
  let c = R.comptaVide();
  Object.assign(c.emetteur, { nom: 'Prénom Nom', adresse: '1 rue Fictive, 75000 Paris', siren: '123 456 789' });
  c.clients.push(R.client({ id: 'c-un', nom: 'Client Fictif', adresse: '2 avenue Fictive, 44000 Nantes', pro: true }));
  return c;
}

test('compta · numérotation continue, chronologique, et facture figée une fois émise', () => {
  let c = base();
  c.docs.push(R.doc({ id: 'f-1', type: 'facture', clientId: 'c-un', prestation: 'Octobre 2026', lignes: [{ designation: 'Site vitrine', quantite: 1, pu: 1200 }, { designation: 'Hébergement', quantite: 12, pu: 9.99 }] }));
  c.docs.push(R.doc({ id: 'f-2', type: 'facture', clientId: 'c-un', prestation: 'Novembre 2026', lignes: [{ designation: 'Maintenance', quantite: 1, pu: 80 }] }));
  assert.equal(R.total(c.docs[0]), 1319.88, 'au centime près');
  const c1 = R.emettre(c, 'f-1', '2026-10-21'); assert.equal(c.docs[0].numero, null, 'l\'original n\'est pas modifié');
  assert.equal(c1.docs[0].numero, 'F-2026-001'); assert.equal(c1.docs[0].client.nom, 'Client Fictif'); assert.equal(c1.docs[0].emetteur.siren, '123 456 789');
  assert.throws(() => R.emettre(c1, 'f-1', '2026-10-22'), /déjà émis/);
  assert.throws(() => R.emettre(c1, 'f-2', '2026-10-01'), /chronologique/);
  const c2 = R.emettre(c1, 'f-2', '2026-10-25'); assert.equal(c2.docs[1].numero, 'F-2026-002');
  const relu = R.compta(JSON.stringify(c2)); assert.equal(R.prochainNumero(relu, 'facture', '2026-12-01').numero, 'F-2026-003', 'le compteur survit à l\'export');
  const sansCompteur = R.compta(Object.assign(JSON.parse(JSON.stringify(c2)), { compteurs: {} })); assert.equal(R.prochainNumero(sansCompteur, 'facture', '2026-12-01').numero, 'F-2026-003', 'un compteur effacé ne réattribue pas un numéro');
});

test('compta · rien ne s\'émet sans les mentions obligatoires, devis → facture → avoir', () => {
  let c = R.comptaVide(); c.docs.push(R.doc({ id: 'f-x', type: 'facture', lignes: [] }));
  assert.throws(() => R.emettre(c, 'f-x'), /SIREN.*client.*ligne.*prestation/s);
  c = base(); c.docs.push(R.doc({ id: 'd-1', type: 'devis', clientId: 'c-un', objet: 'Création de site', lignes: [{ designation: 'Site', quantite: 1, pu: 900 }] }));
  c = R.emettre(c, 'd-1', '2026-10-21'); const d = c.docs[0]; assert.equal(d.numero, 'D-2026-001'); assert.equal(d.echeance, '2026-11-20', 'validité 30 jours');
  let r = R.devisVersFacture(c, 'd-1'); c = r.compta; const f = c.docs.find(x => x.id === r.id); assert.equal(c.docs[0].statut, 'accepte'); assert.equal(f.numero, null); assert.match(f.notes, /D-2026-001/);
  assert.throws(() => R.avoirDe(c, r.id), /émise/);
  f.prestation = 'Octobre 2026'; c = R.emettre(c, r.id, '2026-10-22');
  r = R.avoirDe(c, f.id); const a = r.compta.docs.find(x => x.id === r.id); assert.equal(R.total(a), -900); assert.equal(a.type, 'avoir');
  const m = R.mentions(c.docs.find(x => x.id === f.id)); assert.ok(m.some(x => /293 B/.test(x)) && m.some(x => /40 €/.test(x)) && m.some(x => /pénalités/.test(x)));
  assert.throws(() => R.compta({ format: 'autre' }));
});

test('régie · la page de la régie n\'est pas indexée et ne publie jamais la comptabilité', () => {
  const h = fs.readFileSync('regie/index.html', 'utf8'); assert.match(h, /noindex/);
  const js = fs.readFileSync('regie/regie.js', 'utf8');
  assert.match(js, /aime-regie-compta/); assert.ok(!/fetch\([^)]*compta/.test(js), 'aucun envoi réseau de la comptabilité');
});

test('régie · la scène est chargée sur les sites, et Le Monde AIME lui laisse décider de l\'orbe', () => {
  for (const f of ['index.html', 'studio/index.html', 'g44/index.html', 'stitch/index.html', 'sites/index.html', 'vitrine/world/index.html', 'aime/index.html']) assert.match(fs.readFileSync(f, 'utf8'), /\/regie\/scene\.js/, f);
  assert.match(fs.readFileSync('aime/index.html', 'utf8'), /AIMERegieScene&&AIMERegieScene\.actif\)return/);
  const s = fs.readFileSync('regie/scene.js', 'utf8');
  assert.match(s, /e\.origin!==location\.origin\|\|e\.source!==parent/, 'messages de la régie : même origine, cadre parent seulement');
  assert.ok(!/innerHTML\s*=/.test(s), 'la scène n\'écrit jamais de HTML venu de la configuration');
});
