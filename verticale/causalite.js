/* AIME · Acte V (#story3) : La Causalité en Direct
   1. Gauche : Moteur réel du Jour J (live/modele.js + synchroview/permissions.js sur mariage.json)
               — Pluie / Plan B (Orangerie), retard en cascade atomique (+25 min), étape faite, annulation (n - 1).
   2. Droite : Jeu causal jouable en direct AIME INFINITY (infinity/js/regles + niveaux + partie + rendu + son). */
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
     1. JOUR J LIVE & CASCADE PAPPILLON (AIMELive + Permissions)
     ========================================================================= */
  var sourceMariage = null, journalLive = [], pluieActive = false;
  var ACTEURS_PAR_MODE = {
    moi:    { id: 'u-lea',     nom: 'Mariés (Propriétaires)' },
    coord:  { id: 'u-camille', nom: 'Camille (Coordinatrice)' },
    pro:    { id: 'u-lumen',   nom: 'Studio Lumen (Prestataire)' },
    proche: { id: 'u-lucie',   nom: 'Lucie (Invitée)' }
  };

  function chargerMariage() {
    if (sourceMariage) return Promise.resolve(sourceMariage);
    return Promise.all([
      fetch('/vitrine/donnees/mariage.json').then(function(r) { return r.json(); }),
      fetch('/vitrine/acces/mariage.json').then(function(r) { return r.json(); })
    ]).then(function(r) {
      sourceMariage = { donnees: r[0], acces: r[1] };
      return sourceMariage;
    });
  }

  function rendreLive(snap) {
    var liste = $('liveMoments'), etatTxt = $('liveEtat'), roleTxt = $('liveRoleActif');
    var Perms = window.AIMEPerms || window.Permissions;
    if (!liste || !window.AIMELive || !Perms) return;
    if (!sourceMariage) {
      chargerMariage().then(function() { rendreLive(noyau.lire()); }).catch(function() {});
      return;
    }
    var Live = window.AIMELive;
    var b = Live.base(sourceMariage.donnees);
    b.evenement.nom = snap.etat.titre;
    var rej = Live.rejouer(b, sourceMariage.acces, journalLive, Perms);
    var acteur = ACTEURS_PAR_MODE[snap.etat.mode] || ACTEURS_PAR_MODE.moi;
    var v = Live.vue(rej.etat, sourceMariage.acces, acteur.id, Live.hm('14:45'), Perms);

    if (roleTxt) {
      roleTxt.textContent = 'Vue filtrée : ' + acteur.nom + ' · ' + journalLive.length + ' action(s) au journal';
    }
    if (etatTxt) {
      var der = rej.trace[rej.trace.length - 1];
      etatTxt.textContent = der
        ? (der.ok
          ? '✓ Action « ' + der.a.action + ' » rejouée (' + (der.touches && der.touches.length ? der.touches.length + ' moments recalés en cascade' : 'appliquée') + ')'
          : '✕ Action refusée : ' + der.raison)
        : 'Journal vierge — déclenchez une averse ou un retard pour observer l’onde causale.';
    }

    liste.innerHTML = v.moments.map(function(m) {
      var dec = Live.ecart(m.decalage);
      return '<li class="' + (m.decalage || m.planBActif ? 'deplace ' : '') + (m.fait ? 'fait' : '') + '">' +
        '<span class="live-h">' + esc(m.debut) + (m.prevu !== m.debut ? '<br><small style="color:var(--vt-muted);text-decoration:line-through">' + esc(m.prevu) + '</small>' : '') + '</span>' +
        '<div><b style="color:var(--vt-ink)">' + esc(m.titre) + '</b><div style="color:var(--vt-soft);font-size:12.5px">Lieu : ' + esc(m.espace || snap.etat.lieu) + (m.equipe ? ' · ' + esc(m.equipe) : '') + '</div></div>' +
        '<div>' +
          (m.planBActif ? '<span class="live-tag">Plan B · Orangerie</span> ' : '') +
          (dec ? '<span class="live-tag">' + esc(dec) + '</span> ' : '') +
          (m.fait ? '<span class="live-tag" style="color:var(--vt-mint)">✓ Fait</span>' : '') +
        '</div>' +
      '</li>';
    }).join('');
  }

  var liveCmd = $('liveCommandes');
  if (liveCmd) {
    liveCmd.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-lact]');
      if (!b || !sourceMariage) return;
      var act = b.getAttribute('data-lact');
      if (act === 'pluie') {
        pluieActive = !pluieActive;
        journalLive.push({ qui: 'u-camille', action: 'planB', p: { moment: 'ceremonie', actif: pluieActive }, t: journalLive.length + 1 });
        b.textContent = pluieActive ? '☀ Revenir au jardin (lever Plan B)' : '🌧 Pluie à 15 h → Activer Plan B';
      } else if (act === 'retard') {
        journalLive.push({ qui: 'u-camille', action: 'retarder', p: { moment: 'ceremonie', minutes: 25, cascade: true }, t: journalLive.length + 1 });
      } else if (act === 'fait') {
        journalLive.push({ qui: 'u-camille', action: 'fait', p: { moment: 'installation' }, t: journalLive.length + 1 });
      } else if (act === 'annuler') {
        journalLive.pop();
        pluieActive = journalLive.some(function(x) { return x.action === 'planB' && x.p.actif; });
      }
      rendreLive(noyau.lire());
    });
  }

  noyau.abonner(rendreLive);
  rendreLive(noyau.lire());

  /* =========================================================================
     2. JEU CAUSAL JOUABLE EN DIRECT : AIME INFINITY
     ========================================================================= */
  var infCv = $('infMiniCanvas');
  if (infCv && window.AIMEInfinityNiveaux && window.AIMEInfinityPartie && window.AIMEInfinityRendu) {
    var NV = window.AIMEInfinityNiveaux, P = window.AIMEInfinityPartie, R = window.AIMEInfinityRendu, S = window.AIMEInfinitySon;
    var campagne = new P.Campagne({ L: 2 }), grille = campagne.grille;
    var vueInf = R.creer(infCv), curseur = null;
    if (S && S.muet && !S.muet()) S.muet(true); /* silencieux par défaut dans une page de lecture */

    function redimInf() {
      var boite = infCv.parentNode.getBoundingClientRect();
      var s = Math.max(180, Math.floor(Math.min(boite.width, boite.height || boite.width)));
      infCv.width = s;
      infCv.height = s;
      vueInf.taille({ x: 8, y: 8, s: s - 16 });
      vueInf.grille(grille);
    }

    function majStatsInf(message) {
      if ($('infStatsTaille')) {
        $('infStatsTaille').textContent = 'Grille ' + grille.n + ' × ' + grille.n + ' · Optimum exact : ' + grille.g.optimum + ' coup(s)';
      }
      if ($('infStatsCoups')) {
        $('infStatsCoups').textContent = message || ('Budget restant : ' + grille.reste() + ' / ' + grille.g.budget + ' · Cases restantes : ' + grille.restant);
      }
    }

    function jouerCase(idx) {
      if (idx == null || idx < 0) return;
      if (vueInf.enTransition && vueInf.enTransition()) { vueInf.passer(); return; }
      var res = grille.toucher(idx);
      if (!res) return;
      var anim = vueInf.cascade(res);
      if (S && S.cascade) S.cascade(anim.vagues, Math.log2(grille.n));
      if (res.statut === 'gagne') {
        var bilan = campagne.valider();
        majStatsInf('✦ Grille vidée (' + (bilan.parfait ? 'optimum exact !' : bilan.actions + ' coups') + ') — passage à ' + campagne.grille.n + ' × ' + campagne.grille.n);
        setTimeout(function() {
          grille = campagne.grille;
          vueInf.grille(grille, { fondu: true });
          majStatsInf();
        }, 700);
      } else if (res.statut === 'perdu') {
        majStatsInf('Il reste ' + grille.restant + ' case(s) — recommencez ou essayez une autre source.');
      } else {
        majStatsInf('Cascade : ' + res.ordre.length + ' case(s) touchée(s) · reste ' + grille.restant);
      }
    }

    infCv.addEventListener('pointermove', function(e) {
      var i = vueInf.caseA(e.clientX, e.clientY);
      vueInf.viser(i >= 0 ? i : null);
    });
    infCv.addEventListener('pointerleave', function() { vueInf.viser(null); });
    infCv.addEventListener('pointerup', function(e) {
      var i = vueInf.caseA(e.clientX, e.clientY);
      if (i >= 0) jouerCase(i);
    });
    infCv.addEventListener('keydown', function(e) {
      var n = grille.n, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        if (curseur == null) curseur = 0;
        var x = Math.max(0, Math.min(n - 1, (curseur % n) + d[0]));
        var y = Math.max(0, Math.min(n - 1, ((curseur / n) | 0) + d[1]));
        curseur = y * n + x;
        vueInf.curseur(curseur);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (curseur == null) { curseur = 0; vueInf.curseur(0); } else jouerCase(curseur);
      }
    });

    var infCmd = $('infCommandes');
    if (infCmd) {
      infCmd.addEventListener('click', function(e) {
        var b = e.target.closest('button[data-iact]');
        if (!b) return;
        var a = b.getAttribute('data-iact');
        if (a === 'rejouer') {
          grille = campagne.reprendre();
          vueInf.grille(grille, { fondu: true });
          majStatsInf();
        } else if (a === 'defi') {
          var iso = new Date().toISOString().slice(0, 10);
          grille = new P.Grille(NV.defi(iso));
          vueInf.grille(grille, { fondu: true });
          majStatsInf('Défi du jour (' + iso + ') · 16 × 16 en 5 coups');
        } else if (a === 'son' && S) {
          S.reveil();
          S.muet(!S.muet());
          b.setAttribute('aria-pressed', String(!S.muet()));
          b.textContent = S.muet() ? '♪ Activer le son pentatonique' : '♪ Couper le son';
        }
      });
    }

    window.addEventListener('resize', redimInf);
    redimInf();
    majStatsInf();
  }
})();
