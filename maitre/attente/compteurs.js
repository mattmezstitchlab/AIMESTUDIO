/* AIME · les compteurs de la liste d'attente (/maitre/attente/), pour le propriétaire du site.
   La page est gardée (middleware.js) ; les chiffres viennent de /api/attente?stats=1, qui répond 404 à toute autre personne.
   Aucune adresse n'est envoyée par le serveur : seulement des nombres, et les réponses libres sans leur auteur. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var PLACES = { maries: 'Futurs mariés', coordination: 'Coordination', invite: 'Invité·e' }, metiers = {};
  function place(v) { return PLACES[v] || (v && v.indexOf('metier:') === 0 ? (metiers[v.slice(7)] || v.slice(7)) : v); }
  function table(id, lignes, nom, tete) {
    var max = lignes.reduce(function (m, l) { return Math.max(m, l.n); }, 0) || 1;
    $(id).innerHTML = lignes.length ? '<tr><th scope="col">' + esc(tete) + '</th><th scope="col" class="n">Nombre</th></tr>' + lignes.map(function (l) {
      return '<tr><td>' + esc(nom ? nom(l.cle) : l.cle) + '<span class="barre" style="width:' + Math.round(100 * l.n / max) + '%" aria-hidden="true"></span></td><td class="n">' + l.n + '</td></tr>';
    }).join('') : '<tr><td class="vide">Rien pour l\'instant.</td></tr>';
  }
  Promise.all([
    fetch('/api/attente?stats=1', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch('/vitrine/metiers.json').then(function (r) { return r.json(); }).catch(function () { return { metiers: [] }; })
  ]).then(function (x) {
    var s = x[0]; x[1].metiers.forEach(function (m) { metiers[m.id] = m.nom.charAt(0).toUpperCase() + m.nom.slice(1); });
    var noms = {}; s.liste.forEach(function (l) { noms[l.id] = l.nom; });
    $('nConf').textContent = s.confirmes; $('nAtt').textContent = s.enAttente;
    var sel = $('parPlace'), places = s.parPlace.map(function (l) { return l.cle; });
    sel.insertAdjacentHTML('beforeend', places.map(function (p) { return '<option value="' + esc(p) + '">' + esc(place(p)) + '</option>'; }).join(''));
    function souhaits() {
      var p = sel.value, l = p ? s.souhaitsParPlace.filter(function (r) { return r.place === p; }) : s.souhaits;
      table('souhaits', l, function (c) { return noms[c] || c; }, 'Fonction');
    }
    sel.addEventListener('change', souhaits); souhaits();
    table('place', s.parPlace, place, 'Place'); table('source', s.parSource, null, 'Source'); table('campagne', s.parCampagne, null, 'Campagne'); table('jour', s.parJour, null, 'Jour');
    $('libres').innerHTML = s.libres.length ? s.libres.map(function (l) { return '<li>' + esc(l.texte) + '<small>' + esc(place(l.place)) + ' · ' + esc(l.jour) + '</small></li>'; }).join('') : '<li class="vide">Aucune réponse libre.</li>';
    $('etat').hidden = true; $('tout').hidden = false;
  }).catch(function () { $('etat').textContent = 'Compteurs indisponibles (réservés au propriétaire du site, ou liste d\'attente pas encore installée).'; });
})();
