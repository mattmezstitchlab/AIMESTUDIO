// La Carte enregistrée sur le compte (V1, PR P1) : /api/carte contre une base PostgreSQL de TEST, avec de vraies sessions.
// Prouve : sans session, rien ; chacun ne lit et n'écrit que SA Carte ; rien sans accord ; ce qui ne quitte jamais l'appareil
// (photo, relations, historique) ; une rubrique jamais publique refusée ; jamais publiée par cette voie ; deux appareils sans
// écrasement silencieux (409) ; retrait ; suppression du compte ; même origine et JSON ; base sans la migration : 503, dit.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('crypto');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8783';
if (URLT) Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: crypto.randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE });
delete process.env.VERCEL_ENV;
const M = require('../carte/carte.js');
let A, H, pool, liens = [], ip = 0;

function appel(o = {}) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null, h: this.h }); } };
    const req = { method: o.method || 'GET', url: '/api/carte', body: o.body,
      headers: Object.assign({ origin: BASE, host: 'localhost:8783', 'content-type': 'application/json' }, o.cookie ? { cookie: o.cookie } : {}, o.headers || {}) };
    H.default(req, res);
  });
}
const lire = cookie => appel({ cookie });
const ecrire = (cookie, body, headers) => appel({ method: 'POST', cookie, body, headers });
async function connecter(email) {
  const a = A.auth(); liens = [];
  await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ip % 250) }, body: JSON.stringify({ email, callbackURL: '/compte/' }) }));
  const r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ip % 250) } }));
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
function maCarte(champs) {
  let c = M.vide('2026-10-25'); c = M.modifier(c, Object.assign({ nom: 'Camille Fictive', intention: 'Jouer au mariage de mes amis', competences: ['saxophone'] }, champs || {}), 'essai', '2026-10-25');
  return c;
}

test.before(async () => {
  H = await import('../api/carte.mjs');
  if (!URLT) return;
  A = await import('../api/_auth/auth.mjs'); A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate cartes').catch(() => {}); await pool.query('truncate quotas').catch(() => {});
  /* rejouable sur la même base : les liens et les demandes des Cartes d'un passage précédent sont effacés */
  await pool.query('truncate cartes_liens').catch(() => {}); await pool.query("delete from demandes where boite like 'compte:%'").catch(() => {});
});
test.after(async () => { if (pool) await pool.end(); });

test('sans session : 401, rien n\'est lu ni écrit', opts, async () => {
  assert.equal((await lire()).code, 401);
  assert.equal((await ecrire(undefined, { action: 'enregistrer', carte: maCarte(), consentement: true })).code, 401);
});

test('enregistrer exige l\'accord ; ensuite la Carte est sur le compte, privée, sans photo, relations ni historique', opts, async () => {
  const c = await connecter('carte.une@exemple.test');
  assert.deepEqual((await lire(c)).body.carte, null, 'au départ : aucune Carte sur le compte');
  const carte = maCarte(); carte.photo = 'data:image/png;base64,AAAA'; carte.relations = ['Anne, ma sœur']; carte.visibilite.nom = 'publique';
  carte.publication = { publiee: true, consentement: { date: '2026-10-25' }, revoqueeLe: null };
  assert.equal((await ecrire(c, { action: 'enregistrer', carte, consentement: false })).code, 400, 'sans accord : refusé');
  const r = await ecrire(c, { action: 'enregistrer', carte, consentement: true, rev: null });
  assert.equal(r.code, 200); assert.equal(r.body.rev, 1);
  assert.deepEqual(r.body.retenus.sort(), ['historique', 'photo', 'relations'], 'la réponse dit ce qui est resté sur l\'appareil');
  const g = (await lire(c)).body.carte;
  assert.equal(g.nom, 'Camille Fictive'); assert.deepEqual(g.competences, ['saxophone']);
  assert.equal(g.photo, null, 'jamais la photo'); assert.deepEqual(g.relations, [], 'jamais les relations (des tiers)'); assert.deepEqual(g.historique, [], 'jamais l\'historique');
  assert.equal(g.publication.publiee, false, 'jamais publiée par cette voie, même si l\'appareil le demandait');
  assert.equal(g.visibilite.nom, 'publique', 'la visibilité choisie est gardée (elle ne sert qu\'au futur lien public)');
  const ligne = (await pool.query('select consentement_le, consentement_texte from cartes c join "user" u on u.id = c.user_id where u.email = $1', ['carte.une@exemple.test'])).rows[0];
  assert.ok(ligne.consentement_le && /privée/.test(ligne.consentement_texte), 'l\'accord est daté, avec son texte');
});

