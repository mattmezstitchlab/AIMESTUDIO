/* AIME · ME : ma Carte, sur cet appareil et sur mon compte (V1, PR P1).
   Une seule Carte (carte/carte.js). Sur l'appareil : localStorage « aime-carte », comme avant. Sur le compte : /api/carte.
   Rien ne part sans un geste et une case cochée ; la copie de l'appareil n'est jamais effacée en silence (une sauvegarde
   « aime-carte-sauvegarde » est gardée avant de la remplacer) ; deux versions différentes ne sont jamais fusionnées : on choisit.
   États : chargement, aucune Carte, Carte sur l'appareil seulement, sur le compte seulement, identiques, différentes, erreur (503),
   conflit (409). AIMECarteCompte.monter(section) */
(function () {
'use strict';
var K = window.AIMECarte, CLE = 'aime-carte', SAUVEGARDE = 'aime-carte-sauvegarde', RETENUS = { photo: 'la photo', relations: 'les relations', historique: 'l\'historique des versions' };
var NIVEAUX = { privee: 'Privée', contacts: 'Mes contacts', publique: 'Publique (visible par mon lien, si j\'en crée un)' };
var Z = null, compte = null, etat = 'chargement', message = '', occupe = false;

function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
function locale() { try { var t = localStorage.getItem(CLE); return t ? K.migrer(JSON.parse(t)) : null; } catch (_) { return null; } }
function poserLocale(c) { try { var avant = localStorage.getItem(CLE); if (avant) localStorage.setItem(SAUVEGARDE, avant); localStorage.setItem(CLE, JSON.stringify(c)); return true; } catch (_) { return false; } }
function requete(corps) {
  return fetch('/api/carte', { method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined })
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { statut: r.status, j: j }; }); });
}
function jour(d) { if (!d) return ''; var x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
/* ce que le compte garde d'une Carte : les rubriques (sans photo ni relations) et leurs visibilités ; sert à comparer */
function empreinte(c) {
  if (!c) return '';
  var o = {}; Object.keys(K.RUBRIQUES).forEach(function (k) { if (k === 'photo' || k === 'relations') return; o[k] = c[k]; o['v_' + k] = c.visibilite && c.visibilite[k]; });
  return JSON.stringify(o);
}
function retenus(c) { var r = []; if (c && c.photo) r.push('photo'); if (c && c.relations && c.relations.length) r.push('relations'); if (c && c.historique && c.historique.length > 1) r.push('historique'); return r; }
function remplies(c) { return Object.keys(K.RUBRIQUES).filter(function (k) { return k !== 'photo' && k !== 'relations' && K.rempli(c, k); }); }
function dire(t, ko) { message = t || ''; var s = Z && Z.querySelector('#mcVivant'); if (s) { s.className = 'leg' + (ko ? ' alerte' : ''); s.textContent = message; } }

/* le résumé d'une Carte : ses rubriques remplies et leur visibilité */
function resume(c, titre) {
  var b = el('div', 'pile'); if (titre) b.appendChild(el('h3', null, titre));
  var r = remplies(c);
  if (!r.length) { b.appendChild(el('p', 'leg', 'Aucune rubrique remplie pour l\'instant.')); return b; }
  var l = el('ul', 'mc-liste'); r.forEach(function (k) { var li = el('li'); li.appendChild(el('b', null, K.RUBRIQUES[k].nom)); li.appendChild(document.createTextNode(' · ' + (NIVEAUX[c.visibilite[k]] || c.visibilite[k]))); l.appendChild(li); });
  b.appendChild(l); return b;
}
/* l'accord, avant tout envoi : la case, le texte, et ce qui reste sur l'appareil */
function accord(c, libelle, faire, texte) {
  var f = el('form', 'pile'), id = 'mcAccord' + Math.floor(Math.random() * 1e6);
  var r = retenus(c); if (r.length) f.appendChild(el('p', 'leg', 'Restent sur cet appareil, jamais envoyés : ' + r.map(function (x) { return RETENUS[x]; }).join(', ') + '.'));
  var lab = el('label', 'mc-accord'), cb = el('input'); cb.type = 'checkbox'; cb.id = id; cb.setAttribute('aria-required', 'true'); lab.appendChild(cb); lab.appendChild(el('span', null, texte || (compte && compte.texte) || 'J\'enregistre ma Carte sur mon compte.')); f.appendChild(lab);
  var b = el('button', 'b b-p', libelle); b.type = 'submit'; f.appendChild(b);
  f.onsubmit = function (e) { e.preventDefault(); if (!cb.checked) { dire('Cochez la case pour donner votre accord.', true); cb.focus(); return; } faire(b); };
  return f;
}
function enregistrer(c, rev, bouton) {
  if (occupe) return; occupe = true; if (bouton) bouton.disabled = true; dire('Enregistrement…');
  requete({ action: 'enregistrer', carte: c, consentement: true, rev: rev == null ? null : rev }).then(function (r) {
    occupe = false; if (bouton) bouton.disabled = false;
    if (r.statut === 200) { compte = r.j; if (!locale()) poserLocale(r.j.carte); etat = ''; afficher(); dire('Votre Carte est enregistrée sur votre compte.'); return; }
    if (r.statut === 409) { compte = r.j; afficher(); dire(r.j.raison || 'Votre Carte a changé sur un autre appareil : choisissez la version à garder.', true); return; }
    dire((r.j && r.j.raison) || 'Enregistrement impossible pour l\'instant. Votre Carte reste sur cet appareil.', true);
  }).catch(function () { occupe = false; if (bouton) bouton.disabled = false; dire('Réseau indisponible : rien n\'a été envoyé. Votre Carte reste sur cet appareil.', true); });
}

/* les visibilités, réglées ici et appliquées par le serveur (une rubrique jamais publique n'a pas le choix « publique ») */
function visibilites(c) {
  var f = el('form', 'pile mc-vis'), fs = el('fieldset'); fs.appendChild(el('legend', null, 'Qui pourra voir chaque rubrique'));
  var r = remplies(c); if (!r.length) return null;
  r.forEach(function (k) {
    var lab = el('label', 'lgn mc-ligne'), s = el('select'); s.name = k; s.id = 'mcVis-' + k;
    Object.keys(NIVEAUX).forEach(function (n) { if (n === 'publique' && K.RUBRIQUES[k].jamaisPublique) return; var o = el('option', null, NIVEAUX[n]); o.value = n; if (c.visibilite[k] === n) o.selected = true; s.appendChild(o); });
    lab.setAttribute('for', s.id); lab.appendChild(el('span', null, K.RUBRIQUES[k].nom)); lab.appendChild(s); fs.appendChild(lab);
  });
  f.appendChild(fs); var b = el('button', 'b b-s', 'Enregistrer ces visibilités'); b.type = 'submit'; f.appendChild(b);
  f.appendChild(el('p', 'leg', 'Une visibilité ne publie rien à elle seule : seules les rubriques « publique » apparaissent sur le lien, si vous en créez un.'));
  f.onsubmit = function (e) {
    e.preventDefault(); var n = JSON.parse(JSON.stringify(c));
    [].forEach.call(f.querySelectorAll('select'), function (s) { n = K.rendreVisible(n, s.name, s.value); });
    var loc = locale(); if (loc) { var l2 = loc; Object.keys(n.visibilite).forEach(function (k) { if (K.RUBRIQUES[k]) l2 = K.rendreVisible(l2, k, n.visibilite[k]); }); poserLocale(l2); }
    enregistrer(n, compte.rev, b);
  };
  return f;
}
/* modifier ma Carte dans ME (V1, P4, critère 2.10) : quelques rubriques en texte ; chaque modification crée une version (carte.js),
   va sur cet appareil (s'il a une copie) et sur le compte, sans toucher aux visibilités ni à la photo */
var LISTES = { competences: 'Compétences', interets: 'Centres d\'intérêt', territoires: 'Territoires' };
function modifier(c) {
  var d = el('details', 'mc-modifier'); d.id = 'mcModifier'; var sm = el('summary', null, 'Modifier ma Carte'); d.appendChild(sm);
  var f = el('form', 'pile'); d.appendChild(f);
  function champ(id, lib, val, max, aide) {
    var l = el('label', 'pile'); l.setAttribute('for', id); l.appendChild(el('span', null, lib)); var i = el('input'); i.id = id; i.maxLength = max; i.value = val || ''; l.appendChild(i);
    if (aide) { var a = el('span', 'leg', aide); a.id = id + '-aide'; i.setAttribute('aria-describedby', a.id); l.appendChild(a); } f.appendChild(l); return i;
  }
  var nom = champ('mcmNom', 'Nom d\'affichage', c.nom, 80), it = champ('mcmIntention', 'Intention', c.intention, 200), L = {};
  Object.keys(LISTES).forEach(function (k) {
    var v = Array.isArray(c[k]) ? c[k] : []; if (v.some(function (x) { return typeof x !== 'string'; })) return;   /* une liste d'objets se modifie ailleurs : on n'y touche pas */
    L[k] = champ('mcm-' + k, LISTES[k], v.join(', '), 600, 'Séparées par des virgules.');
  });
  var b = el('button', 'b b-p', 'Enregistrer les modifications'); b.type = 'submit'; f.appendChild(b);
  f.appendChild(el('p', 'leg', 'Les visibilités ne changent pas : une rubrique privée le reste.'));
  f.onsubmit = function (e) {
    e.preventDefault(); if (!nom.value.trim()) { dire('Donnez un nom d\'affichage.', true); nom.focus(); return; }
    var champs = { nom: nom.value.trim(), intention: it.value.trim() };
    Object.keys(L).forEach(function (k) { champs[k] = L[k].value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 50); });
    var jourIso = new Date().toISOString().slice(0, 10), n = K.modifier(c, champs, 'Modification dans ME', jourIso);
    var loc = locale(); if (loc) poserLocale(K.modifier(loc, champs, 'Modification dans ME', jourIso));
    enregistrer(n, compte.rev, b);
  };
  return d;
}
/* partager ma Carte par un lien (PR P2) : un seul lien actif, créé avec accord, coupé en un geste ; il ne montre que le « publique » */
function partage(srv) {
  var z = el('section', 'pile mc-partage'); z.setAttribute('aria-labelledby', 'mcPartageT'); var h = el('h3', null, 'Partager ma Carte par un lien'); h.id = 'mcPartageT'; z.appendChild(h);
  if (compte.publication === 'indisponible') { z.appendChild(el('p', 'leg', 'Le partage par lien n\'est pas encore disponible ici.')); return z; }
  var pub = remplies(srv).filter(function (k) { return srv.visibilite[k] === 'publique' && !K.RUBRIQUES[k].jamaisPublique; });
  var noms = pub.map(function (k) { return K.RUBRIQUES[k].nom; }).join(', ');
  if (compte.lien) {
    var url = location.origin + '/c/#' + compte.lien.jeton, lg = el('div', 'lgn mc-lien'), i = el('input'); i.readOnly = true; i.value = url; i.id = 'mcLien'; i.setAttribute('aria-label', 'Le lien public de ma Carte'); lg.appendChild(i);
    var cp = el('button', 'b b-s', 'Copier'); cp.type = 'button'; cp.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { dire('Lien copié.'); }).catch(function () { i.select(); dire('Lien sélectionné : copiez-le.'); }); }; lg.appendChild(cp); z.appendChild(lg);
    var o = el('a', 'b b-s', 'Voir ce que le lien montre'); o.href = url; o.target = '_blank'; o.rel = 'noopener noreferrer'; z.appendChild(o);
    z.appendChild(el('p', 'leg', 'Créé le ' + jour(compte.lien.cree_le) + ' · ouvert ' + compte.lien.ouvertures + ' fois. ' + (noms ? 'Il montre : ' + noms + ', et les activités cochées « Montrer sur ma Carte ».' : 'Il ne montre aucune rubrique pour l\'instant (aucune n\'est « publique ») ; seulement les activités cochées « Montrer sur ma Carte ».')));
    z.appendChild(contact());
    var cou = el('button', 'b b-s', 'Couper le lien'); cou.type = 'button';
    cou.onclick = function () { if (occupe) return; occupe = true; cou.disabled = true; requete({ action: 'couper' }).then(function (r) { occupe = false; cou.disabled = false; if (r.statut === 200) { compte = r.j; afficher(); dire('Le lien est coupé : il ne mène plus à rien.'); } else dire((r.j && r.j.raison) || 'Impossible de couper le lien pour l\'instant.', true); }).catch(function () { occupe = false; cou.disabled = false; dire('Réseau indisponible : le lien n\'a pas été coupé.', true); }); };
    z.appendChild(cou); return z;
  }
  if (!pub.length) { z.appendChild(el('p', 'leg', 'Marquez au moins une rubrique « publique » ci-dessus pour pouvoir partager votre Carte par un lien.')); return z; }
  z.appendChild(el('p', 'leg', 'Le lien montrera : ' + noms + '. Rien d\'autre.'));
  z.appendChild(accord(null, 'Créer le lien', function (b) {
    if (occupe) return; occupe = true; b.disabled = true; dire('Création du lien…');
    requete({ action: 'publier', consentement: true }).then(function (r) { occupe = false; b.disabled = false; if (r.statut === 200) { compte = r.j; afficher(); dire('Votre lien est prêt. Vous pouvez le couper à tout moment.'); } else dire((r.j && r.j.raison) || 'Le lien n\'a pas pu être créé.', true); }).catch(function () { occupe = false; b.disabled = false; dire('Réseau indisponible : aucun lien n\'a été créé.', true); });
  }, compte.texte_publication));
  return z;
}
/* recevoir des demandes par mon lien (V1, P3) : éteint par défaut ; elles arrivent dans mon AI et à l'adresse de mon compte */
function contact() {
  var d = el('div', 'pile mc-contact');
  if (compte.contact === 'indisponible') { d.appendChild(el('p', 'leg', 'Recevoir des demandes par votre Carte n\'est pas encore disponible ici.')); return d; }
  var l = el('label', 'lgn'), c = el('input'); c.type = 'checkbox'; c.id = 'mcContact'; c.checked = !!(compte.lien && compte.lien.contact);
  l.setAttribute('for', 'mcContact'); l.appendChild(c); l.appendChild(el('span', null, 'Recevoir des demandes par ce lien')); d.appendChild(l);
  d.appendChild(el('p', 'leg', c.checked
    ? 'Allumé : la page du lien montre un formulaire. Les demandes arrivent dans votre AI et par e-mail à l\'adresse de votre compte, qui n\'est jamais montrée.'
    : 'Éteint : personne ne peut vous écrire par ce lien.'));
  c.onchange = function () {
    if (occupe) { c.checked = !c.checked; return; } occupe = true; c.disabled = true; var voulu = c.checked;
    requete({ action: 'contact', actif: voulu }).then(function (r) { occupe = false; c.disabled = false; if (r.statut === 200) { compte = r.j; afficher(); var n = document.getElementById('mcContact'); if (n) n.focus(); dire(voulu ? 'Votre Carte reçoit maintenant des demandes.' : 'Votre Carte ne reçoit plus de demandes.'); } else { c.checked = !voulu; dire((r.j && r.j.raison) || 'Réglage impossible pour l\'instant.', true); } })
      .catch(function () { occupe = false; c.disabled = false; c.checked = !voulu; dire('Réseau indisponible : rien n\'a changé.', true); });
  };
  return d;
}
function retirer() {
  var d = el('details', 'mc-retirer'), s = el('summary', null, 'Retirer ma Carte de mon compte'); d.appendChild(s);
  d.appendChild(el('p', 'leg', 'Elle sera effacée de votre compte. La copie de cet appareil, s\'il y en a une, reste ici.'));
  var b = el('button', 'b b-s', 'Retirer de mon compte'); b.type = 'button'; d.appendChild(b);
  b.onclick = function () { if (occupe) return; occupe = true; b.disabled = true; requete({ action: 'retirer', confirmation: true }).then(function (r) { occupe = false; b.disabled = false; if (r.statut === 200) { compte = r.j; afficher(); dire('Votre Carte est retirée de votre compte.'); } else dire((r.j && r.j.raison) || 'Retrait impossible pour l\'instant.', true); }).catch(function () { occupe = false; b.disabled = false; dire('Réseau indisponible : rien n\'a été retiré.', true); }); };
  return d;
}
function afficher() {
  if (!Z) return;
  var C = Z.querySelector('#mcCorps'); C.textContent = '';
  if (etat === 'chargement') { C.appendChild(el('p', 'leg', 'Chargement de votre Carte…')); return; }
  var loc = locale(), srv = compte && compte.carte;
  if (etat === 'indisponible') {
    C.appendChild(el('p', 'alerte', (compte && compte.raison) || 'Votre Carte ne peut pas être enregistrée ici pour l\'instant. Elle reste sur cet appareil.'));
    if (loc) C.appendChild(resume(loc, 'Sur cet appareil'));
    return;
  }
  if (!loc && !srv) {
    C.appendChild(el('p', null, 'Vous n\'avez pas encore de Carte. Elle dit qui vous êtes et ce que vous proposez ; elle est privée par défaut.'));
    var f = el('form', 'pile');
    var l1 = el('label', 'pile'); l1.setAttribute('for', 'mcNom'); l1.appendChild(el('span', null, 'Nom d\'affichage')); var nom = el('input'); nom.id = 'mcNom'; nom.maxLength = 80; nom.autocomplete = 'name'; l1.appendChild(nom); f.appendChild(l1);
    var l2 = el('label', 'pile'); l2.setAttribute('for', 'mcIntention'); l2.appendChild(el('span', null, 'Ce que vous aimeriez faire ou proposer (facultatif)')); var it = el('input'); it.id = 'mcIntention'; it.maxLength = 200; l2.appendChild(it); f.appendChild(l2);
    try { var n0 = document.getElementById('nom'); if (n0 && n0.value) nom.value = n0.value; } catch (_) {}
    C.appendChild(f);
    C.appendChild(accord(null, 'Créer ma Carte et l\'enregistrer sur mon compte', function (b) {
      if (!nom.value.trim()) { dire('Donnez un nom d\'affichage.', true); nom.focus(); return; }
      var d = new Date().toISOString().slice(0, 10), c = K.modifier(K.vide(d), { nom: nom.value.trim(), intention: it.value.trim() }, 'Création dans ME', d);
      poserLocale(c); enregistrer(c, null, b);
    }));
    return;
  }
  if (loc && !srv) {
    C.appendChild(el('p', null, 'Une Carte existe sur cet appareil. Elle n\'est pas encore sur votre compte : rien n\'en a été envoyé.'));
    C.appendChild(resume(loc, 'Ce qui sera enregistré'));
    C.appendChild(accord(loc, 'Enregistrer ma Carte sur mon compte', function (b) { enregistrer(loc, null, b); }));
    return;
  }
  var maj = el('p', 'leg', 'Enregistrée sur votre compte le ' + jour(compte.maj_le) + '.');
  if (srv && !loc) {
    C.appendChild(el('p', null, 'Votre Carte est enregistrée sur votre compte. Cet appareil n\'en a pas encore de copie.'));
    C.appendChild(maj); C.appendChild(resume(srv, 'Sur votre compte'));
    var u = el('button', 'b b-p', 'Utiliser ma Carte sur cet appareil'); u.type = 'button';
    u.onclick = function () { if (poserLocale(srv)) { afficher(); dire('Votre Carte est maintenant aussi sur cet appareil.'); } else dire('Cet appareil refuse l\'enregistrement local (navigation privée ?).', true); };
    C.appendChild(u); C.appendChild(modifier(srv)); var v = visibilites(srv); if (v) C.appendChild(v); C.appendChild(partage(srv)); C.appendChild(retirer()); return;
  }
  if (empreinte(loc) === empreinte(srv)) {
    C.appendChild(el('p', null, 'Votre Carte est à jour sur cet appareil et sur votre compte.'));
    C.appendChild(maj); C.appendChild(resume(srv)); C.appendChild(modifier(srv)); var v2 = visibilites(srv); if (v2) C.appendChild(v2); C.appendChild(partage(srv)); C.appendChild(retirer()); return;
  }
  /* deux versions différentes : on choisit, rien n'est fusionné */
  C.appendChild(el('p', null, 'Votre Carte n\'est pas la même sur cet appareil et sur votre compte. Choisissez la version à garder : l\'autre ne sera pas perdue (la version de cet appareil est sauvegardée avant d\'être remplacée).'));
  var g = el('div', 'mc-deux'); g.appendChild(resume(loc, 'Sur cet appareil')); var s2 = resume(srv, 'Sur votre compte'); s2.appendChild(maj); g.appendChild(s2); C.appendChild(g);
  C.appendChild(accord(loc, 'Garder la version de cet appareil', function (b) { enregistrer(loc, compte.rev, b); }));
  var k = el('button', 'b b-s', 'Garder la version de mon compte sur cet appareil'); k.type = 'button';
  k.onclick = function () { if (poserLocale(srv)) { afficher(); dire('Cet appareil reprend la version de votre compte ; l\'ancienne est sauvegardée.'); } else dire('Cet appareil refuse l\'enregistrement local.', true); };
  C.appendChild(k); C.appendChild(retirer());
}

function charger() {
  etat = 'chargement'; afficher();
  return requete(null).then(function (r) {
    if (r.statut === 401) { Z.hidden = true; return; }
    if (r.statut !== 200) { etat = 'indisponible'; compte = r.j || {}; afficher(); return; }
    etat = ''; compte = r.j; afficher();
  }).catch(function () { etat = 'indisponible'; compte = { raison: 'Réseau indisponible : votre Carte reste sur cet appareil.' }; afficher(); });
}
function monter(section) {
  if (!section || !K) return; Z = section; Z.hidden = false;
  Z.textContent = ''; var h = el('h2', 'k', 'Ma Carte'); h.id = 't-carte'; Z.appendChild(h); Z.setAttribute('aria-labelledby', 't-carte');
  var corps = el('div', 'pile'); corps.id = 'mcCorps'; Z.appendChild(corps);
  var viv = el('p', 'leg'); viv.id = 'mcVivant'; viv.setAttribute('role', 'status'); viv.setAttribute('aria-live', 'polite'); Z.appendChild(viv);
  return charger();
}
window.AIMECarteCompte = { monter: monter, charger: charger, _empreinte: empreinte };
})();
