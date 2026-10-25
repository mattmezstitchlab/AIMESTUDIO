// AIME · /api/carte-publique?l=<jeton> : ce qu'une Carte montre à qui a son lien (V1, PR P2), et la demande qu'on peut lui
// écrire quand la personne l'a permis (V1, PR P3). Sans compte, sans session.
// GET ne sert QUE les rubriques marquées « publique », calculées au serveur à chaque ouverture (api/_carte/carte.cjs vuePublique) :
// jamais la naissance ni les relations, jamais la photo, jamais l'identifiant du compte ni son adresse e-mail.
// Lien inconnu, coupé, ou Carte retirée du compte : 404, sans dire lequel. Aucune adresse IP gardée (le quota n'en garde qu'une
// empreinte, 48 h au plus) ; un compteur d'ouvertures, que seul le propriétaire voit. Jamais indexé, jamais mis en cache.
// POST ?l=<jeton> { prenom, nom, email, tel?, message, consentement: true, site_web (piège), duree } : une demande déposée dans la
// boîte de la personne ('compte:<id>', table demandes), visible dans SON AI, et un e-mail à l'adresse de SON compte (Reply-To : le
// visiteur). Seulement si le lien est actif ET que « recevoir des demandes » est allumé (migration 2026-10-25-12) ; sinon 404, sans
// dire pourquoi. Le contrat est celui du formulaire Contact (api/contact.js valider, docs/INTERACTIONS.md) ; protections : même
// origine et JSON, taille bornée, piège à robots, délai minimal, 3 demandes par IP et 10 minutes, 20 par Carte et par jour.
import { _pool } from './_auth/auth.mjs';
import Q from './_auth/quotas.cjs';
import R from './_auth/requete.cjs';
import K from './_carte/carte.cjs';
import D from './_demandes/depot.cjs';
import C from './_demandes/courriel.cjs';
import contact from './contact.js';

let db; export function _db(d) { db = d; }
let envoi = null; export function _fetch(f) { envoi = f || null; }
const JETON = /^[A-Za-z0-9_-]{32,64}$/;
const LIMITE_OCTETS = 16 * 1024, DELAI_MIN_MS = 3000;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
const INTROUVABLE = { ok: false, raison: 'Ce lien ne mène à aucune Carte : il a peut-être été coupé par la personne qui l\'avait partagé.' };
const FERME = { ok: false, raison: 'Cette Carte ne reçoit pas de demandes pour l\'instant.' };
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { if (req.body.length > LIMITE_OCTETS) return null; try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > LIMITE_OCTETS) return null; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}

/* le lien actif et son réglage « recevoir des demandes » ; sans la migration 12, le contact est fermé (rien ne casse) */
async function ouvrir(base, jeton) {
  const sql = c => `update cartes_liens l set ouvertures = least(l.ouvertures + 1, 2000000000) from cartes c
      where l.jeton = $1 and l.coupe_le is null and c.user_id = l.user_id returning c.donnees${c ? ', l.contact' : ''}`;
  try { return (await base.query(sql(true), [jeton])).rows[0] || null; }
  catch (e) { if (e && e.code === '42703') return (await base.query(sql(false), [jeton])).rows[0] || null; throw e; }
}

async function deposer(req, res, base, jeton) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  const b = await corps(req);
  if (b === null) return json(res, 413, { ok: false, erreur: 'taille' });
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(res, 400, { ok: false, erreur: 'format' });
  let lien;
  try {
    lien = (await base.query(`select l.user_id, u.email from cartes_liens l join cartes c on c.user_id = l.user_id join "user" u on u.id = l.user_id
        where l.jeton = $1 and l.coupe_le is null and l.contact`, [jeton])).rows[0] || null;
  } catch (e) { if (e && (e.code === '42P01' || e.code === '42703')) return json(res, 404, FERME); throw e; }
  if (!lien) return json(res, 404, FERME);
  /* pièges à robots : « reçu » sans rien garder ni envoyer, pour ne rien leur apprendre (comme Contact) */
  if (String(b.site_web || '').trim() || !(Number(b.duree) >= DELAI_MIN_MS)) return json(res, 200, { ok: true });
  /* le même contrat que Contact ; une Carte n'a ni type de demande, ni adresse, ni date de livraison */
  const r = contact.valider(Object.assign({}, b, { projet: 'projet', adresse: '', livraison: '' }));
  if (!r.ok) { if (r.erreurs.consentement) r.erreurs.consentement = 'Cochez la case pour que la personne puisse vous répondre.'; return json(res, 422, { ok: false, erreur: 'champs', champs: r.erreurs }); }
  const boite = D.boiteCarte(lien.user_id);
  const q = await Q.quota('carte:demande:ip', Q.ipDe(req), { db: base });
  const qb = q.ok ? await Q.quota('carte:demande:boite', boite, { db: base }) : q;
  if (!q.ok || !qb.ok) { const attente = q.ok ? qb.attente : q.attente; res.setHeader('Retry-After', String(attente)); return json(res, 429, { ok: false, erreur: 'limite', attente }); }
  const v = r.valeurs, emp = D.empreinte(v, Date.now(), boite);
  const enr = await D.enregistrer(base, v, emp, { boite });
  /* une demande à une Carte n'existe que gardée : sans base, on ne l'envoie pas à moitié */
  if (enr.etat === 'indisponible') return json(res, 503, { ok: false, erreur: 'indisponible' });
  if (enr.etat === 'existante' && enr.email_statut === 'envoye') return json(res, 200, { ok: true });
  const conf0 = C.configuration();
  if (!conf0 || !lien.email) { await D.noterEnvoi(base, enr.id, { nonConfigure: true }); return json(res, 200, { ok: true }); }
  const fin = await C.envoyer(Object.assign({}, v, { via: 'carte' }), 'carte-' + emp, Object.assign({}, conf0, { a: [lien.email] }), envoi);
  await D.noterEnvoi(base, enr.id, fin);
  if (!fin.ok) console.error(fin.code === 'reseau' ? 'carte: service d\'envoi injoignable' : 'carte: envoi refusé, statut ' + fin.code);
  return json(res, 200, { ok: true });   /* gardée dans l'AI de la personne, même si l'e-mail a échoué */
}

export default async function cartePublique(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false }); }
  const jeton = new URL(req.url || '/', 'http://local').searchParams.get('l') || '';
  if (!JETON.test(jeton)) return json(res, 404, INTROUVABLE);
  const base = db !== undefined ? db : _pool();
  if (!base) return json(res, 503, { ok: false, raison: 'Cette Carte ne peut pas être affichée pour l\'instant.' });
  try {
    if (req.method === 'POST') return await deposer(req, res, base, jeton);
    const q = await Q.quota('carte:lecture', Q.ipDe(req), { db: base });
    if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: 'Trop d\'ouvertures en peu de temps : réessayez dans un moment.' }); }
    const l = await ouvrir(base, jeton);
    if (!l) return json(res, 404, INTROUVABLE);
    return json(res, 200, Object.assign({ ok: true }, K.vuePublique(l.donnees), { contact: l.contact === true }));
  } catch (e) {
    if (e && e.code === '42P01') return json(res, 404, INTROUVABLE);
    return json(res, 503, { ok: false, raison: 'Cette Carte ne peut pas être affichée pour l\'instant.' });
  }
}
