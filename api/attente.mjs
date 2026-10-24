// /api/attente : la liste d'attente de la bêta (brief « Liste d'attente », 24/10/2026). Aucun compte n'est créé.
//   POST                 { email, place, consentement, souhaits[], souhait_libre, utm_source, utm_campaign, site_web, duree } → inscription
//   GET  ?jeton=…        → confirmation (lien de l'e-mail, valable 7 jours) ; renvoie le rang parmi les confirmés
//   GET  ?retrait=…      → désinscription en un clic : la ligne est effacée (POST accepté aussi, pour List-Unsubscribe-Post)
//   GET  ?stats=1        → compteurs sans adresses, pour le propriétaire du site seulement (même règle que /api/maitre : 404 sinon)
// Protections reprises du formulaire de contact : même origine et JSON (api/_auth/requete.cjs), taille bornée, champ piège
// « site_web », 3 secondes au moins, consentement obligatoire ; quotas partagés entre instances (api/_auth/quotas.cjs) :
// 5 inscriptions par adresse IP et par heure, 3 e-mails par adresse et par jour, 300 e-mails par heure pour le site. Une adresse déjà
// inscrite reçoit la même réponse qu'une nouvelle (on ne révèle pas qui est inscrit) et pas de second e-mail avant 10 minutes.
// Jetons de confirmation : aléatoires, gardés seulement en empreinte sha256, comme les liens magiques. Le lien de
// désinscription est signé (HMAC de l'identifiant) : rien à stocker, et il reste valable pour les e-mails suivants.
// Fichier .mjs (et non .js) : Vercel compile un .js en CommonJS, et un require() de auth.mjs échoue sous Node 20.
import crypto from 'crypto';
import { createRequire } from 'module';
import { auth, _pool, adresse, expediteur } from './_auth/auth.mjs';
import { proprietaire as proprietaireReel } from './_auth/proprietaire.mjs';
import Q from './_auth/quotas.cjs';      /* quotas partagés entre instances (PR 2) : inscriptions par IP, e-mails par adresse et pour le site */
import R from './_auth/requete.cjs';     /* même origine et corps JSON (PR 2) */
const require = createRequire(import.meta.url);
const SOUHAITS = require('../attente/souhaits.json').souhaits;
const METIERS = require('../vitrine/metiers.json').metiers;

export const IDS_SOUHAITS = SOUHAITS.map(s => s.id);
export const PLACES = ['maries', 'coordination', ...METIERS.map(m => 'metier:' + m.id), 'invite'];
const LIMITE_OCTETS = 8 * 1024, DELAI_MIN_MS = 3000, JOURS = 7, RENVOI_MIN = 10, LIBRE = 140, UTM = 40;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
const JETON = /^[A-Za-z0-9_-]{43}$/, RETRAIT = /^[0-9a-z]{1,13}\.[A-Za-z0-9_-]{32}$/;

let db = null, envoyeur = null, verifier = proprietaireReel;
export function _db(d) { db = d; }
export function _envoyeur(f) { envoyeur = f; }
export function _proprietaire(f) { verifier = f || proprietaireReel; }
export function _reinitialiser() { Q._oublier(); }

const propre = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1);
const court = (v, max) => { const t = propre(v, max).slice(0, max); return t || null; };   /* utm : gardé tel quel, tronqué à 40 */
export const hacher = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* les champs : { ok, valeurs } ou { ok:false, erreurs:{ champ: message } } */
export function valider(b) {
  b = b && typeof b === 'object' ? b : {};
  const e = {}, email = propre(b.email, 254), place = String(b.place == null ? '' : b.place);
  if (!EMAIL.test(email) || email.length > 254) e.email = 'Adresse e-mail invalide.';
  if (!PLACES.includes(place)) e.place = 'Choisissez votre place dans « Je suis… ».';
  if (b.consentement !== true) e.consentement = 'Cochez la case pour recevoir l\'e-mail d\'ouverture.';
  let souhaits = [];
  if (b.souhaits != null) {
    if (!Array.isArray(b.souhaits) || b.souhaits.length > IDS_SOUHAITS.length || !b.souhaits.every(x => typeof x === 'string' && IDS_SOUHAITS.includes(x))) e.souhaits = 'Une fonction proposée n\'existe pas.';
    else souhaits = IDS_SOUHAITS.filter(id => b.souhaits.includes(id));   /* sans doublon, dans l'ordre de la liste */
  }
  const libre = propre(b.souhait_libre, LIBRE);
  if (libre.length > LIBRE) e.souhait_libre = '140 caractères au plus.';
  if (Object.keys(e).length) return { ok: false, erreurs: e };
  return { ok: true, valeurs: { email, place, souhaits, souhait_libre: libre || null, source: court(b.utm_source, UTM), campagne: court(b.utm_campaign, UTM) } };
}