test('chacun ne lit que SA Carte : une autre personne ne voit rien de la première', opts, async () => {
  const deux = await connecter('carte.deux@exemple.test');
  assert.deepEqual((await lire(deux)).body.carte, null, 'la seconde personne n\'a pas de Carte, et ne voit pas celle de la première');
  await ecrire(deux, { action: 'enregistrer', carte: maCarte({ nom: 'Dominique Autre' }), consentement: true, rev: null });
  const une = await connecter('carte.une@exemple.test');
  assert.equal((await lire(une)).body.carte.nom, 'Camille Fictive', 'chacune retrouve la sienne');
  assert.equal((await lire(deux)).body.carte.nom, 'Dominique Autre');
});

test('une rubrique jamais publique, une visibilité inconnue, un objet qui n\'est pas une Carte : refusés, rien n\'est changé', opts, async () => {
  const c = await connecter('carte.une@exemple.test'), avant = (await lire(c)).body;
  const x = maCarte(); x.visibilite.naissance = 'publique';
  let r = await ecrire(c, { action: 'enregistrer', carte: x, consentement: true, rev: avant.rev });
  assert.equal(r.code, 400); assert.match(r.body.raison, /naissance/i);
  const y = maCarte(); y.visibilite.nom = 'tout le monde';
  assert.equal((await ecrire(c, { action: 'enregistrer', carte: y, consentement: true, rev: avant.rev })).code, 400);
  assert.equal((await ecrire(c, { action: 'enregistrer', carte: { format: 'autre' }, consentement: true, rev: avant.rev })).code, 400);
  assert.equal((await ecrire(c, { action: 'enregistrer', carte: maCarte(), consentement: true, rev: 'abc' })).code, 400, 'révision invalide');
  assert.equal((await lire(c)).body.rev, avant.rev, 'aucun de ces envois n\'a modifié la Carte du compte');
});

test('deux appareils : celui qui écrit sur une version périmée reçoit 409 et la version du compte, jamais d\'écrasement silencieux', opts, async () => {
  const ordi = await connecter('carte.une@exemple.test'), tel = await connecter('carte.une@exemple.test');
  const rev = (await lire(ordi)).body.rev;
  const a = await ecrire(ordi, { action: 'enregistrer', carte: maCarte({ intention: 'Version de l\'ordinateur' }), consentement: true, rev });
  assert.equal(a.code, 200); assert.equal(a.body.rev, rev + 1);
  const b = await ecrire(tel, { action: 'enregistrer', carte: maCarte({ intention: 'Version du téléphone' }), consentement: true, rev });
  assert.equal(b.code, 409); assert.equal(b.body.carte.intention, 'Version de l\'ordinateur', '409 rend la version du compte'); assert.equal(b.body.rev, rev + 1);
  const n = await ecrire(tel, { action: 'enregistrer', carte: maCarte({ intention: 'Version du téléphone' }), consentement: true, rev: null });
  assert.equal(n.code, 409, 'prétendre qu\'il n\'y a rien sur le compte ne permet pas d\'écraser');
  const c = await ecrire(tel, { action: 'enregistrer', carte: maCarte({ intention: 'Version du téléphone' }), consentement: true, rev: b.body.rev });
  assert.equal(c.code, 200, 'après avoir choisi en connaissance de cause, le téléphone enregistre'); assert.equal((await lire(ordi)).body.carte.intention, 'Version du téléphone');
});

test('deux enregistrements simultanés sur la même révision : un seul passe, l\'autre reçoit 409', opts, async () => {
  const c = await connecter('carte.une@exemple.test'), rev = (await lire(c)).body.rev;
  const rs = await Promise.all([1, 2, 3].map(i => ecrire(c, { action: 'enregistrer', carte: maCarte({ intention: 'Simultané ' + i }), consentement: true, rev })));
  assert.equal(rs.filter(r => r.code === 200).length, 1); assert.equal(rs.filter(r => r.code === 409).length, 2);
  assert.equal((await lire(c)).body.rev, rev + 1);
});

