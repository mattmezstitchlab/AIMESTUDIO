/* AIME · la liste d'attente de la bêta, côté navigateur (brief « Liste d'attente »).
   AIMEAttente.grille(el)    : la grille « Qu'attendez-vous d'AIME ? », depuis attente/souhaits.json (une seule liste), au style du Dock
   AIMEAttente.formulaire(f) : /beta/ : adresse, « Je suis… » (accueil/liste.js), fonctions, « Autre chose ? », consentement
   AIMEAttente.bloc(f)       : le bloc court de l'accueil : la place vient du « Je suis… » déjà choisi au-dessus
   AIMEAttente.lien(el)      : /beta/?jeton=… (confirmation) et /beta/?retrait=… (désinscription en un clic)
   La source vient des paramètres utm_source et utm_campaign de l'adresse de la page. Rien n'est envoyé sans le bouton. */
(function (root) {
  'use strict';
  var debut = Date.now(), API = '/api/attente';
  var MSG = {
    envoye: 'Vérifiez votre boîte : un lien de confirmation vient de partir.',
    place: 'Choisissez votre place dans « Je suis… ».',
    email: 'Adresse e-mail invalide.',
    consentement: 'Cochez la case pour recevoir l\'e-mail d\'ouverture.',
    limite: 'Trop d\'essais depuis cette connexion. Réessayez dans un moment.',
    indisponible: 'La liste d\'attente n\'est pas encore ouverte. Réessayez bientôt.',
    erreur: 'L\'envoi n\'a pas abouti. Réessayez dans un instant.'
  };
  function utm() {
    var p = new URLSearchParams(location.search), c = function (v) { return (v || '').slice(0, 40); };
    return { utm_source: c(p.get('utm_source')), utm_campaign: c(p.get('utm_campaign')) };
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icone(n) { return root.AIMEDockVue && root.AIMEDockVue.icone ? root.AIMEDockVue.icone(n) : ''; }
  var COCHE = '<svg class="at-coche" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

  function grille(el) {
    return fetch('/attente/souhaits.json', { cache: 'force-cache' }).then(function (r) { return r.json(); }).then(function (j) {
      el.innerHTML = j.souhaits.map(function (s) {
        /* le nom complet est le nom accessible ; il contient le mot affiché (WCAG 2.5.3) */
        return '<label class="at-e" title="' + esc(s.nom) + '"><input type="checkbox" name="souhaits" value="' + esc(s.id) + '" aria-label="' + esc(s.nom) + '">' +
          icone(s.icone) + COCHE + '<span class="at-t" aria-hidden="true">' + esc(s.mot) + '</span></label>';
      }).join('');
      return j.souhaits;
    });
  }
  function dire(etat, texte, erreur) { etat.textContent = texte; etat.classList.toggle('erreur', !!erreur); }
  function poster(donnees) {
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(donnees) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { code: r.status, j: j }; }); });
  }
  function reponse(x) {
    if (x.code === 200 && x.j.ok) return [MSG.envoye, false];
    if (x.code === 422 && x.j.champs) { var k = Object.keys(x.j.champs)[0]; return [MSG[k] || x.j.champs[k], true, k]; }
    if (x.code === 429) return [MSG.limite, true];
    if (x.code === 503) return [MSG.indisponible, true];
    return [MSG.erreur, true];
  }
  /* commun aux deux formulaires : vérifier, envoyer, dire ; le bouton reste inactif pendant l'envoi */
  function brancher(f, lire, focus) {
    var etat = f.querySelector('.at-etat'), bouton = f.querySelector('button[type=submit]');
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = lire(); if (!d) return;
      d.site_web = (f.querySelector('[name=site_web]') || {}).value || '';
      d.duree = Date.now() - debut;
      var u = utm(); d.utm_source = u.utm_source; d.utm_campaign = u.utm_campaign;
      bouton.disabled = true; dire(etat, 'Envoi…');
      poster(d).then(reponse, function () { return [MSG.erreur, true]; }).then(function (r) {
        dire(etat, r[0], r[1]); bouton.disabled = false;
        if (!r[1]) { f.classList.add('envoye'); var e = f.querySelector('input[type=email]'); if (e) e.value = ''; }
        else if (r[2] && focus[r[2]]) focus[r[2]]();
      });
    });
  }
  function adresse(f) { var e = f.querySelector('input[type=email]'); return e && e.value.trim(); }

  function formulaire(f) {
    var choix = document.getElementById('jsChoix'), consent = f.querySelector('[name=consentement]'), email = f.querySelector('input[type=email]'),
      libre = f.querySelector('[name=souhait_libre]'), etat = f.querySelector('.at-etat');
    grille(f.querySelector('.at-g'));
    var focus = { email: function () { email.focus(); }, place: function () { choix.focus(); }, consentement: function () { consent.focus(); } };
    brancher(f, function () {
      if (!email.checkValidity() || !email.value.trim()) { dire(etat, MSG.email, true); email.focus(); return null; }
      if (!choix.value) { dire(etat, MSG.place, true); choix.focus(); return null; }
      if (!consent.checked) { dire(etat, MSG.consentement, true); consent.focus(); return null; }
      return { email: adresse(f), place: choix.value, consentement: true, souhait_libre: libre.value.trim().slice(0, 140),
        souhaits: [].map.call(f.querySelectorAll('[name=souhaits]:checked'), function (x) { return x.value; }) };
    }, focus);
  }

  function bloc(f) {
    var choix = document.getElementById('jsChoix'), consent = f.querySelector('[name=consentement]'), email = f.querySelector('input[type=email]'), etat = f.querySelector('.at-etat');
    var focus = { email: function () { email.focus(); }, place: function () { choix.focus(); }, consentement: function () { consent.focus(); } };
    brancher(f, function () {
      if (!email.checkValidity() || !email.value.trim()) { dire(etat, MSG.email, true); email.focus(); return null; }
      if (!choix || !choix.value) { dire(etat, 'Choisissez votre place dans « Je suis… », avant d\'envoyer.', true); if (choix) { choix.scrollIntoView({ block: 'center' }); choix.focus({ preventScroll: true }); } return null; }
      if (!consent.checked) { dire(etat, MSG.consentement, true); consent.focus(); return null; }
      return { email: adresse(f), place: choix.value, consentement: true, souhaits: [] };
    }, focus);
  }

  /* /beta/?jeton=… et /beta/?retrait=… : le lien de l'e-mail ; la page appelle le serveur (un robot de messagerie qui ne
     lance pas de script ne confirme ni ne désinscrit personne) */
  function lien(zone, form) {
    var p = new URLSearchParams(location.search), jeton = p.get('jeton'), retrait = p.get('retrait');
    if (!jeton && !retrait) return false;
    if (form) form.hidden = true;
    zone.hidden = false;
    var h = zone.querySelector('h2'), t = zone.querySelector('p');
    h.textContent = 'Un instant…'; t.textContent = '';
    history.replaceState(null, '', location.pathname);   /* le jeton ne reste ni dans l'historique ni dans le Referer */
    var q = jeton ? 'jeton=' + encodeURIComponent(jeton) : 'retrait=' + encodeURIComponent(retrait);
    fetch(API + '?' + q, { cache: 'no-store' }).then(function (r) { return r.json().then(function (j) { return { code: r.status, j: j }; }); }).then(function (x) {
      if (jeton && x.j.ok) {
        h.textContent = 'C\'est noté. Vous serez parmi les premiers.';
        /* le rang, seulement s'il est utile : parmi les 500 premiers */
        t.textContent = x.j.rang && x.j.rang <= 500 ? 'Vous êtes le ' + x.j.rang + (x.j.rang === 1 ? 'ᵉʳ' : 'ᵉ') + ' inscrit.' : 'Nous vous écrirons à l\'ouverture de la bêta.';
      } else if (jeton) {
        h.textContent = x.j.raison === 'expire' ? 'Ce lien a expiré.' : 'Ce lien n\'est plus valable.';
        t.textContent = 'Un lien de confirmation vaut 7 jours et sert une fois. Inscrivez-vous de nouveau ci-dessous : un nouveau lien partira.';
        if (form) form.hidden = false;
      } else if (x.j.ok) {
        h.textContent = 'Vous êtes désinscrit.'; t.textContent = 'Votre adresse a été effacée de la liste d\'attente. Vous ne recevrez plus rien de notre part.';
      } else { h.textContent = 'Ce lien de désinscription n\'est pas valable.'; t.textContent = 'Écrivez-nous depuis la page Contact : nous effacerons votre adresse.'; }
    }, function () { h.textContent = 'Le serveur ne répond pas.'; t.textContent = 'Rechargez la page dans un instant.'; });
    return true;
  }

  root.AIMEAttente = { grille: grille, formulaire: formulaire, bloc: bloc, lien: lien, MSG: MSG };
})(typeof self !== 'undefined' ? self : this);
