// /api/demandes : les demandes reçues par le formulaire Contact du site (boîte « site »), pour ses propriétaires seulement.
//   GET                    → la liste, la plus récente d'abord ({ demandes, suivant }) ; ?avant=<suivant> pour la page d'après, ?n= (50 au plus)
//   GET  ?cle=…            → le détail d'une demande et son historique
//   POST { action: 'statut', cle, statut }        nouvelle, lue, en_cours, convertie, classee
//   POST { action: 'note', cle, note }            note privée, 2 000 caractères au plus
//   POST { action: 'renvoyer', cle }              renvoie l'e-mail d'une demande dont l'envoi a échoué ou n'a pas pu partir
//   POST { action: 'effacer', cle, confirmation: true }   droit à l'effacement : la demande et son historique
//   POST { action: 'convertir', cle, titre, modele? }     créer un projet depuis la demande (le propriétaire en est propriétaire) ;
//        rejouable : la même demande ne crée qu'un projet (spaces.data.origine = demande-<clé>, index unique) ; seuls le titre et le
//        modèle passent dans le projet, jamais les coordonnées de la personne
// Le droit est décidé ici, côté serveur, à chaque appel : proprietaire(req) (AIME_PROPRIETAIRES), comme /api/maitre.
// Toute autre personne (sans session, membre ou invitée d'un projet, autre compte) reçoit 404, comme si la route n'existait pas ;
// le propriétaire reçoit 503 si la base manque ou si la migration n'est pas appliquée. Les écritures passent par la garde même origine et JSON (api/_auth/requete.cjs).
// Ces données ne servent jamais une page publique : une vitrine de l'usage d'AIME par AIME lira d'autres données
// (fictives ou explicitement autorisées), avec les mêmes composants (docs/DEMANDES.md, « AIME fonctionne avec AIME »).
import { proprietaire } from './_auth/proprietaire.mjs';
import { _pool } from './_auth/auth.mjs';
import { creer, Refus } from './_auth/espaces.mjs';
import R from './_auth/requete.cjs';
import D from './_demandes/depot.cjs';
import C from './_demandes/courriel.cjs';

const BOITE = 'site';
/* qui transforme une demande reçue en projet est le professionnel sollicité : sa place dans le projet est nommée « prestataire »,
   pas par le mot du rôle propriétaire du domaine (« le couple » pour un mariage). Un mot seulement : aucun droit ne change. */
const RELATION_PROPRIETAIRE = 'prestataire';
let verifier = proprietaire, db, envoi = null;
export function _proprietaire(f) { verifier = f || proprietaire; }
export function _db(d) { db = d; }
export function _fetch(f) { envoi = f; }
let dbEspaces; export function _dbEspaces(d) { dbEspaces = d; }

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 8192) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
const parametres = req => new URL(req.url || '/', 'http://local').searchParams;

