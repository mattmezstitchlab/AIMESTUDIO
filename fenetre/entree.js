/* Liens historiques conservés ; le moteur d'origine demeure la vue embarquée. Aucun jeton n'est enregistré. */
(function(){const q=new URLSearchParams(location.search);if(window.self!==window.top){document.documentElement.dataset.fenetreInterne='true';return}if(q.get('historique')==='1')return;location.replace(AIMEFenetreRoute.historical(location.pathname,location.search,location.hash))})();
