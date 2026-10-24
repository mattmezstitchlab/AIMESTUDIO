/* Parcours V1 dans un vrai navigateur (ordinateur, téléphone, mouvement réduit), sur le serveur de test.
   Échoue (code 1) à la première rupture. Usage : node scripts/serveur-test.cjs & node tests/navigateur/parcours.cjs
   Variables : BASE (défaut http://localhost:8771), CHROMIUM (chemin d'un Chromium, sinon celui de Playwright). */
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://localhost:8771';
const echecs = [], ok = (c, m) => { if (!c) echecs.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const IGNORE = /fonts\.g|Failed to load resource|Blocked script execution|net::ERR/;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  for (const [n, vp, rm] of [['ordinateur', { width: 1440, height: 900 }, false], ['téléphone', { width: 390, height: 844 }, false], ['mouvement réduit', { width: 1280, height: 800 }, true]]) {
    console.log('— ' + n);
    const ctx = await b.newContext({ viewport: vp, reducedMotion: rm ? 'reduce' : 'no-preference', isMobile: n === 'téléphone', hasTouch: n === 'téléphone' });
    const p = await ctx.newPage(), err = [];
    p.on('pageerror', e => err.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) err.push(m.text()); });
    const deborde = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    // pages principales : chargées, sans erreur, sans débordement
    for (const u of ['/', '/contact/', '/exemples/', '/exemples/mosaique/', '/exemples/?u=world', '/exemples/?u=seminaire', '/exemples/?u=g44', '/exemples/?u=stitch', '/exemples/?u=magazine', '/exemples/?u=regie', '/exemples/?u=studio', '/lab/grande-partition/', '/point-zero/', '/aime/', '/bureau/espace/', '/cube/', '/canevas/', '/reseau/', '/compte/', '/maitre/', '/magazine/', '/magazine/edito.html']) {
      await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); ok(!(await deborde()), u + ' sans débordement horizontal');
    }
    // le Dock unique (docs/IDENTITE.md) : en haut seulement le logo
    await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !document.querySelector('.barre #porte, .barre .compte-d') && !document.getElementById('entrer')), 'accueil : en haut seulement le logo, plus de « Et maintenant ? »');
    // le Dock public et la carte du + (décision de Matt, 24/10) : le Dock garde les lieux, le + garde les actions
    ok(await p.evaluate(() => [...document.querySelectorAll('#dock-site .dock-e .dock-t')].map(x => x.textContent).join(' · ') === 'Le cœur · Exemples · J\'ai un compte'), 'Dock, pas connecté : Le cœur · Exemples · + · J\'ai un compte');
    await p.click('#dock-site .dock-plus'); await p.waitForTimeout(300);
    const carte = await p.evaluate(() => { const m = document.querySelector('#dock-site .dock-menu'), g = [...m.querySelectorAll('.dock-g')].map(a => a.textContent.trim()), d = document.querySelector('#dock-site .dock').getBoundingClientRect(), r = m.getBoundingClientRect(), lieux = [...document.querySelectorAll('#dock-site .dock-e .dock-t')].map(x => x.textContent);
      return { g, dessus: r.bottom <= d.top + 1 && r.top >= 0 && r.left >= 0 && r.right <= innerWidth, carte: m.classList.contains('dock-carte'), double: g.some(x => lieux.includes(x)) }; });
    ok(carte.carte && carte.g.join(' · ') === 'Créer un projet · J\'ai reçu une invitation' && !carte.double, 'le + : une carte, deux gestes, aucune entrée du Dock en double (' + carte.g.join(' · ') + ')');
    ok(carte.dessus, 'le + : la carte est au-dessus du Dock, dans l\'écran');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelector('#dock-site .dock-menu').hidden && document.activeElement === document.querySelector('#dock-site .dock-plus')), 'le + : Échap ferme la carte et rend le focus au +');
    await p.click('#dock-site .dock-plus'); await p.waitForTimeout(150); await p.click('#dock-site .dock-plus'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelector('#dock-site .dock-menu').hidden), 'le + : retoucher le + ferme la carte');
    await p.click('#dock-site .dock-plus'); await p.waitForTimeout(150); await p.mouse.click(20, 200); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelector('#dock-site .dock-menu').hidden), 'le + : toucher ailleurs ferme la carte');
    await p.click('#dock-site .dock-plus'); await p.waitForTimeout(150); await p.click('#dock-site [data-geste=creerProjet]'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'jsChoix'), '« Créer un projet » : jusqu\'à « Je suis… »');
    // « J'ai reçu une invitation » : un lien collé mène à l'invitation ; un texte quelconque est refusé, sans navigation
    await p.click('#dock-site .dock-plus'); await p.waitForTimeout(150); await p.click('#dock-site [data-geste=invitationRecue]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => /Ouvrez le lien reçu par e-mail ou par message\./.test(document.querySelector('#dock-site [data-invitation]').textContent) && document.activeElement.type === 'url'), 'invitation : le champ s\'ouvre, avec la phrase');
    await p.keyboard.type('bonjour'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    ok(new URL(p.url()).pathname === '/' && await p.evaluate(() => !!document.querySelector('#dock-site .dock-inv-e').textContent), 'invitation : un texte qui n\'est pas un lien est refusé, sans quitter la page');
    const T = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
    await p.fill('#dock-site [data-invitation] input', B + '/projets/?invitation=' + T); await p.keyboard.press('Enter'); await p.waitForURL(/invitation=/, { timeout: 5000 }).catch(() => {});
    ok(/\/projets\/\?invitation=AbCdEfGhIjKlMnOpQrStUvWxYz012345$/.test(p.url()), 'invitation : le lien collé mène à /projets/?invitation=…');
    await p.goto(B + '/exemples/?commencer=1', { waitUntil: 'networkidle' }).catch(() => {});
    await p.goto(B + '/?commencer=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'jsChoix'), '/?commencer=1 : le curseur est dans « Je suis… »');
    await p.goto(B + '/contact/', { waitUntil: 'networkidle' }); ok(await p.evaluate(() => !!document.querySelector('#formContact [name=site_web]') && !!document.getElementById('dock-site')), '/contact/ : le formulaire a déménagé, avec le Dock');
    // le Point Zéro et la Grande Partition ont le même + unique (le Bureau est supprimé : /bureau/ → /projets/)
    for (const u of ['/point-zero/', '/lab/grande-partition/']) { await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('#dock-site .dock-plus') && !document.querySelector('#porte .ap-b') && !(document.getElementById('dock') && document.getElementById('dock').offsetHeight)), u + ' : un seul Dock, un seul +, plus de porte'); }
    // PR C (iPhone 393×659) : « Je suis… » → la démo ; aucun appel au serveur avant « Créer » (seul le Dock lit /api/identite) ;
    // le bouton sous la démo, puis le champ e-mail, restent au-dessus du Dock
    if (n === 'téléphone') { const q = await b.newContext({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true }), t = await q.newPage(), api = [];
      t.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) api.push(r.method() + ' ' + u.pathname); });
      await t.goto(B + '/', { waitUntil: 'networkidle' }); await t.click('#dock-site .dock-plus'); await t.waitForTimeout(250); await t.click('#dock-site [data-geste=invitationRecue]'); await t.waitForTimeout(250);
      ok(await t.evaluate(() => { const m = document.querySelector('#dock-site .dock-menu').getBoundingClientRect(), d = document.querySelector('#dock-site .dock').getBoundingClientRect(); return m.bottom <= d.top + 1 && m.top >= 0 && m.left >= 0 && m.right <= innerWidth; }), 'le + (393×659) : la carte et le champ d\'invitation restent au-dessus du Dock, dans l\'écran');
      await t.keyboard.press('Escape'); api.length = 0;
      await t.selectOption('#jsChoix', 'maries'); await t.waitForSelector('#demo .dm-tel.choisi'); await t.waitForTimeout(500);
      const dessus = sel => t.evaluate(async s => { const x = document.querySelector(s); x.scrollIntoView({ block: 'nearest' }); await new Promise(r => setTimeout(r, 120)); const d = document.querySelector('#dock-site .dock').getBoundingClientRect().top, r = x.getBoundingClientRect(); return r.height > 0 && r.bottom <= d + 1 && r.top >= 0; }, sel);
      ok(await dessus('#jsCreer'), 'accueil (393×659) : « Créer notre mariage », sous la démo, reste au-dessus du Dock');
      ok(api.every(x => x === 'GET /api/identite'), 'accueil : aucun appel au serveur avant « Créer » (seul le Dock lit /api/identite)' + (api.length ? ' (' + [...new Set(api)].join(', ') + ')' : ''));
      await t.click('#jsCreer'); await t.waitForSelector('#jsLien:not([hidden])', { timeout: 4000 }).catch(() => {});
      ok(await t.evaluate(() => !document.getElementById('jsLien').hidden && document.activeElement && document.activeElement.id === 'jsEmail'), 'accueil : sans session, « Créer » demande l\'adresse du lien de connexion');
      ok(await dessus('#jsLien button'), 'accueil (393×659) : « Recevoir le lien » reste au-dessus du Dock');
      ok(!api.some(x => /espaces|sign-in/.test(x)), 'accueil : rien n\'est créé ni envoyé avant l\'adresse');
      await q.close(); }
    // la mosaïque (démonstration) : aucun son avant le premier geste ; « Activer » lance les téléphones, sans erreur
    { const m = await ctx.newPage(), em = []; m.on('pageerror', e => em.push(e.message));
      await m.addInitScript(() => { window.__sons = 0; const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const W = function (...a) { window.__sons++; return new A(...a) }; W.prototype = A.prototype; window.AudioContext = W; window.webkitAudioContext = W; });
      await m.goto(B + '/exemples/mosaique/', { waitUntil: 'networkidle' }); await m.waitForTimeout(1200);
      ok(await m.evaluate(() => window.__sons === 0), 'mosaïque : aucun son avant le premier geste');
      ok(await m.evaluate(() => /Démonstration · données fictives/.test(document.body.innerText)), 'mosaïque : la mention de démonstration est visible');
      await m.getByRole('button', { name: /Activer/ }).first().click(); await m.waitForTimeout(1500);
      ok(await m.evaluate(() => window.__sons >= 1), 'mosaïque : « Activer » ouvre le son');
      ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'mosaïque : sans débordement après activation');
      ok(em.length === 0, 'mosaïque : aucune erreur JavaScript' + (em.length ? ' (' + em[0] + ')' : '')); await m.close(); }
    // la coque de l'OS (Page Zéro, ?coque=1) : le Réseau épinglé ; le Canevas, le Studio et l'ancien générateur mis de côté ; ni Régie pour le public
    await p.goto(B + '/?coque=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    const dock = await p.$$eval('#dockApps [data-app]', a => a.map(x => x.dataset.app));
    ok(dock.includes('reseau') && !dock.includes('canevas'), 'coque : Réseau, sans le Canevas mis de côté'); ok(!dock.includes('sites'), 'coque : pas l\'ancien générateur');
    // l'ancien Bureau (« aime-os ») survit à l'ouverture et à la fermeture d'une fenêtre
    const ANCIEN = JSON.stringify({ folders: [{ id: 'f1', n: 'Mariage' }], memos: ['penser au sax'], me: { nom: 'Matt' } });
    await p.evaluate(v => localStorage.setItem('aime-os', v), ANCIEN);
    await p.goto(B + '/?coque=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    await p.click('#dockApps [data-app="reseau"]').catch(() => {}); await p.waitForTimeout(800);
    await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(500);
    const garde = await p.evaluate(() => ({ a: localStorage.getItem('aime-os'), v2: localStorage.getItem('aime-os-zero') }));
    ok(garde.a === ANCIEN, 'ancienne clé « aime-os » intacte après une fenêtre ouverte');
    ok(!!garde.v2 && /fenetres/.test(garde.v2), 'coque : son état vit sous « aime-os-zero » (le Bureau supprimé, plus de « aime-os-v2 »)');
    await p.evaluate(() => { localStorage.removeItem('aime-os'); localStorage.removeItem('aime-os-zero') });
    // Point Zéro : une photo devient un projet (image dessinée dans la page, déposée comme un fichier)
    await p.goto(B + '/point-zero/', { waitUntil: 'networkidle' });
    ok(await p.$eval('[data-donnees]', e => /ce navigateur/.test(e.textContent) && !!e.querySelector('a[href="/bureau/espace/"]')).catch(() => false), 'Point Zéro : la mention « où sont mes données » est visible');
    await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 240; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#F3E9D8'; g.fillRect(0, 0, 240, 300); g.fillStyle = '#D2691E'; g.beginPath(); g.moveTo(120, 50); g.lineTo(200, 230); g.lineTo(40, 230); g.fill();
      const blob = await new Promise(r => c.toBlob(r, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'renard.png', { type: 'image/png' })); const i = document.querySelector('input[type=file]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); });
    // les confirmations arrivent au rythme de l'orbe : on attend chacune (au plus 20 s), puis on confirme
    const CONF = /^(Confirmer|Valider)/;
    for (let k = 0; k < 8; k++) {
      const h = await p.waitForFunction(re => [...document.querySelectorAll('button')].some(x => x.offsetParent && new RegExp(re).test(x.textContent.trim())) || [...document.querySelectorAll('a,button')].some(x => x.offsetParent && /Modifier dans le Canevas/.test(x.textContent)), CONF.source, { timeout: 20000 }).catch(() => null);
      if (!h) break; const fini = await p.evaluate(() => [...document.querySelectorAll('a,button')].some(x => x.offsetParent && /Modifier dans le Canevas/.test(x.textContent))); if (fini) break;
      await p.evaluate(re => { const x = [...document.querySelectorAll('button')].find(x => x.offsetParent && new RegExp(re).test(x.textContent.trim())); x && x.click(); }, CONF.source); await p.waitForTimeout(600);
    }
    const lien = await p.$('a:has-text("Modifier dans le Canevas"), button:has-text("Modifier dans le Canevas")'); ok(!!lien, 'Point Zéro : le projet propose « Modifier dans le Canevas »');
    if (lien) { await lien.evaluate(e => e.click()); await p.waitForURL(/\/canevas\/\?site=/, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(2500); ok(/Mini-site/.test(await p.textContent('body')), 'Canevas : le mini-site du projet est ouvert'); }
    // Design System (démonstration) : une direction en un clic, contenu identique, annulation, puis l'aperçu du projet relit le choix
    if (lien && await p.$('.cvs-ds-b')) {
      const ds = await p.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); 
        document.querySelector('.cvs-ds-b').click(); await w(500); const r = [...document.querySelectorAll('.cvs-ds input')].map(i => i.value);
        const lu = () => (document.querySelector('.cvs-if').contentDocument.querySelector('style').textContent.match(/--c1:[^;]+/) || [''])[0];
        const avant = lu(); document.querySelector('.cvs-ds input[value=aime-editorial]').click(); await w(1200); const apres = lu();
        document.querySelector('[data-a=annuler]').click(); await w(1000); const annule = lu();
        document.querySelector('.cvs-ds input[value=aime-editorial]').click(); await w(1000);
        const b = [...document.querySelectorAll('.cvs-barre button')].find(x => /Enregistrer/.test(x.textContent)); if (b) b.click(); await w(400);
        return { r, avant, apres, annule, dit: document.querySelector('.cvs-ds-dit').textContent }; });
      ok(ds.r.length === 5 && ds.apres === '--c1:#99472C' && ds.annule === ds.avant, 'Canevas : Design System Éditorial appliqué puis annulé (' + ds.avant + ' → ' + ds.apres + ' → ' + ds.annule + ')');
      ok(/contenu n'a pas changé/.test(ds.dit), 'Canevas : le contenu reste identique');
      const pid = new URL(p.url()).searchParams.get('projet');
      await p.goto(B + '/projet/?id=' + encodeURIComponent(pid), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
      const c1 = await p.evaluate(() => { const f = document.getElementById('site'); return f && f.srcdoc ? (f.srcdoc.match(/--c1:[^;]+/) || [''])[0] : ''; });
      ok(c1 === '--c1:#99472C', 'Projet : l\'aperçu montre le Design System enregistré (' + c1 + ')');
    }
    // Studio Publication (M1) : créer, appliquer un gabarit, modifier un titre, remplacer une image, ajouter et réordonner une page, enregistrer, recharger, lire
    await p.goto(B + '/canevas/?publication=nouvelle', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    ok(!!(await p.$('.pub-g')) && !!(await p.$('.pub-d')) && !!(await p.$('.pub-cf')) && !!(await p.$('.pub-scene')), 'Studio Publication : structure, propriétés, chemin de fer, composition');
    const pubR = await p.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
      qa('.pub-cf-p')[1].click(); await w(700); q('#pub-tab-gabarits').click(); await w(200);
      qa('.pub-gab').find(g => /Article/.test(g.textContent)).querySelector('button').click(); await w(900);
      q('#pub-tab-pages').click(); await w(200); qa('.pub-bl').find(b => /Titraille/.test(b.textContent)).click(); await w(400);
      const t = qa('.pub-d input').find(i => /Titre/.test(i.closest('label').textContent)); t.value = 'Un *catalogue* d\'atelier'; t.dispatchEvent(new Event('input', { bubbles: true })); await w(800);
      const titre = q('.pub-if').contentDocument.querySelector('.pl-titraille .tt-t').innerHTML;
      qa('.pub-bl').find(b => /Image/.test(b.textContent)).click(); await w(300); q('#pub-tab-medias').click(); await w(400); q('.pub-med').click(); await w(800);
      const img = !!q('.pub-if').contentDocument.querySelector('.pl-image img');
      qa('.pub-cf-p')[0].click(); await w(700); q('.pub-cf-a select').value = 'page-texte'; qa('.pub-cf-a button').find(b => /\+ Page/.test(b.textContent)).click(); await w(700); qa('.pub-cf-a button').find(b => b.getAttribute('aria-label') === 'Reculer la page').click(); await w(700);
      const ordre = qa('.pub-cf-p').map(b => b.textContent), courant = q('.pub-cf-p.on').textContent;
      qa('.pub-barre button').find(b => /Enregistrer/.test(b.textContent)).click(); await w(400);
      const o = JSON.parse(localStorage.getItem('aime-sites')), id = Object.keys(o.sites).find(k => /^pub-/.test(k)); return { titre, img, ordre, courant, id, n: id && o.sites[id].pages.length }; });
    ok(/<em>catalogue<\/em>/.test(pubR.titre) && pubR.img, 'Studio Publication : gabarit appliqué, titre et image modifiés');
    ok(pubR.n === 3 && /Page de texte/.test(pubR.ordre.at(-1)) && /Page de texte/.test(pubR.courant) && /Ouverture/.test(pubR.ordre[1]), 'Studio Publication : page ajoutée puis réordonnée (' + pubR.ordre.join(' / ') + ')');
    await p.goto(B + '/canevas/?publication=' + pubR.id, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    ok(/Enregistré sur cet appareil/.test(await p.textContent('.pub-etat')) && (await p.$$('.pub-cf-p')).length === 3, 'Studio Publication : retrouvée à l\'identique après rechargement');
    await p.goto(B + '/publication/?id=' + pubR.id + '&vue=tel', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => { const f = document.getElementById('doc'); return /class="planche/.test(f.srcdoc) && document.querySelector('.lp-cadre').classList.contains('tel') && !/data-sec=/.test(f.srcdoc); }), 'Lecture : vue publique, aperçu téléphone');
    // Réseau : la carte du projet, puis un module ajouté après les sept vérifications
    await p.goto(B + '/reseau/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    ok((await p.$$('.rx-carte')).length > 0, 'Réseau : la carte du projet');
    await p.click('[role=tab]:nth-child(5)'); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); const c = document.querySelector('.rx-carte'); [...c.querySelectorAll('button')].find(b => /Ajouter/.test(b.innerText)).click(); await w(1200);
      const v = [...document.querySelectorAll('.rx-ver li')].map(l => l.className); const conf = [...document.querySelectorAll('.rx-voile button')].find(b => /Confirmer/.test(b.innerText)); if (conf) conf.click(); await w(800); return v; });
    ok(r.length === 7 && r.every(x => x === 'ok'), 'Réseau : sept vérifications au vert avant l\'ajout');
    // Cube Maître : six facettes réelles ; le visiteur n'a ni la facette Comptes ni de lien vers la Régie ; le Canevas l'ouvre déplié
    await p.goto(B + '/maitre/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    const cm = await p.evaluate(() => ({ faces: document.querySelectorAll('#mc-cube .cv3-f').length, posees: document.querySelectorAll('#mc-cube .cv3-f.pose').length, regie: [...document.querySelectorAll('a')].some(a => /^\/regie/.test(a.getAttribute('href') || '')) }));
    ok(cm.faces === 6 && cm.posees === 5 && !cm.regie, 'Cube Maître : six faces, cinq lues par le visiteur, aucun lien vers la Régie');
    await p.focus('#mc-cube .cv3-f[data-f="moteurs"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    ok(/Moteurs/.test(await p.textContent('#mc-pan h2')), 'Cube Maître : au clavier, une face ouvre sa fiche');
    await p.goto(B + '/canevas/?maitre=sante&de=/maitre/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    ok(/Cube Maître/.test(await p.textContent('.cv-titre')), 'Canevas : le Cube Maître s\'ouvre déplié');
    // Le cœur : un seul projet, quatre écrans ; écrire une fois recompose les quatre, le jour J se recale pour chacun
    await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.evaluate(() => document.getElementById('ecrans').scrollIntoView()); await p.waitForSelector('#droitsCorps tr'); await p.waitForTimeout(800);
    await p.fill('#srcTitre', 'Inès & Théo'); await p.waitForTimeout(1200);
    ok((await Promise.all(p.frames().filter(f => f.url() === 'about:srcdoc').map(f => f.evaluate(() => /Inès & Théo/.test(document.body.textContent))))).filter(Boolean).length === 4, 'Accueil : le nom écrit une fois apparaît sur les quatre écrans');
    await p.click('#jourPluie'); await p.waitForTimeout(400); ok(/plan B/.test(await p.textContent('#jourTrace')) && (await p.$$('#jourVues li.change')).length >= 3, 'Accueil : l\'averse recale le jour J pour chacun');
    ok(!(await deborde()), 'Accueil (cœur) : sans débordement horizontal');
    // Les exemples : la même mécanique avec six rôles (World), six écrans composés par le moteur
    await p.goto(B + '/exemples/?u=world', { waitUntil: 'networkidle' }); await p.evaluate(() => document.getElementById('ecrans').scrollIntoView()); await p.waitForSelector('#droitsCorps tr'); await p.waitForTimeout(1200);
    ok((await Promise.all(p.frames().filter(f => f.url() === 'about:srcdoc').map(f => f.evaluate(() => /Inès &amp; Théo|Inès & Théo/.test(document.body.textContent))))).filter(Boolean).length === 6, 'Exemples : six écrans composés depuis la même source (World)');
    ok((await p.$$('#droitsTete th')).length === 7, 'Exemples : le tableau des droits a une colonne par rôle');
    // Neuf rôles (Studio) : neuf écrans en rangée ; la quantité écrite une fois ne paraît que chez qui la voit
    await p.goto(B + '/exemples/?u=studio', { waitUntil: 'networkidle' }); await p.evaluate(() => document.getElementById('ecrans').scrollIntoView()); await p.waitForSelector('#droitsCorps tr'); await p.waitForTimeout(1200);
    ok((await p.$$('#ecransGrille .tel')).length === 9 && (await p.$$('#droitsTete th')).length === 10, 'Exemples : neuf écrans et neuf colonnes (Studio)');
    ok(!(await deborde()), 'Exemples (Studio) : sans débordement horizontal de la page');
    await p.fill('#src-exemplaires', '4321'); await p.waitForTimeout(900);
    { const t = await Promise.all(p.frames().filter(f => f.url() === 'about:srcdoc').map(f => f.evaluate(() => /4\s?321/.test(document.body.textContent))));
      ok(t.filter(Boolean).length === 4, 'Exemples (Studio) : la quantité paraît chez les quatre rôles qui voient le bon à tirer, et chez eux seuls'); }
    // Premier écran (PR C) : chaque choix de « Je suis… » affiche des téléphones, le rôle choisi au centre ; un seul bouton, selon le rôle
    await p.goto(B + '/', { waitUntil: 'networkidle' });
    const choix = await p.evaluate(() => [...document.querySelectorAll('#jsChoix option')].map(o => o.value).filter(Boolean));
    const vus = [];
    for (const v of choix) { await p.selectOption('#jsChoix', v); await p.waitForTimeout(250);
      const r = await p.evaluate(() => ({ n: document.querySelectorAll('#demo .dm-tel').length, c: !!document.querySelector('#demo .dm-tel.choisi'), b: (document.getElementById('jsCreer') || {}).textContent || '', inv: !!document.querySelector('#jsSuite .js-invit'), vis: !document.getElementById('demo').hidden }));
      if (!(r.vis && r.n >= 7 && r.c && (v === 'invite' ? r.inv && !r.b : r.b))) vus.push(v); }
    ok(choix.length === 11 && vus.length === 0, 'Accueil : les ' + choix.length + ' choix de « Je suis… » affichent chacun des téléphones et un seul bouton' + (vus.length ? ' (' + vus.join(', ') + ')' : ''));
    await p.selectOption('#jsChoix', 'metier:fleuriste'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => /Créer mon espace fleuriste/.test(document.getElementById('jsCreer').textContent) && /fleuriste/.test(document.querySelector('#demo .dm-tel.choisi .dm-leg b').textContent)), 'Accueil : un métier, le gabarit prestataire avec ses mots (vitrine/metiers.json)');
    await p.selectOption('#jsChoix', 'metier:musicien-intermittent'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => /en préparation/i.test(document.getElementById('demo').textContent)), 'Accueil : le module intermittent est marqué « en préparation »');
    await p.selectOption('#jsChoix', 'invite'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.getElementById('jsCreer') && /Ce rôle arrive par invitation/.test(document.getElementById('jsSuite').textContent)), 'Accueil : invité·e, pas d\'inscription');
    await p.selectOption('#jsChoix', 'coordination'); await p.waitForTimeout(200);
    await p.click('#dmGo'); await p.waitForTimeout(rm ? 900 : 2600);
    ok(await p.evaluate(() => !document.getElementById('dmSon').hidden && document.getElementById('dmGo').hidden), 'Accueil : « Activer la démo » lance le scénario ; le bouton du son paraît');
    await p.click('#dmSon'); ok(await p.getAttribute('#dmSon', 'aria-pressed') === 'true', 'Accueil : le son se coupe');
    await p.waitForFunction(() => document.querySelectorAll('#demo .nt').length > 0, null, { timeout: 15000 }).catch(() => {});
    ok(await p.evaluate(() => document.querySelectorAll('#demo .nt').length > 0), 'Accueil : les notifications arrivent sur les téléphones concernés');
    // les deux vidéos : rien en lecture automatique, preload="none", sous-titres par défaut, Échap ferme
    await p.click('[data-video="aime-film"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const d = document.getElementById('lecteur'), v = document.getElementById('lecteurVideo'), tr = v.querySelector('track'); return d.open && v.paused && v.preload === 'none' && !v.autoplay && /aime-film\.mp4$/.test(v.src) && tr && tr.default && tr.srclang === 'fr'; }), 'Accueil : la vidéo s\'ouvre sans lecture automatique, preload="none", sous-titres par défaut');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.getElementById('lecteur').open && document.activeElement && document.activeElement.getAttribute('data-video') === 'aime-film'), 'Accueil : Échap ferme le lecteur et rend le focus à la vignette');
    ok(await p.evaluate(() => !document.getElementById('acApercu') && ![...document.querySelectorAll('a[href]')].some(a => /\/(sites|studio|canevas|bureau|lab|aime)\//.test(a.getAttribute('href')))), 'Accueil : ni aperçu de mini-site ni lien vers les outils mis de côté');
    // les anciens essais de ce navigateur : rien ne se perd, ils paraissent dans Mes projets, « Sur cet appareil », sans être envoyés
    await p.goto(B + '/projets/', { waitUntil: 'networkidle' });
    await p.evaluate(() => { const P = window.AIMEProjets; P.Depot(localStorage).enregistrer(P.versProjet({ titre: 'Léa & Marc', date: '2027-06-14', lieu: 'Chantilly', type: 'mariage', modele: 'mariage' })); });
    { const api2 = []; const h = r => { if (/\/api\/espaces/.test(r.url())) api2.push(r.url()); }; p.on('request', h);
      await p.goto(B + '/projets/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !document.getElementById('local').hidden && /Léa & Marc/.test(document.getElementById('localListe').textContent) && /sur cet appareil/.test(document.getElementById('localListe').textContent)), 'Mes projets : les anciens essais paraissent « Sur cet appareil »');
      ok(api2.length === 0, 'Mes projets : les essais ne sont pas envoyés au serveur sans geste'); p.off('request', h);
      await p.evaluate(() => localStorage.removeItem('aime-projets')); }
    await p.goto(B + '/', { waitUntil: 'networkidle' });
    ok(!(await deborde()), 'Accueil : sans débordement horizontal');
    // Canevas universel · Site : ouvrir un projet, choisir un bloc, voir sa source, changer de Design System, garder après rechargement
    await p.goto(B + '/sites/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800); if (await p.isVisible('#atelier')) await p.click('#nouveau'); await p.click('[data-demo="mariage"]'); await p.waitForTimeout(2500);
    ok(!(await deborde()), 'Canevas universel : sans débordement horizontal');
    ok((await p.$$('#bande .st-vg[data-page]')).length >= 2, 'Canevas universel : la bande montre les pages du site');
    await p.click('#sections [data-sel]'); await p.click('[data-onglet="source"]');
    ok(/Référence interne/.test(await p.textContent('#o-source')), 'Canevas universel : l\'en-tête lit les informations du site (référence interne)');
    await p.click('[data-onglet="style"]'); await p.click('[data-ds="aime-editorial"]'); await p.waitForTimeout(900);
    ok(await p.getAttribute('[data-ds="aime-editorial"]', 'aria-pressed') === 'true', 'Canevas universel : Design System appliqué');
    await p.click('[data-zoom="-"]'); ok(/75 %/.test(await p.textContent('#zoomVal')), 'Canevas universel : zoom');
    await p.click('[data-taille="390px"]'); ok(await p.evaluate(() => document.getElementById('apercu').style.width === '390px'), 'Canevas universel : aperçu téléphone');
    await p.waitForTimeout(400); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1800); await p.click('[data-onglet="style"]');
    ok(await p.getAttribute('[data-ds="aime-editorial"]', 'aria-pressed') === 'true', 'Canevas universel : le Design System est gardé après rechargement');
    await p.click('#exporter'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-exp="json"]')]);
    ok(/\.json$/.test(dl.suggestedFilename()), 'Canevas universel : sauvegarde .json');
    ok(err.length === 0, 'aucune erreur JavaScript' + (err.length ? ' : ' + err.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(echecs.length ? '\n' + echecs.length + ' échec(s)' : '\nparcours : tout est vert'); process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