test('écritures : même origine et JSON, sinon refusées', opts, async () => {
  const c = await connecter('carte.une@exemple.test');
  assert.equal((await ecrire(c, { action: 'retirer', confirmation: true }, { origin: 'https://ailleurs.exemple' })).code, 403);
  assert.equal((await ecrire(c, { action: 'retirer', confirmation: true }, { 'content-type': 'text/plain' })).code, 415);
  assert.ok((await lire(c)).body.carte, 'rien n\'a été retiré');
});

test('retirer ma Carte du compte : confirmation exigée, puis plus rien sur le compte', opts, async () => {
  const c = await connecter('carte.deux@exemple.test');
  assert.equal((await ecrire(c, { action: 'retirer' })).code, 400);
  const r = await ecrire(c, { action: 'retirer', confirmation: true }); assert.equal(r.code, 200); assert.equal(r.body.carte, null);
  assert.equal((await lire(c)).body.carte, null);
  assert.equal((await pool.query("select count(*)::int as n from cartes c join \"user\" u on u.id = c.user_id where u.email = 'carte.deux@exemple.test'")).rows[0].n, 0);
});

test('supprimer son compte efface sa Carte', opts, async () => {
  const c = await connecter('carte.trois@exemple.test');
  await ecrire(c, { action: 'enregistrer', carte: maCarte({ nom: 'Trois' }), consentement: true, rev: null });
  const id = (await pool.query("select id from \"user\" where email = 'carte.trois@exemple.test'")).rows[0].id;
  await A.auth().handler(new Request(BASE + '/api/auth/delete-user', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, cookie: c, 'x-forwarded-for': '192.0.2.200' }, body: JSON.stringify({}) }));
  assert.equal((await pool.query('select count(*)::int as n from cartes where user_id = $1', [id])).rows[0].n, 0);
});

test('base sans la migration 2026-10-25-10 : 503, dit, pour la lecture comme pour l\'écriture', opts, async () => {
  const c = await connecter('carte.une@exemple.test');
  H._db({ query: async () => { const e = new Error('relation "cartes" does not exist'); e.code = '42P01'; throw e; } });
  try {
    const g = await lire(c); assert.equal(g.code, 503); assert.match(g.body.raison, /reste sur cet appareil/);
    assert.equal((await ecrire(c, { action: 'enregistrer', carte: maCarte(), consentement: true, rev: null })).code, 503);
  } finally { H._db(undefined); }
});

/* ---------- PR P2 : le lien public et révocable (migration 2026-10-25-11) ---------- */
let P;
function publique(jeton, ip) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null, h: this.h }); } };
    P.default({ method: 'GET', url: '/api/carte-publique?l=' + encodeURIComponent(jeton), headers: { 'x-real-ip': ip || '198.51.100.7' } }, res);
  });
}
async function carteAvecPublic(email, champs, vis) {
  const c = await connecter(email); const avant = (await lire(c)).body;
  const x = maCarte(champs); Object.assign(x.visibilite, vis || {});
  const r = await ecrire(c, { action: 'enregistrer', carte: x, consentement: true, rev: avant.rev });
  assert.equal(r.code, 200, 'enregistrée'); return c;
}

test('lien public : exige une Carte sur le compte, l\'accord et au moins une rubrique publique', opts, async () => {
  P = await import('../api/carte-publique.mjs');
  const vide = await connecter('lien.vide@exemple.test');
  assert.equal((await ecrire(vide, { action: 'publier', consentement: true })).code, 400, 'sans Carte sur le compte : refusé');
  const c = await carteAvecPublic('lien.une@exemple.test', { nom: 'Lina Fictive', intention: 'Chanter aux mariages' }, {});
  assert.equal((await ecrire(c, { action: 'publier', consentement: true })).code, 400, 'rien de « publique » : refusé, le lien ne montrerait rien');
  await carteAvecPublic('lien.une@exemple.test', { nom: 'Lina Fictive', intention: 'Chanter aux mariages', naissance: '1990-05-01' }, { nom: 'publique', intention: 'contacts' });
  assert.equal((await ecrire(c, { action: 'publier' })).code, 400, 'sans accord : refusé');
  const r = await ecrire(c, { action: 'publier', consentement: true });
  assert.equal(r.code, 200); assert.match(r.body.lien.jeton, /^[A-Za-z0-9_-]{32}$/); assert.equal(r.body.lien.ouvertures, 0);
  const r2 = await ecrire(c, { action: 'publier', consentement: true });
  assert.equal(r2.body.lien.jeton, r.body.lien.jeton, 'un seul lien actif : publier de nouveau rend le même');
  assert.equal((await pool.query("select count(*)::int as n from cartes_liens l join \"user\" u on u.id = l.user_id where u.email = 'lien.une@exemple.test'")).rows[0].n, 1);
});

