/* AI et ME, avant la connexion : la page a un contenu dès l'arrivée.
   Ce que ces tests protègent : le contenu existe pour les deux écrans et il est écrit avant tout appel serveur ; il reste
   quand la session échoue (401), quand les comptes sont fermés (503) et quand le serveur ne répond pas ; il laisse la place
   à l'écran connecté ; chaque carte dit son état, et rien n'est présenté comme disponible à tort (l'agent AIME reste « En
   préparation », aucun registre public n'est annoncé) ; chaque lien mène à une page réelle ; le menu de ME offre quatre
   gestes réels, dont l'export d'un fichier fait dans le navigateur, sans serveur. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const D = require('../compte/decouverte.js');
const sansCommentaires = f => lire(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

test('découverte · les deux écrans ont un contenu, et chaque carte dit son état', () => {
  assert.deepEqual(Object.keys(D.ECRANS).sort(), ['ai', 'me']);
  assert.throws(() => D.description('projets'), /écran inconnu/);
  for (const ecran of ['ai', 'me']) {
    const d = D.description(ecran);
    assert.equal(d.cle, ecran);
    assert.ok(d.titre && d.titre.length > 6, ecran + ' : un titre');
    assert.ok(d.chapeau && d.chapeau.length > 80, ecran + ' : un chapeau qui explique');
    assert.ok(d.cartes.length >= 4, ecran + ' : au moins quatre cartes (' + d.cartes.length + ')');
    assert.equal(new Set(d.cartes.map(c => c.id)).size, d.cartes.length, ecran + ' : identifiants uniques');
    for (const c of d.cartes) {
      assert.ok(c.id && c.titre && c.texte, ecran + ' : une carte complète');
      assert.ok(Object.hasOwn(D.ETATS, c.etat), ecran + '.' + c.id + ' : état connu (' + c.etat + ')');
      assert.ok(D.ETATS[c.etat].nom && D.ETATS[c.etat].dit, 'chaque état est nommé et expliqué');
      for (const l of c.liens || []) assert.ok(l.nom && l.href, c.id + ' : un lien nommé');
    }
    assert.ok(d.sansCompte && d.sansCompte.liens.length >= 3, ecran + ' : ce qui est possible sans compte');
    assert.ok(d.note && d.note.length > 40, ecran + ' : une note qui ne promet rien de plus');
  }
});

test('découverte · rien n’est présenté comme disponible à tort', () => {
  const ai = D.description('ai'), me = D.description('me');
  const agent = ai.cartes.find(c => c.id === 'agent');
  assert.equal(agent.etat, 'preparation', 'l’agent AIME reste « En préparation » (il n’est pas branché)');
  assert.match(agent.texte, /n’est pas branché|n'est pas branché/);
  assert.match(agent.texte, /rien ne le simule/, 'aucune démonstration ne fait croire qu’il agit');
  assert.ok(ai.cartes.every(c => c.id === 'agent' || c.etat === 'disponible'), 'aucune autre carte n’est en préparation');
  /* le registre public n’existe pas : ME le dit, et ne le promet nulle part */
  const activites = me.cartes.find(c => c.id === 'activites');
  assert.match(activites.texte, /il n’en existe pas|il n'en existe pas/);
  for (const t of [ai, me].map(d => [d.chapeau, d.note].concat(d.cartes.map(c => c.texte)).join(' ')))
    assert.ok(!/registre public (de|des|avec)|annuaire public (pour|de) découvrir/.test(t), 'aucun registre promis');
  /* la Carte : photo et relations restent sur l'appareil, comme le dit /confidentialite/ */
  assert.match(me.cartes.find(c => c.id === 'carte').texte, /sans la photo ni les relations/);
  /* les données : export et suppression sont livrés ; la durée est celle du code */
  const dd = require('../api/_demandes/depot.cjs'), donnees = me.cartes.find(c => c.id === 'donnees');
  assert.match(donnees.texte, /Exporter votre Carte d’un geste|Exporter votre Carte d'un geste/);
  assert.ok(donnees.texte.includes('24 mois') && dd.CONSERVATION_DEFAUT === 24, 'la durée citée est celle du code');
});