/* le lien de désinscription : l'identifiant signé ; aucun jeton à garder, valable pour tous les e-mails suivants */
const secret = () => { const s = process.env.ATTENTE_SECRET || process.env.BETTER_AUTH_SECRET || ''; return s.length >= 32 ? s : null; };
const signer = (id, s) => crypto.createHmac('sha256', s).update('aime-attente-retrait:' + id).digest('base64url').slice(0, 32);
export function jetonRetrait(id, s = secret()) { return s && s.length >= 32 ? Number(id).toString(36) + '.' + signer(String(id), s) : null; }
export function lireRetrait(j, s = secret()) {
  if (!s || s.length < 32 || !RETRAIT.test(String(j || ''))) return null;
  const [b36, sig] = String(j).split('.'), id = parseInt(b36, 36);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const a = Buffer.from(sig), b = Buffer.from(signer(String(id), s));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}

async function base() { if (db) return db; try { if (!auth()) return null; return _pool(); } catch { return null; } }
const absente = e => e && (e.code === '42P01' || /liste_attente/.test(String(e.message)) && /does not exist|n'existe pas/.test(String(e.message)));

function courrier(lien, retrait) {
  const subject = 'Confirmez votre inscription à la bêta AIME';
  const text = 'Bonjour,\n\nPour être prévenu à l\'ouverture de la bêta AIME, confirmez votre inscription (lien valable 7 jours) :\n' + lien +
    '\n\nSi vous n\'avez rien demandé, ignorez ce message.\n\nNe plus recevoir d\'e-mails de la liste d\'attente : ' + retrait + '\n';
  const html = '<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#141416;max-width:520px">' +
    '<p>Bonjour,</p><p>Pour être prévenu à l\'ouverture de la bêta AIME, confirmez votre inscription.</p>' +
    '<p><a href="' + esc(lien) + '" style="display:inline-block;background:#141416;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Confirmer mon inscription</a></p>' +
    '<p style="color:#555">Ce lien est valable 7 jours. Si vous n\'avez rien demandé, ignorez ce message.</p>' +
    '<p style="font-size:12px;color:#777"><a href="' + esc(retrait) + '" style="color:#777">Ne plus recevoir d\'e-mails de la liste d\'attente</a></p></div>';
  return { subject, text, html };
}
async function envoyer(to, m, retraitApi) {
  if (envoyeur) return envoyeur(Object.assign({ to }, m, { retraitApi }));
  const cle = process.env.RESEND_API_KEY, de = process.env.ATTENTE_FROM || expediteur();
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: de, to: [to], subject: m.subject, text: m.text, html: m.html,
      headers: { 'List-Unsubscribe': '<' + retraitApi + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }) });
  if (!r.ok) throw new Error('envoi refusé ' + r.status);
}
const envoiPret = () => !!(envoyeur || (process.env.RESEND_API_KEY && (process.env.ATTENTE_FROM || expediteur())));

