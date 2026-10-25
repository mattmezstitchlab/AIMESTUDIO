// AIME · le dépôt des demandes (table « demandes », db/migrations/2026-10-25-09-demandes.sql).
// Écrire une demande et envoyer son e-mail sont deux événements distincts : la demande est écrite d'abord, l'e-mail ensuite,
// et le résultat de l'envoi est noté sur la demande (email_statut) et dans son historique (demandes_journal).
// Repli : sans base, base injoignable (délai de 4 s) ou tant que la migration n'est pas appliquée, enregistrer() répond
// { etat: 'indisponible' } sans jamais lever d'exception, et api/contact.js garde le comportement d'avant (l'e-mail seul).
// Aucune adresse IP n'est stockée ; l'historique ne contient que des statuts et des codes.
// Conservation : DEMANDES_CONSERVATION_MOIS (24 par défaut, entre 1 et 120), comptée depuis la dernière activité ; à valider
// juridiquement (docs/DEMANDES.md). L'effacement passe au plus une fois par heure et par instance, à la lecture et à l'écriture.
// En CommonJS, comme api/contact.js et api/_auth/quotas.cjs.
'use strict';
const crypto = require('crypto');

const DELAI_MS = 4000;
const CONSERVATION_DEFAUT = 24;
const STATUTS = ['nouvelle', 'lue', 'en_cours', 'convertie', 'classee'];
const EMAIL_STATUTS = ['en_attente', 'envoye', 'echec', 'non_configure'];
let pool = null, tableAbsente = 0, purgeLe = 0;

/* une connexion propre à ce module, avec un délai de connexion court : une base lente ne bloque pas le formulaire */
function base() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL; if (!url) return null;
  try {
    const pg = require('pg'), u = new URL(url); u.searchParams.delete('sslmode');
    pool = new pg.Pool({ connectionString: u.toString(), max: 2, connectionTimeoutMillis: DELAI_MS, idleTimeoutMillis: 10000,
      ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: true } });
    pool.on('error', () => {});
    return pool;
  } catch { return null; }
}

/* la durée de conservation, en mois : la variable si elle est un entier entre 1 et 120, sinon 24 */
function conservationMois(env = process.env) {
  const n = Number(env.DEMANDES_CONSERVATION_MOIS);
  return Number.isInteger(n) && n >= 1 && n <= 120 ? n : CONSERVATION_DEFAUT;
}

/* l'empreinte anti-doublon : la même que l'Idempotency-Key de Resend (adresse, message, fenêtre de 10 minutes) */
function empreinte(v, t = Date.now()) {
  return crypto.createHash('sha256').update([v.email, v.message, Math.floor(t / 600000)].join('|')).digest('hex').slice(0, 48);
}
const nouvelleCle = () => crypto.randomBytes(16).toString('base64url').slice(0, 22);

function delai(p, ms = DELAI_MS) {
  let t; return Promise.race([p, new Promise((_, n) => { t = setTimeout(() => n(Object.assign(new Error('délai'), { code: 'DELAI' })), ms); })]).finally(() => clearTimeout(t));
}
async function requete(db, sql, params) {
  const r = await delai(db.query(sql, params));
  return r.rows;
}
function noterAbsence(e) { if (e && e.code === '42P01') tableAbsente = Date.now(); }
const utilisable = db => !!db && Date.now() - tableAbsente > 60000;

/* enregistrer une demande validée (valeurs de valider() dans api/contact.js).
   → { etat: 'nouvelle' | 'existante', id, cle, email_statut } | { etat: 'indisponible' } ; ne lève jamais. */
