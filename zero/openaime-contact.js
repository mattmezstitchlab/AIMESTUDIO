/* OpenAime → formulaire AIME : un brouillon, jamais un envoi automatique.
   Le fragment ne part pas au serveur HTTP. On le retire de l'URL aussitôt lu.
   Pas de stockage local, de HTML injecté, d'URL de retour fournie par le visiteur ni de coordonnées dans le lien. */
(function () {
  'use strict';
  var fragment = window.location.hash;
  if (fragment) {
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
  }
  var msg = document.getElementById('c-message');
  if (!msg) return;
  var texte = '';
  if (fragment.length <= 18000) {
    try {
      var params = new URLSearchParams(fragment.slice(1));
      texte = (params.get('mot') || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 3000);
    } catch (_) {}
  }
  msg.value = texte.trim() ? '[OpenAime · post-it privé]\n' + texte : '';
  document.getElementById('compte').textContent = String(msg.value.length);
})();