/* ---------- inscription ---------- */
async function inscrire(req, b) {
  const r = valider(b);
  if (!r.ok) return [422, { ok: false, erreur: 'champs', champs: r.erreurs }];
  const d = await base(), s = secret();
  if (!d || !s || !envoiPret()) return [503, { ok: false, erreur: 'indisponible' }];
  const qi = await Q.quota('attente:ip', Q.ipDe(req), { db: d });   /* 5 inscriptions par adresse IP et par heure, toutes instances */
  if (!qi.ok) return [429, { ok: false, erreur: 'limite', attente: qi.attente }];
  const v = r.valeurs, jeton = crypto.randomBytes(32).toString('base64url');
  /* un e-mail partirait-il ? (nouvelle adresse, ou non confirmée et dernier envoi il y a plus de 10 minutes) ; si oui, les quotas
     d'envoi d'abord : 3 par adresse et par jour (personne ne peut inonder la boîte d'un autre), 300 par heure pour tout le site.
     Vérifié AVANT d'écrire : un envoi refusé ne remplace pas le jeton du lien déjà reçu. */
  const { rows: ex } = await d.query(`select (confirme_le is null and (jeton_expire is null or jeton_expire - interval '${JOURS} days' < now() - interval '${RENVOI_MIN} minutes')) as renvoi
    from liste_attente where lower(email) = lower($1)`, [v.email]);
  if (!ex[0] || ex[0].renvoi) {
    const qa = await Q.quota('attente:adresse', v.email.toLowerCase(), { db: d });
    if (!qa.ok) return [200, { ok: true }];   /* même réponse : on ne révèle rien de l'adresse */
    const qs = await Q.quota('attente:envois', 'site', { db: d });
    if (!qs.ok) return [429, { ok: false, erreur: 'limite', attente: qs.attente }];
  }
  /* une seule requête : nouvelle adresse → une ligne ; adresse non confirmée et dernier envoi il y a plus de 10 minutes →
     nouveau jeton et réponses mises à jour ; adresse confirmée, ou envoi récent → rien (aucune ligne rendue, aucun e-mail) */
  const { rows } = await d.query(`insert into liste_attente (email, place, source, campagne, souhaits, souhait_libre, jeton_hash, jeton_expire)
      values ($1, $2, $3, $4, $5::text[], $6, $7, now() + interval '${JOURS} days')
    on conflict (lower(email)) do update set place = excluded.place, souhaits = excluded.souhaits, souhait_libre = excluded.souhait_libre,
      source = coalesce(liste_attente.source, excluded.source), campagne = coalesce(liste_attente.campagne, excluded.campagne),
      jeton_hash = excluded.jeton_hash, jeton_expire = excluded.jeton_expire
      where liste_attente.confirme_le is null
        and (liste_attente.jeton_expire is null or liste_attente.jeton_expire - interval '${JOURS} days' < now() - interval '${RENVOI_MIN} minutes')
    returning id`, [v.email, v.place, v.source, v.campagne, v.souhaits, v.souhait_libre, hacher(jeton)]);
  if (rows[0]) {
    const site = adresse(), retrait = jetonRetrait(rows[0].id, s);
    await envoyer(v.email, courrier(site + '/beta/?jeton=' + jeton, site + '/beta/?retrait=' + retrait), site + '/api/attente?retrait=' + retrait);
  }
  return [200, { ok: true }];
}

/* ---------- confirmation ---------- */
async function confirmer(jeton) {
  if (!JETON.test(String(jeton || ''))) return [410, { ok: false, raison: 'invalide' }];
  const d = await base(); if (!d) return [503, { ok: false, erreur: 'indisponible' }];
  const h = hacher(jeton);
  const { rows } = await d.query(`update liste_attente set confirme_le = now(), jeton_hash = null, jeton_expire = null
    where jeton_hash = $1 and confirme_le is null and jeton_expire > now() returning id, confirme_le`, [h]);
  if (!rows[0]) {
    const { rows: x } = await d.query('select 1 from liste_attente where jeton_hash = $1 and jeton_expire <= now()', [h]);
    return [410, { ok: false, raison: x[0] ? 'expire' : 'invalide' }];
  }
  /* le rang se calcule en SQL : un horodatage passé par JavaScript perd ses microsecondes */
  const { rows: n } = await d.query('select count(*)::int as n from liste_attente a, liste_attente moi where moi.id = $1 and a.confirme_le is not null and (a.confirme_le, a.id) <= (moi.confirme_le, moi.id)', [rows[0].id]);
  return [200, { ok: true, rang: n[0].n }];
}

/* ---------- désinscription : la ligne est effacée (rien ne reste de l'adresse) ---------- */
async function retirer(j) {
  const id = lireRetrait(j); if (!id) return [400, { ok: false, raison: 'invalide' }];
  const d = await base(); if (!d) return [503, { ok: false, erreur: 'indisponible' }];
  await d.query('delete from liste_attente where id = $1', [id]);
  return [200, { ok: true }];   /* déjà effacée : même réponse */
}

