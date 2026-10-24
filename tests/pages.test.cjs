// Les gabarits du lot 1 composés par le serveur (docs/GABARITS.md § 12) : on lit la RÉPONSE BRUTE de /api/page, rôle par rôle,
// contre une vraie base PostgreSQL de test. Lancé seulement si TEST_DATABASE_URL est défini (jamais la preview ni la production).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8774';
let A, E, G, PG, liens = [], pool, ipn = 0;

async function post(body, cookie) { let res; const p = new Promise(d => { res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; });
  await E.default({ method: 'POST', body, headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}) }, res); return p; }
async function page(espace, gabarit, cookie) { let res; const p = new Promise(d => { res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, h: this.h, body: t ? JSON.parse(t) : null, brut: t || '' }); } }; });
  await PG.default({ method: 'GET', url: '/api/page?espace=' + encodeURIComponent(espace) + '&gabarit=' + encodeURIComponent(gabarit), headers: cookie ? { cookie } : {} }, res); return p; }
async function connecter(email, nom) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '203.0.113.' + (++ipn) }, body: JSON.stringify({ email, name: nom, callbackURL: '/compte/' }) }));
  assert.equal(r.status, 200);
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '203.0.113.' + (++ipn) } }));
  const c = r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
  if (nom) await pool.query('update "user" set name = $1 where email = $2', [nom, email]);
  return c;
}
async function rejoindre(espace, role, qui, inviteur) {
  const r = await post({ action: 'inviter', espace, role }, inviteur); assert.equal(r.code, 200, 'inviter ' + role);
  const j = await post({ action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, qui); assert.equal(j.code, 200); return j;
}

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); PG = await import('../api/page.mjs'); G = await import('../api/_auth/pages.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade').catch(async () => { await pool.query('truncate "user", spaces, invitations, live_journal cascade'); });
});
after(async () => { if (pool) await pool.end(); });

const P = {}; let mariage, autre;
test('pages · le mariage de preuve : un couple, une coordination, un prestataire, un parent, une invitée ; un autre projet', opts, async () => {
  P.lea = await connecter('lea@exemple.test', 'Léa Martin'); P.camille = await connecter('camille@exemple.test', 'Camille');
  P.lumen = await connecter('lumen@exemple.test', 'Studio Lumen'); P.paul = await connecter('paul@exemple.test', 'Paul');
  P.lucie = await connecter('lucie@exemple.test', 'Lucie'); P.nina = await connecter('nina@exemple.test', 'Nina');
  mariage = (await post({ action: 'creer', titre: 'Léa & Marc', modele: 'mariage' }, P.lea)).body.id;
  await rejoindre(mariage, 'editor', P.camille, P.lea); await rejoindre(mariage, 'contributor', P.lumen, P.lea);
  await rejoindre(mariage, 'viewer', P.paul, P.lea); await rejoindre(mariage, 'guest', P.lucie, P.camille);
  autre = (await post({ action: 'creer', titre: 'Projet secret de Nina', modele: 'seminaire' }, P.nina)).body.id;
  await post({ action: 'inviter', espace: mariage, role: 'contributor', email: 'traiteur@exemple.test' }, P.lea);   /* une invitation en cours que la coordination ne doit pas voir */
  await post({ action: 'inviter', espace: mariage, role: 'guest', email: 'oncle@exemple.test' }, P.camille);        /* celle-ci, si */
});

test('pages · la route : 401 sans session, 400 gabarit inconnu, 404 gabarit non servi ou espace d\'un autre, no-store', opts, async () => {
  assert.equal((await page(mariage, 'acces')).code, 401);
  assert.equal((await page(mariage, 'inconnu', P.lea)).code, 400);
  assert.equal((await page(mariage, 'projet', P.lea)).code, 404, 'Projet n\'est pas servi au lot 1');
  const r = await page(autre, 'acces', P.lea); assert.equal(r.code, 404); assert.equal(r.body.raison, 'Espace introuvable.');
  assert.equal((await page('pas-un-uuid', 'acces', P.lea)).code, 404);
  assert.equal((await page(mariage, 'acces', P.lea)).h['cache-control'], 'no-store');
});

