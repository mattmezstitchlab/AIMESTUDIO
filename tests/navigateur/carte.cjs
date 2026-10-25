/* La Carte enregistrée sur le compte (V1, PR P1), dans de vrais navigateurs, contre une base PostgreSQL de TEST (jamais la production).
   Un ordinateur qui a déjà une Carte locale (avec photo et relations) → ME montre ce qui sera envoyé, exige l'accord, garde la photo
   et les relations sur l'appareil → un iPhone (même compte, aucune copie) la retrouve, la prend, règle une visibilité → l'ordinateur
   voit la différence et choisit, sans perte → conflit entre deux appareils (409), jamais d'écrasement silencieux → réseau coupé →
   retrait du compte (la copie locale reste) → un iPad, second compte, commence sa Carte dans ME. Accessibilité et débordement.
   Usage : TEST_DATABASE_URL=postgresql://…/aime_test node tests/navigateur/carte.cjs     (CAPTURES=dossier pour garder les captures) */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const URLT = process.env.TEST_DATABASE_URL; if (!URLT) { console.log('TEST_DATABASE_URL absent : parcours Carte non lancé'); process.exit(0); }
const PORT = 8796, B = 'http://localhost:' + PORT, LIENS = path.join(os.tmpdir(), 'aime-liens-carte-' + process.pid + '.txt'), CAP = process.env.CAPTURES || null;
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'), M = require('../../carte/carte.js');
const UNE = { email: 'camille.carte@exemple.test', nom: 'Camille Fictive' }, DEUX = { email: 'dominique.carte@exemple.test', nom: 'Dominique Fictif' };
let echecs = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) echecs++; };
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pg = require('pg'), pool = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', '') });
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  for (const t of ['quotas', 'cartes_liens', 'cartes', 'demandes cascade', 'activites']) await pool.query('truncate ' + t).catch(() => {});
  try { fs.unlinkSync(LIENS); } catch {}
  const srv = spawn(process.execPath, [path.join(__dirname, '../../scripts/serveur-test.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', AIME_COMPTES_TEST: '1', AIME_LIENS: LIENS }), stdio: 'inherit' });
  process.on('exit', () => { try { srv.kill(); } catch {} });
  await attendre(1200);
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let ip = 80;
  const contexte = app => b.newContext(Object.assign({ locale: 'fr-FR', extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.' + (ip++) } }, app));
  async function connecter(ctx, qui) {
    const r = await ctx.request.post(B + '/api/auth/sign-in/magic-link', { data: { email: qui.email, name: qui.nom, callbackURL: '/compte/' }, headers: { origin: B } });
    if (r.status() !== 200) throw new Error('lien magique ' + qui.email + ' : ' + r.status());
    await attendre(150);
    const lien = fs.readFileSync(LIENS, 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.to === qui.email).pop().lien;
    const p = await ctx.newPage(); await p.goto(lien, { waitUntil: 'networkidle' }); await p.waitForSelector('#meCarte:not([hidden]) #mcCorps'); await p.waitForFunction(() => !/Chargement/.test(document.getElementById('mcCorps').textContent)); return p;
  }
  const capture = async (p, nom) => { if (!CAP) return; fs.mkdirSync(CAP, { recursive: true }); await p.locator('#meCarte').screenshot({ path: path.join(CAP, nom + '.png') }); };
  const axe = async (p, nom) => { await p.addScriptTag({ content: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')));
    ok(!v.length, nom + ' : aucune anomalie WCAG 2.2 AA' + (v.length ? ' — ' + v.join(', ') : '')); };
  const corps = p => p.locator('#mcCorps').innerText();
  const enBase = async email => (await pool.query('select c.donnees, c.rev from cartes c join "user" u on u.id = c.user_id where u.email = $1', [email])).rows[0] || null;
  const large = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  try {
    console.log('1. L\'ordinateur a une Carte locale : ME montre ce qui sera envoyé et exige l\'accord');
    let locale = M.modifier(M.vide('2026-10-20'), { nom: 'Camille Fictive', intention: 'Jouer du saxophone aux mariages', competences: ['saxophone', 'arrangements'] }, 'essai', '2026-10-20');
    locale.photo = 'data:image/png;base64,AAAA'; locale.relations = ['Anne, ma sœur'];
    const ordi = await contexte({ viewport: { width: 1440, height: 900 } });
    await ordi.addInitScript(c => { if (!localStorage.getItem('aime-carte')) localStorage.setItem('aime-carte', c); }, JSON.stringify(locale));
    const po = await connecter(ordi, UNE);
    ok(/existe sur cet appareil/.test(await corps(po)) && /Intention/.test(await corps(po)) && /Compétences/.test(await corps(po)), 'ME : « Une Carte existe sur cet appareil », avec ses rubriques');
    ok(/la photo, les relations/.test(await corps(po)), 'ME dit ce qui restera sur l\'appareil : la photo, les relations');
    ok((await enBase(UNE.email)) === null, 'rien n\'est envoyé avant le geste');
    await capture(po, 'CARTE__1-ordinateur-avant'); await axe(po, 'ME, Carte locale (ordinateur)');
    await po.click('#mcCorps button[type=submit]'); await attendre(300);
    ok((await enBase(UNE.email)) === null && /Cochez la case/.test(await po.locator('#mcVivant').innerText()), 'sans la case cochée : rien n\'est envoyé, c\'est dit');
    await po.check('#mcCorps .mc-accord input'); await po.click('#mcCorps button[type=submit]');
    await po.waitForFunction(() => /enregistrée sur votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    let ligne = await enBase(UNE.email);
    ok(ligne && ligne.donnees.nom === 'Camille Fictive' && ligne.donnees.photo === null && ligne.donnees.relations.length === 0 && ligne.donnees.publication.publiee === false, 'en base : la Carte, sans photo ni relations, non publiée');
    ok(/à jour sur cet appareil et sur votre compte/.test(await corps(po)), 'ME : à jour sur cet appareil et sur le compte');
    ok(await po.evaluate(() => JSON.parse(localStorage.getItem('aime-carte')).photo === 'data:image/png;base64,AAAA'), 'la copie de l\'ordinateur garde sa photo');

    console.log('2. L\'iPhone (même compte, aucune copie) retrouve la Carte, la prend, règle une visibilité');
    const tel = await contexte(devices['iPhone 13']), pt = await connecter(tel, UNE);
    ok(/enregistrée sur votre compte/.test(await corps(pt)) && /pas encore de copie/.test(await corps(pt)), 'iPhone : la Carte du compte, sans copie sur l\'appareil');
    await pt.click('#mcCorps button:has-text("Utiliser ma Carte sur cet appareil")');
    await pt.waitForFunction(() => /à jour sur cet appareil/.test(document.getElementById('mcCorps').textContent));
    ok(await pt.evaluate(() => JSON.parse(localStorage.getItem('aime-carte')).nom === 'Camille Fictive'), 'iPhone : la Carte est maintenant aussi sur l\'appareil');
    const options = await pt.locator('#mcVis-intention option').evaluateAll(o => o.map(x => x.value));
    ok(options.includes('publique') && !(await pt.locator('#mcVis-naissance').count()), 'les visibilités proposées pour les rubriques remplies');
    await pt.selectOption('#mcVis-intention', 'contacts'); await pt.click('#mcCorps .mc-vis button[type=submit]');
    await pt.waitForFunction(() => /enregistrée sur votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    ligne = await enBase(UNE.email); ok(ligne.donnees.visibilite.intention === 'contacts' && ligne.rev === 2, 'la visibilité « Mes contacts » est enregistrée au serveur (révision 2)');
    ok(await large(pt) <= 1, 'iPhone : aucun défilement horizontal');
    const deborde = await pt.evaluate(() => { const f = document.querySelector('#meCarte .mc-vis fieldset').getBoundingClientRect(); return [...document.querySelectorAll('#meCarte .mc-vis select')].filter(s => s.getBoundingClientRect().right > f.right + 1).length; });
    ok(deborde === 0, 'iPhone : chaque menu des visibilités tient dans son cadre (' + deborde + ' dépasse)'); await capture(pt, 'CARTE__2-iphone'); await axe(pt, 'ME, Carte (iPhone)');

    console.log('3. L\'ordinateur voit la différence et choisit, sans perte');
    await po.reload({ waitUntil: 'networkidle' }); await po.waitForFunction(() => !/Chargement/.test(document.getElementById('mcCorps').textContent));
    ok(/pas la même sur cet appareil et sur votre compte/.test(await corps(po)), 'ordinateur : « pas la même », les deux versions affichées');
    await capture(po, 'CARTE__3-ordinateur-difference'); await axe(po, 'ME, deux versions (ordinateur)');
    await po.click('#mcCorps button:has-text("Garder la version de mon compte sur cet appareil")');
    await po.waitForFunction(() => /à jour sur cet appareil/.test(document.getElementById('mcCorps').textContent));
    ok(await po.evaluate(() => JSON.parse(localStorage.getItem('aime-carte')).visibilite.intention === 'contacts' && JSON.parse(localStorage.getItem('aime-carte-sauvegarde')).photo === 'data:image/png;base64,AAAA'), 'ordinateur : la version du compte est reprise ; l\'ancienne copie, avec sa photo, est sauvegardée');

    console.log('4. Deux appareils en même temps : celui qui a une version périmée ne l\'écrase pas');
    await po.selectOption('#mcVis-intention', 'publique'); await po.click('#mcCorps .mc-vis button[type=submit]');
    await po.waitForFunction(() => /enregistrée sur votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    await pt.selectOption('#mcVis-competences', 'contacts'); await pt.click('#mcCorps .mc-vis button[type=submit]');
    await pt.waitForFunction(() => /autre appareil/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    ligne = await enBase(UNE.email);
    ok(ligne.donnees.visibilite.intention === 'publique' && ligne.donnees.visibilite.competences === 'privee', 'le serveur a gardé la version de l\'ordinateur ; celle de l\'iPhone, périmée, n\'a rien écrasé (409)');
    ok(/Choisissez/.test(await pt.locator('#mcVivant').innerText()), 'iPhone : on lui demande de choisir la version à garder');

    console.log('5. Réseau coupé : rien n\'est envoyé, c\'est dit');
    await po.route('**/api/carte', r => r.request().method() === 'POST' ? r.abort() : r.continue());
    await po.selectOption('#mcVis-intention', 'privee'); await po.click('#mcCorps .mc-vis button[type=submit]');
    await po.waitForFunction(() => /Réseau indisponible/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    ok((await enBase(UNE.email)).donnees.visibilite.intention === 'publique', 'réseau coupé : le compte n\'a pas changé, et le message le dit');
    await po.unroute('**/api/carte');

    console.log('6. Retirer ma Carte du compte : la copie de l\'appareil reste');
    await po.reload({ waitUntil: 'networkidle' }); await po.waitForFunction(() => !/Chargement/.test(document.getElementById('mcCorps').textContent));
    await po.click('#mcCorps .mc-retirer summary'); await po.click('#mcCorps .mc-retirer button');
    await po.waitForFunction(() => /retirée de votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    ok((await enBase(UNE.email)) === null && await po.evaluate(() => !!localStorage.getItem('aime-carte')), 'retirée du compte ; la copie de l\'ordinateur est intacte');
    ok(/existe sur cet appareil/.test(await corps(po)), 'ME propose de nouveau de l\'enregistrer, avec accord');

    console.log('7. iPad, second compte : il commence sa Carte dans ME ; il ne voit rien de la première');
    const tab = await contexte(devices['iPad Mini']), pi = await connecter(tab, DEUX);
    ok(/pas encore de Carte/.test(await corps(pi)), 'iPad : « Vous n\'avez pas encore de Carte »');
    await pi.fill('#mcNom', 'Dominique Fictif'); await pi.fill('#mcIntention', 'Organiser une fête de quartier');
    await pi.check('#mcCorps .mc-accord input'); await pi.click('#mcCorps button:has-text("Créer ma Carte")');
    await pi.waitForFunction(() => /enregistrée sur votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    const l2 = await enBase(DEUX.email); ok(l2 && l2.donnees.nom === 'Dominique Fictif' && l2.donnees.intention === 'Organiser une fête de quartier', 'iPad : la Carte est créée et enregistrée');
    const r = await (await tab.request.get(B + '/api/carte')).json(); ok(r.carte.nom === 'Dominique Fictif' && !JSON.stringify(r).includes('Camille'), 'chacun ne lit que sa Carte');
    ok(await large(pi) <= 1, 'iPad : aucun défilement horizontal'); await capture(pi, 'CARTE__4-ipad'); await axe(pi, 'ME, Carte créée (iPad)');
    const anon = await contexte({}); ok((await anon.request.get(B + '/api/carte')).status() === 401, 'sans session : 401');

    console.log('8. Partager ma Carte par un lien (P2) : seulement le « publique », depuis un autre appareil sans compte ; couper le lien');
    await pi.selectOption('#mcVis-nom', 'publique'); await pi.selectOption('#mcVis-intention', 'contacts'); await pi.click('#mcCorps .mc-vis button[type=submit]');
    await pi.waitForFunction(() => /enregistrée sur votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    await pi.waitForSelector('#mcCorps .mc-partage');
    ok(/Le lien montrera : Nom d'affichage\. Rien d'autre\./.test(await pi.locator('#mcCorps .mc-partage').innerText()), 'ME dit exactement ce que le lien montrera');
    await pi.locator('#mcCorps .mc-partage button[type=submit]').click(); await attendre(300);
    ok((await pool.query('select count(*)::int as n from cartes_liens')).rows[0].n === 0, 'sans la case cochée : aucun lien');
    await pi.check('#mcCorps .mc-partage .mc-accord input'); await pi.locator('#mcCorps .mc-partage button[type=submit]').click();
    await pi.waitForSelector('#mcLien', { timeout: 6000 }); const url = await pi.inputValue('#mcLien');
    ok(/\/c\/#[A-Za-z0-9_-]{32}$/.test(url), 'le lien est prêt : ' + url.replace(/#.*/, '#…'));
    await capture(pi, 'CARTE__5-ipad-lien'); await axe(pi, 'ME, lien public (iPad)');
    const ext = await contexte(devices['iPhone 13']), pe = await ext.newPage(); await pe.goto(url, { waitUntil: 'networkidle' });
    await pe.waitForFunction(() => document.getElementById('cpNom').textContent !== 'Une Carte AIME' || document.querySelector('.cp-alerte'), null, { timeout: 6000 });
    const vu = await pe.locator('main').innerText();
    ok((await pe.locator('#cpNom').innerText()) === 'Dominique Fictif' && !/fête de quartier/.test(vu), 'sans compte, sur un autre appareil : le nom (publique), pas l\'intention (« Mes contacts »)');
    ok((await pe.evaluate(() => document.querySelector('meta[name=robots]').content)) === 'noindex, nofollow', 'la page n\'est jamais indexée');
    ok(await large(pe) <= 1, 'Carte publique sur iPhone : aucun défilement horizontal'); await axe(pe, 'Carte publique (iPhone)');
    if (CAP) await pe.screenshot({ path: path.join(CAP, 'CARTE__6-publique-iphone.png') });
    await pi.click('#mcCorps .mc-partage button:has-text("Couper le lien")');
    await pi.waitForFunction(() => /coupé/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    await pe.reload({ waitUntil: 'networkidle' }); await pe.waitForSelector('.cp-alerte', { timeout: 6000 });
    ok(/coupé/.test(await pe.locator('.cp-alerte').innerText()) && !/Dominique/.test(await pe.locator('main').innerText()), 'lien coupé : l\'autre appareil ne voit plus rien, immédiatement');
    const pe2 = await ext.newPage(); await pe2.goto(B + '/c/#abc', { waitUntil: 'networkidle' }); await pe2.waitForSelector('.cp-alerte');
    ok(/incomplet/.test(await pe2.locator('.cp-alerte').innerText()), 'un lien tronqué : c\'est dit, sans appel inutile');

    console.log('9. Écrire à une Carte (P3) : éteint par défaut ; allumé dans ME, un visiteur écrit ; la demande arrive dans SON AI');
    await pi.check('#mcCorps .mc-partage .mc-accord input'); await pi.locator('#mcCorps .mc-partage button[type=submit]').click();
    await pi.waitForSelector('#mcLien', { timeout: 6000 }); const url2 = await pi.inputValue('#mcLien');
    ok(!(await pi.isChecked('#mcContact')), 'ME : « Recevoir des demandes » est éteint par défaut');
    const pv = await ext.newPage(); await pv.goto(url2, { waitUntil: 'networkidle' }); await pv.waitForFunction(() => document.getElementById('cpNom').textContent === 'Dominique Fictif', null, { timeout: 6000 });
    ok(await pv.locator('#cpEcrire').isHidden(), 'éteint : la page publique ne montre aucun formulaire');
    await pi.check('#mcContact'); await pi.waitForFunction(() => /reçoit maintenant des demandes/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    ok(await pi.evaluate(() => document.activeElement && document.activeElement.id === 'mcContact'), 'ME : le focus reste sur le réglage');
    ok((await pool.query('select contact from cartes_liens where coupe_le is null')).rows[0].contact === true, 'allumé en base');
    await pv.reload({ waitUntil: 'networkidle' }); await pv.waitForSelector('#cpEcrire:not([hidden])', { timeout: 6000 });
    await pv.click('#cpEnvoyer'); await attendre(100);
    ok(/Vérifiez/.test(await pv.locator('#cpResultat').innerText()) && await pv.evaluate(() => document.activeElement.id === 'cpPrenom'), 'formulaire vide : les champs sont signalés, le focus va au premier');
    await pv.fill('#cpPrenom', 'Sacha'); await pv.fill('#cpNom2', 'Visiteur'); await pv.fill('#cpEmail', 'sacha.visiteur@exemple.test');
    await pv.fill('#cpMessage', 'Bonjour, votre fête de quartier m\'intéresse : puis-je aider à l\'organiser ?'); await pv.check('#cpAccord');
    await attendre(3200); await pv.click('#cpEnvoyer');
    await pv.waitForFunction(() => /est envoyé/.test(document.getElementById('cpResultat').textContent), null, { timeout: 6000 });
    ok(!/dominique\.carte@/.test(await pv.content()), 'le visiteur ne voit jamais l\'adresse de la personne');
    const dm = (await pool.query("select d.boite, d.prenom, d.email_statut from demandes d join \"user\" u on d.boite = 'compte:' || u.id where u.email = $1", [DEUX.email])).rows;
    ok(dm.length === 1 && dm[0].prenom === 'Sacha', 'la demande est gardée dans la boîte de SA Carte');
    ok(await large(pv) <= 1, 'formulaire sur iPhone : aucun défilement horizontal'); await axe(pv, 'Carte publique, formulaire (iPhone)');
    if (CAP) await pv.screenshot({ path: path.join(CAP, 'CARTE__7-ecrire-iphone.png'), fullPage: true });
    const pa = await tab.newPage(); await pa.goto(B + '/projets/', { waitUntil: 'networkidle' }); await pa.waitForSelector('#aTraiter:not([hidden]) #demandes .dm-t', { timeout: 8000 });
    ok(/Via ma Carte/.test(await pa.locator('#demandes').innerText()) && /Sacha Visiteur/.test(await pa.locator('#demandes').innerText()), 'son AI : « Sacha Visiteur · Via ma Carte »');
    await axe(pa, 'AI, demande reçue par la Carte (iPad)');
    const autre = await contexte({}); await connecter(autre, UNE);
    ok((await autre.request.get(B + '/api/demandes')).status() === 404, 'l\'autre compte n\'y a pas accès (404)');
    await pi.uncheck('#mcContact'); await pi.waitForFunction(() => /ne reçoit plus de demandes/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    await pv.reload({ waitUntil: 'networkidle' }); await pv.waitForFunction(() => document.getElementById('cpNom').textContent === 'Dominique Fictif', null, { timeout: 6000 });
    ok(await pv.locator('#cpEcrire').isHidden(), 'éteint de nouveau : plus de formulaire');

    console.log('10. Le + de ME (P4) : modifier ma Carte, ajouter une activité et la montrer, partager ; le lien la montre, rien d\'autre');
    await pi.goto(B + '/compte/', { waitUntil: 'networkidle' }); await pi.waitForSelector('#activites:not([hidden]) #fActivite:not([hidden])', { timeout: 8000 });
    await pi.waitForFunction(() => !/Chargement/.test(document.getElementById('mcCorps').textContent));
    await pi.click('#dock-site .dock-plus'); await pi.waitForTimeout(300);
    const gm = await pi.evaluate(() => [...document.querySelectorAll('#dock-site .dock-menu .dock-g')].map(a => a.textContent.trim()).join(' · '));
    ok(gm === 'Modifier ma Carte · Ajouter une activité · Partager ma Carte', 'le + de ME : ' + gm);
    await pi.click('#dock-site .dock-menu .dock-g:has-text("Ajouter une activité")'); await attendre(200);
    ok(await pi.evaluate(() => document.activeElement && document.activeElement.id === 'actAjout'), '« Ajouter une activité » : le focus est sur le choix du métier');
    await pi.selectOption('#actAjout', 'dj'); await pi.click('#fActivite button[type=submit]'); await pi.waitForSelector('#act-c-dj', { timeout: 6000 });
    ok(!(await pi.isChecked('#act-c-dj')), 'ajoutée, et montrée nulle part par défaut');
    await pi.check('#act-c-dj'); await attendre(600);
    ok((await pool.query("select a.sur_carte from activites a join \"user\" u on u.id = a.user_id where u.email = $1 and metier = 'dj'", [DEUX.email])).rows[0].sur_carte === true, 'cochée : « sur ma Carte » en base');
    await pi.click('#dock-site .dock-plus'); await pi.waitForTimeout(300); await pi.click('#dock-site .dock-menu .dock-g:has-text("Modifier ma Carte")'); await attendre(200);
    ok(await pi.evaluate(() => document.getElementById('mcModifier').open && document.activeElement.id === 'mcmNom'), '« Modifier ma Carte » : le formulaire s\'ouvre, le focus sur le nom');
    await pi.fill('#mcm-competences', 'platines, sonorisation'); await pi.click('#mcModifier button[type=submit]');
    await pi.waitForFunction(() => /enregistrée sur votre compte/.test(document.getElementById('mcVivant').textContent), null, { timeout: 6000 });
    const l3 = await enBase(DEUX.email); ok(JSON.stringify(l3.donnees.competences) === '["platines","sonorisation"]' && l3.donnees.visibilite.competences === 'privee', 'modifiée sur le compte ; la nouvelle rubrique reste privée');
    await pi.click('#dock-site .dock-plus'); await pi.waitForTimeout(300); await pi.click('#dock-site .dock-menu .dock-g:has-text("Partager ma Carte")'); await attendre(200);
    ok(await pi.evaluate(() => !!document.activeElement.closest('.mc-partage')), '« Partager ma Carte » : le focus est dans le partage');
    ok(await large(pi) <= 1, 'ME sur iPad : aucun défilement horizontal'); await capture(pi, 'CARTE__8-ipad-activites'); await axe(pi, 'ME, activités et + (iPad)');
    await pv.reload({ waitUntil: 'networkidle' }); await pv.waitForSelector('#cp-activites', { timeout: 6000 });
    const vu2 = await pv.locator('main').innerText();
    ok(/DJ/.test(vu2) && !/platines/.test(vu2), 'le lien montre l\'activité cochée, pas les compétences (privées)');
    await pi.uncheck('#act-c-dj'); await attendre(600); await pv.reload({ waitUntil: 'networkidle' }); await pv.waitForFunction(() => document.getElementById('cpNom').textContent === 'Dominique Fictif', null, { timeout: 6000 });
    ok(!(await pv.locator('#cp-activites').count()), 'décochée : l\'activité disparaît du lien');
  } catch (e) { echecs++; console.error(e); }
  await b.close(); await pool.end(); try { srv.kill(); } catch {}
  console.log(echecs ? '\nparcours Carte : ' + echecs + ' échec(s)' : '\nparcours Carte : tout est vert');
  process.exit(echecs ? 1 : 0);
})();
