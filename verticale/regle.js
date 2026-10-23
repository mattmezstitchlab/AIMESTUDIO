/* AIME · La Règle vivante (#rul), la Barre du Fil Rouge, l'Acte I (Impulsion & Timbre)
   et le Tiroir d'atelier plein écran (<dialog>). */
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

  /* ---------- Chapitres suivis par la Règle vivante ---------- */
  var CHAPITRES = [
    { id: 'haut',      num: '00', court: 'Zéro',     unite: '0 · Point',     echelle: 'Origine' },
    { id: 'impulsion', num: '01', court: 'Saisie',   unite: '1 · Saisie',    echelle: 'Contrat v1' },
    { id: 'naiss',     num: '02', court: 'Terre',    unite: 'km · Terre',    echelle: 'Espace & Temps' },
    { id: 'story2',    num: '03', court: 'Cube',     unite: '6 · Faces',     echelle: 'Volume complet' },
    { id: 'regards',   num: '04', court: 'Regards',  unite: '4 · Rôles',     echelle: 'Permissions' },
    { id: 'story3',    num: '05', court: 'Ondes',    unite: 'min · Direct',  echelle: 'Causalité' },
    { id: 'build',     num: '06', court: 'Supports', unite: 'mm · Supports', echelle: 'Web · Print · DMC' },
    { id: 'atlas',     num: '07', court: 'Univers',  unite: '10 · Univers',  echelle: '130 dépôts' },
    { id: 'contact',   num: '08', court: 'Projet',   unite: '✓ · Devis',     echelle: 'Mise en œuvre' }
  ];

  /* ---------- Tiroir d'atelier plein écran (<dialog>) ---------- */
  function ouvrirTiroir(opts) {
    var dlg = $('tiroirAtelier');
    if (!dlg) return;
    var corps = $('tiroirCorps'), titre = $('tiroirTitre'), ext = $('tiroirExterne');
    titre.textContent = opts.titre || 'Atelier AIME';
    corps.innerHTML = '';
    if (opts.href) {
      ext.href = opts.href;
      ext.hidden = false;
      var f = document.createElement('iframe');
      f.src = opts.href;
      f.title = opts.titre || 'Atelier AIME';
      corps.appendChild(f);
    } else if (opts.rendre) {
      ext.hidden = true;
      var box = document.createElement('div');
      box.style.padding = '24px';
      opts.rendre(box);
      corps.appendChild(box);
    }
    if (typeof dlg.showModal === 'function' && !dlg.open) dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function fermerTiroir() {
    var dlg = $('tiroirAtelier');
    if (!dlg) return;
    $('tiroirCorps').innerHTML = '';
    if (dlg.open && typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  window.AIMETiroir = { ouvrir: ouvrirTiroir, fermer: fermerTiroir };

  var btnFermer = $('tiroirFermer');
  if (btnFermer) btnFermer.addEventListener('click', fermerTiroir);
  var dlgEl = $('tiroirAtelier');
  if (dlgEl) {
    dlgEl.addEventListener('click', function(e) {
      if (e.target === dlgEl) fermerTiroir();
    });
    dlgEl.addEventListener('close', function() {
      $('tiroirCorps').innerHTML = '';
    });
  }

  /* Délégation universelle sur [data-atelier] */
  document.addEventListener('click', function(e) {
    var b = e.target.closest && e.target.closest('[data-atelier]');
    if (!b) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    ouvrirTiroir({
      href: b.getAttribute('data-atelier'),
      titre: b.getAttribute('data-atelier-titre') || b.textContent.trim()
    });
  });

  /* ---------- Loupes d'échelle de la Règle (Print 1:1 mm & Partition Jour J) ---------- */
  function ouvrirLoupeMM() {
    var s = noyau.lire();
    ouvrirTiroir({
      titre: 'Échelle physique · Supports millimétrés de « ' + s.etat.titre + ' »',
      rendre: function(box) {
        var pxParMm = 3.7795;
        box.innerHTML =
          '<p style="margin:0 0 18px;color:var(--vt-soft);max-width:680px">' +
          'Ces trois objets papier lisent exactement votre saisie de l’Acte I (<b>' + esc(s.etat.titre) + '</b> · ' +
          esc(s.etat.date) + ' · ' + esc(s.etat.lieu) + '), dessinés au rapport millimétrique exact.</p>' +
          '<div class="print-plateau">' +
            '<div><div class="papier-cote">CARTE DE VISITE · 85 × 55 mm</div>' +
              '<article class="papier-objet" style="width:' + Math.round(85 * pxParMm) + 'px;min-height:' + Math.round(55 * pxParMm) + 'px">' +
                '<div><small>' + esc(s.etat.roleAuteur) + '</small><h4>' + esc(s.etat.titre) + '</h4></div>' +
                '<p>' + esc(s.etat.lieu) + '<br>' + esc(s.etat.contact) + '</p>' +
              '</article></div>' +
            '<div><div class="papier-cote">FAIRE-PART / INVITATION · 148 × 105 mm (A6)</div>' +
              '<article class="papier-objet" style="width:' + Math.round(148 * pxParMm) + 'px;min-height:' + Math.round(105 * pxParMm) + 'px;border-top:5px solid ' + esc(s.etat.palette[0]) + '">' +
                '<div><small>' + esc(s.casInfo.etiquette) + ' · ' + esc(s.etat.date) + '</small><h4 style="font-size:28px;margin-top:10px">' + esc(s.etat.titre) + '</h4><p style="margin-top:10px">' + esc(s.etat.intention) + '</p></div>' +
                '<p><b>' + esc(s.etat.lieu) + '</b> · Réponse personnelle sur votre espace dédié</p>' +
              '</article></div>' +
            '<div><div class="papier-cote">MARQUE-PLACE · 85 × 40 mm</div>' +
              '<article class="papier-objet" style="width:' + Math.round(85 * pxParMm) + 'px;min-height:' + Math.round(40 * pxParMm) + 'px">' +
                '<div><small>Table d’honneur · ' + esc(s.etat.date) + '</small><h4>Camille Laurent</h4></div>' +
                '<p>' + esc(s.etat.titre) + '</p>' +
              '</article></div>' +
          '</div>';
      }
    });
  }

  function ouvrirPartition() {
    var s = noyau.lire();
    ouvrirTiroir({
      titre: 'Partition temporelle · De J − 360 au Jour J (' + s.etat.titre + ')',
      rendre: function(box) {
        box.innerHTML =
          '<p style="margin:0 0 18px;color:var(--vt-soft)">Jalons calculés automatiquement autour du <b>' + esc(s.etat.date) + '</b> pour le regard <b>' + esc(s.modeInfo.complet) + '</b>.</p>' +
          '<ul class="frise-liste">' + s.jalons.map(function(j) {
            return '<li class="' + (j.id === 'j-0' ? 'cle' : '') + '">' +
              '<span class="frise-ecart">' + esc(j.ecart) + '<small>' + esc(j.date) + '</small></span>' +
              '<div class="frise-corps"><b>' + esc(j.titre) + '</b><span>' + esc(j.detail) + '</span></div></li>';
          }).join('') + '</ul>';
      }
    });
  }

  /* ---------- Montage de la Règle gauche (#rul) ---------- */
  var rul = $('rul');
  if (rul) {
    document.body.classList.add('avec-regle');
    var listeActes = $('regleActes'), btnUnite = $('regleUnite');
    listeActes.innerHTML = CHAPITRES.map(function(c) {
      return '<button type="button" data-cible="' + c.id + '" title="' + esc(c.num + ' · ' + c.court + ' (' + c.echelle + ')') + '" aria-label="Aller à l’acte ' + c.num + ' : ' + esc(c.court) + '">' + c.num + '</button>';
    }).join('');

    listeActes.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-cible]');
      if (!b) return;
      var el = $(b.getAttribute('data-cible'));
      if (el) el.scrollIntoView({ behavior: document.documentElement.classList.contains('calme') ? 'auto' : 'smooth' });
    });

    if (btnUnite) btnUnite.addEventListener('click', ouvrirLoupeMM);
    var bMm = $('loupeMM'), bPart = $('loupePartition'), bTout = $('loupeTout');
    if (bMm) bMm.addEventListener('click', ouvrirLoupeMM);
    if (bPart) bPart.addEventListener('click', ouvrirPartition);
    if (bTout) bTout.addEventListener('click', function() {
      ouvrirTiroir({ href: '/tout/', titre: 'Tout voir · Les 4 regards synchronisés côte à côte' });
    });

    var rafR = 0;
    function majRegle() {
      rafR = 0;
      var milieu = window.innerHeight * 0.42, actif = CHAPITRES[0];
      CHAPITRES.forEach(function(c) {
        var el = $(c.id);
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (r.top <= milieu) actif = c;
      });
      if (btnUnite) btnUnite.textContent = actif.unite;
      [].forEach.call(listeActes.querySelectorAll('button[data-cible]'), function(b) {
        if (b.getAttribute('data-cible') === actif.id) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function() {
      if (!rafR) rafR = requestAnimationFrame(majRegle);
    }, { passive: true });
    window.addEventListener('resize', majRegle);
    majRegle();
  }

  /* ---------- Bandeau conditionnel de reprise locale (AIMEBureauSources, 0 écriture) ---------- */
  if (window.AIMEBureauSources && $('repriseLocale')) {
    try {
      var inv = window.AIMEBureauSources.inventaire(window.localStorage);
      if (inv.projets && inv.projets.length > 0) {
        var recents = window.AIMEBureauSources.reprendre(inv, 4);
        var liste = recents.length ? recents : inv.projets.slice(0, 3);
        $('repriseLiens').innerHTML = liste.map(function(p) {
          return '<a href="' + esc(p.lien) + '" data-atelier="' + esc(p.lien) + '" data-atelier-titre="' + esc(p.titre) + '">' +
            esc(p.titre) + ' <small style="color:var(--vt-mint)">(' + esc(p.detail || p.nom || 'local') + ')</small></a>';
        }).join('');
        $('repriseLocale').hidden = false;
      }
    } catch (e) {}
  }

  /* ---------- Acte I : Impulsion, Presets, Timbre & Contrat v1 ---------- */
  var casBox = $('impCas'), palettesBox = $('impPalettes'), timbrePorte = $('impTimbrePorte');
  var PALETTES = [
    ['#FB7185', '#F59E0B', '#7C5CFF', '#22D3EE'],
    ['#22D3EE', '#34D399', '#7C5CFF', '#F59E0B'],
    ['#F59E0B', '#FB7185', '#14B8A6', '#8B5CF6'],
    ['#E2E8F0', '#94A3B8', '#7C5CFF', '#22D3EE']
  ];

  if (casBox) {
    casBox.innerHTML = Object.keys(V.CAS).map(function(k) {
      var c = V.CAS[k];
      return '<button type="button" class="vt-pilule" data-cas="' + c.id + '" aria-pressed="false">' + esc(c.etiquette) + '</button>';
    }).join('');
    casBox.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-cas]');
      if (b) noyau.choisirCas(b.getAttribute('data-cas'));
    });
  }

  if (palettesBox) {
    palettesBox.innerHTML = PALETTES.map(function(p, i) {
      return '<button type="button" class="imp-pal" data-pal="' + i + '" aria-pressed="false" aria-label="Choisir l’harmonie colorée ' + (i + 1) + '" style="background:linear-gradient(135deg,' + p[0] + ',' + p[2] + ')"></button>';
    }).join('');
    palettesBox.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-pal]');
      if (!b) return;
      var idx = +b.getAttribute('data-pal');
      noyau.modifier({ palette: PALETTES[idx] }, 'palette');
    });
  }

  /* Sélecteurs de regard (barre collante) */
  var regardsBarre = $('filRegards');
  if (regardsBarre) {
    regardsBarre.innerHTML = Object.keys(V.MODES).map(function(k) {
      var m = V.MODES[k];
      return '<button type="button" data-mode="' + m.id + '" aria-pressed="false">' + esc(m.court) + '</button>';
    }).join('');
    regardsBarre.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-mode]');
      if (!b) return;
      var m = b.getAttribute('data-mode');
      noyau.modifier({ mode: m }, 'mode');
      try {
        var u = new URL(location.href);
        u.searchParams.set('mode', m);
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } catch (_) {}
    });
  }

  /* Liaison bidirectionnelle des champs de l'Acte I */
  var chTitre = $('impTitre'), chDate = $('impDate'), chLieu = $('impLieu'), chIntention = $('impIntention'), chPhoto = $('impPhoto');
  if (chTitre) chTitre.addEventListener('input', function() { noyau.modifier({ titre: chTitre.value }, 'saisie'); });
  if (chDate) chDate.addEventListener('change', function() { noyau.modifier({ date: chDate.value }, 'saisie'); });
  if (chLieu) chLieu.addEventListener('input', function() { noyau.modifier({ lieu: chLieu.value }, 'saisie'); });
  if (chIntention) chIntention.addEventListener('input', function() { noyau.modifier({ intention: chIntention.value }, 'saisie'); });

  if (chPhoto && window.AIMETimbre) {
    chPhoto.addEventListener('change', function() {
      var f = chPhoto.files && chPhoto.files[0];
      if (!f) return;
      window.AIMETimbre.preparer(f).then(function(dataUrl) {
        noyau.modifier({ image: dataUrl }, 'photo');
      }).catch(function(err) {
        var msg = $('impPhotoEtat');
        if (msg) msg.textContent = err && err.message ? err.message : 'Image non lue.';
      });
    });
  }

  var btnContrat = $('btnVoirContrat'), preContrat = $('impContratJson');
  if (btnContrat && preContrat) {
    btnContrat.addEventListener('click', function() {
      var cache = !preContrat.hidden;
      preContrat.hidden = cache;
      btnContrat.setAttribute('aria-expanded', String(!cache));
      btnContrat.textContent = cache ? 'Inspecter le contrat JSON live (v1)' : 'Masquer le contrat JSON';
    });
  }

  function rendreImpulsion(snap) {
    var e = snap.etat;
    if (chTitre && document.activeElement !== chTitre) chTitre.value = e.titre;
    if (chDate && document.activeElement !== chDate) chDate.value = e.date;
    if (chLieu && document.activeElement !== chLieu) chLieu.value = e.lieu;
    if (chIntention && document.activeElement !== chIntention) chIntention.value = e.intention;

    if (casBox) {
      [].forEach.call(casBox.querySelectorAll('button[data-cas]'), function(b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-cas') === e.cas));
      });
    }
    if (palettesBox) {
      [].forEach.call(palettesBox.querySelectorAll('button[data-pal]'), function(b, i) {
        b.setAttribute('aria-pressed', String(PALETTES[i][0] === e.palette[0] && PALETTES[i][2] === e.palette[2]));
      });
    }
    if (regardsBarre) {
      [].forEach.call(regardsBarre.querySelectorAll('button[data-mode]'), function(b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === e.mode));
      });
    }

    /* Barre collante du Fil Rouge */
    if ($('filTitre')) $('filTitre').textContent = e.titre;
    if ($('filDetail')) $('filDetail').textContent = e.date + ' · ' + e.lieu;
    if ($('filCompteur')) {
      $('filCompteur').textContent = 'rév. ' + e.revision + ' · 9 actes liés · #' + snap.empreinte;
    }

    /* Timbre officiel AIMETimbre (compte/timbre.js) */
    if (timbrePorte && window.AIMETimbre) {
      timbrePorte.innerHTML = '';
      var tb = window.AIMETimbre.creer({
        id: snap.contrat.id,
        nom: e.titre,
        role: snap.modeInfo.timbreRole,
        image: e.image || undefined,
        legende: true
      });
      timbrePorte.appendChild(tb);
    }

    if ($('impRegardIndice')) {
      $('impRegardIndice').textContent = 'Regard actif : ' + snap.modeInfo.complet + ' — ' + snap.modeInfo.indice;
    }
    if (preContrat) {
      preContrat.textContent = JSON.stringify(snap.contrat, null, 2);
    }
  }

  noyau.abonner(rendreImpulsion);
  rendreImpulsion(noyau.lire());
})();