test('pages · Mon accès : chacun reçoit son rôle et sa fin, jamais ceux des autres ; le signalement est toujours là', opts, async () => {
  const attendu = { lea: 'owner', camille: 'editor', lumen: 'contributor', paul: 'viewer', lucie: 'guest' };
  for (const [k, role] of Object.entries(attendu)) {
    const r = await page(mariage, 'acces', P[k]); assert.equal(r.code, 200, k);
    const roles = r.body.blocs.filter(b => b.type === 'role'); assert.equal(roles.length, 1); assert.equal(roles[0].role, role, k);
    assert.ok(r.body.blocs.some(b => b.id === 'acces-signaler'), k + ' : « Je vois un accès inattendu » jamais masqué');
    assert.ok(r.body.blocs.some(b => b.id === 'acces-fin'), k + ' : sa fin');
    for (const [k2, r2] of Object.entries(attendu)) if (k2 !== k && r2 !== role) assert.ok(!r.brut.includes('"role":"' + r2 + '"'), k + ' ne reçoit pas le rôle de ' + k2);
    assert.ok(!/@exemple\.test/.test(r.brut), k + ' : aucune adresse dans Mon accès');
  }
  const lucie = await page(mariage, 'acces', P.lucie);
  assert.ok(!lucie.body.blocs.some(b => b.type === 'compte'), 'l\'invitée ne reçoit pas le nombre de membres');
  assert.ok(!/Camille/.test(lucie.brut), 'l\'invitée ne connaît pas le nom de qui l\'a invitée (hors de sa portée)');
  const lumen = await page(mariage, 'acces', P.lumen); assert.match(lumen.brut, /Léa Martin vous a invité/, 'le prestataire voit que le couple l\'a invité');
  assert.match(lumen.body.blocs.find(b => b.type === 'role').texte, /prestataire du mariage « Léa & Marc »/);
});

test('pages · un rôle échu reçoit 404 et la fermeture est inscrite une seule fois', opts, async () => {
  const p2 = await post({ action: 'membres', espace: mariage }, P.lea), paulId = p2.body.membres.find(m => m.role === 'viewer').id;
  await pool.query("update space_members set jusqu_au = now() - interval '1 minute' where space_id = $1 and user_id = $2", [mariage, paulId]);
  assert.equal((await page(mariage, 'acces', P.paul)).code, 404); assert.equal((await page(mariage, 'journal', P.paul)).code, 404);
  const { rows } = await pool.query("select count(*)::int as n from audit where space_id = $1 and action = 'fermeture' and detail->>'cible' = $2", [mariage, paulId]);
  assert.equal(rows[0].n, 1, 'une seule ligne de fermeture');
});

test('pages · Personnes : l\'invitée ne voit qu\'elle ; le prestataire, aucun invité ; les adresses, à soi et au propriétaire', opts, async () => {
  const lucie = await page(mariage, 'personnes', P.lucie);
  for (const n of ['Léa Martin', 'Camille', 'Studio Lumen', 'Paul']) assert.ok(!lucie.brut.includes(n), 'l\'invitée ne reçoit pas ' + n);
  assert.ok(!/effectif/.test(lucie.brut), 'aucun effectif pour l\'invitée');
  const lumen = await page(mariage, 'personnes', P.lumen);
  assert.ok(!lumen.brut.includes('Lucie'), 'le prestataire ne reçoit aucun nom d\'invité'); assert.ok(lumen.brut.includes('Léa Martin') && lumen.brut.includes('Camille'), 'il voit l\'organisation');
  assert.ok(lumen.body.blocs.some(b => b.type === 'effectif'), 'des effectifs sans noms');
  for (const k of ['camille', 'lumen', 'lucie']) { const r = await page(mariage, 'personnes', P[k]); const adr = r.brut.match(/[a-z]+@exemple\.test/g) || [];
    assert.ok(adr.every(a => a === k + '@exemple.test'), k + ' : aucune adresse hors de la sienne'); }
  const lea = await page(mariage, 'personnes', P.lea); assert.ok(lea.brut.includes('lumen@exemple.test'), 'le propriétaire gère les membres');
  assert.ok(lea.body.blocs.some(b => b.id === 'personnes-inviter'));
  assert.ok(!lumen.body.blocs.some(b => b.id === 'personnes-inviter'), 'pas de geste Inviter pour un prestataire');
});

test('pages · Personnes : la coordination ne reçoit que les invitations qu\'elle peut émettre (viewer, guest)', opts, async () => {
  const r = await page(mariage, 'personnes', P.camille), inv = r.body.blocs.find(b => b.type === 'invitations').invitations;
  assert.ok(inv.length >= 1); assert.ok(inv.every(i => ['viewer', 'guest'].includes(i.role)), 'aucune invitation contributor ni editor');
  assert.ok(!r.brut.includes('traiteur@exemple.test'));
  const g = r.body.blocs.find(b => b.id === 'personnes-inviter'); assert.deepEqual(g.roles.map(x => x.role), ['viewer', 'guest']);
});

test('pages · gestes : un geste non accordé, appelé directement, est refusé ; signaler est limité à 5 par jour', opts, async () => {
  assert.equal((await post({ action: 'inviter', espace: mariage, role: 'guest' }, P.lumen)).code, 403, 'le prestataire n\'invite pas');
  assert.equal((await post({ action: 'inviter', espace: mariage, role: 'contributor' }, P.camille)).code, 403, 'au-delà de son rang');
  for (let i = 0; i < 5; i++) assert.equal((await post({ action: 'signaler', espace: mariage, motif: 'essai ' + i }, P.lucie)).code, 200);
  assert.equal((await post({ action: 'signaler', espace: mariage }, P.lucie)).code, 429);
});

