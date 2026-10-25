// Les demandes du formulaire Contact (migration 2026-10-25-09) : enregistrées avant l'e-mail, deux statuts distincts,
// aucune perte si l'e-mail échoue, l'e-mail seul si la base manque, doublons, droits, historique sans donnée personnelle,
// conservation configurable. La partie sans base tourne partout ; le reste contre une vraie base PostgreSQL de test
// (TEST_DATABASE_URL), avec de vraies sessions Better Auth (liens magiques) : propriétaire du site, membre et invitée
// d'un projet, autre compte, visiteur sans compte. Adresses fictives (exemple.test), aucune donnée réelle.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8781';
const ENV = { RESEND_API_KEY: 're_test_fictif', CONTACT_TO: 'boite@exemple.test', CONTACT_FROM: 'AIME <contact@exemple.test>' };

if (URLT) Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: crypto.randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE });
else delete process.env.DATABASE_URL;
delete process.env.VERCEL_ENV; delete process.env.DEMANDES_CONSERVATION_MOIS;
const H = require('../api/contact.js');
const D = require('../api/_demandes/depot.cjs');
let A, M, E, pool, liens = [], ip = 0, envois = [], reponseResend = () => ({ ok: true, status: 200 });

const bon = extra => Object.assign({ prenom: 'Camille', nom: 'Fictif', email: 'camille.demande@exemple.test', tel: '06 00 00 00 00', adresse: '1 rue Fictive, Nantes', projet: 'site',
  livraison: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), message: 'Un site vitrine pour un atelier de céramique, avec galerie et prise de rendez-vous.', consentement: true, site_web: '', duree: 8000 }, extra);
function contact(corps, o = {}) {
  const req = { method: 'POST', headers: { origin: 'https://aime.exemple.test', host: 'aime.exemple.test', 'content-type': 'application/json', 'x-real-ip': o.ip || '203.0.113.' + (++ip % 250) }, body: corps };
  const res = { code: 0, corps: null, h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(j) { this.corps = j; return this; } };
  return H(req, res).then(() => res);
}
function api(o = {}) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } };
    const req = { method: o.method || 'GET', url: o.url || '/api/demandes', body: o.body,
      headers: Object.assign({ origin: BASE, host: 'localhost:8781', 'content-type': 'application/json' }, o.cookie ? { cookie: o.cookie } : {}, o.headers || {}) };
    M.default(req, res);
  });
}
const poster = (body, cookie, headers) => api({ method: 'POST', body, cookie, headers });
async function connecter(email) {
  const a = A.auth(); liens = [];
  await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ip % 250) }, body: JSON.stringify({ email, callbackURL: '/compte/' }) }));
  const r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ip % 250) } }));
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
const ligne = async email => (await pool.query('select * from demandes where email = $1 order by id', [email])).rows;
const journal = async id => (await pool.query('select quoi, par, detail from demandes_journal where demande_id = $1 order by quand, id', [id])).rows;

before(async () => {
  M = await import('../api/demandes.mjs');
  if (!URLT) return;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate demandes restart identity cascade');
  await pool.query('truncate quotas').catch(() => {});
});
after(async () => { if (pool) await pool.end(); const p = D.base(); if (p) await p.end(); });
beforeEach(async () => {
  if (pool) await pool.query('truncate quotas').catch(() => {});
  H._reinitialiser(); envois = []; reponseResend = () => ({ ok: true, status: 200 });
  Object.assign(process.env, ENV);
  H.fetch = async (url, o) => { envois.push({ url, o, corps: JSON.parse(o.body) }); return reponseResend(); };
  delete H.db; M._db(undefined); M._fetch(H.fetch); M._proprietaire();
});

/* ——— sans base ——— */

test('empreinte : la même que l\'Idempotency-Key d\'avant ; conservation : 24 mois par défaut, bornée entre 1 et 120', () => {
  const v = { email: 'a@exemple.test', message: 'bonjour bonjour bonjour' }, t = 1761350400000;
  const avant = crypto.createHash('sha256').update([v.email, v.message, Math.floor(t / 600000)].join('|')).digest('hex').slice(0, 48);
  assert.equal(D.empreinte(v, t), avant);
  assert.equal(D.conservationMois({}), 24);
  for (const [x, n] of [['36', 36], ['1', 1], ['120', 120], ['0', 24], ['121', 24], ['12.5', 24], ['douze', 24], ['', 24]]) assert.equal(D.conservationMois({ DEMANDES_CONSERVATION_MOIS: x }), n, x);
});