async function enregistrer(db, v, emp, opts = {}) {
  if (!utilisable(db)) return { etat: 'indisponible' };
  try {
    const rows = await requete(db,
      `with d as (
         insert into demandes (cle, boite, empreinte, type, prenom, nom, email, tel, adresse, livraison, message, consentement_le)
         values ($1, 'site', $2, $3, $4, $5, $6, nullif($7, ''), nullif($8, ''), nullif($9, '')::date, $10, now())
         on conflict (empreinte) do nothing
         returning id, cle, email_statut),
       j as (insert into demandes_journal (demande_id, quoi) select id, 'recue' from d)
       select id, cle, email_statut, true as nouvelle from d
       union all
       select id, cle, email_statut, false from demandes where empreinte = $2 and not exists (select 1 from d)`,
      [opts.cle || nouvelleCle(), emp, v.projet, v.prenom, v.nom, v.email, v.tel || '', v.adresse || '', v.livraison || '', v.message]);
    const r = rows[0];
    if (!r) return { etat: 'indisponible' };
    purgerDeTempsEnTemps(db);
    return { etat: r.nouvelle ? 'nouvelle' : 'existante', id: Number(r.id), cle: r.cle, email_statut: r.email_statut };
  } catch (e) { noterAbsence(e); return { etat: 'indisponible' }; }
}

/* noter le résultat d'un envoi sur la demande et dans son historique ; ne lève jamais.
   resultat : { ok: true } | { ok: false, code } | { nonConfigure: true } ; par : identifiant du compte (renvoi) ou null (serveur) */
async function noterEnvoi(db, id, resultat, opts = {}) {
  if (!db) return false;
  const statut = resultat.nonConfigure ? 'non_configure' : resultat.ok ? 'envoye' : 'echec';
  const quoi = opts.renvoi ? 'renvoi' : resultat.nonConfigure ? 'email_non_configure' : resultat.ok ? 'email_envoye' : 'email_echec';
  const detail = JSON.stringify(Object.assign({ resultat: statut }, resultat.code ? { code: String(resultat.code).slice(0, 16) } : {}));
  try {
    await requete(db,
      `with d as (
         update demandes set email_statut = $2, email_tentatives = least(email_tentatives + 1, 100), email_dernier_essai = now(),
           email_envoye_le = case when $2 = 'envoye' then now() else email_envoye_le end,
           email_code = case when $2 = 'envoye' then null else $3 end,
           derniere_activite = case when $5::text is null then derniere_activite else now() end
         where id = $1 returning id)
       insert into demandes_journal (demande_id, quoi, par, detail) select id, $4, $5, $6::jsonb from d`,
      [id, statut, resultat.code ? String(resultat.code).slice(0, 16) : (statut === 'non_configure' ? 'config' : null), quoi, opts.par || null, detail]);
    return true;
  } catch (e) { noterAbsence(e); return false; }
}

/* effacer les demandes sans activité depuis la durée de conservation (historique compris) ; renvoie le nombre effacé */
async function purger(db, env = process.env) {
  const rows = await requete(db, 'with d as (delete from demandes where derniere_activite < now() - make_interval(months => $1) returning 1) select count(*)::int as n from d', [conservationMois(env)]);
  purgeLe = Date.now();
  return rows[0] ? rows[0].n : 0;
}
function purgerDeTempsEnTemps(db) { if (Date.now() - purgeLe > 3600000) { purgeLe = Date.now(); purger(db).catch(() => {}); } }

/* ——— lecture et suivi, pour le destinataire seulement (le droit est vérifié par api/demandes.mjs avant chaque appel) ——— */
const EXTRAIT = 140;
const ligneListe = r => ({ cle: r.cle, recue_le: r.recue_le, type: r.type, prenom: r.prenom, nom: r.nom, email: r.email,
  statut: r.statut, email_statut: r.email_statut, extrait: r.message.length > EXTRAIT ? r.message.slice(0, EXTRAIT - 1) + '…' : r.message });

/* la liste d'une boîte, la plus récente d'abord, par pages de n (50 au plus) ; avant : le curseur de la page précédente */
async function lister(db, boite, { n = 30, avant = null } = {}) {
  n = Math.max(1, Math.min(50, Number(n) || 30));
  let curseur = null;
  if (avant) { const m = /^(\d{13})\.(\d{1,18})$/.exec(String(avant)); if (m) curseur = [new Date(Number(m[1])), m[2]]; }
  const rows = await requete(db,
    `select id, cle, recue_le, type, prenom, nom, email, statut, email_statut, message from demandes
     where boite = $1 ${curseur ? 'and (recue_le, id) < ($3, $4::bigint)' : ''}
     order by recue_le desc, id desc limit $2`, curseur ? [boite, n + 1, curseur[0], curseur[1]] : [boite, n + 1]);
  const page = rows.slice(0, n), der = page[page.length - 1];
  purgerDeTempsEnTemps(db);
  return { demandes: page.map(ligneListe), suivant: rows.length > n && der ? new Date(der.recue_le).getTime() + '.' + der.id : null };
}