test('pages · Journal : chacun ses lignes ; aucun nom hors de sa portée ; l\'auteur d\'un signalement est protégé', opts, async () => {
  const lucie = await page(mariage, 'journal', P.lucie);
  assert.ok(lucie.body.blocs.length > 0); for (const n of ['Camille', 'Léa Martin', 'Studio Lumen', 'Paul']) assert.ok(!lucie.brut.includes(n), 'l\'invitée ne lit pas ' + n);
  assert.ok(lucie.body.blocs.some(b => b.action === 'signalement' && b.moi), 'l\'auteur voit sa propre ligne');
  const lumen = await page(mariage, 'journal', P.lumen);
  assert.ok(!lumen.brut.includes('Lucie') && !lumen.body.blocs.some(b => b.action === 'signalement'), 'le prestataire ne lit pas les lignes des autres');
  const lea = await page(mariage, 'journal', P.lea), sig = lea.body.blocs.filter(b => b.action === 'signalement');
  assert.equal(sig.length, 5); assert.ok(sig.every(b => !b.moi && /^\d{4}-\d{2}-\d{2}$/.test(b.le)), 'jour seulement, pas l\'heure');
  const { rows } = await pool.query('select id from "user" where email = $1', ['lucie@exemple.test']);
  assert.ok(!lea.brut.includes(rows[0].id), 'le journal du propriétaire ne contient pas l\'identifiant de l\'autrice');
  assert.ok(!sig.some(b => /Lucie|invité/i.test(b.texte)), 'ni son nom ni son rôle dans la phrase');
});

test('pages · deux projets : aucune donnée d\'un autre espace dans aucune réponse', opts, async () => {
  for (const k of ['lea', 'camille', 'lumen', 'lucie']) for (const g of ['acces', 'journal', 'personnes']) {
    const r = await page(mariage, g, P[k]); assert.ok(!r.brut.includes('Projet secret') && !r.brut.includes('Nina') && !r.brut.includes(autre), k + ' / ' + g); }
  const n = await page(autre, 'personnes', P.nina); assert.ok(!n.brut.includes('Léa') && !n.brut.includes('mariage'), 'Nina ne reçoit rien du mariage');
});

test('pages · public : sans compte, rien du lot 1 n\'est publié', opts, async () => {
  for (const g of ['acces', 'journal', 'personnes']) { const r = await G.projeter(pool, null, { espace: mariage, gabarit: g }); assert.deepEqual(r.blocs, []); assert.ok(r.public); }
});

test('pages · la projection n\'invente aucun droit : chaque verbe de Mon accès est adossé à permissions.js', opts, async () => {
  const lucie = await page(mariage, 'acces', P.lucie), v = lucie.body.blocs.find(b => b.type === 'gestes').verbes;
  assert.ok(v.includes('lire le programme') && !v.some(x => /inviter|gérer|supprimer|déposer|effectifs/.test(x)), 'une invitée lit, c\'est tout');
  const cam = await page(mariage, 'acces', P.camille), vc = cam.body.blocs.find(b => b.type === 'gestes').verbes;
  assert.ok(vc.some(x => x === 'inviter des lecteurs et des invités'), 'la coordination invite lecteurs et invités'); assert.ok(!vc.includes('supprimer le projet'));
});

test('pages · le Dock de la réponse est composé au serveur (composerReel) : Mon accès en tête, Inviter seulement si accordé', opts, async () => {
  const d = async q => (await page(mariage, 'acces', q)).body.dock;
  const lea = await d(P.lea), cam = await d(P.camille), lumen = await d(P.lumen), lucie = await d(P.lucie);
  for (const k of [lea, cam, lumen, lucie]) { assert.ok(k && k.reel && !k.public, 'un vrai Dock'); assert.equal(k.lieux[0].gabarit, 'acces'); assert.equal(k.inattendu, true); assert.ok(!k.mention.includes('Démonstration'));
    assert.ok(k.lieux.every(l => ['acces', 'journal', 'personnes'].includes(l.gabarit)), 'seulement les gabarits servis'); }
  assert.deepEqual(lea.plus.map(a => a.id), ['inviter']); assert.deepEqual(lea.plus[0].roles, ['editor', 'contributor', 'viewer', 'guest']);
  assert.deepEqual(cam.plus[0].roles, ['viewer', 'guest'], 'la coordination n\'invite que lecteurs et invités');
  assert.deepEqual(lumen.plus, [], 'le prestataire n\'invite personne'); assert.deepEqual(lucie.lieux.map(l => l.gabarit), ['acces'], 'l\'invitée : Mon accès seulement');
  assert.ok(!JSON.stringify(lucie).includes('Personnes') && !JSON.stringify(lucie).includes('Inviter'), 'aucune entrée interdite, même en texte');
  assert.equal((await G.projeter(pool, null, { espace: mariage, gabarit: 'acces' })).dock, null, 'le public n\'a pas de Dock de projet');
});
