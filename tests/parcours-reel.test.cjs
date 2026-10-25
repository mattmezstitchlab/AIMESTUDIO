// Le parcours réel avec deux comptes (brief unique du 24/10, PR B), contre une vraie base PostgreSQL de test, comme en intégration continue :
// créer (sans doublon), se reconnecter et retrouver son projet, inviter avec une relation, accepter, voir chacun sa perspective et son Dock,
// une modification autorisée, des refus, retirer l'accès, une date de fin dépassée ; le journal et les noms selon la portée.
// Lancé seulement si TEST_DATABASE_URL est défini (jamais la preview ni la production).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8775';
let A, E, PG, liens = [], pool, ipn = 0;

function appel(fn, req) { return new Promise(d => { const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; fn(Object.assign({ headers: {} }, req), res); }); }
const post = (body, cookie) => appel(E.default, { method: 'POST', body, headers: Object.assign({ 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' }, cookie ? { cookie } : {}) });
const page = (espace, gabarit, cookie) => appel(PG.default, { method: 'GET', url: '/api/page?espace=' + encodeURIComponent(espace) + '&gabarit=' + gabarit, headers: cookie ? { cookie } : {} });
async function connecter(email, nom) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '198.51.100.' + (++ipn) }, body: JSON.stringify({ email, name: nom, callbackURL: '/projets/' }) }));
  assert.equal(r.status, 200);
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '198.51.100.' + (++ipn) } }));
  const c = r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
  if (nom) await pool.query('update "user" set name = $1 where email = $2', [nom, email]);
  return c;
}
const idDe = async email => (await pool.query('select id from "user" where email = $1', [email])).rows[0].id;
const jeton = lien => new URL(lien).searchParams.get('invitation');
const textes = r => (r.body.blocs || []).map(b => b.texte || '').join(' | ');

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); PG = await import('../api/page.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade').catch(async () => { await pool.query('truncate "user", spaces, invitations, live_journal cascade'); });
  await pool.query('truncate quotas').catch(() => {});   /* les quotas partagés (migration 06) : chaque passe repart de zéro */
});
after(async () => { if (pool) await pool.end(); });

const S = {}; let projet;
test('réel · A crée son projet depuis une origine ; recréer la même origine rend le même projet, sans doublon', opts, async () => {
  S.a = await connecter('alice@exemple.test', 'Alice Martin');
  const r1 = await post({ action: 'creer', titre: 'Mariage de Léa & Marc', modele: 'mariage', origine: 'essai-0001-aulnes' }, S.a);
  assert.equal(r1.code, 200); projet = r1.body.id; assert.equal(r1.body.role, 'owner');
  const r2 = await post({ action: 'creer', titre: 'Mariage de Léa & Marc', modele: 'mariage', origine: 'essai-0001-aulnes' }, S.a);
  assert.equal(r2.body.id, projet, 'même origine : même projet'); assert.equal(r2.body.existant, true);
  const [x, y] = await Promise.all([1, 2].map(() => post({ action: 'creer', titre: 'Séminaire', modele: 'seminaire', origine: 'essai-0002-simultane' }, S.a)));
  assert.equal(x.body.id, y.body.id, 'deux envois simultanés : un seul projet');
  const { rows } = await pool.query("select count(*)::int as n from spaces where data->>'origine' = 'essai-0001-aulnes'"); assert.equal(rows[0].n, 1);
  assert.equal((await post({ action: 'creer', titre: 'X', origine: 'court' }, S.a)).code, 400, 'une origine invalide est refusée');
});

test('réel · A ferme son navigateur et se reconnecte : il retrouve le même projet dans Mes projets, avec son Dock', opts, async () => {
  const ancien = S.a; S.a = await connecter('alice@exemple.test');
  assert.notEqual(S.a, ancien, 'une nouvelle session');
  const mes = await post({ action: 'mes' }, S.a);
  assert.ok(mes.body.espaces.some(e => e.id === projet && e.role === 'owner' && e.modele === 'mariage'));
  const p = await page(projet, 'acces', S.a);
  assert.equal(p.code, 200); assert.ok(p.body.dock && p.body.dock.reel); assert.equal(p.body.dock.lieux[0].gabarit, 'acces');
  assert.deepEqual(p.body.dock.plus.map(g => g.id), ['inviter', 'engagement'], 'le propriétaire peut inviter et s\'engager (V1, P6)');
});

