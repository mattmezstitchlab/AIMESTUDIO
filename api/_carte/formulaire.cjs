// AIME · le formulaire personnel de ma Carte (V1, PR P5) : les questions que la personne pose à qui lui écrit par son lien.
// Un seul endroit pour les règles, appliquées au serveur : nettoyer les questions (ME → /api/carte) et valider les réponses
// (visiteur → /api/carte-publique). Le navigateur peut aider, il ne décide jamais.
//   question : { id: 'q' + 1 à 12 caractères [a-z0-9], libelle: 2 à 120 caractères, type: texte | date | nombre | choix,
//                requise: booléen, choix: 2 à 8 réponses de 1 à 60 caractères (type « choix » seulement) }
//   6 questions au plus. Les réponses gardées sur la demande : [{ libelle, type, valeur }] (le libellé tel qu'il était à l'envoi).
// En CommonJS, comme api/_carte/carte.cjs.
'use strict';
const crypto = require('crypto');
const { Refus } = require('./carte.cjs');

const MAX_QUESTIONS = 6, MAX_CHOIX = 8, MAX_TEXTE = 300, TAILLE_MAX = 8192;   /* la même borne que la migration 14 */
const TYPES = { texte: 'Texte court', date: 'Date', nombre: 'Nombre', choix: 'Choix dans une liste' };
const ID = /^q[a-z0-9]{1,12}$/;

/* un texte d'une ligne : sans caractères de contrôle, espaces resserrés */
function ligne(v) { return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim(); }
const nouvelId = () => 'q' + crypto.randomBytes(6).toString('hex').slice(0, 8);

/* les questions envoyées par ME → la liste propre, ou Refus(400) avec une raison lisible ; rien d'inconnu n'est gardé */
function nettoyerQuestions(entree) {
  if (!Array.isArray(entree)) throw new Refus(400, 'Questions invalides.');
  if (entree.length > MAX_QUESTIONS) throw new Refus(400, MAX_QUESTIONS + ' questions au plus.');
  const vus = new Set();
  const sortie = entree.map((q, i) => {
    const n = 'La question ' + (i + 1);
    if (!q || typeof q !== 'object' || Array.isArray(q)) throw new Refus(400, n + ' est invalide.');
    let id = ID.test(String(q.id || '')) ? String(q.id) : nouvelId();
    while (vus.has(id)) id = nouvelId();
    vus.add(id);
    const libelle = ligne(q.libelle);
    if (libelle.length < 2) throw new Refus(400, n + ' n\'a pas de libellé.');
    if (libelle.length > 120) throw new Refus(400, n + ' est trop longue (120 caractères au plus).');
    if (!Object.prototype.hasOwnProperty.call(TYPES, q.type)) throw new Refus(400, n + ' a un type inconnu.');
    const sortie = { id, libelle, type: q.type, requise: q.requise === true };
    if (q.type === 'choix') {
      if (!Array.isArray(q.choix)) throw new Refus(400, n + ' doit proposer des réponses.');
      const choix = [];
      for (const c of q.choix) { const t = ligne(c); if (!t) continue; if (t.length > 60) throw new Refus(400, n + ' : une réponse dépasse 60 caractères.'); if (!choix.includes(t)) choix.push(t); }
      if (choix.length < 2) throw new Refus(400, n + ' doit proposer au moins 2 réponses.');
      if (choix.length > MAX_CHOIX) throw new Refus(400, n + ' : ' + MAX_CHOIX + ' réponses au plus.');
      sortie.choix = choix;
    }
    return sortie;
  });
  if (Buffer.byteLength(JSON.stringify(sortie), 'utf8') > TAILLE_MAX) throw new Refus(413, 'Questions trop longues : raccourcissez quelques libellés ou réponses.');
  return sortie;
}

/* ce que la page du lien reçoit : exactement les questions, rien d'autre (les questions ne sont jamais personnelles) */
function vuePublique(questions) {
  return (Array.isArray(questions) ? questions : []).filter(q => q && ID.test(String(q.id)) && TYPES[q.type])
    .map(q => Object.assign({ id: q.id, libelle: q.libelle, type: q.type, requise: q.requise === true }, q.type === 'choix' ? { choix: q.choix } : {}));
}

function dateValide(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 1900 && +m[1] <= 2200;
}

/* les réponses d'un visiteur, contre les questions ACTUELLES de la Carte (lues au serveur, jamais celles du navigateur).
   reponses : { [id]: valeur } ; une réponse à une question inconnue est ignorée.
   → { ok: true, valeurs: [{ libelle, type, valeur }] } (seulement les questions répondues) | { ok: false, erreurs: { 'q:<id>': message } } */
function validerReponses(questions, reponses) {
  const qs = vuePublique(questions), r = reponses && typeof reponses === 'object' && !Array.isArray(reponses) ? reponses : {};
  const erreurs = {}, valeurs = [];
  for (const q of qs) {
    const brut = Object.prototype.hasOwnProperty.call(r, q.id) ? r[q.id] : '';
    const t = typeof brut === 'number' ? String(brut) : typeof brut === 'string' ? ligne(brut) : '';
    const cle = 'q:' + q.id;
    if (!t) { if (q.requise) erreurs[cle] = 'Répondez à cette question.'; continue; }
    if (q.type === 'texte') { if (t.length > MAX_TEXTE) { erreurs[cle] = MAX_TEXTE + ' caractères au plus.'; continue; } }
    else if (q.type === 'date') { if (!dateValide(t)) { erreurs[cle] = 'Date invalide.'; continue; } }
    else if (q.type === 'nombre') {
      const x = t.replace(/\s/g, '').replace(',', '.');
      if (!/^\d{1,9}(\.\d{1,2})?$/.test(x)) { erreurs[cle] = 'Indiquez un nombre (positif, deux décimales au plus).'; continue; }
      valeurs.push({ libelle: q.libelle, type: q.type, valeur: x }); continue;
    }
    else if (q.type === 'choix') { if (!q.choix.includes(t)) { erreurs[cle] = 'Choisissez une des réponses proposées.'; continue; } }
    valeurs.push({ libelle: q.libelle, type: q.type, valeur: t });
  }
  return Object.keys(erreurs).length ? { ok: false, erreurs } : { ok: true, valeurs };
}

/* une réponse lisible (e-mail, AI) : une date en JJ/MM/AAAA, le reste tel quel */
function lisible(x) { return x && x.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(x.valeur) ? x.valeur.split('-').reverse().join('/') : String(x && x.valeur || ''); }

module.exports = { nettoyerQuestions, vuePublique, validerReponses, lisible, TYPES, MAX_QUESTIONS, MAX_CHOIX, MAX_TEXTE };
