// Le Dock et les pages d'un vrai projet suivent la même règle (test réel du 24/10, point 2), contre une vraie base PostgreSQL de test.
// Pour chaque rôle : 1) toute entrée du Dock est autorisée (sa page répond 200) ; 2) toute page servie est autorisée et a un chemin visible
// (ici : sa place dans le Dock) ; 3) toute autre page répond 404 par son adresse, comme pour quelqu'un qui n'est pas membre.
// docs/GABARITS.md § 5.3 : le prestataire et le parent ont une page Personnes réduite (lui-même, l'organisation, des effectifs sans noms) ;
// l'invité ne voit que lui-même. Lancé seulement si TEST_DATABASE_URL est défini.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8777';
let A, E, PG, liens = [], pool, ipn = 0;
function appel(fn, req) { return new Promise(d => { const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; fn(Object.assign({ headers: {} }, req), res); }); }
const post = (body, cookie) => appel(E.default, { method: 'POST', body, headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}) });
const page = (espace, gabarit, cookie) => appel(PG.default, { method: 'GET', url: '/api/page?espace=' + encodeURIComponent(espace) + '&gabarit=' + gabarit, headers: cookie ? { cookie } : {} });
async function connecter(email, nom) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ipn) }, body: JSON.stringify({ email, callbackURL: '/projets/' }) }));
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ipn) } }));
  const c = r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
  await pool.query('update "user" set name = $1 where email = $2', [nom, email]); return c;
}
const AUTRES = ['deroule', 'documents', 'messages', 'regie', 'admin', '__proto__', ''];
const S = {}; let projet;
before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); PG = await import('../api/page.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade').catch(async () => { await pool.query('truncate "user", spaces, invitations, live_journal cascade'); });
  S.owner = await connecter('o@exemple.test', 'Léa');
  projet = (await post({ action: 'creer', titre: 'Mariage de preuve', modele: 'mariage', origine: 'preuve-dock-0001' }, S.owner)).body.id;
  for (const [role, email, nom, relation] of [['editor', 'c@exemple.test', 'Camille', 'coordinatrice'], ['contributor', 'p@exemple.test', 'Nora', 'photographe'], ['viewer', 'v@exemple.test', 'Paul', 'parent'], ['guest', 'g@exemple.test', 'Lucie', 'invité']]) {
    S[role] = await connecter(email, nom);
    const inv = await post({ action: 'inviter', espace: projet, role, email, relation }, S.owner);
    await post({ action: 'rejoindre', jeton: new URL(inv.body.lien).searchParams.get('invitation') }, S[role]);
  }
  S.dehors = await connecter('x@exemple.test', 'Xavier');
});
after(async () => { if (pool) await pool.end(); });

for (const role of ['owner', 'editor', 'contributor', 'viewer', 'guest']) {
  test('Dock et pages · ' + role + ' : chaque entrée du Dock est autorisée, chaque page servie est dans le Dock, les autres répondent 404', opts, async () => {
    const acces = await page(projet, 'acces', S[role]); assert.equal(acces.code, 200);
    const lieux = acces.body.dock.lieux.map(l => l.gabarit);
    for (const g of lieux) assert.equal((await page(projet, g, S[role])).code, 200, role + ' : l\'entrée « ' + g + ' » du Dock est autorisée');
    const SERVIS = (await import('../api/_auth/pages.mjs')).SERVIS;
    for (const g of SERVIS) { const r = await page(projet, g, S[role]); if (r.code === 200) assert.ok(lieux.includes(g), role + ' : la page « ' + g + ' » est servie, elle a donc un chemin visible dans le Dock'); else assert.equal(r.code, 404, role + ' : « ' + g + ' » refusée = 404'); }
    for (const g of AUTRES) assert.ok([400, 404].includes((await page(projet, g, S[role])).code), role + ' : « ' + g + ' » n\'existe pas pour lui');
    for (const x of acces.body.dock.plus) assert.ok(lieux.includes(x.gabarit), role + ' : le geste « ' + x.id + ' » mène à une page de son Dock');
  });
}

test('Dock et pages · quelqu\'un qui n\'est pas membre : 404 partout, sans Dock', opts, async () => {
  for (const g of ['acces', 'journal', 'personnes', ...AUTRES]) { const r = await page(projet, g, S.dehors); assert.ok([400, 404].includes(r.code), g); assert.ok(!r.body.dock); }
});

test('Personnes selon § 5.3 : le prestataire et le parent voient eux-mêmes, l\'organisation et des effectifs sans noms ; l\'invitée ne voit qu\'elle-même', opts, async () => {
  for (const role of ['contributor', 'viewer']) {
    const p = await page(projet, 'personnes', S[role]), liste = p.body.blocs.find(b => b.type === 'liste'), noms = liste.personnes.map(x => x.nom).sort();
    assert.ok(noms.includes('Léa') && noms.includes('Camille'), role + ' : l\'organisation');
    assert.ok(!noms.includes('Lucie') && !(role === 'viewer' && noms.includes('Nora')) && !(role === 'contributor' && noms.includes('Paul')), role + ' : aucun autre prestataire ni invité nommé');
    assert.ok(p.body.blocs.some(b => b.type === 'effectif'), role + ' : des effectifs, sans noms');
    assert.ok(!p.body.blocs.some(b => b.id === 'personnes-inviter' || b.type === 'invitations'), role + ' : ni invitations ni geste « Inviter »');
  }
  const g = await page(projet, 'personnes', S.guest);
  assert.deepEqual(g.body.blocs.map(b => b.type), ['personne']); assert.equal(g.body.blocs[0].moi, true);
});

test('Journal : la relation plutôt que le rôle ; « Vous avez retiré une personne du projet » ; jamais « de l\'organisation » dans un mariage', opts, async () => {
  let j = await page(projet, 'journal', S.owner), t = j.body.blocs.map(b => b.texte).join('\n');
  assert.match(t, /Nora a rejoint le projet comme photographe/); assert.match(t, /Camille a rejoint le projet comme coordinatrice/);
  assert.match(t, /vous avez préparé une invitation \(photographe\)/);
  const idP = (await pool.query('select id from "user" where email = $1', ['p@exemple.test'])).rows[0].id;
  await post({ action: 'retirer', espace: projet, membre: idP }, S.owner);
  j = await page(projet, 'journal', S.owner); t = j.body.blocs.map(b => b.texte).join('\n');
  assert.match(t, /vous avez retiré (Nora|une personne) du projet\./); assert.ok(!/Vous a retiré/.test(t));
  assert.ok(!/, (Une personne|Vous) /.test(t), 'après « Le 24 octobre, », pas de majuscule');
  for (const role of ['owner', 'editor', 'viewer', 'guest']) for (const g of ['acces', 'journal', 'personnes']) {
    const r = await page(projet, g, S[role]); assert.ok(!/de l'organisation/.test(JSON.stringify(r.body.blocs)), role + ' / ' + g);
  }
});