test('lien public : sans compte, seulement les rubriques « publique » ; ni « contacts », ni naissance, ni identifiant, ni adresse', opts, async () => {
  const c = await connecter('lien.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton;
  const v = await publique(jeton);
  assert.equal(v.code, 200); assert.equal(v.h['x-robots-tag'], 'noindex, nofollow'); assert.equal(v.h['cache-control'], 'no-store');
  assert.deepEqual(v.body.rubriques.map(r => r.cle), ['nom'], 'seulement le nom, marqué « publique »');
  const texte = JSON.stringify(v.body);
  assert.ok(!/Chanter|1990|lien\.une@|exemple\.test/.test(texte), 'ni l\'intention (contacts), ni la naissance, ni l\'adresse');
  const id = (await pool.query("select id from \"user\" where email = 'lien.une@exemple.test'")).rows[0].id;
  assert.ok(!texte.includes(id), 'jamais l\'identifiant du compte');
  assert.equal((await lire(c)).body.lien.ouvertures, 1, 'le propriétaire voit qu\'il a été ouvert une fois');
});

test('lien public : une visibilité changée prend effet à l\'ouverture suivante ; une naissance forcée « publique » n\'est jamais servie', opts, async () => {
  const c = await carteAvecPublic('lien.une@exemple.test', { nom: 'Lina Fictive', intention: 'Chanter aux mariages', naissance: '1990-05-01' }, { nom: 'publique', intention: 'publique' });
  const jeton = (await lire(c)).body.lien.jeton;
  assert.deepEqual((await publique(jeton)).body.rubriques.map(r => r.cle), ['nom', 'intention']);
  await pool.query("update cartes set donnees = jsonb_set(donnees, '{visibilite,naissance}', '\"publique\"') where user_id = (select id from \"user\" where email = 'lien.une@exemple.test')");
  assert.ok(!JSON.stringify((await publique(jeton)).body).includes('1990'), 'même forcée en base, la naissance n\'est jamais servie');
});

test('lien public : couper le lien le rend inutilisable tout de suite ; un nouveau lien a un autre jeton', opts, async () => {
  const c = await connecter('lien.une@exemple.test'), ancien = (await lire(c)).body.lien.jeton;
  const r = await ecrire(c, { action: 'couper' }); assert.equal(r.code, 200); assert.equal(r.body.lien, null);
  const v = await publique(ancien); assert.equal(v.code, 404); assert.match(v.body.raison, /coupé/);
  const n = await ecrire(c, { action: 'publier', consentement: true }); assert.notEqual(n.body.lien.jeton, ancien, 'nouveau lien, nouveau jeton');
  assert.equal((await publique(ancien)).code, 404, 'l\'ancien reste mort');
  assert.equal((await publique(n.body.lien.jeton)).code, 200);
});

test('lien public : retirer la Carte du compte coupe le lien ; jetons inconnus ou mal formés : 404 sans détail', opts, async () => {
  const c = await connecter('lien.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton;
  await ecrire(c, { action: 'retirer', confirmation: true });
  assert.equal((await publique(jeton)).code, 404);
  assert.equal((await pool.query('select coupe_le from cartes_liens where jeton = $1', [jeton])).rows[0].coupe_le !== null, true, 'coupé en base');
  for (const j of ['', 'court', 'x'.repeat(32), '../../etc', 'A'.repeat(65)]) assert.equal((await publique(j)).code, 404, 'jeton « ' + j.slice(0, 12) + ' »');
});

test('lien public : chacun coupe seulement le sien ; le jeton d\'une autre personne n\'est jamais touché', opts, async () => {
  const a = await carteAvecPublic('lien.a@exemple.test', { nom: 'Alix' }, { nom: 'publique' }), b = await carteAvecPublic('lien.b@exemple.test', { nom: 'Bastien' }, { nom: 'publique' });
  const ja = (await ecrire(a, { action: 'publier', consentement: true })).body.lien.jeton, jb = (await ecrire(b, { action: 'publier', consentement: true })).body.lien.jeton;
  await ecrire(a, { action: 'couper' });
  assert.equal((await publique(ja)).code, 404); assert.equal((await publique(jb)).code, 200, 'le lien de Bastien marche toujours');
  assert.equal((await publique(jb)).body.rubriques[0].valeur, 'Bastien');
});

test('lien public : sans la migration 2026-10-25-11, publier répond 503 dit, la Carte reste lisible, le lien public 404', opts, async () => {
  const c = await connecter('lien.b@exemple.test');
  const faux = { query: async (sql, v) => { if (/cartes_liens/.test(sql)) { const e = new Error('relation "cartes_liens" does not exist'); e.code = '42P01'; throw e; } return pool.query(sql, v); } };
  H._db(faux); P._db(faux);
  try {
    const g = await lire(c); assert.equal(g.code, 200); assert.equal(g.body.publication, 'indisponible'); assert.equal(g.body.carte.nom, 'Bastien');
    assert.equal((await ecrire(c, { action: 'publier', consentement: true })).code, 503);
    assert.equal((await publique('A'.repeat(32))).code, 404);
  } finally { H._db(undefined); P._db(undefined); }
});

/* ---------- PR P3 : écrire à une Carte (migration 2026-10-25-12) : la demande arrive dans l'AI de la personne ---------- */
let Dm, courriels = []; const Qm = require('../api/_auth/quotas.cjs');
const fauxEnvoi = async (url, o) => { courriels.push(JSON.parse(o.body)); return { ok: true, status: 200 }; };
function deposer(jeton, body, o = {}) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null, h: this.h }); } };
    P.default({ method: 'POST', url: '/api/carte-publique?l=' + encodeURIComponent(jeton), body,
      headers: Object.assign({ origin: BASE, host: 'localhost:8783', 'content-type': 'application/json', 'x-real-ip': o.ip || '203.0.113.' + (++ip % 250) }, o.headers || {}) }, res);
  });
}
function mesDemandes(cookie, o = {}) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } };
    Dm.default({ method: o.method || 'GET', url: '/api/demandes' + (o.q || ''), body: o.body,
      headers: Object.assign({ origin: BASE, host: 'localhost:8783', 'content-type': 'application/json' }, cookie ? { cookie } : {}) }, res);
  });
}
const visiteur = x => Object.assign({ prenom: 'Sacha', nom: 'Visiteur', email: 'sacha.visiteur@exemple.test', message: 'Bonjour, seriez-vous libre pour jouer le 12 juin prochain ?', consentement: true, duree: 5000 }, x || {});
const demandesDe = async email => (await pool.query("select d.* from demandes d join \"user\" u on d.boite = 'compte:' || u.id where u.email = $1 order by d.id", [email])).rows;

