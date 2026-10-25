/* AIME · la capsule du haut (25/10) : le logo ouvre la liste « Je suis… », et les liens vers #jsChoix (« Aller au choix »,
   « Choisir ma place » du bas de page) l'ouvrent aussi, puisque le champ est en haut et non plus dans le corps de page.
   Le logo ne choisit rien : il ouvre la même liste qu'accueil/liste.js, qui garde le clavier et le motif ARIA.
   Rien n'est envoyé, rien n'est enregistré : choisir une place ne donne aucun rôle. */
(function () {
  'use strict';
  var mk = document.getElementById('mk'), champ = document.getElementById('jsChoix'), liste = document.getElementById('jsOptions');
  if (!mk || !champ) return;
  function ouvert() { return !!(liste && !liste.hidden); }
  function suivre() { mk.setAttribute('aria-expanded', ouvert() ? 'true' : 'false'); }
  function ouvrir() {
    if (champ._ouvrir) champ._ouvrir();          /* liste.js : le focus au champ, puis la liste */
    else champ.focus({ preventScroll: true });
    suivre();
  }
  mk.addEventListener('click', function (e) {
    /* le clic s'arrête ici : liste.js ferme la liste sur un clic ailleurs, et le logo n'est pas dans la liste */
    e.stopPropagation();
    if (ouvert()) champ.click();                 /* liste.js referme le même champ */
    else ouvrir();
    suivre();
  });
  /* le logo et le champ disent tous les deux si la liste est ouverte (Échap, Tab, un clic ailleurs la ferment) */
  if (liste && window.MutationObserver) new MutationObserver(suivre).observe(liste, { attributes: true, attributeFilter: ['hidden'] });
  /* une adresse qui vise le champ : on l'ouvre, plutôt que de laisser un lien vers un champ fermé */
  function hash() {
    if (location.hash !== '#jsChoix') return;
    setTimeout(ouvrir, 0);
  }
  window.addEventListener('hashchange', hash);
  hash();
})();
