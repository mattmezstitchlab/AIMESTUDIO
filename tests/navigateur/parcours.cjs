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
    // le + unique du Dock (docs/IDENTITE.md) : en haut seulement le logo ; sans compte, « Commencer » met le curseur dans le champ d'intention
    await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !document.querySelector('.barre #porte, .barre .compte-d') && !document.getElementById('entrer')), 'accueil : en haut seulement le logo, plus de « Et maintenant ? »');
    await p.click('#dock-site .dock-plus'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => [...document.querySelectorAll('#dock-site .dock-menu [role=menuitem]')].map(a => a.textContent.trim())[0] === 'Commencer'), 'le + : « Commencer » sans compte');
    await p.click('#dock-site .dock-menu [data-commencer]'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'acTexte'), 'le + : le curseur est dans le champ d\'intention');
    await p.goto(B + '/exemples/?commencer=1', { waitUntil: 'networkidle' }).catch(() => {});
    await p.goto(B + '/?commencer=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'acTexte'), '/?commencer=1 : le curseur est dans le champ d\'intention');
    await p.goto(B + '/contact/', { waitUntil: 'networkidle' }); ok(await p.evaluate(() => !!document.querySelector('#formContact [name=site_web]') && !!document.getElementById('dock-site')), '/contact/ : le formulaire a déménagé, avec le Dock');
    // le Point Zéro et la Grande Partition ont le même + unique (le Bureau est supprimé : /bureau/ → /projets/)
    for (const u of ['/point-zero/', '/lab/grande-partition/']) { await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('#dock-site .dock-plus') && !document.querySelector('#porte .ap-b') && !(document.getElementById('dock') && document.getElementById('dock').offsetHeight)), u + ' : un seul Dock, un seul +, plus de porte'); }
    // le Dock ne cache rien : un champ qui reçoit le focus s'arrête au-dessus (iPhone 393×659, formulaire « Voici ce que j'ai compris ») ;
    // les fenêtres de Mes projets (ancien Bureau) aussi
    if (n === 'téléphone') { const q = await b.newContext({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true }), t = await q.newPage();
      await t.goto(B + '/', { waitUntil: 'networkidle' }); await t.fill('#acTexte', 'Le mariage de Léa et Marc, le 14 juin 2027 au Domaine des Aulnes, 120 invités'); await t.click('.ac-go'); await t.waitForTimeout(600);
      const caches = await t.evaluate(async () => { const dock = document.querySelector('#dock-site .dock').getBoundingClientRect().top, L = [...document.querySelectorAll('#acComprendre input, #acComprendre select, #acComprendre button')].filter(x => x.offsetParent); let k = [];
        for (const x of L) { x.focus(); await new Promise(r => setTimeout(r, 60)); const r = x.getBoundingClientRect(); if (r.bottom > dock + 1 || r.top < 0) k.push(x.id || x.textContent.trim()); } return { n: L.length, k }; });
      ok(caches.n > 0 && caches.k.length === 0, 'accueil (393×659) : chaque champ du formulaire, focalisé, reste au-dessus du Dock' + (caches.k.length ? ' (' + caches.k.join(', ') + ')' : ''));
      const dernier = await t.evaluate(() => { const L = [...document.querySelectorAll('#acComprendre input, #acComprendre select, #acComprendre button')].filter(x => x.offsetParent), x = L[L.length - 1]; x.focus(); return new Promise(r => setTimeout(() => r(x.getBoundingClientRect().bottom <= document.querySelector('#dock-site .dock').getBoundingClientRect().top), 80)); });
      ok(dernier, 'accueil (393×659) : le dernier champ, focalisé, reste au-dessus du Dock');
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
    // Premier écran : une phrase → ce qui est compris → un projet enregistré → sa page, retrouvée après rechargement
    await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.fill('#acTexte', 'Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly, 120 invités'); await p.click('.ac-go'); await p.waitForTimeout(500);
    ok(await p.inputValue('#acLieu') === 'Chantilly' && await p.inputValue('#acDate') === '2027-06-14', 'Accueil : l\'intention est comprise (date, lieu)');
    await p.click('#acOui'); await p.waitForFunction(() => /enregistré dans ce navigateur/.test(document.getElementById('acVivant').textContent), null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('aime-projets')); return !!o && Object.values(o.projets).some(x => x.format === 'aime-projet' && x.titre === 'Léa & Marc'); }), 'Accueil : un projet aime-projet v1 est enregistré');
    ok(await p.evaluate(() => !document.getElementById('acApercu') && ![...document.querySelectorAll('a[href]')].some(a => /\/(sites|studio|canevas|bureau|lab|aime)\//.test(a.getAttribute('href')))), 'Accueil : ni aperçu de mini-site ni lien vers les outils mis de côté');
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
