/* AIME · Acte VI (#build) : Un seul contenu → 5 matérialisations réelles dans la page
   1. Web & Design Systems v3 (AIMEDesign + retournement 3D vers le code HTML/CSS propre)
   2. Édition Magazine 12 × 16 (AIMESite.document + publication/planche.js)
   3. Imprimés au millimètre (Carte 85×55, Faire-part A6, Enveloppe C6, Menu, Marque-place)
   4. Point de croix & Fil DMC en direct (StitchConversion CIEDE2000 + StitchPatron + StitchRendu + StitchMesures)
   5. Dossiers causaux & Institutions (G44Moteur Rewind) + Devis structuré Factur-X EN 16931. */
(function() {
  'use strict';
  var V = window.AIMEVerticale;
  if (!V) return;
  var noyau = V.instance();
  var $ = function(id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* =========================================================================
     NAVIGATION ENTRE LES 5 SUPPORTS + SÉLECTEUR DESIGN SYSTEM V3
     ========================================================================= */
  var catalogueDS = null, ongletActif = 'web';

  var ongletsBar = $('supOnglets');
  if (ongletsBar) {
    ongletsBar.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-sup]');
      if (!b) return;
      ongletActif = b.getAttribute('data-sup');
      [].forEach.call(ongletsBar.querySelectorAll('button[data-sup]'), function(x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      ['web', 'magazine', 'print', 'stitch', 'g44'].forEach(function(id) {
        var pan = $('pan-' + id);
        if (pan) pan.hidden = id !== ongletActif;
      });
      rafraichirOngletCourant(noyau.lire());
    });
  }

  var dsBar = $('supDesignBtns');
  if (dsBar) {
    dsBar.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-ds]');
      if (!b) return;
      noyau.modifier({ design: b.getAttribute('data-ds') }, 'design');
    });
  }

  function chargerDesignSystems() {
    if (catalogueDS) return Promise.resolve(catalogueDS);
    if (!window.AIMEDesignCharger) return Promise.resolve({ compiles: {}, liste: [] });
    return window.AIMEDesignCharger().then(function(cat) {
      catalogueDS = cat;
      return cat;
    }).catch(function() {
      catalogueDS = { compiles: {}, liste: [] };
      return catalogueDS;
    });
  }

  /* =========================================================================
     1. GRILLE WEB 12 COLONNES + DESIGN SYSTEM V3 + CODE AU DOS (ROTATION 3D)
     ========================================================================= */
  function rendreWebEtDesign(snap) {
    var box = $('blocsWeb12'), preuve = $('dsPreuveEmpreinte');
    if (!box) return;
    if (dsBar) {
      [].forEach.call(dsBar.querySelectorAll('button[data-ds]'), function(b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-ds') === snap.etat.design));
      });
    }

    chargerDesignSystems().then(function(cat) {
      var sys = (cat.compiles && cat.compiles[snap.etat.design]) || null;
      var surface = sys && sys.couleurs ? sys.couleurs.surface : '#161620';
      var encre = sys && sys.couleurs ? sys.couleurs.texte : '#EDEDF0';
      var primaire = sys && sys.couleurs ? sys.couleurs.principale : snap.etat.palette[0];
      var rayon = sys && sys.rayons ? sys.rayons.surface + 'px' : '16px';
      var ratioAA = (window.AIMEDesign && window.AIMEDesign.contraste && sys && sys.couleurs)
        ? window.AIMEDesign.contraste(sys.couleurs.texte, sys.couleurs.surface).toFixed(2) + ':1'
        : '≥ 4.5:1';

      if (preuve) {
        preuve.textContent = 'Design : ' + snap.etat.design + ' · Contraste texte/surface : ' + ratioAA + ' · Contenu #' + snap.empreinte + ' (strictement invariant)';
      }

      var e = snap.etat;
      var blocs = [
        {
          large: true,
          etiquette: 'Héros · 12 colonnes',
          visuel: '<span style="font:600 11.5px var(--vt-mono);text-transform:uppercase;letter-spacing:.16em;color:' + esc(primaire) + '">' + esc(snap.casInfo.etiquette) + ' · ' + esc(e.date) + '</span>' +
            '<h3 style="margin:6px 0 4px;font:400 clamp(26px,3.2vw,40px)/1.05 var(--display)">' + esc(e.titre) + '</h3>' +
            '<p style="margin:0;opacity:.85;max-width:640px">' + esc(e.intention) + '</p>',
          code: '<header class="hero" data-regard="' + e.mode + '">\n  <p class="sur">' + e.date + ' · ' + e.lieu + '</p>\n  <h1>' + e.titre + '</h1>\n  <p>' + e.intention + '</p>\n</header>'
        },
        {
          large: false,
          etiquette: 'Programme filtré · 6 colonnes',
          visuel: '<span style="font:600 11.5px var(--vt-mono);color:' + esc(primaire) + '">CHRONOLOGIE AUTO</span>' +
            '<div style="display:grid;gap:6px;margin-top:8px;font-size:13.5px">' +
            snap.jalons.slice(1, 4).map(function(j) {
              return '<div><b>' + esc(j.ecart) + ' (' + esc(j.date) + ')</b> — ' + esc(j.titre) + '</div>';
            }).join('') + '</div>',
          code: '<section aria-label="Étapes">\n' + snap.jalons.slice(1, 4).map(function(j) {
            return '  <article><time datetime="' + j.date + '">' + j.ecart + '</time> ' + j.titre + '</article>';
          }).join('\n') + '\n</section>'
        },
        {
          large: false,
          etiquette: 'Accès selon le rôle · 6 colonnes',
          visuel: '<span style="font:600 11.5px var(--vt-mono);color:' + esc(primaire) + '">REGARD : ' + esc(snap.modeInfo.court.toUpperCase()) + '</span>' +
            '<p style="margin:8px 0 0;font-size:14px">' + esc(snap.modeInfo.indice) + '</p>' +
            '<p style="margin:6px 0 0;font:600 13px var(--vt-mono)">' +
            (e.mode === 'moi' || e.mode === 'coord'
              ? 'Budget consolidé : ' + snap.totalHT.toLocaleString('fr-FR') + ' € HT'
              : 'Budget : masqué par la politique d’accès') + '</p>',
          code: '/* Calculé avant mise en page par vitrine/rendu.js */\npolitique(contenu, acces, { regard: "' + snap.modeInfo.world + '" }, Permissions)\n// → Empreinte source : #' + snap.empreinte
        }
      ];

      box.innerHTML = blocs.map(function(b, i) {
        return '<div class="bloc-ret' + (b.large ? ' large' : '') + '" data-bloc="' + i + '" style="--ds-surface:' + esc(surface) + ';--ds-ink:' + esc(encre) + ';--ds-radius:' + esc(rayon) + '">' +
          '<div class="bloc-ret-in">' +
            '<div class="bloc-avant">' +
              '<div>' + b.visuel + '</div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:8px;border-top:1px solid rgba(150,150,170,.2)">' +
                '<small style="opacity:.75;font:500 11.5px var(--vt-mono)">' + esc(b.etiquette) + '</small>' +
                '<button type="button" class="vt-btn" data-flip="' + i + '" style="padding:5px 11px;font-size:12px">Retourner vers le HTML ↻</button>' +
              '</div>' +
            '</div>' +
            '<div class="bloc-dos" tabindex="0" role="region" aria-label="Code HTML généré du bloc ' + (i + 1) + '">' +
              '<pre>' + esc(b.code) + '</pre>' +
              '<div style="display:flex;justify-content:flex-end"><button type="button" class="vt-btn" data-flip="' + i + '" style="padding:5px 11px;font-size:12px">Revenir au visuel ↺</button></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    });
  }

  document.addEventListener('click', function(e) {
    var b = e.target.closest && e.target.closest('button[data-flip]');
    if (!b) return;
    var carte = b.closest('.bloc-ret');
    if (carte) carte.classList.toggle('retourne');
  });

  /* =========================================================================
     2. ÉDITION MAGAZINE 12 × 16 (AIMESite.document + publication/planche.js)
     ========================================================================= */
  var pubCache = null;
  function rendreMagazine(snap) {
    var frame = $('pubApercuFrame');
    if (!frame || !window.AIMEVitrine) return;
    var charger = pubCache
      ? Promise.resolve(pubCache)
      : Promise.all([
          fetch('/publication/exemples/aime-magazine-temoins.aime-site.json').then(function(r) { return r.json(); }),
          fetch('/vitrine/presentation/studio.json').then(function(r) { return r.json(); }),
          chargerDesignSystems()
        ]).then(function(r) { pubCache = r; return r; });

    charger.then(function(r) {
      var site = JSON.parse(JSON.stringify(r[0]));
      site.nom = snap.etat.titre;
      site.infos = site.infos || {};
      site.infos.titre = snap.etat.titre;
      site.infos.sousTitre = snap.etat.intention;
      if (site.pages && site.pages[0] && site.pages[0].sections) {
        site.pages[0].sections.forEach(function(sec) {
          if (sec.type === 'titraille') {
            sec.surtitre = snap.casInfo.etiquette + ' · ' + snap.etat.date;
            sec.titre = snap.etat.titre;
            sec.chapo = snap.etat.intention;
          }
        });
      }
      var pres = JSON.parse(JSON.stringify(r[1]));
      pres.systemes = r[2].compiles || {};
      var doc = window.AIMEVitrine.site.document(site, {
        unePage: true,
        presentation: pres,
        medias: '/sites/bibliotheque/'
      });
      frame.srcdoc = doc.html;
    }).catch(function() {});
  }

  var pubVueBtns = $('pubVueMode');
  if (pubVueBtns) {
    pubVueBtns.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-pvue]');
      if (!b) return;
      var tel = b.getAttribute('data-pvue') === 'tel';
      var wrap = $('pubCadreWrap');
      if (wrap) wrap.classList.toggle('tel', tel);
      [].forEach.call(pubVueBtns.querySelectorAll('button[data-pvue]'), function(x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
    });
  }

  /* =========================================================================
     3. SUPPORTS IMPRIMÉS AU MILLIMÈTRE (STUDIO)
     ========================================================================= */
  function rendrePrint(snap) {
    var box = $('printPlateauLive');
    if (!box) return;
    var e = snap.etat, c0 = e.palette[0] || '#FB7185', c2 = e.palette[2] || '#7C5CFF';
    box.innerHTML =
      '<div><div class="papier-cote">CARTE DE VISITE · 85 × 55 mm</div>' +
        '<article class="papier-objet" style="width:290px;min-height:188px;border-left:5px solid ' + esc(c0) + '">' +
          '<div><small>' + esc(e.roleAuteur) + '</small><h4>' + esc(e.titre) + '</h4></div>' +
          '<p>' + esc(e.lieu) + '<br><span style="opacity:.75">' + esc(e.contact) + '</span></p>' +
        '</article></div>' +
      '<div><div class="papier-cote">CARTON D’INVITATION · 148 × 105 mm (A6)</div>' +
        '<article class="papier-objet" style="width:360px;min-height:255px;border-top:6px solid ' + esc(c2) + '">' +
          '<div><small>' + esc(snap.casInfo.etiquette) + ' · ' + esc(e.date) + '</small>' +
          '<h4 style="font-size:26px;margin-top:8px">' + esc(e.titre) + '</h4>' +
          '<p style="margin-top:8px">' + esc(e.intention) + '</p></div>' +
          '<p><b>' + esc(e.lieu) + '</b> · Accès personnel sur votre espace AIME</p>' +
        '</article></div>' +
      '<div><div class="papier-cote">ENVELOPPE DOUBLÉE · C6 (162 × 114 mm) &amp; MENU DL</div>' +
        '<article class="papier-objet" style="width:310px;min-height:218px;background:linear-gradient(160deg,#FAF7F2 68%,' + esc(c0) + '22)">' +
          '<div><small>Timbre ' + esc(snap.initiales) + ' · Affranchissement dédié</small>' +
          '<h4>Pour Alice Morel</h4>' +
          '<p>14 rue des Rosiers · 75004 Paris</p></div>' +
          '<p>Expéditeur : <b>' + esc(e.titre) + '</b> · ' + esc(e.date) + '</p>' +
        '</article></div>';
  }

  /* =========================================================================
     4. BRODERIE & FIL DMC EN DIRECT (StitchConversion CIEDE2000 + StitchRendu)
     ========================================================================= */
  var dmcListe = null, stitchMode = 'simple', stitchLargeur = 44, stitchSurbrillance = 0, stitchImgData = null, dernierPatron = null;

  function imageEmblemeDepuisSnap(snap) {
    var S = 128, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var g = c.getContext('2d');
    g.fillStyle = '#F7F3EA';
    g.fillRect(0, 0, S, S);
    /* Couronne géométrique aux couleurs du projet */
    var pal = snap.etat.palette;
    g.strokeStyle = pal[0] || '#FB7185';
    g.lineWidth = 10;
    g.strokeRect(12, 12, S - 24, S - 24);
    g.fillStyle = pal[2] || '#7C5CFF';
    g.beginPath();
    g.arc(S / 2, S / 2, 40, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#FFFFFF';
    g.font = '700 40px "Cal Sans", Inter, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(snap.initiales, S / 2, S / 2 + 2);
    var d = g.getImageData(0, 0, S, S);
    return { l: S, h: S, data: d.data };
  }

  function chargerDMC() {
    if (dmcListe) return Promise.resolve(dmcListe);
    return fetch('/stitch/data/dmc.json').then(function(r) { return r.json(); }).then(function(j) {
      dmcListe = j.fils || j;
      if (window.StitchRendu) window.StitchRendu.tableDMC(dmcListe);
      return dmcListe;
    });
  }

  function rendreStitch(snap) {
    var cvBrode = $('stitchCanvasBrode'), cvGrille = $('stitchCanvasGrille'), leg = $('stitchLegende'), bilanEl = $('stitchBilan');
    if (!cvBrode || !cvGrille || !window.StitchConversion || !window.StitchPatron || !window.StitchRendu) return;

    chargerDMC().then(function(dmc) {
      var source = stitchImgData || imageEmblemeDepuisSnap(snap);
      var conv = window.StitchConversion.convertir(source, {
        mode: stitchMode,
        largeur: stitchLargeur,
        fond: 'auto',
        dmc: dmc
      });
      var patron = window.StitchPatron.depuisConversion(conv, {
        id: 'pat-verticale',
        titre: snap.etat.titre,
        createur: 'AIME Studio'
      });
      dernierPatron = patron;

      var tailleCase = Math.max(4, Math.floor(290 / patron.l));
      window.StitchRendu.apercu(cvBrode, patron, { case: tailleCase });

      var Wg = patron.l * tailleCase, Hg = patron.h * tailleCase;
      cvGrille.width = Wg;
      cvGrille.height = Hg;
      var gg = cvGrille.getContext('2d');
      window.StitchRendu.grille(gg, patron, { x: 0, y: 0, s: tailleCase }, Wg, Hg, {
        mode: 'mixte',
        surbrillance: stitchSurbrillance
      });

      var qtes = window.StitchPatron.quantites(patron);
      var mapNom = {};
      dmc.forEach(function(d) { mapNom[d.code] = d; });

      if (bilanEl) {
        bilanEl.textContent = patron.l + ' × ' + patron.h + ' points · ' + conv.rapport.points.toLocaleString('fr-FR') +
          ' croix · ' + patron.palette.length + ' échevettes DMC · ΔE00 moyen : ' + conv.rapport.fidelite.toFixed(1) + ' (' + conv.rapport.ms + ' ms)';
      }

      if (leg) {
        leg.innerHTML = qtes.map(function(q, i) {
          var info = mapNom[q.dmc] || { hex: '#888888', nom: '' };
          var actif = stitchSurbrillance === i + 1;
          return '<button type="button" class="stitch-fil" data-hl="' + (i + 1) + '" aria-pressed="' + actif + '">' +
            '<span style="display:inline-flex;align-items:center;gap:8px"><i class="stitch-pastille" style="background:' + esc(info.hex) + '"></i>' +
            '<span><b>DMC ' + esc(q.dmc) + '</b> <small style="color:var(--vt-soft)">' + esc(info.nom) + '</small></span></span>' +
            '<span style="font-family:var(--vt-mono);color:var(--vt-amber)">' + q.points + ' pts</span>' +
          '</button>';
        }).join('');
      }
    }).catch(function() {});
  }

  if ($('stitchLegende')) {
    $('stitchLegende').addEventListener('click', function(e) {
      var b = e.target.closest('button[data-hl]');
      if (!b) return;
      var idx = +b.getAttribute('data-hl');
      stitchSurbrillance = stitchSurbrillance === idx ? 0 : idx;
      rendreStitch(noyau.lire());
    });
  }
  if ($('stitchModes')) {
    $('stitchModes').addEventListener('click', function(e) {
      var b = e.target.closest('button[data-smode]');
      if (!b) return;
      stitchMode = b.getAttribute('data-smode');
      stitchSurbrillance = 0;
      [].forEach.call($('stitchModes').querySelectorAll('button[data-smode]'), function(x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      rendreStitch(noyau.lire());
    });
  }
  if ($('stitchLargeur')) {
    $('stitchLargeur').addEventListener('input', function() {
      stitchLargeur = +this.value || 44;
      if ($('stitchLargeurVal')) $('stitchLargeurVal').textContent = stitchLargeur + ' pts';
      rendreStitch(noyau.lire());
    });
  }
  if ($('stitchFichier')) {
    $('stitchFichier').addEventListener('change', function() {
      var f = this.files && this.files[0];
      if (!f) return;
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function() {
        var M = 180, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
        var w = Math.max(16, Math.round(im.naturalWidth * k)), h = Math.max(16, Math.round(im.naturalHeight * k));
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(u);
        stitchImgData = { l: w, h: h, data: c.getContext('2d').getImageData(0, 0, w, h).data };
        stitchSurbrillance = 0;
        rendreStitch(noyau.lire());
      };
      im.src = u;
    });
  }
  if ($('stitchOuvrirAtelier')) {
    $('stitchOuvrirAtelier').addEventListener('click', function() {
      if (dernierPatron && window.StitchPatron) {
        try {
          var b = JSON.parse(localStorage.getItem('stitch-brouillons') || '{}');
          b['pat-verticale'] = JSON.parse(window.StitchPatron.serialiser(dernierPatron));
          localStorage.setItem('stitch-brouillons', JSON.stringify(b));
        } catch (_) {}
      }
      if (window.AIMETiroir) {
        window.AIMETiroir.ouvrir({
          href: '/stitch/atelier/?brouillon=pat-verticale',
          titre: 'AIME Stitch · Atelier complet avec votre patron chargé'
        });
      }
    });
  }

  /* =========================================================================
     5. SIMULATION CAUSALE G44 (REWIND) & FACTUR-X EN 16931
     ========================================================================= */
  var dateSimulee = '2017-05-12';
  function rendreG44EtFacturX(snap) {
    var boxG44 = $('g44Resultat'), preFx = $('facturXPre');
    if (boxG44 && window.G44Moteur) {
      var M = window.G44Moteur;
      var init = M.etatInitial();
      var empAvant = M.empreinte(init);
      var sim = M.simuler(init, { objet: 'ev-mariage', valeur: dateSimulee });
      var empApresVerification = M.empreinte(init);
      var ecarts = M.comparer(init, sim.etat);

      boxG44.innerHTML =
        '<div style="padding:10px 12px;border-radius:10px;background:#101715;border:1px solid #244338;font:500 12px/1.45 var(--vt-mono);color:var(--vt-mint)">' +
          'Empreinte dossier initial : #' + esc(empAvant) + ' · Après simulation isolée : #' + esc(empApresVerification) +
          ' (0 mutation sur l’original) · ' + ecarts.length + ' impact(s) calculé(s)' +
        '</div>' +
        '<ul class="g44-ecarts">' +
          ecarts.slice(0, 5).map(function(ec) {
            return '<li><b style="color:var(--vt-ink)">' + esc(ec.objet || ec.id || 'Champ impacté') + '</b> · ' +
              '<span style="color:var(--vt-soft)">' + esc(ec.champ || '') + ' : </span>' +
              '<code style="color:var(--vt-rose)">' + esc(String(ec.avant != null ? ec.avant : '')) + '</code> → ' +
              '<code style="color:var(--vt-cyan)">' + esc(String(ec.apres != null ? ec.apres : '')) + '</code></li>';
          }).join('') +
          (sim.incoherences && sim.incoherences.length
            ? '<li style="border-color:var(--vt-amber)"><b style="color:var(--vt-amber)">Contrôle humain requis :</b> ' +
              esc(sim.incoherences.map(function(i) { return i.regle + ' — ' + (i.message || i.raison || 'vérification sur pièce'); }).join(' · ')) + '</li>'
            : '') +
        '</ul>';
    }
    if (preFx) {
      preFx.textContent = noyau.facturX();
    }
  }

  if ($('g44DatesBtns')) {
    $('g44DatesBtns').addEventListener('click', function(e) {
      var b = e.target.closest('button[data-gdate]');
      if (!b) return;
      dateSimulee = b.getAttribute('data-gdate');
      [].forEach.call($('g44DatesBtns').querySelectorAll('button[data-gdate]'), function(x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      rendreG44EtFacturX(noyau.lire());
    });
  }
  if ($('btnTelechargerFacturX')) {
    $('btnTelechargerFacturX').addEventListener('click', function() {
      var xml = noyau.facturX(), snap = noyau.lire();
      var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'factur-x-' + snap.contrat.id + '.xml';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    });
  }

  function rafraichirOngletCourant(snap) {
    if (ongletActif === 'web') rendreWebEtDesign(snap);
    else if (ongletActif === 'magazine') rendreMagazine(snap);
    else if (ongletActif === 'print') rendrePrint(snap);
    else if (ongletActif === 'stitch') rendreStitch(snap);
    else if (ongletActif === 'g44') rendreG44EtFacturX(snap);
  }

  noyau.abonner(function(snap) {
    stitchImgData = null; /* régénère l'emblème avec les initiales/couleurs à jour sauf photo choisie */
    rafraichirOngletCourant(snap);
  });

  if ('IntersectionObserver' in window && $('build')) {
    var ioS = new IntersectionObserver(function(en) {
      if (en.some(function(x) { return x.isIntersecting; })) {
        ioS.disconnect();
        rafraichirOngletCourant(noyau.lire());
      }
    }, { rootMargin: '500px 0px' });
    ioS.observe($('build'));
  } else {
    rafraichirOngletCourant(noyau.lire());
  }
})();
