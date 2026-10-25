// AIME · la Carte enregistrée sur le compte : ce que le serveur accepte d'en garder (V1, PR P1).
// Une seule définition de la Carte : carte/carte.js (rubriques, visibilités, rubriques jamais publiques). Ce fichier n'en invente
// pas une seconde ; il applique ses règles côté serveur et retire ce qui ne doit pas quitter l'appareil :
//   · la photo (pas de stockage de fichiers dans la V1) ;
//   · les relations (des données sur d'autres personnes) ;
//   · l'historique (d'anciennes valeurs) et « suite » (contenu libre) ;
//   · la publication : une Carte enregistrée n'est jamais publiée par cette voie (le lien public viendra à part).
// Une rubrique marquée « publique » alors qu'elle ne peut jamais l'être est REFUSÉE (400), jamais corrigée en silence.
'use strict';
const M = require('../../carte/carte.js');

const TEXTE_CONSENTEMENT = 'J\'enregistre ma Carte sur mon compte AIME pour la retrouver sur mes appareils. Elle reste privée : rien n\'en est publié. Je peux la retirer de mon compte à tout moment.';
const JAMAIS_ENVOYES = ['photo', 'relations', 'historique', 'suite'];
const TAILLE_MAX = 32768;

class Refus extends Error { constructor(code, raison) { super(raison); this.code = code; this.raison = raison; } }

/* une valeur propre : textes coupés, listes et objets bornés, rien d'exécutable ni de profond */
function propre(v, prof) {
  if (v == null) return null;
  if (typeof v === 'string') return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 500);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  if (prof >= 3) return null;
  if (Array.isArray(v)) return v.slice(0, 50).map(x => propre(x, prof + 1)).filter(x => x !== null && x !== '');
  if (typeof v === 'object') {
    const o = {}; let n = 0;
    for (const k of Object.keys(v)) { if (n >= 20 || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(k)) continue; const x = propre(v[k], prof + 1); if (x !== null) { o[k] = x; n++; } }
    return o;
  }
  return null;
}

/* la Carte que le serveur garde : seulement les rubriques connues de carte/carte.js, nettoyées */
function nettoyer(entree) {
  if (!entree || typeof entree !== 'object' || entree.format !== 'aime-carte') throw new Refus(400, 'Ce n\'est pas une Carte AIME.');
  let c; try { c = M.migrer(JSON.parse(JSON.stringify(entree))); } catch { c = null; }
  if (!c) throw new Refus(400, 'Ce n\'est pas une Carte AIME.');
  const v = M.vide(null), sortie = { format: 'aime-carte', schema: M.SCHEMA };
  sortie.id = typeof c.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(c.id) ? c.id : v.id;
  sortie.version = Number.isInteger(c.version) && c.version > 0 ? Math.min(c.version, 1e6) : 1;
  sortie.creeLe = typeof c.creeLe === 'string' ? c.creeLe.slice(0, 40) : null;
  for (const k of Object.keys(M.RUBRIQUES)) {
    if (JAMAIS_ENVOYES.includes(k)) { sortie[k] = v[k]; continue; }
    const x = propre(c[k], 0);
    sortie[k] = x === null ? v[k] : (Array.isArray(v[k]) && !Array.isArray(x)) || (typeof v[k] === 'string' && typeof x !== 'string') ? v[k] : x;
  }
  if (typeof sortie.nom === 'string') sortie.nom = sortie.nom.slice(0, 80);
  if (sortie.naissance != null && !(typeof sortie.naissance === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(sortie.naissance))) sortie.naissance = null;
  sortie.couleurs = (Array.isArray(c.couleurs) ? c.couleurs : []).filter(x => M.COULEURS.includes(x)).slice(0, 10);
  const cb = c.contributions && typeof c.contributions === 'object' ? c.contributions : {};
  sortie.contributions = { proposees: propre(Array.isArray(cb.proposees) ? cb.proposees : [], 1) || [], recherchees: propre(Array.isArray(cb.recherchees) ? cb.recherchees : [], 1) || [] };
  sortie.visibilite = {};
  for (const k of Object.keys(M.RUBRIQUES)) {
    const niveau = c.visibilite && c.visibilite[k];
    if (niveau == null) { sortie.visibilite[k] = M.RUBRIQUES[k].defaut; continue; }
    if (!M.VISIBILITES.includes(niveau)) throw new Refus(400, 'Visibilité inconnue pour « ' + M.RUBRIQUES[k].nom + ' ».');
    if (M.RUBRIQUES[k].jamaisPublique && niveau === 'publique') throw new Refus(400, M.RUBRIQUES[k].nom + ' ne peut jamais être publique.');
    sortie.visibilite[k] = niveau;
  }
  sortie.publication = { publiee: false, consentement: null, revoqueeLe: null };
  sortie.historique = []; sortie.suite = {};
  if (Buffer.byteLength(JSON.stringify(sortie), 'utf8') > TAILLE_MAX) throw new Refus(413, 'Carte trop volumineuse : raccourcissez quelques rubriques.');
  return sortie;
}

/* ce qui ne quitte jamais l'appareil, dit à la personne avant qu'elle consente */
function retenus(entree) {
  const r = [];
  if (entree && entree.photo) r.push('photo');
  if (entree && Array.isArray(entree.relations) && entree.relations.length) r.push('relations');
  if (entree && Array.isArray(entree.historique) && entree.historique.length) r.push('historique');
  return r;
}

/* le lien public (PR P2) : ce que montre une Carte à qui a le lien. Seulement les rubriques marquées « publique », jamais une
   rubrique « jamais publique » (naissance, relations), jamais la photo ni l'historique ; calculé à chaque ouverture */
const TEXTE_PUBLICATION = 'Je publie par ce lien les rubriques de ma Carte que j\'ai marquées « publique ». Toute personne qui a le lien peut les voir. Je peux couper le lien à tout moment.';
function vuePublique(donnees) {
  const rubriques = [];
  if (!donnees || donnees.format !== 'aime-carte') return { rubriques };
  for (const k of Object.keys(M.RUBRIQUES)) {
    if (M.RUBRIQUES[k].jamaisPublique || JAMAIS_ENVOYES.includes(k)) continue;
    if (!donnees.visibilite || donnees.visibilite[k] !== 'publique') continue;
    if (!M.rempli(donnees, k)) continue;
    rubriques.push({ cle: k, nom: M.RUBRIQUES[k].nom, valeur: JSON.parse(JSON.stringify(donnees[k])) });
  }
  return { rubriques };
}
const publiables = donnees => vuePublique(donnees).rubriques.length;

module.exports = { nettoyer, retenus, propre, vuePublique, publiables, Refus, TEXTE_CONSENTEMENT, TEXTE_PUBLICATION, JAMAIS_ENVOYES, TAILLE_MAX };
