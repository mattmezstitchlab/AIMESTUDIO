/* AIME · l'apparition douce (25/10) : les blocs se posent quand ils entrent dans l'écran, de 14 px, en une demi-seconde.
   Rien n'est masqué par le CSS seul : sans JavaScript, sans IntersectionObserver, avec « Réduire les animations » ou
   « prefers-reduced-motion », tout reste visible. On ne touche qu'à opacity et transform : aucun décalage de mise en page. */
(function () {
  'use strict';
  var d = document.documentElement;
  if (!('IntersectionObserver' in window)) return;
  if (d.classList.contains('calme') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  /* la page des cinq temps (25/10) : les titres et les sous-titres se posent, le téléphone reste en place */
  var CIBLES = ['#ecrans .etape > h1', '#ecrans .etape > h2', '#ecrans .etape > p', '#entree > *'];
  var vus = [];
  CIBLES.forEach(function (s) {
    [].forEach.call(document.querySelectorAll(s), function (e, i) {
      /* ce qui est déjà à l'écran ne bouge pas : la page s'ouvre stable, l'animation ne concerne que la suite */
      if (e.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      e.classList.add('rev');
      if (/li$/.test(s) || /\.v-cap$/.test(s)) e.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
      vus.push(e);
    });
  });
  if (!vus.length) return;
  var io = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (x) {
      if (!x.isIntersecting) return;
      x.target.classList.add('rev-vu');
      io.unobserve(x.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  vus.forEach(function (e) { io.observe(e); });
  /* filet : si l'observateur ne se déclenche pas (navigateur, onglet en arrière-plan), rien ne reste invisible */
  setTimeout(function () { vus.forEach(function (e) { if (!e.classList.contains('rev-vu')) e.classList.add('rev-vu'); }); }, 4000);
})();
