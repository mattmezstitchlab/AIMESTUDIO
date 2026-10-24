// La liste d'attente de la bêta (/api/attente), contre une vraie base PostgreSQL de test (migration 2026-10-24-05).
// Inscription, double inscription, consentement absent, champ piège, durée trop courte, valeurs hors liste, jeton expiré,
// désinscription en un clic, limite par adresse IP, et les compteurs du propriétaire (sans aucune adresse).
// La partie sans base (validation, jetons signés) tourne partout ; le reste seulement si TEST_DATABASE_URL est défini.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8780';
let A, AU, pool, courriers = [], ip = 0;

function appel(corps, o = {}) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null, h: this.h }); } };
    const req = { method: o.method || 'POST', url: o.url || '/api/attente', body: corps,
      headers: Object.assign({ origin: 'http://localhost:8780', host: 'localhost:8780', 'content-type': 'application/json', 'x-real-ip': o.ip || '198.51.100.' + (++ip % 250) }, o.headers || {}) };
    A.default(req, res);
  });
}
const bon = extra => Object.assign({ email: 'lea.beta@exemple.test', place: 'maries', consentement: true, souhaits: ['planb', 'programme'], souhait_libre: 'Un plan de table qui bouge tout seul', utm_source: 'instagram', utm_campaign: 'lancement-octobre', site_web: '', duree: 4200 }, extra || {});
const get = q => appel(undefined, { method: 'GET', url: '/api/attente?' + q });
const jetonDe = m => new URL(m.text.match(/https?:\/\/\S+\?jeton=\S+/)[0]).searchParams.get('jeton');
const retraitDe = m => new URL(m.text.match(/https?:\/\/\S+\?retrait=\S+/)[0]).searchParams.get('retrait');
const ligne = async email => (await pool.query('select * from liste_attente where lower(email) = lower($1)', [email])).rows[0];

before(async () => {
  A = await import('../api/attente.mjs');
  if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  AU = await import('../api/_auth/auth.mjs'); AU._envoyeur(() => {}); AU.auth(); pool = AU._pool();
  A._envoyeur(m => { courriers.push(m); });
  await pool.query('truncate liste_attente restart identity');
});
after(async () => { if (pool) await pool.end(); });

test('valider : la place vient de « Je suis… », les fonctions de attente/souhaits.json ; toute autre valeur est refusée', async () => {
  const S = require('../attente/souhaits.json').souhaits;
  assert.deepEqual(S.map(s => s.nom), ['Programme du jour', 'Plan B', 'Agenda partagé', 'Réponses des invités', 'Plan de table', 'Effectif et régimes',
    'Missions des prestataires', 'Documents et contrats', 'Budget privé', 'Messages ciblés', 'Rappels automatiques', 'Hébergement et trajets',
    'Site pour les invités', 'Photos partagées après le jour J', 'Liste de cadeaux'], 'les quinze fonctions, dans l\'ordre du brief');
  const icones = new Set(['cloche', 'bulle', 'projet', 'part', 'calendrier', 'coche', 'document', 'personnes', 'effectif', 'budget', 'deroule', 'mission', 'reponse', 'lieu', 'journal', 'signal', 'consentement', 'reglages', 'planb', 'export', 'controle', 'contenus', 'coeur', 'exemples', 'lab', 'compte', 'cadeau']);
  for (const s of S) { assert.ok(icones.has(s.icone), s.id + ' : une icône du Dock'); assert.ok(s.mot.length <= 13, s.id + ' : un mot court'); }
  const accueil = [...require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8').matchAll(/role="option"[^>]*data-value="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(A.PLACES, accueil, 'la même liste que « Je suis… » sur l\'accueil');
  assert.equal(A.valider(bon()).ok, true);
  assert.deepEqual(A.valider(bon({ souhaits: ['planb', 'planb', 'programme'] })).valeurs.souhaits, ['programme', 'planb'], 'sans doublon, dans l\'ordre de la liste');
  for (const [k, v] of [['souhaits', ['vol-en-montgolfiere']], ['souhaits', 'planb'], ['souhaits', [{}]], ['place', 'admin'], ['place', 'metier:astronaute'], ['email', 'pas-une-adresse'], ['consentement', 'true'], ['souhait_libre', 'x'.repeat(141)]])
    assert.equal(A.valider(bon({ [k]: v })).ok, false, k + ' = ' + JSON.stringify(v));
  assert.deepEqual([A.valider(bon({ utm_source: 's'.repeat(60) })).valeurs.source.length, A.valider(bon({ utm_source: '' })).valeurs.source], [40, null], 'utm : 40 caractères au plus');
});

