/* AIME · ME : ma Carte, sur cet appareil et sur mon compte (V1, PR P1).
   Une seule Carte (carte/carte.js). Sur l'appareil : localStorage « aime-carte », comme avant. Sur le compte : /api/carte.
   Rien ne part sans un geste et une case cochée ; la copie de l'appareil n'est jamais effacée en silence (une sauvegarde
   « aime-carte-sauvegarde » est gardée avant de la remplacer) ; deux versions différentes ne sont jamais fusionnées : on choisit.
   États : chargement, aucune Carte, Carte sur l'appareil seulement, sur le compte seulement, identiques, différentes, erreur (503),
   conflit (409). AIMECarteCompte.monter(section) */
(function () {
'use strict';
var K = window.AIMECarte, CLE = 'aime-carte', SAUVEGARDE = 'aime-carte-sauvegarde', RETENUS = { photo: 'la photo', relations: 'les relations', historique: 'l\'historique des versions' };
var NIVEAUX = { privee: 'Privée', contacts: 'Mes contacts', publique: 'Publique (rien n\'est publié pour l\'instant)' };
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
function accord(c, libelle, faire) {
  var f = el('form', 'pile'), id = 'mcAccord' + Math.floor(Math.random() * 1e6);
  var r = retenus(c); if (r.length) f.appendChild(el('p', 'leg', 'Restent sur cet appareil, jamais envoyés : ' + r.map(function (x) { return RETENUS[x]; }).join(', ') + '.'));
  var lab = el('label', 'mc-accord'), cb = el('input'); cb.type = 'checkbox'; cb.id = id; cb.setAttribute('aria-required', 'true'); lab.appendChild(cb); lab.appendChild(el('span', null, (compte && compte.texte) || 'J\'enregistre ma Carte sur mon compte.')); f.appendChild(lab);
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
  f.appendChild(el('p', 'leg', 'Une visibilité ne publie rien : la publication par un lien que vous pourrez couper viendra ensuite.'));
  f.onsubmit = function (e) {
    e.preventDefault(); var n = JSON.parse(JSON.stringify(c));
    [].forEach.call(f.querySelectorAll('select'), function (s) { n = K.rendreVisible(n, s.name, s.value); });
    var loc = locale(); if (loc) { var l2 = loc; Object.keys(n.visibilite).forEach(function (k) { if (K.RUBRIQUES[k]) l2 = K.rendreVisible(l2, k, n.visibilite[k]); }); poserLocale(l2); }
    enregistrer(n, compte.rev, b);
  };
  return f;
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
    C.appendChild(u); var v = visibilites(srv); if (v) C.appendChild(v); C.appendChild(retirer()); return;
  }
  if (empreinte(loc) === empreinte(srv)) {
    C.appendChild(el('p', null, 'Votre Carte est à jour sur cet appareil et sur votre compte.'));
    C.appendChild(maj); C.appendChild(resume(srv)); var v2 = visibilites(srv); if (v2) C.appendChild(v2); C.appendChild(retirer()); return;
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