/* une base simulée : elle note chaque requête et l'ordre par rapport à l'e-mail */
function fausseBase({ casse = false, deja = null } = {}) {
  const fait = [];
  return { fait, query: async (sql) => {
    if (casse) throw Object.assign(new Error('connexion refusée'), { code: 'ECONNREFUSED' });
    fait.push(/insert into demandes \(/.test(sql) ? 'demande' : /update demandes set email_statut/.test(sql) ? 'statut-email' : 'autre');
    if (/insert into demandes \(/.test(sql)) return { rows: [deja ? { id: 7, cle: 'cleexistante0000aa', email_statut: deja, nouvelle: false } : { id: 7, cle: 'clenouvelle00000aa', email_statut: 'en_attente', nouvelle: true }] };
    return { rows: [{ n: 0 }] };
  } };
}

test('ordre : la demande est écrite AVANT l\'e-mail, puis le résultat de l\'envoi est noté', async () => {
  const db = fausseBase(); H.db = db;
  H.fetch = async (url, o) => { db.fait.push('e-mail'); envois.push(o); return { ok: true, status: 200 }; };
  const r = await contact(bon());
  assert.equal(r.code, 200); assert.deepEqual(r.corps, { ok: true });
  assert.deepEqual(db.fait.filter(x => x !== 'autre'), ['demande', 'e-mail', 'statut-email']);
});

test('e-mail en panne, demande enregistrée : le visiteur reçoit « ok », l\'échec est noté, rien n\'est perdu', async () => {
  for (const panne of [async () => ({ ok: false, status: 500 }), async () => { throw new Error('réseau'); }]) {
    const db = fausseBase(); H.db = db; H.fetch = async (...x) => { db.fait.push('e-mail'); return panne(...x); };
    const r = await contact(bon());
    assert.equal(r.code, 200); assert.deepEqual(r.corps, { ok: true });
    assert.deepEqual(db.fait.filter(x => x !== 'autre'), ['demande', 'e-mail', 'statut-email']);
  }
});

test('base en panne : l\'e-mail part quand même (comportement d\'avant) ; base ET e-mail en panne : 502, le texte reste dans la page', async () => {
  H.db = fausseBase({ casse: true });
  let r = await contact(bon()); assert.equal(r.code, 200); assert.equal(envois.length, 1);
  H._reinitialiser(); H.db = fausseBase({ casse: true }); H.fetch = async () => ({ ok: false, status: 503 });
  r = await contact(bon()); assert.equal(r.code, 502); assert.deepEqual(r.corps, { ok: false, erreur: 'envoi' });
  H._reinitialiser(); H.db = null; delete process.env.RESEND_API_KEY;
  r = await contact(bon()); assert.equal(r.code, 503, 'ni base ni configuration : comme avant');
});

test('configuration d\'envoi absente mais demande enregistrée : « ok », statut non_configure, aucun appel à Resend', async () => {
  const db = fausseBase(); H.db = db; delete process.env.RESEND_API_KEY;
  const r = await contact(bon()); assert.equal(r.code, 200); assert.equal(envois.length, 0);
  assert.deepEqual(db.fait.filter(x => x !== 'autre'), ['demande', 'statut-email']);
});

test('doublon déjà transmis : aucune nouvelle ligne, aucun second e-mail', async () => {
  const db = fausseBase({ deja: 'envoye' }); H.db = db;
  const r = await contact(bon()); assert.equal(r.code, 200); assert.equal(envois.length, 0);
  assert.deepEqual(db.fait.filter(x => x !== 'autre'), ['demande']);
});

test('/api/demandes : sans le droit de propriétaire, 404 pour tout, et la base n\'est même pas lue', async () => {
  const db = fausseBase(); M._db(db); M._proprietaire(async () => null);
  for (const o of [{}, { url: '/api/demandes?cle=clenouvelle00000aa' }, { method: 'POST', body: { action: 'statut', cle: 'clenouvelle00000aa', statut: 'lue' } }, { method: 'POST', body: { action: 'effacer', cle: 'x', confirmation: true } }])
    assert.equal((await api(o)).code, 404, JSON.stringify(o));
  M._proprietaire(async () => { throw new Error('session illisible'); });
  assert.equal((await api()).code, 404, 'une erreur ferme');
  assert.deepEqual(db.fait, [], 'aucune requête');
  assert.equal((await api({ method: 'DELETE' })).code, 405);
  M._proprietaire(async () => ({ id: 'proprio-fictif' }));
  assert.equal((await api({ method: 'POST', body: { action: 'statut' }, headers: { origin: 'https://ailleurs.test' } })).code, 403, 'garde même origine sur les écritures');
  M._db(null); assert.equal((await api()).code, 503, 'le propriétaire apprend que la base manque');
});

/* ——— contre une vraie base ——— */

test('base : la demande existe déjà (en_attente) au moment où l\'e-mail part, puis passe à « envoye » ; historique recue → email_envoye', opts, async () => {
  let vueAuMomentDeLEnvoi = null;
  H.fetch = async (url, o) => { envois.push(o); vueAuMomentDeLEnvoi = (await ligne('ordre@exemple.test'))[0]; return { ok: true, status: 200 }; };
  const r = await contact(bon({ email: 'ordre@exemple.test' }));
  assert.equal(r.code, 200); assert.ok(vueAuMomentDeLEnvoi, 'écrite avant l\'e-mail'); assert.equal(vueAuMomentDeLEnvoi.email_statut, 'en_attente');
  const [d] = await ligne('ordre@exemple.test');
  assert.equal(d.email_statut, 'envoye'); assert.ok(d.email_envoye_le); assert.equal(d.email_tentatives, 1); assert.equal(d.statut, 'nouvelle'); assert.equal(d.boite, 'site');
  assert.match(d.cle, /^[A-Za-z0-9_-]{22}$/); assert.ok(d.consentement_le);
  assert.deepEqual((await journal(d.id)).map(j => j.quoi), ['recue', 'email_envoye']);
  assert.equal(envois[0].headers['Idempotency-Key'], 'contact-' + d.empreinte, 'la même clé qu\'avant pour Resend');
});

test('base : aucune adresse IP n\'est enregistrée, l\'historique ne contient aucune donnée personnelle', opts, async () => {
  await contact(bon({ email: 'ip@exemple.test' }), { ip: '198.51.100.77' });
  const cols = (await pool.query("select column_name from information_schema.columns where table_name in ('demandes', 'demandes_journal')")).rows.map(r => r.column_name);
  assert.ok(!cols.some(c => /ip|agent|navigateur/.test(c)), cols.join(', '));
  const brut = JSON.stringify((await pool.query('select * from demandes')).rows) + JSON.stringify((await pool.query('select * from demandes_journal')).rows);
  assert.ok(!brut.includes('198.51.100.77'));
  const j = JSON.stringify((await pool.query('select detail from demandes_journal')).rows);
  for (const pii of ['Camille', 'Fictif', '@exemple.test', 'céramique', '06 00']) assert.ok(!j.includes(pii), pii);
});

test('base : double envoi (double clic, réseau) → une seule demande, un seul e-mail', opts, async () => {
  const v = bon({ email: 'double@exemple.test' });
  const [a, b] = await Promise.all([contact(v), contact(v)]);
  assert.equal(a.code, 200); assert.equal(b.code, 200);
  await contact(v);
  assert.equal((await ligne('double@exemple.test')).length, 1);
  const cles = new Set(envois.map(e => e.o.headers['Idempotency-Key']));
  assert.equal(cles.size, 1, 'au pire, la même clé : Resend n\'envoie qu\'une fois');
  assert.ok(envois.length <= 2, 'le troisième envoi trouve la demande déjà transmise');
});

test('base : e-mail refusé → demande gardée en « echec » (code 403), « ok » pour le visiteur ; le propriétaire la renvoie', opts, async () => {
  reponseResend = () => ({ ok: false, status: 403 });
  const r = await contact(bon({ email: 'echec@exemple.test' }));
  assert.equal(r.code, 200); assert.deepEqual(r.corps, { ok: true });
  let [d] = await ligne('echec@exemple.test');
  assert.equal(d.email_statut, 'echec'); assert.equal(d.email_code, '403'); assert.equal(d.statut, 'nouvelle');
  assert.deepEqual((await journal(d.id)).map(j => [j.quoi, j.detail.code]), [['recue', undefined], ['email_echec', '403']]);
  /* le renvoi : par le propriétaire seulement, la même clé Resend (moins de 23 heures) */
  M._proprietaire(async () => ({ id: 'proprio-fictif' }));
  reponseResend = () => ({ ok: true, status: 200 }); envois = [];
  let x = await poster({ action: 'renvoyer', cle: d.cle }); assert.equal(x.code, 200); assert.equal(x.body.email_statut, 'envoye');
  assert.equal(envois[0].o.headers['Idempotency-Key'], 'contact-' + d.empreinte);
  assert.equal(envois[0].corps.reply_to, 'echec@exemple.test');
  [d] = await ligne('echec@exemple.test'); assert.equal(d.email_statut, 'envoye'); assert.equal(d.email_code, null); assert.equal(d.email_tentatives, 2);
  assert.deepEqual((await journal(d.id)).map(j => [j.quoi, j.par]).slice(-1), [['renvoi', 'proprio-fictif']]);
  x = await poster({ action: 'renvoyer', cle: d.cle }); assert.equal(x.code, 409, 'déjà parti : pas de second e-mail');
});

test('base : vraies sessions — seul le propriétaire du site lit les demandes ; membre, invitée, autre compte, visiteur : 404', opts, async () => {
  await contact(bon({ email: 'droits@exemple.test' }));
  const [d] = await ligne('droits@exemple.test');
  const proprio = await connecter('proprio.demandes@exemple.test'), membre = await connecter('membre.demandes@exemple.test'), invitee = await connecter('invitee.demandes@exemple.test'), autre = await connecter('autre.demandes@exemple.test');
  const id = (await pool.query('select id from "user" where email = $1', ['proprio.demandes@exemple.test'])).rows[0].id;
  process.env.AIME_PROPRIETAIRES = id;
  /* un projet du propriétaire, avec un membre et une invitée : participer à un projet ne donne aucun droit sur les demandes du site */
  const appelE = (body, cookie) => new Promise(r => { const res = { statusCode: 200, setHeader() {}, end(t) { r({ code: this.statusCode, body: JSON.parse(t) }); } };
    E.default({ method: 'POST', body, headers: { 'content-type': 'application/json', origin: BASE, host: 'localhost:8781', cookie } }, res); });
  const esp = (await appelE({ action: 'creer', titre: 'Projet fictif des demandes' }, proprio)).body.id;
  for (const [c, role] of [[membre, 'editor'], [invitee, 'guest']]) {
    const inv = await appelE({ action: 'inviter', espace: esp, role }, proprio);
    assert.equal((await appelE({ action: 'rejoindre', jeton: new URL(inv.body.lien).searchParams.get('invitation') }, c)).code, 200);
  }
  let r = await api({ cookie: proprio }); assert.equal(r.code, 200); assert.ok(r.body.demandes.some(x => x.cle === d.cle)); assert.equal(r.body.conservation_mois, 24);
  assert.ok(!('id' in r.body.demandes[0]) && !('empreinte' in r.body.demandes[0]), 'ni identifiant interne ni empreinte');
  r = await api({ cookie: proprio, url: '/api/demandes?cle=' + d.cle }); assert.equal(r.code, 200); assert.equal(r.body.demande.email, 'droits@exemple.test');
  assert.ok(!('id' in r.body.demande));
  for (const [nom, c] of [['membre', membre], ['invitée', invitee], ['autre compte', autre], ['visiteur', null]]) {
    assert.equal((await api({ cookie: c })).code, 404, nom + ' : liste');
    assert.equal((await api({ cookie: c, url: '/api/demandes?cle=' + d.cle })).code, 404, nom + ' : détail');
    assert.equal((await poster({ action: 'statut', cle: d.cle, statut: 'classee' }, c)).code, 404, nom + ' : statut');
    assert.equal((await poster({ action: 'effacer', cle: d.cle, confirmation: true }, c)).code, 404, nom + ' : effacer');
  }
  assert.equal((await ligne('droits@exemple.test'))[0].statut, 'nouvelle', 'rien n\'a changé');
  delete process.env.AIME_PROPRIETAIRES;
  assert.equal((await api({ cookie: proprio })).code, 404, 'sans la variable, personne (fermé par défaut)');
});

test('base : consulter, qualifier, noter, effacer — l\'historique dit ce qui a changé, jamais le contenu de la note', opts, async () => {
  M._proprietaire(async () => ({ id: 'proprio-fictif' }));
  await contact(bon({ email: 'suivi@exemple.test' }));
  const [d] = await ligne('suivi@exemple.test');
  assert.equal((await poster({ action: 'statut', cle: d.cle, statut: 'lue' })).code, 200);
  assert.equal((await poster({ action: 'statut', cle: d.cle, statut: 'lue' })).code, 200, 'idempotent');
  assert.equal((await poster({ action: 'statut', cle: d.cle, statut: 'en_cours' })).code, 200);
  assert.equal((await poster({ action: 'statut', cle: d.cle, statut: 'pirate' })).code, 400);
  assert.equal((await poster({ action: 'note', cle: d.cle, note: 'Rappeler mardi, budget à préciser' })).code, 200);
  assert.equal((await poster({ action: 'note', cle: d.cle, note: 'x'.repeat(2001) })).code, 400);
  assert.equal((await poster({ action: 'statut', cle: 'inexistante000000000', statut: 'lue' })).code, 404);
  const r = await api({ url: '/api/demandes?cle=' + d.cle });
  assert.equal(r.body.demande.statut, 'en_cours'); assert.equal(r.body.demande.note, 'Rappeler mardi, budget à préciser');
  assert.deepEqual(r.body.journal.map(j => j.quoi), ['recue', 'email_envoye', 'statut', 'statut', 'note']);
  assert.deepEqual(r.body.journal[3].detail, { de: 'lue', a: 'en_cours' });
  assert.ok(!JSON.stringify(r.body.journal).includes('mardi'));
  assert.ok(new Date(r.body.demande.conserver_jusqu_au) > new Date(Date.now() + 23 * 30 * 864e5));
  assert.equal((await poster({ action: 'effacer', cle: d.cle })).code, 400, 'confirmation exigée');
  assert.equal((await poster({ action: 'effacer', cle: d.cle, confirmation: true })).code, 200);
  assert.equal((await ligne('suivi@exemple.test')).length, 0);
  assert.equal((await pool.query('select count(*)::int as n from demandes_journal where demande_id = $1', [d.id])).rows[0].n, 0, 'historique effacé avec');
});

test('base : conservation — sans activité depuis plus longtemps que DEMANDES_CONSERVATION_MOIS, la demande est effacée', opts, async () => {
  await contact(bon({ email: 'vieille@exemple.test' })); await contact(bon({ email: 'recente@exemple.test' }));
  const [v] = await ligne('vieille@exemple.test');
  await pool.query("update demandes set derniere_activite = now() - interval '25 months', recue_le = now() - interval '25 months' where id = $1", [v.id]);
  assert.equal(await D.purger(pool, { DEMANDES_CONSERVATION_MOIS: '36' }), 0, '36 mois : gardée');
  assert.equal(await D.purger(pool, {}), 1, '24 mois par défaut : effacée');
  assert.equal((await ligne('vieille@exemple.test')).length, 0); assert.equal((await ligne('recente@exemple.test')).length, 1);
  assert.equal((await pool.query('select count(*)::int as n from demandes_journal where demande_id = $1', [v.id])).rows[0].n, 0);
});

test('base : la liste se lit par pages (curseur opaque), la plus récente d\'abord', opts, async () => {
  M._proprietaire(async () => ({ id: 'proprio-fictif' }));
  await pool.query('truncate demandes restart identity cascade');
  for (let i = 0; i < 5; i++) { await contact(bon({ email: 'page' + i + '@exemple.test' })); await pool.query("update demandes set recue_le = now() - make_interval(mins => $1) where email = $2", [10 - i, 'page' + i + '@exemple.test']); }
  let r = await api({ url: '/api/demandes?n=2' }); assert.deepEqual(r.body.demandes.map(x => x.email), ['page4@exemple.test', 'page3@exemple.test']); assert.ok(r.body.suivant);
  r = await api({ url: '/api/demandes?n=2&avant=' + r.body.suivant }); assert.deepEqual(r.body.demandes.map(x => x.email), ['page2@exemple.test', 'page1@exemple.test']);
  r = await api({ url: '/api/demandes?n=2&avant=' + r.body.suivant }); assert.deepEqual(r.body.demandes.map(x => x.email), ['page0@exemple.test']); assert.equal(r.body.suivant, null);
  r = await api({ url: '/api/demandes?n=2&avant=nimportequoi' }); assert.equal(r.code, 200, 'curseur illisible : première page');
});

test('AIME fonctionne avec AIME : aucune page publique, démonstration ou vitrine ne lit les demandes réelles', () => {
  const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
  const fichiers = d => fs.existsSync(path.join(R, d)) ? (fs.statSync(path.join(R, d)).isDirectory()
    ? fs.readdirSync(path.join(R, d), { recursive: true }).map(f => path.join(d, String(f))).filter(f => /\.(html|js|mjs|json)$/.test(f)) : [d]) : [];
  const publics = ['index.html', 'exemples', 'vitrine', 'live', 'accueil', 'contact', 'zero', 'lab', 'magazine', 'tarifs', 'attente'].flatMap(fichiers);
  assert.ok(publics.length > 20, 'les pages publiques sont bien parcourues');
  const fautes = publics.filter(f => fs.readFileSync(path.join(R, f), 'utf8').includes('/api/demandes'));
  assert.deepEqual(fautes, [], 'une vitrine de l\'usage réel lira des données fictives ou autorisées, jamais /api/demandes');
});

test('base : demande → projet — le propriétaire crée UN projet (rejouable), sans coordonnées copiées ; personne d\'autre ne le peut', opts, async () => {
  await contact(bon({ email: 'conversion@exemple.test', message: 'Nous préparons un mariage fictif à New York et cherchons un saxophoniste.' }));
  const [d] = await ligne('conversion@exemple.test');
  const proprio = await connecter('proprio.conversion@exemple.test'), autre = await connecter('autre.conversion@exemple.test');
  const id = (await pool.query('select id from "user" where email = $1', ['proprio.conversion@exemple.test'])).rows[0].id;
  process.env.AIME_PROPRIETAIRES = id; M._proprietaire();
  assert.equal((await poster({ action: 'convertir', cle: d.cle, titre: 'Mariage · Camille Fictif' }, autre)).code, 404, 'un autre compte : 404');
  assert.equal((await poster({ action: 'convertir', cle: d.cle, titre: '  ' }, proprio)).code, 400, 'un nom est exigé');
  assert.equal((await poster({ action: 'convertir', cle: 'inexistante000000000', titre: 'X' }, proprio)).code, 404);
  let r = await poster({ action: 'convertir', cle: d.cle, titre: 'Mariage · Camille Fictif', modele: 'mariage' }, proprio);
  assert.equal(r.code, 200); assert.equal(r.body.existant, false); const esp = r.body.espace;
  const s = (await pool.query('select title, owner_id, data from spaces where id = $1', [esp])).rows[0];
  assert.equal(s.title, 'Mariage · Camille Fictif'); assert.equal(s.owner_id, id, 'le propriétaire de la session en est propriétaire');
  assert.deepEqual(s.data, { modele: 'mariage', origine: 'demande-' + d.cle });
  assert.ok(!JSON.stringify(s).includes('conversion@exemple.test') && !JSON.stringify(s).includes('saxophoniste'), 'aucune coordonnée ni message copiés dans le projet');
  assert.equal((await pool.query("select role from space_members where space_id = $1", [esp])).rows.map(x => x.role).join(), 'owner', 'seul membre : le propriétaire');
  assert.equal((await ligne('conversion@exemple.test'))[0].statut, 'convertie');
  r = await poster({ action: 'convertir', cle: d.cle, titre: 'Un autre nom' }, proprio);
  assert.equal(r.code, 200); assert.equal(r.body.espace, esp); assert.equal(r.body.existant, true, 'rejoué : le même projet, aucun doublon');
  assert.equal((await pool.query("select count(*)::int as n from spaces where data->>'origine' = $1", ['demande-' + d.cle])).rows[0].n, 1);
  const j = (await pool.query("select detail from demandes_journal where demande_id = $1 and quoi = 'statut'", [d.id])).rows;
  assert.deepEqual(j.map(x => x.detail), [{ de: 'nouvelle', a: 'convertie', espace: esp }], 'l\'historique garde le lien vers le projet, une seule fois');
  r = await api({ cookie: proprio, url: '/api/demandes?cle=' + d.cle }); assert.equal(r.body.projet, esp, 'le détail dit quel projet en est né');
  delete process.env.AIME_PROPRIETAIRES;
});

test('base : deux conversions simultanées de la même demande → un seul projet, un seul passage à « convertie »', opts, async () => {
  await contact(bon({ email: 'simultane@exemple.test', message: 'Deux clics en même temps sur « Créer le projet », depuis deux onglets.' }));
  const [d] = await ligne('simultane@exemple.test');
  const proprio = await connecter('proprio.simultane@exemple.test');
  process.env.AIME_PROPRIETAIRES = (await pool.query('select id from "user" where email = $1', ['proprio.simultane@exemple.test'])).rows[0].id; M._proprietaire();
  const rs = await Promise.all([1, 2, 3].map(() => poster({ action: 'convertir', cle: d.cle, titre: 'Projet simultané' }, proprio)));
  assert.deepEqual(rs.map(r => r.code), [200, 200, 200], 'chaque requête reçoit le projet');
  assert.equal(new Set(rs.map(r => r.body.espace)).size, 1, 'le même projet pour les trois');
  assert.equal((await pool.query("select count(*)::int as n from spaces where data->>'origine' = $1", ['demande-' + d.cle])).rows[0].n, 1, 'un seul projet en base');
  assert.equal((await pool.query("select count(*)::int as n from demandes_journal where demande_id = $1 and quoi = 'statut' and detail->>'a' = 'convertie'", [d.id])).rows[0].n, 1, 'un seul passage à « convertie » dans l\'historique');
  delete process.env.AIME_PROPRIETAIRES;
});

// Deux changements de statut qui se croisent (deux onglets) : la seconde transaction attend la première, puis relit le statut
// à jour (verrou « for update ») ; sans ce verrou, elle comparait l'ancien statut et écrivait une seconde ligne d'historique.
test('base : deux changements de statut croisés → une seule ligne d\'historique (verrou sur la demande)', opts, async () => {
  await contact(bon({ email: 'croise@exemple.test', message: 'Deux onglets ouverts sur la même demande, le même clic au même moment.' }));
  const [d] = await ligne('croise@exemple.test');
  const c1 = await pool.connect(), c2 = await pool.connect();
  try {
    await c1.query('begin'); await c2.query('begin');
    assert.equal(await D.changerStatut(c1, 'site', d.cle, 'en_cours', 'u1'), true);
    const second = D.changerStatut(c2, 'site', d.cle, 'en_cours', 'u2');          // bloqué par le verrou de la première transaction
    await new Promise(r => setTimeout(r, 200)); await c1.query('commit');
    assert.equal(await second, true, 'la demande existe toujours'); await c2.query('commit');
  } finally { c1.release(); c2.release(); }
  const lignes = (await journal(d.id)).filter(j => j.quoi === 'statut' && j.detail.a === 'en_cours');
  assert.equal(lignes.length, 1, 'un seul passage à « en_cours » dans l\'historique');
});
