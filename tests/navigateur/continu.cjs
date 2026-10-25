/* Le parcours continu, prouvé de bout en bout sur UN seul projet et avec DEUX comptes, dans de vrais navigateurs et contre une base
   PostgreSQL de TEST (jamais la production) :
   un visiteur écrit depuis Contact → la demande est en base avant toute tentative d'e-mail → le propriétaire du site la retrouve dans AI,
   change son statut, ajoute une note privée → le + propose « En faire un projet » → il confirme (nom et domaine modifiables, rien avant),
   au clavier et avec un double clic → un seul projet, lié à la demande → son Dock → il invite une seconde personne (coordination, témoin)
   qui rejoint avec ce rôle → le Programme entre les deux comptes : import, propagation sans rechargement, conflit, refus selon le rôle →
   retour à AI puis ME → lien direct, actualisation, Retour et Suivant gardent le contexte.
   Comptes et données fictifs (exemple.test).
   Usage : TEST_DATABASE_URL=postgresql://…/aime_test node tests/navigateur/continu.cjs     (CAPTURES=dossier pour garder les captures) */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const URLT = process.env.TEST_DATABASE_URL; if (!URLT) { console.log('TEST_DATABASE_URL absent : parcours continu non lancé'); process.exit(0); }
const PORT = 8794, B = 'http://localhost:' + PORT, LIENS = path.join(os.tmpdir(), 'aime-liens-continu-' + process.pid + '.txt'), CAP = process.env.CAPTURES || null;
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PROPRIO = { id: 'proprio-test-continu-01', email: 'proprietaire.continu@exemple.test', nom: 'Matt Test' };
const SECOND = { email: 'temoin.continu@exemple.test', nom: 'Sam Témoin' };
let echecs = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) echecs++; };
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pg = require('pg'), pool = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', '') });
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  for (const t of ['quotas', 'demandes restart identity cascade']) await pool.query('truncate ' + t).catch(() => {});
  await pool.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true)', [PROPRIO.id, PROPRIO.nom, PROPRIO.email]);
  try { fs.unlinkSync(LIENS); } catch {}
  const env = Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', AIME_COMPTES_TEST: '1', AIME_LIENS: LIENS, AIME_PROPRIETAIRES: PROPRIO.id });
  for (const k of ['RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM']) delete env[k];
  const srv = spawn(process.execPath, [path.join(__dirname, '../../scripts/serveur-test.cjs')], { env, stdio: 'inherit' });
  process.on('exit', () => { try { srv.kill(); } catch {} });
  await attendre(1200);
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let ip = 60;
  const contexte = app => b.newContext(Object.assign({ locale: 'fr-FR', extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.' + (ip++) } }, app));
  async function connecter(ctx, qui, retour) {
    const r = await ctx.request.post(B + '/api/auth/sign-in/magic-link', { data: { email: qui.email, name: qui.nom, callbackURL: retour || '/projets/' }, headers: { origin: B } });
    if (r.status() !== 200) throw new Error('lien magique ' + qui.email + ' : ' + r.status());
    await attendre(150);
    const lien = fs.readFileSync(LIENS, 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.to === qui.email).pop().lien;
    const p = await ctx.newPage(); await p.goto(lien, { waitUntil: 'networkidle' }); return p;
  }
  const capture = async (p, nom) => { if (!CAP) return; fs.mkdirSync(CAP, { recursive: true }); await p.screenshot({ path: path.join(CAP, nom + '.png') }); };
  const axe = async (p, nom) => { await p.addScriptTag({ content: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')));
    ok(!v.length, nom + ' : aucune anomalie WCAG 2.2 AA' + (v.length ? ' — ' + v.join(', ') : '')); };
  const dock = p => p.evaluate(() => [...document.querySelectorAll('#dock-site .dock-e .dock-t')].map(x => x.textContent));
  const lieu = (p, n) => { const d = p.locator('#dock-site nav.dock'); return d.getByRole('link', { name: n }).or(d.getByRole('button', { name: n })).first(); };
  const large = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const titre = p => p.locator('#tTitre').innerText();
  try {
    console.log('1–2. Un visiteur écrit depuis Contact ; la demande est en base AVANT la tentative d\'e-mail');
    const vis = await contexte(devices['iPhone 13']), pv = await vis.newPage();
    await pv.goto(B + '/contact/', { waitUntil: 'networkidle' });
    await pv.fill('[name=prenom]', 'Nora'); await pv.fill('[name=nom]', 'Fictive'); await pv.fill('[name=email]', 'nora.fictive@exemple.test');
    await pv.check('input[name=projet][value=projet]', { force: true });
    await pv.fill('[name=message]', 'Bonjour, nous organisons un mariage fictif en juin et cherchons un saxophoniste pour le vin d\'honneur.');
    await pv.check('#c-accord', { force: true }); await attendre(3200); await pv.click('#c-envoyer');
    await pv.waitForFunction(() => /Merci|abouti/.test(document.getElementById('c-etat').textContent));
    ok(/Merci/.test(await pv.locator('#c-etat').innerText()), 'le visiteur voit « Merci »');
    const [dm] = (await pool.query("select id, cle, statut from demandes where email = 'nora.fictive@exemple.test'")).rows;
    const j0 = (await pool.query('select quoi from demandes_journal where demande_id = $1 order by quand, id', [dm.id])).rows.map(r => r.quoi);
    ok(dm && dm.statut === 'nouvelle' && j0[0] === 'recue' && j0[1] === 'email_non_configure', 'en base, « nouvelle » ; historique : reçue, PUIS la tentative d\'e-mail (' + j0.join(' → ') + ')');
    ok(await large(pv) <= 1, 'Contact sur iPhone : aucun défilement horizontal');

    console.log('3–4. Le propriétaire du site la retrouve dans AI, change son statut, ajoute une note privée');
    const proD = await contexte({ viewport: { width: 1440, height: 900 } }), pd = await connecter(proD, PROPRIO);
    /* diagnostic du contrôle intermittent « 9 moments » : erreurs de la page et réponses /api non 200, imprimées seulement s'il échoue */
    const traces = []; pd.on('console', m => { if (m.type() === 'error') traces.push('console: ' + m.text().slice(0, 160)); }); pd.on('pageerror', e => traces.push('erreur: ' + String(e).slice(0, 160)));
    pd.on('requestfailed', r => { if (/\/api\//.test(r.url())) traces.push('échec ' + r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 80) + ' ' + (r.failure() || {}).errorText); });
    const enVol = new Map(); pd.on('request', r => { if (/\/api\//.test(r.url())) enVol.set(r, r.method() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 70) + ' @' + Date.now() % 100000); });
    pd.on('requestfinished', r => enVol.delete(r)); pd.on('requestfailed', r => enVol.delete(r));
    pd.on('response', r => { if (/\/api\/(temps|page)/.test(r.url())) traces.push(r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 80) + ' @' + Date.now() % 100000); });
    await pd.waitForSelector('#aTraiter:not([hidden]) [data-demande="' + dm.cle + '"]', { timeout: 8000 });
    ok((await titre(pd)) === 'AI' && /Nora Fictive/.test(await pd.locator('#demandes').innerText()), 'AI : la demande de Nora, dans « À traiter »');
    await pd.click('[data-demande="' + dm.cle + '"]'); await pd.waitForSelector('#dStatut');
    await pd.waitForFunction(() => document.getElementById('dStatut').value === 'lue', null, { timeout: 5000 }).catch(() => {});
    ok(/E-mail non configuré/.test(await pd.locator('#dCorps').innerText()), 'les deux statuts sont lisibles : la demande et l\'e-mail');
    await pd.selectOption('#dStatut', 'en_cours'); await pd.locator('#dStatut').evaluate(s => s.form.requestSubmit());
    await pd.waitForFunction(c => true, null).catch(() => {}); await attendre(600);
    ok((await pool.query('select statut from demandes where id = $1', [dm.id])).rows[0].statut === 'en_cours', 'statut changé : « en cours » au serveur');
    await pd.fill('#dNote', 'Rappeler Nora mardi : formule cocktail seule.'); await pd.click('#dCorps button:has-text("Enregistrer la note")'); await attendre(600);
    const note = (await pool.query('select note from demandes where id = $1', [dm.id])).rows[0].note;
    const jNote = (await pool.query("select detail from demandes_journal where demande_id = $1 and quoi = 'note'", [dm.id])).rows;
    ok(note === 'Rappeler Nora mardi : formule cocktail seule.' && jNote.length === 1 && !JSON.stringify(jNote).includes('mardi'), 'note privée enregistrée ; l\'historique dit qu\'elle a changé, jamais son contenu');
    await axe(pd, 'Détail de la demande (ordinateur)');

    console.log('5–7. Le + au clavier → « En faire un projet » → confirmation (nom, domaine) → double clic : un seul projet');
    await pd.focus('#dock-site .dock-plus'); await pd.keyboard.press('Enter');
    const geste = pd.locator('#dock-site [data-geste="projetDepuisDemande"]'); await geste.waitFor({ state: 'visible', timeout: 4000 });
    ok(true, 'le + s\'ouvre au clavier et propose « En faire un projet »');
    await geste.focus(); await pd.keyboard.press('Enter'); await pd.waitForSelector('#dConvertir');
    ok((await pool.query('select count(*)::int as n from spaces')).rows[0].n === 0, 'rien n\'est créé avant la confirmation');
    const options = await pd.locator('#dConvModele option').evaluateAll(o => o.map(x => x.value));
    await pd.selectOption('#dConvModele', 'seminaire'); await pd.selectOption('#dConvModele', 'mariage');
    await pd.fill('#dConvTitre', 'Mariage de Nora (test)');
    ok(options.includes('mariage') && options.includes('seminaire') && (await pd.inputValue('#dConvModele')) === 'mariage', 'nom et domaine modifiables (' + options.filter(Boolean).join(', ') + ')');
    await pd.locator('#dConvertir button[type=submit]').dblclick();
    await pd.waitForFunction(() => /Mariage de Nora \(test\)/.test(document.getElementById('tTitre').textContent), null, { timeout: 8000 });
    const projets = (await pool.query("select id, data from spaces where data->>'origine' = $1", ['demande-' + dm.cle])).rows;
    const passages = (await pool.query("select count(*)::int as n from demandes_journal where demande_id = $1 and quoi = 'statut' and detail->>'a' = 'convertie'", [dm.id])).rows[0].n;
    ok(projets.length === 1 && passages === 1, 'double clic : un seul projet (' + projets.length + '), un seul passage à « convertie » (' + passages + ')');
    const C = projets[0].id;
    ok(projets[0].data.modele === 'mariage' && !JSON.stringify(projets[0].data).includes('nora'), 'le projet garde son origine et son domaine, sans les coordonnées de Nora');

    console.log('8. Le projet s\'ouvre avec son Dock contextuel');
    const dC = await dock(pd); ok(new URL(pd.url()).searchParams.get('espace') === C && dC.includes('Mon accès') && dC.includes('Personnes') && !dC.includes('AI'), 'Dock du projet : ' + dC.join(' · '));
    ok(!dC.includes('Programme') && await pd.locator('#pCorps button:has-text("Importer le programme type")').count() === 1, 'le Programme n\'est pas encore dans le Dock ; « Mon accès » propose de l\'ajouter');
    await capture(pd, 'CONTINU__1-projet');

    console.log('9. Le propriétaire invite une seconde personne (coordination, témoin) ; elle rejoint avec ce rôle');
    await lieu(pd, 'Personnes').click(); await pd.waitForSelector('#pInviter select');
    const roles = await pd.locator('#pInviter select option').evaluateAll(o => o.map(x => x.value));
    await pd.selectOption('#pInviter select', 'editor'); await pd.fill('#pInviter input[list=pRelations]', 'témoin'); await pd.fill('#pInviter input[type=email]', SECOND.email);
    await pd.click('#pInviter button[type=submit]'); await pd.waitForSelector('#pInviter input[aria-label="Lien d\'invitation"]');
    const lienInv = await pd.inputValue('#pInviter input[aria-label="Lien d\'invitation"]');
    ok(roles.includes('editor') && /invitation=/.test(lienInv), 'le formulaire propose les rôles (' + roles.join(', ') + ') et rend un lien à usage unique');
    await axe(pd, 'Personnes et invitation (ordinateur)');
    const sec = await contexte(devices['iPhone 13']), ps = await connecter(sec, SECOND, '/projets/?invitation=' + new URL(lienInv).searchParams.get('invitation'));
    await ps.waitForFunction(() => /Mariage de Nora \(test\)/.test(document.getElementById('tTitre').textContent), null, { timeout: 8000 });
    const m2 = (await pool.query('select m.role, m.relation from space_members m join "user" u on u.id = m.user_id where m.space_id = $1 and u.email = $2', [C, SECOND.email])).rows[0];
    ok(m2 && m2.role === 'editor' && m2.relation === 'témoin', 'Sam rejoint le projet avec le rôle prévu : ' + (m2 ? m2.role + ', ' + m2.relation : 'absent'));
    ok(!(await dock(ps)).includes('AI'), 'Sam arrive dans le projet, avec le Dock de son rôle : ' + (await dock(ps)).join(' · '));

    console.log('10. Le Programme entre les deux comptes');
    await lieu(pd, 'Mon accès').click(); await pd.waitForSelector('#pCorps button:has-text("Importer le programme type")', { timeout: 6000 });
    await pd.click('#pCorps button:has-text("Importer le programme type")');
    await pd.waitForFunction(() => [...document.querySelectorAll('#dock-site .dock-e .dock-t')].some(x => x.textContent === 'Programme'), null, { timeout: 8000 }).catch(() => {});
    ok((await dock(pd)).includes('Programme'), 'après l\'import, « Programme » rejoint le Dock du projet : ' + (await dock(pd)).join(' · '));
    await lieu(pd, 'Programme').click(); await pd.waitForSelector('.tp-m', { timeout: 8000 });
    /* le programme peut s'afficher en deux temps (copie locale, puis serveur) : on attend le compte final, sans le supposer */
    await pd.waitForFunction(() => document.querySelectorAll('.tp-m').length === 9, null, { timeout: 15000 }).catch(() => {});   /* une lecture perdue est relancée après 6 s (modules/temps/vue.js) */
    const nM = await pd.locator('.tp-m').count(); ok(nM === 9, 'le propriétaire ouvre le programme type du mariage : 9 moments (' + nM + ')');
    if (nM !== 9) console.log('    traces :\n      ' + traces.slice(-25).join('\n      ') + '\n    en vol (sans réponse) :\n      ' + [...enVol.values()].join('\n      '));
    if (nM !== 9) {
      const actv = (await pool.query("select state, wait_event_type || ':' || wait_event as attente, round(extract(epoch from now() - query_start))::int as s, left(regexp_replace(query, '\\s+', ' ', 'g'), 90) as q from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() order by query_start")).rows;
      console.log('    base :\n      ' + actv.map(r => [r.state, r.attente, r.s + ' s', r.q].join(' · ')).join('\n      '));
      console.log('    page : ' + JSON.stringify(await pd.evaluate(() => ({ visible: document.visibilityState, maintenant: Date.now() % 100000 }))));
    }
    if (nM !== 9) console.log('    diagnostic : ' + pd.url().replace(/^https?:\/\/[^/]+/, '') + ' · ' + JSON.stringify((await pd.locator('#pCorps').innerText().catch(() => '')).slice(0, 300)));
    await ps.reload({ waitUntil: 'networkidle' }); await ps.waitForFunction(() => [...document.querySelectorAll('#dock-site .dock-e .dock-t')].some(x => x.textContent === 'Programme'), null, { timeout: 8000 }).catch(() => {});
    ok((await dock(ps)).includes('Programme'), 'Sam voit aussi « Programme » dans son Dock');
    await lieu(ps, 'Programme').click(); await ps.waitForSelector('.tp-m', { timeout: 8000 });
    ok((await ps.locator('.tp-m').count()) === 9, 'Sam (coordination) voit les 9 moments');
    await ps.getByRole('button', { name: 'Décaler « Cérémonie laïque » de 15 minutes' }).click();
    await ps.waitForFunction(() => /15:15 – 16:00/.test(document.querySelector('[data-id="ceremonie"]').innerText), null, { timeout: 5000 });
    const t0 = Date.now();
    await pd.waitForFunction(() => /15:15 – 16:00/.test((document.querySelector('[data-id="ceremonie"]') || {}).innerText || ''), null, { timeout: 8000 })
      .then(() => ok(true, 'propagation : le geste de Sam arrive chez le propriétaire sans rechargement (' + Math.round((Date.now() - t0) / 100) / 10 + ' s)'), () => ok(false, 'propagation : le geste de Sam n\'est pas arrivé'));
    /* conflit : la vue du propriétaire est figée (lectures coupées), Sam agit, puis le propriétaire agit sur une vue périmée */
    await pd.route('**/api/temps?*', r => r.request().method() === 'GET' ? r.abort() : r.continue());
    await ps.getByRole('button', { name: 'Décaler « Vin d\'honneur » de 15 minutes' }).click(); await attendre(800);
    await pd.unroute('**/api/temps?*');
    await pd.getByRole('button', { name: 'Décaler « Vin d\'honneur » de 15 minutes' }).click(); await attendre(1500);
    const vin = (await pool.query("select decalage_min from moments where space_id = $1 and id = 'vin'", [C])).rows[0].decalage_min;
    ok(vin === 15, 'conflit : le second geste, fait sur une vue périmée, est refusé par le serveur (décalage resté à ' + vin + ' min, pas 30)');
    ok(/16:15 – 18:45/.test(await pd.locator('[data-id="vin"]').innerText()), 'conflit : le propriétaire reçoit la version à jour (vin d\'honneur 16:15 – 18:45)');
    const refusInv = await ps.evaluate(async e => (await fetch('/api/espaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'inviter', espace: e, role: 'editor' }) })).status, C);
    ok(refusInv === 403, 'Sam (coordination) ne peut pas inviter une autre coordination : refusé par le serveur (' + refusInv + ')');
    ok((await sec.request.get(B + '/api/demandes')).status() === 404, 'Sam, membre du projet : aucune demande du site (404)');
    await pd.reload({ waitUntil: 'networkidle' }); await pd.waitForSelector('.tp-m');
    ok(/15:15 – 16:00/.test(await pd.locator('[data-id="ceremonie"]').innerText()), 'actualiser le Programme : les gestes sont gardés (persistance)');
    ok(await large(ps) <= 1, 'Programme sur iPhone (Sam) : aucun défilement horizontal');
    await axe(pd, 'Programme (ordinateur)'); await axe(ps, 'Programme (iPhone, Sam)');
    await capture(pd, 'CONTINU__2-programme-proprietaire'); await capture(ps, 'CONTINU__3-programme-sam-iphone');

    console.log('11. Retour vers AI puis ME : cohérent');
    await pd.click('#projet [data-vers-ai]'); await pd.waitForSelector('#espaces:not([hidden])');
    await pd.waitForFunction(() => /Mariage de Nora/.test(document.getElementById('liste').textContent) && !document.getElementById('traitees').hidden, null, { timeout: 8000 }).catch(() => {});
    ok(/Mariage de Nora \(test\)/.test(await pd.locator('#liste').innerText()), 'AI : le projet est dans « Mes projets et participations »');
    ok(/Demandes traitées \(1\)/.test(await pd.locator('#traitees').innerText()), 'AI : la demande est dans « Demandes traitées »');
    ok(JSON.stringify(await dock(pd)) === JSON.stringify(['AI', 'ME']), 'AI : le Dock personnel AI · + · ME');
    await pd.locator('#dock-site a[data-lieu="me"]').focus(); await pd.keyboard.press('Enter'); await pd.waitForURL(/\/compte\/$/); await pd.waitForSelector('#profil:not([hidden])');
    ok((await titre(pd)) === 'ME', 'ME s\'ouvre depuis le Dock, au clavier');
    await pd.locator('#dock-site a[data-lieu="ai"]').click(); await pd.waitForURL(/\/projets\/$/); await pd.waitForSelector('#espaces:not([hidden])');
    ok((await titre(pd)) === 'AI', 'et AI revient depuis le Dock');

    console.log('12. Lien direct, actualisation, Retour et Suivant');
    const pl = await proD.newPage(); await pl.goto(B + '/projets/?espace=' + C + '&page=deroule', { waitUntil: 'networkidle' }); await pl.waitForSelector('.tp-m');
    ok(/Mariage de Nora/.test(await titre(pl)) && (await pl.locator('#pTitre').textContent()) === 'Programme', 'lien direct vers le Programme du projet');
    await pl.goto(B + '/projets/?demande=' + dm.cle, { waitUntil: 'networkidle' }); await pl.waitForSelector('#dTitre');
    ok(await pl.locator('#dCorps button[data-ouvrir="' + C + '"]').count() === 1, 'lien direct vers la demande : elle mène au projet créé');
    await pl.click('#dCorps button[data-ouvrir="' + C + '"]'); await pl.waitForFunction(() => /Mariage de Nora/.test(document.getElementById('tTitre').textContent));
    await pl.goBack(); await pl.waitForSelector('#dTitre'); ok(true, 'Retour : la demande');
    await pl.goForward(); await pl.waitForFunction(() => /Mariage de Nora/.test(document.getElementById('tTitre').textContent)); ok(true, 'Suivant : le projet');
    await pl.reload({ waitUntil: 'networkidle' }); await pl.waitForFunction(() => /Mariage de Nora/.test(document.getElementById('tTitre').textContent));
    ok((await dock(pl)).includes('Mon accès'), 'actualiser le projet : le même projet, avec son Dock');
    await ps.reload({ waitUntil: 'networkidle' }); await ps.waitForSelector('.tp-m');
    ok(/16:15 – 18:45/.test(await ps.locator('[data-id="vin"]').innerText()), 'Sam actualise sur iPhone : le Programme à jour');
    await ps.click('#projet [data-vers-ai]'); await ps.waitForSelector('#espaces:not([hidden])'); await attendre(500);
    ok(await ps.locator('#aTraiter').isHidden() && /Mariage de Nora/.test(await ps.locator('#liste').innerText()), 'l\'AI de Sam : son projet, sans « À traiter »');
    ok(await large(ps) <= 1, 'AI de Sam sur iPhone : aucun défilement horizontal');
  } catch (e) { echecs++; console.error(e); }
  await b.close(); await pool.end(); try { srv.kill(); } catch {}
  console.log(echecs ? '\nparcours continu : ' + echecs + ' échec(s)' : '\nparcours continu : tout est vert');
  process.exit(echecs ? 1 : 0);
})();
