/* AIME · Actes III & IV :
   - Acte III (#story2) : Le Cube à 6 Faces (moteur réel cube/modele.js + cube/vue3d.js, sans Carte Postale)
   - Acte IV  (#regards) : Un seul fait, quatre regards simultanés (moteur réel vitrine/rendu.js +
                           synchroview/permissions.js + synchroview/flux.js sur world.json). */
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
     ACTE III · LE CUBE À 6 FACES (AIMECube + AIMECubeVue)
     ========================================================================= */
  var C = window.AIMECube, CV = window.AIMECubeVue;
  var cubeHote = $('cubeHote'), cubeBar = $('cubeFacesBar'), cubeDeplie = $('cubeDeplie');
  var vueCube = null, faceActive = C && C.FACETTES[0] ? C.FACETTES[0].id : null;

  function construireCubeDepuisSnap(snap) {
    if (!C) return null;
    var e = snap.etat, c = C.vide();
    var contenusParIndice = [
      [e.titre, e.roleAuteur + ' · ' + e.sousTitre],
      [e.intention, 'Regard actif : ' + snap.modeInfo.complet],
      [e.date, e.lieu],
      [snap.totalHT.toLocaleString('fr-FR') + ' € HT', e.lignesDevis.length + ' postes chiffrés'],
      ['Contrat ' + snap.contrat.id, 'Empreinte #' + snap.empreinte],
      [snap.casInfo.etiquette, e.villes.length + ' ville(s) reliée(s)']
    ];
    C.FACETTES.forEach(function(def, idx) {
      var val = contenusParIndice[idx] || [e.titre, e.lieu];
      var patch = {};
      def.champs.forEach(function(ch, k) {
        patch[ch.k] = val[k] || val[0] || e.titre;
      });
      c = C.ecrire(c, def.id, patch);
      c = C.timbrer(c, def.id);
      c = C.poser(c, def.id);
      if (idx < 3 || e.mode === 'moi') c = C.publier(c, def.id, true);
    });
    return c;
  }

  function selectionnerFace(id) {
    faceActive = id;
    if (vueCube) vueCube.montrer(id);
    if (cubeBar) {
      [].forEach.call(cubeBar.querySelectorAll('button[data-face]'), function(b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-face') === id));
      });
    }
    if (cubeDeplie) {
      [].forEach.call(cubeDeplie.querySelectorAll('[data-carte-face]'), function(el) {
        el.classList.toggle('active', el.getAttribute('data-carte-face') === id);
      });
    }
  }

  function rendreCube(snap) {
    if (!C || !cubeHote) return;
    var cube = construireCubeDepuisSnap(snap);
    var moi = { id: snap.contrat.id, name: snap.etat.titre, image: snap.etat.image || undefined };
    if (!vueCube && CV) {
      cubeHote.innerHTML = '';
      vueCube = CV.monter(cubeHote, {
        cube: cube,
        moi: moi,
        interactif: true,
        surFace: function(id) { selectionnerFace(id); }
      });
      if (cubeBar) {
        cubeBar.innerHTML = C.FACETTES.map(function(d) {
          return '<button type="button" class="vt-pilule" data-face="' + d.id + '" aria-pressed="false">' + esc(d.nom) + '</button>';
        }).join('');
        cubeBar.addEventListener('click', function(e) {
          var b = e.target.closest('button[data-face]');
          if (b) selectionnerFace(b.getAttribute('data-face'));
        });
      }
    } else if (vueCube) {
      vueCube.maj(cube);
    }

    if (cubeDeplie) {
      cubeDeplie.innerHTML = C.FACETTES.map(function(d) {
        var f = cube.facettes[d.id];
        var textes = d.champs.map(function(ch) {
          return '<b>' + esc(ch.l || ch.k) + ' :</b> ' + esc(f.champs[ch.k] || '—');
        }).join('<br>');
        return '<article class="cube-face-carte' + (d.id === faceActive ? ' active' : '') + '" data-carte-face="' + d.id + '">' +
          '<div class="cube-face-tete"><b>' + esc(d.nom) + '</b><span>' + (f.visibilite === 'publie' ? 'Publiée' : 'Privée') + '</span></div>' +
          '<p class="cube-face-lignes">' + textes + '</p>' +
        '</article>';
      }).join('');
      cubeDeplie.onclick = function(e) {
        var art = e.target.closest('[data-carte-face]');
        if (art) selectionnerFace(art.getAttribute('data-carte-face'));
      };
    }
    if (faceActive) selectionnerFace(faceActive);
  }

  /* =========================================================================
     ACTE IV · QUATRE REGARDS & PERMISSIONS (AIMEVitrine + Permissions + Flux)
     ========================================================================= */
  var worldBrut = null, journalWorld = [], lieuAlternatif = false;
  var traceCourante = {
    refus: false,
    texte: 'Moteur AIMEVitrine.politique + Permissions.can actif : 1 fichier JSON, 0 copie de données, 4 vues filtrées.'
  };

  var COLONNES = [
    { sujet: 'p-ines',  mode: 'moi',    titre: 'Inès & Théo',        role: 'Propriétaire' },
    { sujet: 'p-clara', mode: 'coord',  titre: 'Clara & Maya',       role: 'Agence / Coord.' },
    { sujet: 'p-petal', mode: 'pro',    titre: 'Petal & Stem',       role: 'Fleuriste' },
    { sujet: 'p-alice', mode: 'proche', titre: 'Alice Morel',        role: 'Invitée' }
  ];

  var LIBELLES_ACTION = {
    apply: 'Candidater',
    shortlist: 'Proposer au couple',
    validate: 'Valider',
    reject: 'Renvoyer',
    confirm: 'Confirmer accès',
    start: 'Démarrer',
    task: 'Cocher tâche',
    finish: 'Déclarer terminé',
    close: 'Clôturer',
    edit: 'Modifier logistique',
    reassign: 'Changer responsable'
  };

  function chargerWorld() {
    if (worldBrut) return Promise.resolve(worldBrut);
    return Promise.all([
      fetch('/vitrine/donnees/world.json').then(function(r) { return r.json(); }),
      fetch('/vitrine/acces/world.json').then(function(r) { return r.json(); }),
      fetch('/vitrine/perspectives/world.json').then(function(r) { return r.json(); })
    ]).then(function(res) {
      worldBrut = { donnees: res[0], acces: res[1], perspectives: res[2] };
      return worldBrut;
    });
  }

  function calculerEtatWorld(snap) {
    var Perms = window.AIMEPerms || window.Permissions;
    if (!worldBrut || !window.AIMEVitrine || !Perms || !window.AIMEFlux) return null;
    var Flux = window.AIMEFlux, Vit = window.AIMEVitrine;
    var contenu = JSON.parse(JSON.stringify(worldBrut.donnees));
    contenu.evenement.nom = snap.etat.titre;
    contenu.evenement.date = snap.etat.date;
    if (contenu.lieux && contenu.lieux.length) {
      contenu.lieux[0].nom = lieuAlternatif
        ? ('Verrière couverte · ' + snap.etat.lieu)
        : snap.etat.lieu;
    }
    var rejoue = Flux.rejouer(contenu, worldBrut.acces, Perms, journalWorld);
    return {
      contenu: rejoue.contenu,
      acces: worldBrut.acces,
      Vit: Vit,
      Perms: Perms,
      Flux: Flux
    };
  }

  function actionsAutoriseesListe(actionsMap) {
    if (!actionsMap) return [];
    return Object.keys(actionsMap).filter(function(k) {
      return actionsMap[k] && actionsMap[k].allow;
    }).map(function(k) { return LIBELLES_ACTION[k] || k; });
  }

  function rendreRegards(snap) {
    var box = $('regardsColonnes'), traceEl = $('regardsTrace');
    if (!box) return;
    if (!worldBrut) {
      chargerWorld().then(function() { rendreRegards(noyau.lire()); }).catch(function() {
        box.innerHTML = '<p style="color:var(--vt-soft)">Chargement des perspectives…</p>';
      });
      return;
    }
    var W = calculerEtatWorld(snap);
    if (!W) return;

    if (traceEl) {
      traceEl.className = 'regards-trace' + (traceCourante.refus ? ' refus' : '');
      traceEl.textContent = traceCourante.texte;
    }

    box.innerHTML = COLONNES.map(function(col) {
      var vue = W.Vit.politique(W.contenu, W.acces, { regard: col.sujet }, W.Perms, W.Flux);
      var moms = vue.moments();
      var docs = vue.documents();
      var bud = vue.collection('budget');
      var miss = vue.mission('m-03');
      var permises = miss ? actionsAutoriseesListe(miss.actions) : [];

      return '<article class="regard-col' + (snap.etat.mode === col.mode ? ' selection' : '') + '">' +
        '<div class="regard-tete"><h3>' + esc(col.titre) + '</h3><span class="regard-role">' + esc(col.role) + '</span></div>' +
        '<div class="regard-stats">' +
          '<span class="ok">' + moms.length + ' moments vus</span>' +
          '<span>' + docs.visibles.length + ' doc(s) · ' + docs.caches + ' masqué(s)</span>' +
          '<span class="' + (bud.visibles.length ? 'ok' : 'bloque') + '">' +
            (bud.visibles.length ? 'Budget visible (' + bud.visibles.length + ')' : 'Budget refusé') +
          '</span>' +
        '</div>' +
        '<div class="regard-extrait">' +
          moms.slice(0, 3).map(function(m) {
            return '<div class="regard-item"><b>' + esc((m.debut || m.heure || '') + ' · ' + (m.titre || m.nom)) + '</b>' +
              '<small>' + esc(vue.lieuNom(m.lieu)) + '</small></div>';
          }).join('') +
        '</div>' +
        '<div class="regard-mission">' +
          '<b>Mission « Installation florale »</b>' +
          (miss
            ? '<span>Étape : <strong>' + esc(miss.m.etape + ' (' + miss.statut + ')') + '</strong><br>' +
              (permises.length ? 'Droits ouverts : ' + esc(permises.join(' · ')) : 'Lecture seule à cette étape.') +
              '</span>'
            : '<span>Non exposée aux invités par <code>permissions.js</code>.</span>') +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* Suite ordonnée du cycle complet Découvrir/Candidater → Clôturer sur m-03 */
  function prochaineEtape(W) {
    var c = W.contenu, m = (c.missions || []).filter(function(x) { return x.id === 'm-03'; })[0];
    if (!m) return null;
    var candDeposee = (c.candidatures || []).filter(function(x) { return x.mission === 'm-03' && x.statut === 'deposee'; })[0];
    if (m.etape === 'decouvrir') return { qui: 'p-petal', action: 'apply', p: { mission: 'm-03' } };
    if (m.etape === 'candidater' && candDeposee) return { qui: 'p-clara', action: 'shortlist', p: { mission: 'm-03', candidature: candDeposee.id } };
    if (m.etape === 'valider') return { qui: 'p-ines', action: 'validate', p: { mission: 'm-03' } };
    if (m.etape === 'organiser' && !m.confirme) return { qui: (m.affectes && m.affectes[0]) || 'p-petal', action: 'confirm', p: { mission: 'm-03' } };
    if (m.etape === 'organiser' && m.confirme) return { qui: 'p-maya', action: 'start', p: { mission: 'm-03' } };
    if (m.etape === 'realiser') {
      var nonFaite = (c.taches || []).filter(function(t) { return t.mission === 'm-03' && !t.fait; })[0];
      var aff = (m.affectes && m.affectes[0]) || 'p-petal';
      if (nonFaite) return { qui: aff, action: 'task', p: { mission: 'm-03', tache: nonFaite.id } };
      return { qui: aff, action: 'finish', p: { mission: 'm-03' } };
    }
    if (m.etape === 'cloturer') return { qui: 'p-clara', action: 'close', p: { mission: 'm-03' } };
    return null;
  }

  var barActions = $('regardsActions');
  if (barActions) {
    barActions.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-wact]');
      var Perms = window.AIMEPerms || window.Permissions;
      if (!b || !worldBrut || !window.AIMEFlux || !Perms) return;
      var act = b.getAttribute('data-wact');
      var W = calculerEtatWorld(noyau.lire());
      if (!W) return;

      if (act === 'avancer') {
        var suivant = prochaineEtape(W);
        if (!suivant) {
          journalWorld = [];
          traceCourante = { refus: false, texte: '↺ Cycle complet de la mission terminé (Découvrir → Clôturer) — journal réinitialisé pour rejouer.' };
        } else {
          var tr = W.Flux.transition(W.contenu, W.acces, W.Perms, suivant.qui, suivant.action, suivant.p);
          if (tr.allow) {
            journalWorld.push(suivant);
            traceCourante = {
              refus: false,
              texte: '✓ ' + tr.message + ' (acteur : ' + suivant.qui + ', règle : ' + tr.rule + ', révision ' + (W.contenu.revision + 1) + ') — les 4 regards se mettent à jour.'
            };
          } else {
            traceCourante = { refus: true, texte: '✕ Transition refusée : ' + tr.reason };
          }
        }
        rendreRegards(noyau.lire());
      } else if (act === 'refus') {
        var trRefus = W.Flux.transition(W.contenu, W.acces, W.Perms, 'p-clara', 'validate', { mission: 'm-03' });
        traceCourante = {
          refus: true,
          texte: '✕ Action forgée bloquée par permissions.js — L’agence (p-clara) tente « validate » à la place du couple : refusée (' + trRefus.reason + '). État intact.'
        };
        rendreRegards(noyau.lire());
      } else if (act === 'lieu') {
        lieuAlternatif = !lieuAlternatif;
        traceCourante = {
          refus: false,
          texte: '✓ Lieu modifié une seule fois par référence dans la couche Contenu → répercuté instantanément dans les 4 perspectives.'
        };
        rendreRegards(noyau.lire());
      }
    });
  }

  noyau.abonner(function(snap) {
    rendreCube(snap);
    rendreRegards(snap);
  });
  rendreCube(noyau.lire());
  rendreRegards(noyau.lire());
})();