test('écrire à une Carte : éteint par défaut ; le réglage exige un lien actif', opts, async () => {
  Dm = await import('../api/demandes.mjs'); Dm._proprietaire(async () => null); P._fetch(fauxEnvoi); Dm._fetch(fauxEnvoi);
  Object.assign(process.env, { RESEND_API_KEY: 'test_cle_fictive', CONTACT_TO: 'site@exemple.test', CONTACT_FROM: 'AIME <bonjour@exemple.test>' });
  await pool.query('truncate quotas').catch(() => {}); Qm._oublier();
  const c = await carteAvecPublic('ecrire.une@exemple.test', { nom: 'Noé Fictif' }, { nom: 'publique' });
  assert.equal((await ecrire(c, { action: 'contact', actif: true })).code, 400, 'sans lien : rien à régler');
  const jeton = (await ecrire(c, { action: 'publier', consentement: true })).body.lien.jeton;
  assert.equal((await lire(c)).body.lien.contact, false, 'éteint par défaut');
  assert.equal((await publique(jeton)).body.contact, false, 'la page publique ne montre pas de formulaire');
  const r = await deposer(jeton, visiteur());
  assert.equal(r.code, 404); assert.equal((await demandesDe('ecrire.une@exemple.test')).length, 0, 'rien n\'est gardé');
  assert.equal((await ecrire(c, { action: 'contact', actif: 'oui' })).code, 400, 'réglage invalide');
  const on = await ecrire(c, { action: 'contact', actif: true });
  assert.equal(on.code, 200); assert.equal(on.body.lien.contact, true);
  assert.equal((await publique(jeton)).body.contact, true);
  assert.equal((await mesDemandes(c)).code, 200, 'avec le contact allumé, la personne a une boîte (vide)');
});