test('lien de désinscription : signé, impossible à fabriquer pour un autre identifiant', async () => {
  const s = 'x'.repeat(40), j = A.jetonRetrait(128, s);
  assert.equal(A.lireRetrait(j, s), 128);
  assert.equal(A.lireRetrait(j.replace(/^[0-9a-z]+/, (129).toString(36)), s), null);
  assert.equal(A.lireRetrait(j, 'y'.repeat(40)), null); assert.equal(A.lireRetrait('3j.abc', s), null); assert.equal(A.jetonRetrait(1, 'court'), null);
});

test('inscription : un e-mail de confirmation (7 jours, « ignorez ce message », désinscription), rien de confirmé avant le clic', opts, async () => {
  const r = await appel(bon()); assert.equal(r.code, 200); assert.deepEqual(r.body, { ok: true });
  assert.equal(courriers.length, 1); const m = courriers[0];
  assert.equal(m.to, 'lea.beta@exemple.test'); assert.match(m.subject, /Confirmez votre inscription/);
  assert.match(m.html, /Confirmer mon inscription/); assert.match(m.text, /Si vous n'avez rien demandé, ignorez ce message\./); assert.match(m.text, /valable 7 jours/);
  assert.match(m.text, /\/beta\/\?retrait=/); assert.match(m.retraitApi, /\/api\/attente\?retrait=/, 'List-Unsubscribe (un clic)');
  const l = await ligne('lea.beta@exemple.test');
  assert.deepEqual([l.place, l.source, l.campagne, l.souhaits, l.souhait_libre, l.confirme_le], ['maries', 'instagram', 'lancement-octobre', ['programme', 'planb'], 'Un plan de table qui bouge tout seul', null]);
  assert.equal(l.jeton_hash, A.hacher(jetonDe(m)), 'seulement l\'empreinte du jeton'); assert.ok(!JSON.stringify(l).includes(jetonDe(m)));
  const c = await get('jeton=' + jetonDe(m)); assert.deepEqual(c.body, { ok: true, rang: 1 });
  assert.ok((await ligne('lea.beta@exemple.test')).confirme_le);
  assert.deepEqual((await get('jeton=' + jetonDe(m))).body, { ok: false, raison: 'invalide' }, 'un lien sert une fois');
});

test('double inscription : même réponse, aucune nouvelle ligne, pas de second e-mail avant 10 minutes, rien de changé une fois confirmée', opts, async () => {
  courriers = [];
  assert.deepEqual((await appel(bon({ email: 'Lea.Beta@Exemple.test', place: 'invite' }))).body, { ok: true }, 'confirmée : même réponse');
  assert.equal(courriers.length, 0); assert.equal((await ligne('lea.beta@exemple.test')).place, 'maries', 'une adresse confirmée ne se modifie pas de l\'extérieur');
  await appel(bon({ email: 'nora.beta@exemple.test', place: 'metier:photographe' })); assert.equal(courriers.length, 1);
  assert.deepEqual((await appel(bon({ email: 'NORA.beta@exemple.test', place: 'metier:photographe' }))).body, { ok: true }); assert.equal(courriers.length, 1, 'pas de second e-mail avant 10 minutes');
  assert.equal((await pool.query("select count(*)::int as n from liste_attente where lower(email) = 'nora.beta@exemple.test'")).rows[0].n, 1);
  await pool.query("update liste_attente set jeton_expire = now() + interval '7 days' - interval '11 minutes' where lower(email) = 'nora.beta@exemple.test'");
  await appel(bon({ email: 'nora.beta@exemple.test', place: 'metier:photographe' })); assert.equal(courriers.length, 2, 'après 10 minutes, un nouveau lien');
  assert.deepEqual((await get('jeton=' + jetonDe(courriers[0]))).body, { ok: false, raison: 'invalide' }, 'l\'ancien lien ne vaut plus');
  assert.equal((await get('jeton=' + jetonDe(courriers[1]))).body.rang, 2);
});

test('consentement absent, champ piège, durée trop courte, autre origine : rien n\'est écrit ni envoyé', opts, async () => {
  courriers = []; const avant = (await pool.query('select count(*)::int as n from liste_attente')).rows[0].n;
  const r = await appel(bon({ email: 'sans.accord@exemple.test', consentement: false })); assert.equal(r.code, 422); assert.ok(r.body.champs.consentement);
  assert.deepEqual((await appel(bon({ email: 'robot@exemple.test', site_web: 'https://spam.test' }))).body, { ok: true }, 'piège : « reçu », sans rien faire');
  assert.deepEqual((await appel(bon({ email: 'rapide@exemple.test', duree: 900 }))).body, { ok: true });
  assert.equal((await appel(bon({ email: 'ailleurs@exemple.test' }), { headers: { origin: 'https://ailleurs.test' } })).code, 403);
  assert.equal((await appel(bon({ email: 'x@exemple.test', souhaits: ['hors-liste'] }))).code, 422, 'une fonction hors liste est refusée');
  assert.equal((await pool.query('select count(*)::int as n from liste_attente')).rows[0].n, avant); assert.equal(courriers.length, 0);
});

test('jeton expiré : 410 « expire », rien de confirmé ; une nouvelle inscription renvoie un lien', opts, async () => {
  courriers = []; await appel(bon({ email: 'tard@exemple.test', place: 'coordination' })); const j = jetonDe(courriers[0]);
  await pool.query("update liste_attente set jeton_expire = now() - interval '1 minute' where email = 'tard@exemple.test'");
  assert.deepEqual((await get('jeton=' + j)).body, { ok: false, raison: 'expire' });
  assert.equal((await ligne('tard@exemple.test')).confirme_le, null);
  await appel(bon({ email: 'tard@exemple.test', place: 'coordination' })); assert.equal(courriers.length, 2);
  assert.equal((await get('jeton=' + jetonDe(courriers[1]))).body.ok, true);
  assert.deepEqual((await get('jeton=court')).body, { ok: false, raison: 'invalide' });
});

test('désinscription en un clic : la ligne est effacée (GET depuis la page, POST depuis la messagerie) ; un lien modifié ne fait rien', opts, async () => {
  courriers = []; await appel(bon({ email: 'part@exemple.test', place: 'invite' })); const r = retraitDe(courriers[0]);
  assert.equal((await get('retrait=' + r.replace(/.$/, c => (c === 'A' ? 'B' : 'A')))).code, 400);
  assert.ok(await ligne('part@exemple.test'));
  assert.deepEqual((await get('retrait=' + r)).body, { ok: true }); assert.equal(await ligne('part@exemple.test'), undefined, 'plus rien de l\'adresse');
  assert.deepEqual((await get('retrait=' + r)).body, { ok: true }, 'deux fois : même réponse');
  courriers = []; await appel(bon({ email: 'part2@exemple.test', place: 'invite' }));
  const u = new URL(courriers[0].retraitApi);
  assert.equal((await appel('List-Unsubscribe=One-Click', { method: 'POST', url: u.pathname + u.search, headers: { origin: undefined, 'content-type': 'application/x-www-form-urlencoded' } })).code, 200);
  assert.equal(await ligne('part2@exemple.test'), undefined);
});

test('5 envois par adresse IP et par heure', opts, async () => {
  A._reinitialiser(); const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await appel(bon({ email: 'ip' + i + '@exemple.test' }), { ip: '203.0.113.77' })).code);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});