export default async function demandes(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false }); }
  if (req.method === 'POST') { const refus = R.ecriture(req); if (refus) return json(res, ...refus); }
  let u = null; try { u = await verifier(req); } catch { u = null; }
  if (!u) return json(res, 404, { ok: false });
  const base = db !== undefined ? db : D.base();
  const INDISPONIBLE = { ok: false, raison: 'Les demandes ne sont pas disponibles ici : base injoignable, ou migration 2026-10-25-09 à appliquer.' };
  if (!base) return json(res, 503, INDISPONIBLE);
  try {
    if (req.method === 'GET') {
      const p = parametres(req);
      if (p.has('cle')) { const d = await D.detail(base, BOITE, p.get('cle')); if (!d) return json(res, 404, { ok: false }); return json(res, 200, { ok: true, demande: d.demande, journal: d.journal, projet: await D.projetDe(base, BOITE, p.get('cle')) }); }
      const l = await D.lister(base, BOITE, { n: p.get('n'), avant: p.get('avant') });
      return json(res, 200, Object.assign({ ok: true, conservation_mois: D.conservationMois() }, l));
    }
    const b = await corps(req), cle = String(b.cle || '');
    if (b.action === 'statut') {
      if (!D.STATUTS.includes(b.statut)) return json(res, 400, { ok: false, raison: 'Statut inconnu.' });
      return (await D.changerStatut(base, BOITE, cle, b.statut, u.id)) ? json(res, 200, { ok: true }) : json(res, 404, { ok: false });
    }
    if (b.action === 'note') {
      const r = await D.changerNote(base, BOITE, cle, b.note, u.id);
      if (r === null) return json(res, 400, { ok: false, raison: 'Note trop longue (2 000 caractères au plus).' });
      return r ? json(res, 200, { ok: true }) : json(res, 404, { ok: false });
    }
    if (b.action === 'renvoyer') {
      const d = await D.detail(base, BOITE, cle); if (!d) return json(res, 404, { ok: false });
      const x = d.demande;
      if (x.email_statut === 'envoye') return json(res, 409, { ok: false, raison: 'Cet e-mail est déjà parti.' });
      if (x.email_statut === 'en_attente' && Date.now() - new Date(x.recue_le).getTime() < 10 * 60000) return json(res, 409, { ok: false, raison: 'Le premier envoi est peut-être encore en cours : réessayez dans quelques minutes.' });
      const conf = C.configuration(); if (!conf) return json(res, 503, { ok: false, raison: 'L\'envoi d\'e-mails n\'est pas configuré sur cet environnement.' });
      /* moins de 23 heures après la réception : la même clé que le premier envoi, Resend ne l'enverra pas deux fois */
      const recent = Date.now() - new Date(x.recue_le).getTime() < 23 * 3600000;
      const idem = recent ? 'contact-' + (await empreinteDe(base, d.id)) : 'contact-renvoi-' + x.cle + '-' + x.email_tentatives;
      const v = { projet: x.type, prenom: x.prenom, nom: x.nom, email: x.email, tel: x.tel, adresse: x.adresse, livraison: x.livraison, message: x.message };
      const r = await C.envoyer(v, idem, conf, envoi);
      await D.noterEnvoi(base, d.id, r, { renvoi: true, par: u.id });
      return r.ok ? json(res, 200, { ok: true, email_statut: 'envoye' }) : json(res, 502, { ok: false, email_statut: 'echec', raison: 'L\'envoi a de nouveau échoué. La demande reste enregistrée.' });
    }
    if (b.action === 'convertir') {
      const d = await D.detail(base, BOITE, cle); if (!d) return json(res, 404, { ok: false });
      const titre = String(b.titre == null ? '' : b.titre).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 120);
      if (!titre) return json(res, 400, { ok: false, raison: 'Donnez un nom au projet.' });
      const modele = ['mariage', 'seminaire'].includes(b.modele) ? b.modele : undefined;
      let p;
      try { p = await creer(dbEspaces !== undefined ? dbEspaces : _pool(), u, { titre, modele, origine: 'demande-' + d.demande.cle, relation: RELATION_PROPRIETAIRE }); }
      catch (e) { if (e instanceof Refus) return json(res, e.code, { ok: false, raison: e.raison }); throw e; }
      await D.marquerConvertie(base, BOITE, cle, p.id, u.id);
      return json(res, 200, { ok: true, espace: p.id, titre: p.titre, existant: !!p.existant });
    }
    if (b.action === 'effacer') {
      if (b.confirmation !== true) return json(res, 400, { ok: false, raison: 'Confirmation requise.' });
      return (await D.effacer(base, BOITE, cle)) ? json(res, 200, { ok: true }) : json(res, 404, { ok: false });
    }
    return json(res, 400, { ok: false, raison: 'Action inconnue.' });
  } catch { return json(res, 503, INDISPONIBLE); }
}
async function empreinteDe(base, id) { const r = await base.query('select empreinte from demandes where id = $1', [id]); return r.rows[0].empreinte; }