/* ---------- compteurs, sans adresses, pour le propriétaire ---------- */
async function compteurs(d) {
  const C = 'confirme_le is not null', q = async (sql, p) => (await d.query(sql, p)).rows;
  const [t] = await q(`select count(*) filter (where ${C})::int as confirmes, count(*) filter (where confirme_le is null and jeton_expire > now())::int as en_attente from liste_attente`);
  const parPlace = await q(`select coalesce(place, '—') as cle, count(*)::int as n from liste_attente where ${C} group by 1 order by 2 desc, 1`);
  const parSource = await q(`select coalesce(source, '(direct)') as cle, count(*)::int as n from liste_attente where ${C} group by 1 order by 2 desc, 1`);
  const parCampagne = await q(`select coalesce(campagne, '—') as cle, count(*)::int as n from liste_attente where ${C} group by 1 order by 2 desc, 1`);
  const parJour = await q(`select to_char((confirme_le at time zone 'Europe/Paris')::date, 'YYYY-MM-DD') as cle, count(*)::int as n from liste_attente where ${C} group by 1 order by 1 desc limit 90`);
  const souhaits = await q(`select s as cle, count(*)::int as n from liste_attente, unnest(souhaits) s where ${C} group by 1 order by 2 desc, 1`);
  const souhaitsParPlace = await q(`select coalesce(place, '—') as place, s as cle, count(*)::int as n from liste_attente, unnest(souhaits) s where ${C} group by 1, 2 order by 1, 3 desc, 2`);
  const libres = await q(`select souhait_libre as texte, coalesce(place, '—') as place, to_char((confirme_le at time zone 'Europe/Paris')::date, 'YYYY-MM-DD') as jour
    from liste_attente where ${C} and souhait_libre is not null order by confirme_le desc limit 500`);
  return { confirmes: t.confirmes, enAttente: t.en_attente, parPlace, parSource, parCampagne, parJour, souhaits, souhaitsParPlace, libres,
    liste: SOUHAITS.map(s => ({ id: s.id, nom: s.nom })) };
}

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body;
  let t = ''; for await (const c of req) { t += c; if (t.length > LIMITE_OCTETS) return null; } return t;
}

export default async function attente(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const u = new URL(req.url || '/', 'http://x'), p = u.searchParams;
  try {
    if (p.has('retrait') && (req.method === 'GET' || req.method === 'POST')) return json(res, ...(await retirer(p.get('retrait'))));
    if (req.method === 'GET') {
      if (p.has('jeton')) return json(res, ...(await confirmer(p.get('jeton'))));
      if (p.has('stats')) {
        let qui = null; try { qui = await verifier(req); } catch { qui = null; }
        const d = qui ? await base() : null;
        if (!qui || !d) return json(res, 404, { ok: false });
        return json(res, 200, Object.assign({ ok: true }, await compteurs(d)));
      }
      return json(res, 404, { ok: false });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, erreur: 'methode' }); }
    const refus = R.ecriture(req); if (refus) return json(res, refus[0], { ok: false, erreur: refus[1].erreur });   /* la désinscription un clic (plus haut) n'en dépend pas : jeton signé, effet idempotent */
    if (Number(req.headers['content-length'] || 0) > LIMITE_OCTETS) return json(res, 413, { ok: false, erreur: 'taille' });
    let b = await corps(req);
    if (b === null) return json(res, 413, { ok: false, erreur: 'taille' });
    if (typeof b === 'string') { if (b.length > LIMITE_OCTETS) return json(res, 413, { ok: false, erreur: 'taille' }); try { b = JSON.parse(b || '{}'); } catch { return json(res, 400, { ok: false, erreur: 'format' }); } }
    if (!b || typeof b !== 'object' || Array.isArray(b) || Buffer.byteLength(JSON.stringify(b)) > LIMITE_OCTETS) return json(res, 400, { ok: false, erreur: 'format' });
    /* pièges à robots : « reçu », sans rien écrire ni envoyer */
    if (propre(b.site_web, 200) || !(Number(b.duree) >= DELAI_MIN_MS)) return json(res, 200, { ok: true });
    return json(res, ...(await inscrire(req, b)));
  } catch (e) {
    if (absente(e)) return json(res, 503, { ok: false, erreur: 'indisponible' });   /* migration pas encore appliquée */
    console.error('attente : ' + (e && e.code ? e.code : 'erreur'));
    return json(res, 500, { ok: false, erreur: 'serveur' });
  }
}