/* le détail d'une demande et son historique ; null si elle n'existe pas dans cette boîte */
async function detail(db, boite, cle) {
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(String(cle || ''))) return null;
  const rows = await requete(db, 'select * from demandes where boite = $1 and cle = $2', [boite, cle]);
  const r = rows[0]; if (!r) return null;
  const j = await requete(db, 'select quand, quoi, par, detail from demandes_journal where demande_id = $1 order by quand, id', [r.id]);
  return { id: Number(r.id), demande: { cle: r.cle, recue_le: r.recue_le, type: r.type, prenom: r.prenom, nom: r.nom, email: r.email, tel: r.tel, adresse: r.adresse,
    livraison: r.livraison ? toISODate(r.livraison) : null, message: r.message, consentement_le: r.consentement_le, statut: r.statut, note: r.note,
    email_statut: r.email_statut, email_tentatives: r.email_tentatives, email_dernier_essai: r.email_dernier_essai, email_envoye_le: r.email_envoye_le, email_code: r.email_code,
    derniere_activite: r.derniere_activite, conserver_jusqu_au: new Date(new Date(r.derniere_activite).setMonth(new Date(r.derniere_activite).getMonth() + conservationMois())).toISOString() },
    journal: j.map(x => ({ quand: x.quand, quoi: x.quoi, par: x.par, detail: x.detail })) };
}
function toISODate(d) { if (typeof d === 'string') return d.slice(0, 10); const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }

/* changer le statut ; renvoie false si la demande n'existe pas dans cette boîte */
async function changerStatut(db, boite, cle, statut, par) {
  if (!STATUTS.includes(statut)) return false;
  const rows = await requete(db,
    `with a as (select id, statut from demandes where boite = $1 and cle = $2 for update),
     d as (update demandes set statut = $3, derniere_activite = now() from a where demandes.id = a.id and a.statut <> $3 returning demandes.id, a.statut as avant),
     j as (insert into demandes_journal (demande_id, quoi, par, detail) select id, 'statut', $4, jsonb_build_object('de', avant, 'a', $3::text) from d)
     select (select count(*) from a)::int as existe`, [boite, cle, statut, par]);
  return !!(rows[0] && rows[0].existe);
}

/* la note privée (2 000 caractères au plus) ; l'historique dit qu'elle a changé, jamais ce qu'elle contient */
async function changerNote(db, boite, cle, note, par) {
  const t = String(note == null ? '' : note).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (t.length > 2000) return null;
  const rows = await requete(db,
    `with d as (update demandes set note = nullif($3, ''), derniere_activite = now() where boite = $1 and cle = $2 returning id),
     j as (insert into demandes_journal (demande_id, quoi, par) select id, 'note', $4 from d)
     select count(*)::int as n from d`, [boite, cle, t, par]);
  return !!(rows[0] && rows[0].n);
}

/* effacer une demande à la demande de la personne (droit à l'effacement) ; historique compris */
async function effacer(db, boite, cle) {
  const rows = await requete(db, 'with d as (delete from demandes where boite = $1 and cle = $2 returning 1) select count(*)::int as n from d', [boite, cle]);
  return !!(rows[0] && rows[0].n);
}

module.exports = {
  base, conservationMois, empreinte, enregistrer, noterEnvoi, purger, lister, detail, changerStatut, changerNote, effacer,
  STATUTS, EMAIL_STATUTS, CONSERVATION_DEFAUT, DELAI_MS,
  _pool(p) { pool = p; }, _oublier() { tableAbsente = 0; purgeLe = 0; },
};