test('découverte · chaque lien mène à une page réelle', () => {
  const v = JSON.parse(lire('vercel.json')), rewrites = (v.rewrites || []).map(r => r.source);
  const existe = href => {
    const u = href.split('#')[0].split('?')[0];
    if (/\/$/.test(u) && fs.existsSync(path.join(__dirname, '..', u, 'index.html'))) return true;
    if (fs.existsSync(path.join(__dirname, '..', u.replace(/^\//, '')))) return true;
    return rewrites.some(r => r.replace(/\/$/, '') === u.replace(/\/$/, ''));
  };
  for (const ecran of ['ai', 'me']) {
    const d = D.description(ecran);
    const liens = d.cartes.flatMap(c => c.liens || []).concat(d.sansCompte.liens);
    assert.ok(liens.length >= 5, ecran + ' : des liens à proposer');
    for (const l of liens) assert.ok(existe(l.href), ecran + ' : ' + l.href + ' existe');
  }
  /* /#temps existe vraiment sur l'accueil */
  assert.ok(lire('index.html').includes('id="temps"'), 'l’aperçu du Temps est bien sur l’accueil');
});

test('découverte · le contenu est posé avant tout appel serveur et reste quand la session échoue', () => {
  const h = lire('compte/index.html'), c = sansCommentaires('compte/compte.js');
  const iDec = h.indexOf('id="decouverte"'), iCnx = h.indexOf('id="connexion"');
  assert.ok(iDec > 0 && iDec < iCnx, 'la section est avant le formulaire de connexion');
  assert.ok(h.indexOf('/compte/decouverte.js') < h.indexOf('/compte/compte.js'), 'le module est chargé avant la page');
  assert.ok(h.indexOf('/compte/decouverte.js') > h.indexOf('/compte/carte-compte.js'));
  /* l'ordre, dans le fichier : poserDecouverte() s'exécute avant le fetch de session */
  const iPoser = c.indexOf("poserDecouverte();"), iFetch = c.indexOf("requete('/api/auth/get-session')");
  assert.ok(iPoser > 0 && iPoser < iFetch, 'le contenu est écrit avant de demander la session');
  /* les quatre issues gardent le contenu ; seule la session ouverte le retire */
  assert.match(c, /if\(r\.statut===503\|\|r\.statut===404\)\{[\s\S]{0,400}poserDecouverte\(\)/);
  assert.match(c, /if\(!r\.j\|\|!r\.j\.user\)\{poserDecouverte\(\)/);
  assert.match(c, /\}\)\.catch\(function\(\)\{[\s\S]{0,300}poserDecouverte\(\)/);
  assert.match(c, /moi=r\.j\.user;cacherDecouverte\(\)/, 'connecté : la découverte laisse la place');
  assert.equal((c.match(/AIMEDecouverte\.monter/g) || []).length, 1, 'un seul point d’entrée pour poser le contenu');
  /* l'alerte dit que la suite est là, au lieu de laisser une page vide */
  assert.match(c, /réunit reste visible ci-dessous/);
  /* ME porte son nom dès l'arrivée, connecté ou non */
  assert.match(c, /if\(!PROJETS\)\{document\.title='ME · AIME'/);
});

test('découverte · le rendu n’injecte aucun HTML et la couleur ne dit jamais seule', () => {
  const src = lire('compte/decouverte.js'), css = lire('compte/compte.css');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(src), 'textContent seul : aucun HTML venu d’ailleurs');
  assert.match(src, /textContent/);
  assert.match(src, /setAttribute\('title',etat\.dit\)/, 'l’état est expliqué, pas seulement coloré');
  assert.match(src, /z\.hidden=false/, 'le contenu s’affiche');
  for (const r of ['.dec-carte', '.dec-etat', '.etat-disponible', '.etat-preparation', '.dec-sans', '.dec-note'])
    assert.ok(css.includes(r), 'style ' + r);
  assert.match(css, /@media \(max-width:560px\)\{\.dec-grille\{grid-template-columns:1fr\}\}/, 'une colonne sur téléphone');
  assert.match(src, /aria-labelledby'?,?'tDecouverte'|setAttribute\('aria-labelledby','tDecouverte'\)/, 'la grille est rattachée à son titre');
});

test('ME · le menu offre quatre gestes réels, dont l’export d’un fichier sans serveur', () => {
  const P = require('../dock/plus.js'), M = require('../dock/modele.js'), c = sansCommentaires('compte/compte.js');
  assert.deepEqual(P.ME, ['modifierCarte', 'ajouterActivite', 'partagerCarte', 'exporterCarte']);
  assert.ok(P.ME.length <= M.MAX_PLUS, 'le Dock garde ses quatre gestes au plus');
  assert.equal(M.ACTIONS.exporterCarte.nom, 'Exporter ma Carte');
  assert.equal(M.ACTIONS.exporterCarte.geste, 'public', 'un geste local, aucun droit demandé');
  for (const id of P.ME) assert.ok(M.ACTIONS[id], 'action décrite : ' + id);
  /* le geste existe et ne parle à personne */
  assert.match(c, /id==='exporterCarte'\)\{exporterCarte\(\);return\}/);
  const bloc = c.slice(c.indexOf('function exporterCarte()'), c.indexOf('/* ---------- le + de ME'));
  assert.match(bloc, /new Blob\(\[JSON\.stringify\(c,null,2\)\]/, 'le fichier est fabriqué dans le navigateur');
  assert.match(bloc, /a\.download=nom/);
  assert.ok(!/fetch\(|\/api\//.test(bloc), 'aucun appel serveur : l’export ne part nulle part');
  assert.ok(!/photo/.test(bloc), 'rien n’est ajouté au fichier : la Carte telle quelle');
  /* sans Carte sur l'appareil, il le dit et n'invente rien */
  assert.match(bloc, /Aucune Carte sur cet appareil à exporter/);
});

test('ME · le menu écrit en clair : six gestes, tous réels, posés à la connexion seulement', () => {
  const h = lire('compte/index.html'), c = sansCommentaires('compte/compte.js'), css = lire('compte/compte.css');
  assert.match(h, /<section class="dec-menu" id="menuME" hidden aria-labelledby="tMenuME">/, 'le bloc existe, masqué au départ');
  assert.match(h, /id="menuMELiens"/);
  const m = c.match(/var MENU_ME=\[([\s\S]*?)\];/);
  assert.ok(m, 'la liste des gestes est dans le code');
  const ids = [...m[1].matchAll(/\['([A-Za-z]+)'/g)].map(x => x[1]);
  assert.deepEqual(ids, ['modifierCarte', 'ajouterActivite', 'partagerCarte', 'exporterCarte', 'mesCles', 'mesQuestions']);
  /* chacun est traité par versME, et les deux nouveaux y mènent vraiment */
  for (const id of ids) assert.ok(c.includes("id==='" + id + "'"), 'versME traite ' + id);
  assert.match(c, /id==='mesCles'\)\{cible=\$\(\'ajCle\'\)/);
  assert.match(c, /id==='mesQuestions'\)\{cible=document\.getElementById\('mfTitre'\)/);
  /* posé à la connexion, jamais avant : sans compte, le menu n'a rien à faire */
  assert.match(c, /poserMenuME\(\);carteLocale\(\)/);
  assert.match(c, /function poserMenuME\(\)\{\s*var z=\$\(\'menuME\'\)/);
  assert.match(c, /z\.hidden=false/);
  /* le + du Dock et le menu de ME passent par la même place : un seul comportement */
  assert.match(c, /document\.addEventListener\('aime:dock-geste',function\(e\)\{var id=e\.detail&&e\.detail\.id;if\(MENU_ME\.some/);
  assert.match(css, /\.dec-menu\{/);
});

test('découverte · le module se charge en navigateur (la fabrique reçoit bien la fenêtre)', () => {
  const src = lire('compte/decouverte.js');
  assert.match(src, /factory\(root\)/, 'le navigateur passe la fenêtre à la fabrique (une erreur silencieuse ici viderait la page)');
  assert.match(src, /module\.exports=factory\(null\)/, 'sous node, aucune fenêtre');
  const D = require('../compte/decouverte.js');
  assert.equal(D.monter('ai'), null, 'sans DOM, monter ne fait rien et ne casse pas');
});
