/* AIME · ce qui attend la personne, même sans compte (AI et ME).
   Constat du 25/10 : sans session, /projets/ et /compte/ n'affichaient que le formulaire de connexion — et, sur un
   environnement où les comptes ne sont pas ouverts, presque rien du tout. Cette page-là n'existe plus : le contenu est
   écrit dans le document, il s'affiche tout de suite, et il reste quand le serveur répond 401, 503 ou ne répond pas.

   Rien n'est présenté comme disponible à tort : chaque carte porte son état, et « En préparation » reste « En préparation »
   (l'agent AIME). Aucun registre public n'est annoncé : il n'existe pas. Les liens pointent vers des pages réelles.

   AIMEDecouverte.description(ecran) → { cle, titre, chapeau, cartes[{ id, titre, etat, texte, liens[] }], sansCompte, note }
   AIMEDecouverte.monter(ecran)      → écrit ce contenu dans #decouverte (textContent seul : aucun HTML venu d'ailleurs)
   AIMEDecouverte.ECRANS, .ETATS      → les deux écrans, les trois états et leurs libellés */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(null);else root.AIMEDecouverte=factory(root)})(typeof self!=='undefined'?self:this,function(root){'use strict';

var ETATS={
 disponible:{nom:'Disponible',dit:'Fonctionne aujourd\'hui'},
 preparation:{nom:'En préparation',dit:'Annoncé, pas encore branché'},
 demonstration:{nom:'Démonstration',dit:'Données fictives'}
};
var ECRANS={
 ai:{titre:'AI', route:'/projets/'},
 me:{titre:'ME', route:'/compte/'}
};

/* les liens sont des routes réelles du site ; le test vérifie que chacune répond */
var L={
 temps:{nom:'Voir l\'aperçu du Temps',href:'/#temps'},
 exemples:{nom:'Les exemples',href:'/exemples/'},
 capacites:{nom:'Toutes les capacités',href:'/capacites/'},
 contact:{nom:'Nous écrire',href:'/contact/'},
 confidentialite:{nom:'Confidentialité',href:'/confidentialite/'},
 compte:{nom:'ME',href:'/compte/'},
 projets:{nom:'AI',href:'/projets/'},
 accueil:{nom:'L\'accueil',href:'/'}
};

function description(ecran){
 if(ecran!=='ai'&&ecran!=='me')throw new Error('écran inconnu : ' + ecran + ' (attendu « ai » ou « me »)');
 if(ecran==='ai')return{
  cle:'ai',
  titre:'Ce qui vous attend dans AI.',
  chapeau:'AI rassemble ce qui vous concerne : les demandes qu\'on vous adresse, les programmes de vos projets, ce que vous avez promis. Voilà ce que vous y trouverez — et ce que vous pouvez déjà voir sans compte.',
  cartes:[
   {id:'programmes',titre:'Vos programmes',etat:'disponible',
    texte:'Le Temps de chaque projet : la liste des moments, ou le cadran Circle de 24 heures. Une date de Jour J quand le projet en a une, les horaires qui changent sans recharger, et seulement les moments que votre place vous laisse voir — les autres ne vous sont jamais envoyés.',
    liens:[L.temps]},
   {id:'projets',titre:'Vos projets et vos invités',etat:'disponible',
    texte:'Un projet par mariage ou par séminaire. Chacun garde ses places et ses règles ; vous ouvrez directement ce qui vous concerne, et une invitation vous rejoint par un lien, jamais par un mot de passe à retenir.'},
   {id:'demandes',titre:'Ce qu\'on vous adresse',etat:'disponible',
    texte:'Les messages reçus par le formulaire ou par le lien de votre Carte arrivent ici, avec les réponses aux questions que vous avez posées. Vous y répondez, vous suivez l\'envoi, et vous pouvez faire d\'une demande un projet.',
    liens:[L.contact]},
   {id:'engagements',titre:'Vos engagements',etat:'disponible',
    texte:'Ce que vous avez promis, à qui, et pour quand — dans un projet partagé, avec une échéance. Vous ne voyez que ce qui vous concerne.'},
   {id:'agent',titre:'L\'agent AIME',etat:'preparation',
    texte:'Écrire « décale le cocktail de 15 minutes » et voir le programme suivre. Le module Temps sait déjà reconnaître ces phrases ; l\'agent qui les exécute n\'est pas branché, et rien ne le simule ici.',
    liens:[L.capacites]}
  ],
  sansCompte:{titre:'Sans compte, vous pouvez déjà',liens:[L.temps,L.exemples,L.capacites,L.contact]},
  note:'Ces exemples utilisent des programmes fictifs et le disent. Aucune donnée réelle n\'est lue pour vous montrer cette page.'
 };
 return{
  cle:'me',
  titre:'Ce que ME garde.',
  chapeau:'ME, c\'est vous : votre Timbre, vos activités, votre Carte et vos accès. Une partie vit sur cet appareil, le reste attend votre accord — rien ne part sans un geste de votre part.',
  cartes:[
   {id:'timbre',titre:'Votre Timbre',etat:'disponible',
    texte:'Votre nom et votre photo, ce que les membres de vos projets voient. Vous les changez quand vous voulez, et vous pouvez retirer la photo.'},
   {id:'activites',titre:'Vos activités',etat:'disponible',
    texte:'Vos métiers. Une activité ne donne aucun droit dans un projet, et cocher « Montrer sur ma Carte » ne publie rien dans un annuaire : il n\'en existe pas.'},
   {id:'carte',titre:'Votre Carte',etat:'disponible',
    texte:'Elle vit d\'abord dans votre navigateur. Avec votre accord, elle est enregistrée sur votre compte — sans la photo ni les relations, qui restent sur l\'appareil. Un lien public que vous coupez à tout moment, et un compteur d\'ouvertures, sans adresse IP.',
    liens:[L.confidentialite]},
   {id:'acces',titre:'Vos accès',etat:'disponible',
    texte:'Un lien de connexion par e-mail, puis une clé d\'accès (Face ID, Touch ID, empreinte). Votre empreinte ne quitte jamais l\'appareil : seules les clés publiques sont gardées.'},
   {id:'donnees',titre:'Vos données',etat:'disponible',
    texte:'Exporter votre Carte d\'un geste, depuis le menu de ME. Supprimer votre compte en deux confirmations, avec tout ce qu\'il contient. Et 24 mois au plus pour une demande reçue, comme le dit la page Confidentialité.',
    liens:[L.confidentialite]}
  ],
  sansCompte:{titre:'Sans compte, vous pouvez déjà',liens:[L.projets,L.exemples,L.capacites,L.accueil]},
  note:'Cette page ne demande rien pour être lue. Votre Carte, elle, ne devient publique que si vous ouvrez son lien.'
 };
}

function el(t,c,x){var e=root.document.createElement(t);if(c)e.setAttribute('class',c);if(x!=null)e.textContent=x;return e}

function monter(ecran){
 if(!root||!root.document)return null;   /* sous node (tests), aucun DOM : la description reste utilisable seule */
 var z=root.document.getElementById('decouverte'),d=description(ecran);
 if(!z)return d;
 z.textContent='';
 var tete=el('div','dec-tete'),h=el('h2','k',d.titre);h.id='tDecouverte';
 tete.appendChild(h);tete.appendChild(el('p','leg',d.chapeau));z.appendChild(tete);
 var g=el('ul','dec-grille');g.setAttribute('aria-labelledby','tDecouverte');
 d.cartes.forEach(function(c){
  var li=el('li','dec-carte'),haut=el('div','dec-haut'),etat=ETATS[c.etat];
  haut.appendChild(el('h3',null,c.titre));
  var p=el('span','dec-etat etat-'+c.etat,etat.nom);p.setAttribute('title',etat.dit);haut.appendChild(p);
  li.appendChild(haut);li.appendChild(el('p','leg',c.texte));
  if(c.liens&&c.liens.length){var l=el('p','dec-liens');c.liens.forEach(function(x){var a=el('a','b b-s',x.nom);a.href=x.href;l.appendChild(a)});li.appendChild(l)}
  g.appendChild(li)});
 z.appendChild(g);
 if(d.sansCompte){var b=el('div','dec-sans'),sb=el('h3','k',d.sansCompte.titre);sb.id='tSansCompte';b.appendChild(sb);
  var ul=el('ul','dec-liens');ul.setAttribute('aria-labelledby','tSansCompte');
  d.sansCompte.liens.forEach(function(x){var li=el('li'),a=el('a','b b-s',x.nom);a.href=x.href;li.appendChild(a);ul.appendChild(li)});
  b.appendChild(ul);z.appendChild(b)}
 z.appendChild(el('p','dec-note',d.note));
 z.hidden=false;
 return d;
}

return{ETATS:ETATS,ECRANS:ECRANS,description:description,monter:monter};
});