test('compteurs : le propriétaire seulement (404 sinon), sans aucune adresse ; fonctions classées, toutes places puis par place', opts, async () => {
  A._proprietaire(async () => null); assert.equal((await get('stats=1')).code, 404);
  A._proprietaire(async () => { throw new Error('panne'); }); assert.equal((await get('stats=1')).code, 404);
  A._proprietaire(async () => ({ id: 'proprio' }));
  courriers = []; A._reinitialiser();
  await appel(bon({ email: 'chef@exemple.test', place: 'metier:traiteur', souhaits: ['effectif', 'documents'], souhait_libre: 'Les allergies par table', utm_source: 'linkedin' }));
  await get('jeton=' + jetonDe(courriers[0]));
  const s = (await get('stats=1')).body; A._proprietaire(null);
  assert.equal(s.ok, true); assert.ok(s.confirmes >= 4);
  assert.ok(!/@/.test(JSON.stringify(s)), 'aucune adresse dans les compteurs');
  assert.ok(s.parPlace.some(x => x.cle === 'metier:traiteur' && x.n === 1)); assert.ok(s.parSource.some(x => x.cle === 'linkedin'));
  assert.equal(s.souhaits[0].cle, 'planb', 'le plus attendu en premier');
  assert.deepEqual(s.souhaitsParPlace.filter(x => x.place === 'metier:traiteur').map(x => x.cle), ['documents', 'effectif']);
  assert.ok(s.libres.some(x => x.texte === 'Les allergies par table' && x.place === 'metier:traiteur' && /^\d{4}-\d{2}-\d{2}$/.test(x.jour)));
  assert.ok(s.parJour.length >= 1);
});

test('sans la table (migration pas encore appliquée) : 503, jamais 500', opts, async () => {
  A._db({ query: async () => { const e = new Error('relation "liste_attente" does not exist'); e.code = '42P01'; throw e; } });
  try { A._reinitialiser(); assert.equal((await appel(bon({ email: 'avant@exemple.test' }))).code, 503); assert.equal((await get('jeton=' + 'a'.repeat(43))).code, 503); }
  finally { A._db(null); }
});