test('écrire à une Carte : la demande arrive dans SON AI et à l\'adresse de SON compte, jamais montrée au visiteur', opts, async () => {
  const c = await connecter('ecrire.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton; courriels = [];
  const r = await deposer(jeton, visiteur());
  assert.equal(r.code, 200); assert.deepEqual(r.body, { ok: true }, 'la réponse ne dit rien de la personne');
  const rows = await demandesDe('ecrire.une@exemple.test');
  assert.equal(rows.length, 1); assert.equal(rows[0].email, 'sacha.visiteur@exemple.test'); assert.equal(rows[0].email_statut, 'envoye'); assert.ok(rows[0].consentement_le);
  assert.equal(courriels.length, 1); assert.deepEqual(courriels[0].to, ['ecrire.une@exemple.test'], 'à l\'adresse du compte, pas à celle du site');
  assert.equal(courriels[0].reply_to, 'sacha.visiteur@exemple.test'); assert.match(courriels[0].subject, /^Demande via votre Carte · Sacha Visiteur/);
  const l = await mesDemandes(c);
  assert.equal(l.code, 200); assert.equal(l.body.demandes.length, 1); assert.equal(l.body.demandes[0].via, 'carte');
  const d = await mesDemandes(c, { q: '?cle=' + l.body.demandes[0].cle });
  assert.equal(d.code, 200); assert.equal(d.body.demande.via, 'carte'); assert.equal(d.body.demande.prenom, 'Sacha');
  assert.equal((await mesDemandes(c, { method: 'POST', body: { action: 'statut', cle: l.body.demandes[0].cle, statut: 'en_cours' } })).code, 200, 'elle la traite comme toute demande');
  assert.equal((await deposer(jeton, visiteur())).code, 200); assert.equal((await demandesDe('ecrire.une@exemple.test')).length, 1, 'double envoi : une seule demande');
});

test('écrire à une Carte : personne d\'autre ne la voit, ni le propriétaire du site, ni un autre compte', opts, async () => {
  const c = await connecter('ecrire.une@exemple.test'), cle = (await mesDemandes(c)).body.demandes[0].cle;
  const autre = await connecter('ecrire.autre@exemple.test');
  assert.equal((await mesDemandes(autre)).code, 404, 'un autre compte sans boîte : 404');
  assert.equal((await mesDemandes(autre, { q: '?cle=' + cle })).code, 404);
  assert.equal((await mesDemandes(autre, { method: 'POST', body: { action: 'statut', cle, statut: 'classee' } })).code, 404);
  const proprio = await connecter('proprio.site@exemple.test'), idp = (await pool.query("select id, email from \"user\" where email = 'proprio.site@exemple.test'")).rows[0];
  Dm._proprietaire(async () => ({ id: idp.id, email: idp.email }));
  try {
    const l = await mesDemandes(proprio); assert.equal(l.code, 200);
    assert.ok(!l.body.demandes.some(x => x.cle === cle), 'la liste du site ne contient pas la demande de la Carte');
    assert.equal((await mesDemandes(proprio, { q: '?cle=' + cle })).code, 404, 'ni son détail');
  } finally { Dm._proprietaire(async () => null); }
});

test('écrire à une Carte : champs, pièges à robots, même origine ; rien n\'est gardé à tort', opts, async () => {
  const c = await connecter('ecrire.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton, avant = (await demandesDe('ecrire.une@exemple.test')).length;
  const k = await deposer(jeton, visiteur({ email: 'pas-une-adresse', message: 'trop court', consentement: false }));
  assert.equal(k.code, 422); assert.deepEqual(Object.keys(k.body.champs).sort(), ['consentement', 'email', 'message']); assert.match(k.body.champs.consentement, /la personne/);
  assert.deepEqual((await deposer(jeton, visiteur({ site_web: 'http://robot.test' }))).body, { ok: true }, 'piège rempli : « reçu »');
  assert.deepEqual((await deposer(jeton, visiteur({ duree: 200 }))).body, { ok: true }, 'trop rapide : « reçu »');
  assert.equal((await deposer(jeton, visiteur({ message: 'Un autre message assez long pour passer.' }), { headers: { origin: 'https://ailleurs.test' } })).code, 403, 'autre origine');
  assert.equal((await deposer(jeton, 'pas du json', { headers: { 'content-type': 'text/plain' } })).code, 415);
  assert.equal((await demandesDe('ecrire.une@exemple.test')).length, avant, 'aucune demande de plus');
  assert.equal((await deposer('A'.repeat(32), visiteur())).code, 404, 'jeton inconnu');
});

test('écrire à une Carte : 3 par adresse IP et 10 minutes, 20 par Carte et par jour', opts, async () => {
  /* compteurs remis à zéro, en base ET en mémoire (une base simulée sans table plus haut fait compter en mémoire une minute) */
  await pool.query('truncate quotas'); Qm._oublier();
  const c = await connecter('ecrire.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton;
  for (let i = 0; i < 3; i++) assert.equal((await deposer(jeton, visiteur({ email: 'ip' + i + '@exemple.test' }), { ip: '203.0.113.250' })).code, 200, 'ip ' + i);
  const r = await deposer(jeton, visiteur({ email: 'ip9@exemple.test' }), { ip: '203.0.113.250' });
  assert.equal(r.code, 429); assert.ok(Number(r.h['retry-after']) > 0);
  for (let i = 3; i < 20; i++) assert.equal((await deposer(jeton, visiteur({ email: 'b' + i + '@exemple.test' }))).code, 200, 'demande ' + i);
  assert.equal((await deposer(jeton, visiteur({ email: 'b99@exemple.test' }))).code, 429, 'la 21e du jour : refusée, la personne n\'est pas submergée');
  await pool.query('truncate quotas');
});

test('écrire à une Carte : un e-mail en échec garde la demande, et « Renvoyer » l\'envoie à la personne, pas au site', opts, async () => {
  const c = await connecter('ecrire.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton;
  P._fetch(async () => ({ ok: false, status: 500 }));
  try { assert.equal((await deposer(jeton, visiteur({ email: 'echec@exemple.test' }))).code, 200, 'gardée malgré la panne'); } finally { P._fetch(fauxEnvoi); }
  const row = (await demandesDe('ecrire.une@exemple.test')).find(x => x.email === 'echec@exemple.test');
  assert.equal(row.email_statut, 'echec'); courriels = [];
  assert.equal((await mesDemandes(c, { method: 'POST', body: { action: 'renvoyer', cle: row.cle } })).code, 200);
  assert.deepEqual(courriels[0].to, ['ecrire.une@exemple.test']); assert.match(courriels[0].subject, /via votre Carte/);
});

test('écrire à une Carte : éteindre ou couper le lien ferme la porte tout de suite ; la boîte reste lisible', opts, async () => {
  const c = await connecter('ecrire.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton;
  assert.equal((await ecrire(c, { action: 'contact', actif: false })).body.lien.contact, false);
  assert.equal((await deposer(jeton, visiteur({ email: 'apres@exemple.test' }))).code, 404);
  await ecrire(c, { action: 'contact', actif: true }); await ecrire(c, { action: 'couper' });
  assert.equal((await deposer(jeton, visiteur({ email: 'apres2@exemple.test' }))).code, 404, 'lien coupé : plus personne ne peut écrire');
  assert.equal((await mesDemandes(c)).code, 200, 'les demandes déjà reçues restent dans son AI');
  const n = await ecrire(c, { action: 'publier', consentement: true }); assert.equal(n.body.lien.contact, false, 'un nouveau lien repart éteint');
});

test('écrire à une Carte : sans la migration 2026-10-25-12, le lien marche, le contact est dit indisponible, rien n\'est déposé', opts, async () => {
  const c = await connecter('ecrire.une@exemple.test'), jeton = (await lire(c)).body.lien.jeton;
  const faux = { query: async (sql, v) => { if (/\bcontact\b/.test(sql) && /cartes_liens|\bl\./.test(sql)) { const e = new Error('column "contact" does not exist'); e.code = '42703'; throw e; } return pool.query(sql, v); } };
  H._db(faux); P._db(faux);
  try {
    const g = await lire(c); assert.equal(g.code, 200); assert.equal(g.body.contact, 'indisponible'); assert.ok(g.body.lien, 'le lien est toujours là');
    assert.equal((await ecrire(c, { action: 'contact', actif: true })).code, 503);
    const v = await publique(jeton); assert.equal(v.code, 200); assert.equal(v.body.contact, false);
    assert.equal((await deposer(jeton, visiteur({ email: 'sans12@exemple.test' }))).code, 404);
  } finally { H._db(undefined); P._db(undefined); }
});
