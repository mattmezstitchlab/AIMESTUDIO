/* AIME · Acte II : La Terre 3D (nuage de points terres.txt + arcs géodésiques interactifs)
   et la Frise du Temps (J − 360 → Jour J → Archive), branchés sur AIMEVerticale.
   Chargement différé de /terres.txt par IntersectionObserver ; 0 % CPU hors écran ou en mode calme. */
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

  var cv = $('globeCanvas'), villesBox = $('globeVilles'), friseBox = $('friseListe');
  if (!cv) return;
  var ctx = cv.getContext('2d');

  /* Points terrestres [latRad, lonRad] */
  var terres = [], charge = false, visible = false, raf = 0;
  var rotLon = -0.35, rotLat = 0.42, cibleLon = null, glisse = null, tOnde = 0;

  /* Semis initial léger en attendant terres.txt */
  (function semisInitial() {
    var cles = Object.keys(V.VILLES);
    cles.forEach(function(k) {
      var v = V.VILLES[k];
      for (var a = -3; a <= 3; a++) {
        for (var b = -3; b <= 3; b++) {
          terres.push([(v.lat + a * 2.2) * Math.PI / 180, (v.lon + b * 2.6) * Math.PI / 180]);
        }
      }
    });
  })();

  function parserTerres(txt) {
    var out = [], lignes = String(txt || '').split(/\r?\n/);
    for (var i = 0; i < lignes.length; i++) {
      var L = lignes[i].trim();
      if (!L) continue;
      /* terres.txt peut contenir des paires lon/lat séparées par espaces, virgules ou points-virgules */
      var nums = L.match(/-?\d+(?:\.\d+)?/g);
      if (!nums || nums.length < 2) continue;
      for (var j = 0; j + 1 < nums.length; j += 2) {
        var a = parseFloat(nums[j]), b = parseFloat(nums[j + 1]);
        if (isNaN(a) || isNaN(b)) continue;
        /* Détection automatique [lat, lon] vs [lon, lat] */
        var lat = Math.abs(a) <= 90 && Math.abs(b) > 90 ? a : (Math.abs(b) <= 90 ? b : a);
        var lon = lat === a ? b : a;
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          out.push([lat * Math.PI / 180, lon * Math.PI / 180]);
        }
      }
    }
    return out;
  }

  function chargerTerres() {
    if (charge) return;
    charge = true;
    fetch('/terres.txt').then(function(r) { return r.ok ? r.text() : ''; }).then(function(t) {
      var pts = parserTerres(t);
      if (pts.length > 120) {
        /* Échantillonnage fluide max ~2 800 points pour 60 fps constant sur mobile */
        var pas = Math.max(1, Math.floor(pts.length / 2800)), retenus = [];
        for (var i = 0; i < pts.length; i += pas) retenus.push(pts[i]);
        terres = retenus;
        if ($('globeStatut')) $('globeStatut').textContent = terres.length.toLocaleString('fr-FR') + ' points côtiers réels (terres.txt)';
        dessiner();
      }
    }).catch(function() {});
  }

  function projeter(lat, lon, cx, cy, R) {
    var cl = Math.cos(lat), sl = Math.sin(lat);
    var dLon = lon - rotLon;
    var x = cl * Math.sin(dLon);
    var y0 = sl * Math.cos(rotLat) - cl * Math.cos(dLon) * Math.sin(rotLat);
    var z = sl * Math.sin(rotLat) + cl * Math.cos(dLon) * Math.cos(rotLat);
    return { x: cx + x * R, y: cy - y0 * R, z: z };
  }

  function dessiner() {
    var rect = cv.parentNode.getBoundingClientRect();
    var W = Math.max(260, Math.floor(rect.width)), H = Math.max(220, Math.floor(rect.height));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== W * dpr || cv.height !== H * dpr) {
      cv.width = W * dpr;
      cv.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.43;

    /* Halo atmosphérique + sphère */
    var grad = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.12);
    grad.addColorStop(0, 'rgba(38, 42, 66, 0.55)');
    grad.addColorStop(0.82, 'rgba(13, 14, 22, 0.85)');
    grad.addColorStop(1, 'rgba(10, 10, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(124, 92, 255, 0.28)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    /* Points continentaux face arrière puis face avant */
    for (var i = 0; i < terres.length; i++) {
      var p = projeter(terres[i][0], terres[i][1], cx, cy, R);
      if (p.z < -0.15) continue;
      ctx.fillStyle = p.z > 0
        ? 'rgba(237, 237, 240, ' + (0.16 + p.z * 0.52).toFixed(2) + ')'
        : 'rgba(124, 92, 255, 0.09)';
      var taille = p.z > 0 ? 1.55 : 1.0;
      ctx.fillRect(p.x, p.y, taille, taille);
    }

    /* Villes actives du Fil Rouge + arcs géodésiques lumineux */
    var snap = noyau.lire();
    var villes = snap.villes;
    var couls = snap.etat.palette;

    for (var a = 0; a + 1 < villes.length; a++) {
      var v1 = villes[a], v2 = villes[a + 1];
      var lat1 = v1.lat * Math.PI / 180, lon1 = v1.lon * Math.PI / 180;
      var lat2 = v2.lat * Math.PI / 180, lon2 = v2.lon * Math.PI / 180;
      ctx.beginPath();
      var demarre = false;
      for (var s = 0; s <= 40; s++) {
        var u = s / 40;
        var la = lat1 + (lat2 - lat1) * u;
        var lo = lon1 + (lon2 - lon1) * u;
        var el = 1 + Math.sin(u * Math.PI) * 0.14;
        var q = projeter(la, lo, cx, cy, R * el);
        if (q.z > -0.25) {
          if (!demarre) { ctx.moveTo(q.x, q.y); demarre = true; }
          else ctx.lineTo(q.x, q.y);
        }
      }
      ctx.strokeStyle = couls[a % couls.length] || '#22D3EE';
      ctx.lineWidth = 2.1;
      ctx.stroke();

      /* Signal lumineux parcourant l'arc */
      var uOnde = (tOnde + a * 0.37) % 1;
      var qO = projeter(
        lat1 + (lat2 - lat1) * uOnde,
        lon1 + (lon2 - lon1) * uOnde,
        cx, cy, R * (1 + Math.sin(uOnde * Math.PI) * 0.14)
      );
      if (qO.z > -0.2) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(qO.x, qO.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* Repères et noms des villes reliées */
    ctx.font = '600 12px "Inter Variable", Inter, sans-serif';
    villes.forEach(function(v, idx) {
      var q = projeter(v.lat * Math.PI / 180, v.lon * Math.PI / 180, cx, cy, R);
      if (q.z < -0.1) return;
      ctx.fillStyle = couls[idx % couls.length] || '#FB7185';
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0A0A0C';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#EDEDF0';
      ctx.fillText(v.nom, q.x + 9, q.y + 4);
    });
  }

  function boucle() {
    raf = 0;
    if (!visible) return;
    var calme = document.documentElement.classList.contains('calme');
    if (cibleLon !== null) {
      var diff = cibleLon - rotLon;
      rotLon += diff * (calme ? 1 : 0.1);
      if (Math.abs(diff) < 0.004) cibleLon = null;
    } else if (!glisse && !calme) {
      rotLon += 0.0022;
      tOnde = (tOnde + 0.006) % 1;
    }
    dessiner();
    if (!calme || cibleLon !== null) raf = requestAnimationFrame(boucle);
  }

  function relancer() {
    dessiner();
    if (visible && !raf && !document.documentElement.classList.contains('calme')) {
      raf = requestAnimationFrame(boucle);
    }
  }

  cv.addEventListener('pointerdown', function(e) {
    glisse = { x: e.clientX, y: e.clientY };
    cibleLon = null;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cv.addEventListener('pointermove', function(e) {
    if (!glisse) return;
    rotLon -= (e.clientX - glisse.x) * 0.007;
    rotLat = Math.max(-1.2, Math.min(1.2, rotLat + (e.clientY - glisse.y) * 0.006));
    glisse = { x: e.clientX, y: e.clientY };
    dessiner();
  });
  cv.addEventListener('pointerup', function() { glisse = null; relancer(); });
  cv.addEventListener('pointercancel', function() { glisse = null; });
  window.addEventListener('resize', dessiner);

  /* Boutons de villes cliquables + Frise du Temps */
  if (villesBox) {
    villesBox.innerHTML = Object.keys(V.VILLES).map(function(k) {
      var v = V.VILLES[k];
      return '<button type="button" class="vt-pilule" data-ville="' + v.id + '" aria-pressed="false">' + esc(v.nom) + '</button>';
    }).join('');
    villesBox.addEventListener('click', function(e) {
      var b = e.target.closest('button[data-ville]');
      if (!b) return;
      var id = b.getAttribute('data-ville');
      var info = V.VILLES[id];
      if (info) {
        cibleLon = info.lon * Math.PI / 180;
        rotLat = Math.max(-0.9, Math.min(0.9, info.lat * Math.PI / 180 * 0.72));
      }
      noyau.basculerVille(id);
      relancer();
    });
  }

  function rendreTerreEtTemps(snap) {
    if (villesBox) {
      [].forEach.call(villesBox.querySelectorAll('button[data-ville]'), function(b) {
        b.setAttribute('aria-pressed', String(snap.etat.villes.indexOf(b.getAttribute('data-ville')) >= 0));
      });
    }
    if (snap.villes[0] && !glisse) {
      cibleLon = snap.villes[0].lon * Math.PI / 180 + 0.22;
    }
    if (friseBox) {
      friseBox.innerHTML = snap.jalons.map(function(j) {
        return '<li class="' + (j.id === 'j-0' ? 'cle' : '') + '">' +
          '<span class="frise-ecart">' + esc(j.ecart) + '<small>' + esc(j.date) + '</small></span>' +
          '<div class="frise-corps"><b>' + esc(j.titre) + '</b><span>' + esc(j.detail) + '</span></div>' +
        '</li>';
      }).join('');
    }
    relancer();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(en) {
      en.forEach(function(e) {
        if (e.isIntersecting) {
          chargerTerres();
          visible = true;
          relancer();
        } else {
          visible = false;
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }
      });
    }, { rootMargin: '420px 0px' });
    io.observe($('naiss') || cv);
  } else {
    chargerTerres();
    visible = true;
  }

  noyau.abonner(rendreTerreEtTemps);
  rendreTerreEtTemps(noyau.lire());
})();
