/* AIME · Actes VII & VIII :
   - Acte VII  (#atlas) : L'Atlas vivant des 10 Univers (univers.json) & des 130 Dépôts / 1 191 Modules (moteurs.json)
   - Acte VIII (#entrer / #contact) : Catalogue filtrable des 26 entrées de nav/registre.js,
     export ouvert .aime-projet.json + sauvegarde intégrale du navigateur, et pré-remplissage consenti de /api/contact. */
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
     ACTE VII · ATLAS DES 10 UNIVERS & 130 DÉPÔTS (univers.json + moteurs.json)
     ========================================================================= */
  var donneesAtlas = null, universActif = 'mariage', filtreEtat = 'tous', requete = '';

  function chargerAtlas() {
    if (donneesAtlas) return Promise.resolve(donneesAtlas);
    return Promise.all([
      fetch('/univers.json').then(function(r) { return r.json(); }),
      fetch('/moteurs.json').then(function(r) { return r.json(); })
    ]).then(function(r) {
      donneesAtlas = { univers: r[0], moteurs: r[1] };
      return donneesAtlas;
    });
  }

  function rendreAtlas() {
    var onglets = $('atlasUniversBtns'), detail = $('atlasUniversDetail'), listeRepos = $('atlasReposListe'), statsBox = $('atlasStats');
    if (!detail || !listeRepos) return;
    if (!donneesAtlas) {
      chargerAtlas().then(rendreAtlas).catch(function() {
        detail.innerHTML = '<p style="color:var(--vt-soft)">Impossible de lire univers.json / moteurs.json.</p>';
      });
      return;
    }

    var U = donneesAtlas.univers.univers || [];
    var R = donneesAtlas.moteurs.repos || [];
    var totalMod = R.reduce(function(s, r) { return s + ((r.modules && r.modules.length) || 0); }, 0);
    var nbFonc = R.filter(function(r) { return r.etat === 'fonctionnel'; }).length;

    if (statsBox && !statsBox.dataset.pret) {
      statsBox.dataset.pret = '1';
      statsBox.innerHTML =
        '<div class="atlas-stat"><b>' + U.length + '</b><span>Univers métiers structurés</span></div>' +
        '<div class="atlas-stat"><b>' + R.length + '</b><span>Dépôts inventoriés (' + nbFonc + ' fonctionnels)</span></div>' +
        '<div class="atlas-stat"><b>' + totalMod.toLocaleString('fr-FR') + '</b><span>Modules documentés et typés</span></div>' +
        '<div class="atlas-stat"><b>402+</b><span>Tests automatisés vérifiables</span></div>';
    }

    if (onglets) {
      onglets.innerHTML = U.map(function(u) {
        return '<button type="button" class="vt-pilule" data-univ="' + esc(u.id) + '" aria-pressed="' + (u.id === universActif) + '">' + esc(u.titre) + '</button>';
      }).join('');
    }

    var cur = U.filter(function(u) { return u.id === universActif; })[0] || U[0];
    if (cur) {
      var nbModulesUniv = (cur.aspects || []).reduce(function(s, a) {
        return s + ((a.modules && a.modules.length) || 0);
      }, 0);
      detail.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
          '<h3 style="margin:0;font:400 28px/1.1 var(--display)">' + esc(cur.titre) + '</h3>' +
          '<span style="font:600 12px var(--vt-mono);color:var(--vt-cyan)">' + (cur.aspects || []).length + ' facettes · ' + nbModulesUniv + ' briques reliées</span>' +
        '</div>' +
        '<p style="margin:10px 0 0;color:var(--vt-soft);font-size:14.5px">' + esc(cur.promesse || cur.description || '') + '</p>' +
        ((cur.processus && cur.processus.length)
          ? '<h4 style="margin:18px 0 8px;font:600 12px var(--vt-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--vt-amber)">Chaînes de bout en bout (sans ressaisie)</h4>' +
            '<ul class="atlas-flux">' + cur.processus.map(function(pr) {
              var etapes = (pr.etapes || []).map(function(et) { return (et.action || et.titre || et.module || ''); }).filter(Boolean);
              return '<li><b style="color:var(--vt-ink)">' + esc(pr.titre || pr.nom || 'Processus') + '</b><br>' +
                '<code>' + esc(etapes.join(' → ')) + '</code></li>';
            }).join('') + '</ul>'
          : '') +
        '<h4 style="margin:18px 0 8px;font:600 12px var(--vt-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--vt-soft)">Facettes de cet univers</h4>' +
        '<ul class="atlas-flux">' + (cur.aspects || []).map(function(a) {
          return '<li><b style="color:var(--vt-ink)">' + esc(a.titre || a.id) + '</b> — <span style="color:var(--vt-soft)">' +
            esc(a.description || ((a.modules || []).length + ' modules associés')) + '</span></li>';
        }).join('') + '</ul>';
    }

    var q = requete.trim().toLowerCase();
    var filtres = R.filter(function(r) {
      if (filtreEtat !== 'tous' && r.etat !== filtreEtat) return false;
      if (!q) return true;
      var texte = (r.nom + ' ' + (r.description || '') + ' ' + (r.domaine || '') + ' ' +
        ((r.modules || []).map(function(m) { return m.nom + ' ' + (m.description || ''); }).join(' '))).toLowerCase();
      return texte.indexOf(q) >= 0;
    });

    if ($('atlasCompteFiltre')) {
      $('atlasCompteFiltre').textContent = filtres.length + ' dépôt(s) affiché(s) sur ' + R.length;
    }

    listeRepos.innerHTML = filtres.slice(0, 40).map(function(r) {
      var nbM = (r.modules && r.modules.length) || 0;
      return '<article class="atlas-repo">' +
        '<div class="atlas-repo-tete"><b>' + esc(r.nom) + '</b>' +
          '<span class="badge-etat ' + esc(r.etat || '') + '">' + esc(r.etat || 'inconnu') + ' · ' + nbM + ' mod.</span></div>' +
        '<div style="font-size:13px;color:var(--vt-soft)">' + esc(r.description || 'Dépôt inventorié dans moteurs.json') +
          (r.doublon_de ? ' <em style="color:var(--vt-rose)">(converge vers ' + esc(r.doublon_de) + ')</em>' : '') + '</div>' +
      '</article>';
    }).join('');
  }

  if ($('atlasUniversBtns')) {
    $('atlasUniversBtns').addEventListener('click', function(e) {
      var b = e.target.closest('button[data-univ]');
      if (!b) return;
      universActif = b.getAttribute('data-univ');
      rendreAtlas();
    });
  }
  if ($('atlasRecherche')) {
    $('atlasRecherche').addEventListener('input', function() {
      requete = this.value;
      rendreAtlas();
    });
  }
  if ($('atlasEtatsBtns')) {
    $('atlasEtatsBtns').addEventListener('click', function(e) {
      var b = e.target.closest('button[data-etat]');
      if (!b) return;
      filtreEtat = b.getAttribute('data-etat');
      [].forEach.call($('atlasEtatsBtns').querySelectorAll('button[data-etat]'), function(x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      rendreAtlas();
    });
  }

  noyau.abonner(function(snap) {
    if (snap.casInfo && snap.casInfo.univers && donneesAtlas) {
      universActif = snap.casInfo.univers;
      rendreAtlas();
    }
  });

  (window.requestIdleCallback || function(fn) { setTimeout(fn, 60); })(function() {
    universActif = noyau.lire().casInfo.univers || 'mariage';
    rendreAtlas();
  });

  /* =========================================================================
     ACTE VIII · GRILLE COMPLÈTE DES ATELIERS (AIMENav) + EXPORTS + CONTACT
     ========================================================================= */
  var navBox = $('tousLesAteliers');
  if (navBox && window.AIMENav) {
    var entrees = window.AIMENav.publiques(false).filter(function(e) {
      return e.href !== '/' && e.id !== 'compte';
    });
    navBox.innerHTML = entrees.map(function(e) {
      return '<article class="atelier-carte">' +
        '<div>' +
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">' +
            '<h3>' + esc(e.nom) + '</h3>' +
            '<span class="badge-etat ' + (e.statut === 'disponible' ? 'fonctionnel' : 'prototype') + '">' + esc(window.AIMENav.STATUTS[e.statut] || e.statut) + '</span>' +
          '</div>' +
          '<p>' + esc(e.description || '') + '</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<a class="vt-btn" href="' + esc(e.href) + '" data-atelier="' + esc(e.href) + '" data-atelier-titre="' + esc(e.nom) + '">Ouvrir dans le tiroir</a>' +
          '<a class="vt-btn" href="' + esc(e.href) + '" style="opacity:.8">Page dédiée →</a>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* Export contrat aime-projet v1 (.json) */
  if ($('btnExporterProjet')) {
    $('btnExporterProjet').addEventListener('click', function() {
      var snap = noyau.lire();
      var blob = new Blob([JSON.stringify(snap.contrat, null, 2)], { type: 'application/json;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = snap.contrat.id + '.aime-projet.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    });
  }

  /* Sauvegarde intégrale sans perte du navigateur (AIMEBureauSources.sauvegarder) */
  if ($('btnSauvegardeLocale') && window.AIMEBureauSources) {
    $('btnSauvegardeLocale').addEventListener('click', function() {
      var data = window.AIMEBureauSources.sauvegarder(window.localStorage, new Date().toISOString());
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sauvegarde-aime-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    });
  }

  /* Injection consentie du résumé du Fil Rouge dans le formulaire /api/contact */
  if ($('btnInjecterBrief')) {
    $('btnInjecterBrief').addEventListener('click', function() {
      var msg = $('c-message'), compte = $('compte');
      if (!msg) return;
      var texte = noyau.briefContact();
      msg.value = msg.value.trim() ? (msg.value.trim() + '\n\n---\n' + texte) : texte;
      msg.dispatchEvent(new Event('input', { bubbles: true }));
      if (compte) compte.textContent = msg.value.length.toLocaleString('fr-FR');
      msg.focus();
    });
  }
})();