test('réel · A invite B avec la relation « témoin » ; B accepte et voit sa perspective et son Dock', opts, async () => {
  S.b = await connecter('bruno@exemple.test', 'Bruno');
  const inv = await post({ action: 'inviter', espace: projet, role: 'contributor', email: 'bruno@exemple.test', relation: 'Témoin' }, S.a);
  assert.equal(inv.code, 200); assert.equal(inv.body.relation, 'témoin'); assert.match(inv.body.lien, /\/projets\/\?invitation=/);
  const j = await post({ action: 'rejoindre', jeton: jeton(inv.body.lien) }, S.b);
  assert.equal(j.code, 200); assert.equal(j.body.espace, projet); assert.equal(j.body.role, 'contributor');
  const p = await page(projet, 'acces', S.b);
  assert.equal(p.code, 200); assert.equal(p.body.blocs.find(b => b.id === 'acces-role').relation, 'témoin', 'la relation nomme le rôle');
  assert.match(textes(p), /Vous êtes témoin du mariage/); assert.ok(!/prestataire/.test(textes(p))); assert.equal(p.body.mots.role, 'Témoin', 'l\'en-tête nomme la relation');
  assert.ok(p.body.dock && p.body.dock.reel && !p.body.dock.plus.some(g => g.id === 'inviter'), 'le Dock de B : aucun geste d\'invitation');
  assert.equal(p.body.blocs.find(b => b.id === 'acces-signaler').aide, 'Le propriétaire lira votre message, pas votre nom.');
  const pers = await page(projet, 'personnes', S.a);
  assert.ok(pers.body.blocs.find(b => b.type === 'liste').personnes.some(x => x.nom === 'Bruno' && x.relation === 'témoin'));
  assert.ok(pers.body.blocs.find(b => b.id === 'personnes-inviter').roles.find(r => r.role === 'contributor').suggestions.includes('fleuriste'), 'des relations proposées, sans droit');
  assert.equal((await post({ action: 'inviter', espace: projet, role: 'guest', relation: 'ami 2' }, S.a)).code, 400, 'une relation est un mot');
});

test('réel · une modification autorisée et des refus : le serveur décide à chaque geste', opts, async () => {
  assert.equal((await post({ action: 'inviter', espace: projet, role: 'viewer' }, S.a)).code, 200, 'le propriétaire invite un parent');
  assert.equal((await post({ action: 'inviter', espace: projet, role: 'guest' }, S.b)).code, 403, 'le témoin (contributor) n\'invite personne');
  assert.equal((await post({ action: 'retirer', espace: projet, membre: await idDe('alice@exemple.test') }, S.b)).code, 403, 'le témoin ne retire personne');
  const autre = (await post({ action: 'creer', titre: 'Projet de Bruno', modele: 'seminaire' }, S.b)).body.id;
  assert.equal((await page(autre, 'acces', S.a)).code, 404, 'A ne voit rien du projet de B');
  assert.equal((await page(projet, 'acces', null)).code, 401);
});

test('réel · A retire B : B reçoit 404 au rechargement ; le journal contient le retrait', opts, async () => {
  const idB = await idDe('bruno@exemple.test');
  assert.equal((await post({ action: 'retirer', espace: projet, membre: idB }, S.a)).code, 200);
  assert.equal((await page(projet, 'acces', S.b)).code, 404, 'plus d\'accès : la même réponse qu\'un espace inconnu');
  assert.equal((await post({ action: 'mes' }, S.b)).body.espaces.some(e => e.id === projet), false);
  const jA = await page(projet, 'journal', S.a);
  assert.ok(jA.body.blocs.some(b => b.action === 'retrait'), 'le retrait est au journal');
});

test('réel · une date de fin dépassée : 404, fermeture au journal ; le nom d\'un accès échu disparaît, sauf pour le propriétaire', opts, async () => {
  S.e = await connecter('emma@exemple.test', 'Emma'); S.g = await connecter('gaspard@exemple.test', 'Gaspard');
  const fin = new Date(Date.now() + 5 * 864e5).toISOString();
  const ie = await post({ action: 'inviter', espace: projet, role: 'editor', email: 'emma@exemple.test', jusquau: fin, relation: 'coordinatrice' }, S.a);
  assert.equal((await post({ action: 'rejoindre', jeton: jeton(ie.body.lien) }, S.e)).code, 200);
  const pe = await page(projet, 'acces', S.e); assert.equal(pe.body.blocs.find(b => b.id === 'acces-fin').jusquau, fin, 'Mon accès montre la date de fin');
  const ig = await post({ action: 'inviter', espace: projet, role: 'viewer', email: 'gaspard@exemple.test', relation: 'parent' }, S.e);
  assert.equal(ig.code, 200, 'la coordination invite un parent (lecture)');
  assert.equal((await post({ action: 'rejoindre', jeton: jeton(ig.body.lien) }, S.g)).code, 200);
  assert.match(textes(await page(projet, 'acces', S.g)), /Emma vous a invité/, 'tant que son accès dure, Emma est nommée');
  const idE = await idDe('emma@exemple.test');
  await pool.query("update space_members set jusqu_au = now() - interval '1 second' where space_id = $1 and user_id = $2", [projet, idE]);
  assert.equal((await page(projet, 'acces', S.e)).code, 404, 'date de fin dépassée : plus d\'accès');
  const jA = await page(projet, 'journal', S.a);
  assert.ok(jA.body.blocs.some(b => b.action === 'fermeture'), 'la fermeture est au journal');
  const tg = textes(await page(projet, 'acces', S.g));
  assert.ok(!/Emma/.test(tg), 'le parent ne voit plus le nom d\'Emma'); assert.match(tg, /Une personne vous a invité/);
  assert.match(textes(jA), /Emma/, 'le propriétaire, lui, garde les noms');
});
