// Comptes, espaces, invitations et direct réel — contre une VRAIE base PostgreSQL locale de test.
// Lancé seulement si TEST_DATABASE_URL est défini (jamais la base de preview ni de production).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8773';
let A, E, C, liens = [], pool, ipn = 0;

function reponse() { return new Promise(done => { const r = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, getHeader(k) { return this.h[k.toLowerCase()]; },
  status(c) { this.statusCode = c; return this; }, json(o) { done({ code: this.statusCode, body: o }); }, end(t) { done({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; r.done = done; return r; }); }
async function appel(h, body, cookie) { let res; const p = new Promise(d => { res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { d({ code: this.statusCode, body: o }); }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; });
  await h({ method: 'POST', body, headers: Object.assign({ 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.' + Math.floor(Math.random() * 250) }, cookie ? { cookie } : {}) }, res); return p; }
async function connecter(email) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ipn) }, body: JSON.stringify({ email, callbackURL: '/compte/' }) }));
  assert.equal(r.status, 200, 'demande du lien'); assert.equal(liens.length, 1); assert.match(liens[0].html, /Me connecter à AIME/);
  const url = liens[0].text.match(/https?:\/\/\S+/)[0];
  r = await a.handler(new Request(url, { headers: { origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ipn) } }));
  assert.equal(r.status, 302); const c = r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
  assert.match(c, /aime\.session_token=/); return c;
}

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); C = require('../api/_live/core.js');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal cascade');
  C._base(() => (s, ...v) => pool.query(s.reduce((acc, x, i) => acc + '$' + i + x), v).then(r => r.rows)); C._reinitialiser();
});
after(async () => { if (pool) await pool.end(); });

let lea, camille, paul, nina, esp, invEditeur;
test('comptes · lien par e-mail : un seul usage, session par cookie', opts, async () => {
  lea = await connecter('lea@exemple.test'); camille = await connecter('camille@exemple.test'); paul = await connecter('paul@exemple.test'); nina = await connecter('nina@exemple.test');
  const r = await appel(E.default, { action: 'mes' }); assert.equal(r.code, 401, 'sans session : refusé');
});

test('espaces · créer, inviter par rôle, rejoindre une seule fois', opts, async () => {
  let r = await appel(E.default, { action: 'creer', titre: 'Mariage <b>test</b>', modele: 'mariage' }, lea); assert.equal(r.code, 200); esp = r.body.id;
  assert.equal(r.body.role, 'owner'); assert.equal(r.body.titre, 'Mariage <b>test</b>', 'texte gardé tel quel, échappé à l\'affichage');
  r = await appel(E.default, { action: 'inviter', espace: esp, role: 'editor' }, lea); assert.equal(r.code, 200); invEditeur = r.body.lien;
  const jeton = new URL(invEditeur).searchParams.get('invitation');
  const { rows } = await pool.query('select token_hash from invitations'); assert.notEqual(rows[0].token_hash, jeton, 'seule l\'empreinte est gardée');
  r = await appel(E.default, { action: 'rejoindre', jeton }, camille); assert.equal(r.code, 200); assert.equal(r.body.role, 'editor');
  r = await appel(E.default, { action: 'rejoindre', jeton }, paul); assert.equal(r.code, 410, 'un lien ne sert qu\'une fois');
});

test('espaces · les règles décident : la coordination n\'invite que lecteurs et invités ; un non-membre ne voit rien', opts, async () => {
  assert.equal((await appel(E.default, { action: 'inviter', espace: esp, role: 'contributor' }, camille)).code, 403);
  let r = await appel(E.default, { action: 'inviter', espace: esp, role: 'guest', email: 'nina@exemple.test' }, camille); assert.equal(r.code, 200);
  const jn = new URL(r.body.lien).searchParams.get('invitation');
  assert.equal((await appel(E.default, { action: 'rejoindre', jeton: jn }, paul)).code, 410, 'invitation nominative : pas pour une autre adresse');
  assert.equal((await appel(E.default, { action: 'rejoindre', jeton: jn }, nina)).code, 200);
  assert.equal((await appel(E.default, { action: 'membres', espace: esp }, paul)).code, 404, 'non-membre : comme si l\'espace n\'existait pas');
  assert.equal((await appel(E.default, { action: 'inviter', espace: esp, role: 'owner' }, lea)).code, 400, 'personne n\'invite un propriétaire');
});

test('espaces · adresses e-mail visibles du seul propriétaire ; garder un propriétaire', opts, async () => {
  let r = await appel(E.default, { action: 'membres', espace: esp }, camille);
  assert.equal(r.body.membres.length, 3); assert.ok(r.body.membres.filter(m => m.email).every(m => m.email === 'camille@exemple.test')); assert.equal(r.body.invitations, undefined);
  r = await appel(E.default, { action: 'membres', espace: esp }, lea); assert.ok(r.body.membres.every(m => m.email)); assert.equal(r.body.invitations.length, 2);
  const leaId = r.body.moi.id;
  assert.equal((await appel(E.default, { action: 'retirer', espace: esp, membre: leaId }, lea)).code, 409);
  assert.equal((await appel(E.default, { action: 'retirer', espace: esp, membre: leaId }, camille)).code, 403);
});

test('direct réel · la personne vient de la session, le rôle de l\'espace, l\'action est revérifiée', opts, async () => {
  const passe = require('../api/live/passe.js'), act = require('../api/live/act.js'), journal = require('../api/live/journal.js');
  assert.equal((await appel(passe, { espace: esp, qui: 'u-lea' })).code, 401, 'sans session');
  assert.equal((await appel(passe, { espace: esp }, paul)).code, 403, 'non-membre');
  const pc = (await appel(passe, { espace: esp, qui: 'quelquun-d-autre' }, camille)).body, pn = (await appel(passe, { espace: esp }, nina)).body.passe;
  assert.notEqual(pc.qui, 'quelquun-d-autre');
  let r = await appel(act, { passe: pc.passe, action: 'retarder', p: { moment: 'diner', minutes: 15, cascade: true } }); assert.equal(r.code, 200); assert.equal(r.body.touches.length, 5);
  r = await appel(act, { passe: pn, action: 'retarder', p: { moment: 'bal', minutes: 30 } }); assert.equal(r.code, 403, 'une invitée ne décale rien');
  await appel(act, { passe: pc.passe, action: 'annoncer', p: { texte: 'Équipe seulement', audience: 'equipe' } });
  r = await appel(journal, { passe: pn, depuis: 0 }); assert.equal(r.body.lignes.length, 1, 'l\'annonce d\'équipe ne sort pas vers l\'invitée');
  const acc = await appel(E.default, { action: 'acces', espace: esp }, nina); assert.equal(acc.body.modele, 'mariage'); assert.ok(acc.body.personnes.every(p => !('email' in p)));
  /* règle 2 : l'invitée ne reçoit que son nom ; la carte des rôles garde elle-même et qui agit dans son journal (sans nom) */
  assert.deepEqual(acc.body.personnes.map(p => p.id), [acc.body.moi.id]); assert.equal(Object.keys(acc.body.membres).length, 2, 'elle-même + la coordination qui a agi');
});

/* Refus par rôle × geste : chaque action de /api/espaces, pour chaque rôle et pour un non-membre.
   Codes attendus : 200 permis ; 403 refusé par la règle ; 404 non-membre (rien n'est révélé) ; 400 rôle inconnu. */
let M = null;
async function espaceComplet(titre) {
  const ids = {}; let r = await appel(E.default, { action: 'creer', titre }, M.owner); const id = r.body.id;
  for (const role of ['editor', 'contributor', 'viewer', 'guest']) {
    r = await appel(E.default, { action: 'inviter', espace: id, role }, M.owner); assert.equal(r.code, 200, 'inviter ' + role);
    r = await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, M[role]); assert.equal(r.body.role, role);
  }
  return id;
}
test('espaces · refus par rôle × geste (et un non-membre ne voit rien)', opts, async () => {
  M = { owner: await connecter('o@exemple.test'), editor: await connecter('e@exemple.test'), contributor: await connecter('c@exemple.test'),
        viewer: await connecter('v@exemple.test'), guest: await connecter('g@exemple.test'), dehors: await connecter('x@exemple.test') };
  const id = await espaceComplet('Matrice');
  const autre = (await appel(E.default, { action: 'membres', espace: id }, M.owner)).body.membres.find(m => m.role === 'guest').id;
  const ATTENDU = {
    // geste                       owner editor contributor viewer guest dehors
    'membres':                     [200, 200, 200, 200, 200, 404],
    'acces':                       [200, 200, 200, 200, 200, 404],
    'inviter:editor':              [200, 403, 403, 403, 403, 404],
    'inviter:contributor':         [200, 403, 403, 403, 403, 404],
    'inviter:viewer':              [200, 200, 403, 403, 403, 404],
    'inviter:guest':               [200, 200, 403, 403, 403, 404],
    'inviter:owner':               [400, 400, 400, 400, 400, 400],
    'retirer':                     [null, 403, 403, 403, 403, 404],
    'annuler':                     [404, 403, 403, 403, 403, 404]
  };
  const QUI = ['owner', 'editor', 'contributor', 'viewer', 'guest', 'dehors'];
  for (const [geste, codes] of Object.entries(ATTENDU)) for (let i = 0; i < QUI.length; i++) {
    if (codes[i] === null) continue;
    const [action, role] = geste.split(':');
    const b = { action, espace: id }; if (role) b.role = role; if (action === 'retirer') b.membre = autre; if (action === 'annuler') b.invitation = '00000000-0000-0000-0000-000000000000';
    const r = await appel(E.default, b, M[QUI[i]]);
    assert.equal(r.code, codes[i], geste + ' par ' + QUI[i] + ' : ' + JSON.stringify(r.body));
  }
});

test('espaces · deux projets : un membre du projet A ne lit ni ne touche rien du projet B', opts, async () => {
  const A1 = await espaceComplet('Projet A');
  let r = await appel(E.default, { action: 'creer', titre: 'Projet B' }, M.dehors); const B1 = r.body.id;
  for (const qui of ['owner', 'editor', 'contributor', 'viewer', 'guest']) {
    for (const action of ['membres', 'acces', 'annuler', 'retirer']) assert.equal((await appel(E.default, { action, espace: B1, membre: 'x', invitation: 'x' }, M[qui])).code, 404, qui + ' · ' + action + ' sur B');
    assert.equal((await appel(E.default, { action: 'inviter', espace: B1, role: 'guest' }, M[qui])).code, 404, qui + ' · inviter sur B');
    assert.equal((await appel(require('../api/live/passe.js'), { espace: B1 }, M[qui])).code, 403, qui + ' · direct de B');
    const mes = (await appel(E.default, { action: 'mes' }, M[qui])).body.espaces.map(e => e.id);
    assert.ok(mes.includes(A1) && !mes.includes(B1), qui + ' · « mes espaces »');
  }
  r = await appel(E.default, { action: 'membres', espace: A1 }, M.dehors); assert.equal(r.code, 404, 'le propriétaire de B ne voit pas A');
});

/* Règle 2 : chacun ne reçoit des membres que ce que sa portée permet ; hors portée = absent de la réponse, même le nom. */
test('espaces · règle 2 : membres selon la portée (un invité ne reçoit que lui-même)', opts, async () => {
  const id = await espaceComplet('Portée');
  const noms = { owner: 'o', editor: 'e', contributor: 'c', viewer: 'v', guest: 'g' };
  const lire = async q => (await appel(E.default, { action: 'membres', espace: id }, M[q])).body;
  let r = await lire('guest'); assert.deepEqual(r.membres.map(m => m.role), ['guest']); assert.equal(r.effectif, undefined, 'aucun total pour un destinataire');
  const brut = JSON.stringify(r); for (const q of ['owner', 'editor', 'contributor', 'viewer']) assert.ok(!brut.includes('"nom":"' + noms[q] + '"'), 'aucun autre nom : ' + q);
  for (const q of ['contributor', 'viewer']) { r = await lire(q); assert.deepEqual(r.membres.map(m => m.role).sort(), ['editor', 'owner', q].sort(), q + ' : lui-même et l\'organisation');
    assert.deepEqual(r.effectif, { owner: 1, editor: 1, contributor: 1, viewer: 1, guest: 1 }, q + ' : effectifs sans noms'); }
  for (const q of ['owner', 'editor']) { r = await lire(q); assert.equal(r.membres.length, 5, q + ' voit tout le monde'); assert.equal(r.effectif, undefined); }
  r = (await appel(E.default, { action: 'acces', espace: id }, M.guest)).body; assert.equal(r.personnes.length, 1); assert.deepEqual(Object.values(r.membres), ['guest']);
});

/* Règle 11 : chaque décision laisse une trace, en ajout seul ; le propriétaire lit le journal de l'espace, chacun ce qui le concerne. */
test('espaces · règle 11 : journal en ajout seul, lisible par la personne concernée', opts, async () => {
  let r = await appel(E.default, { action: 'creer', titre: 'Journal' }, M.owner); const id = r.body.id; assert.equal(r.body.journal, true);
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'guest', email: 'g@exemple.test' }, M.owner); assert.equal(r.body.journal, true);
  r = await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, M.guest); assert.equal(r.body.journal, true);
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'viewer' }, M.owner);
  await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, M.viewer);
  const membres = (await appel(E.default, { action: 'membres', espace: id }, M.owner)).body.membres, idv = membres.find(m => m.role === 'viewer').id, idg = membres.find(m => m.role === 'guest').id;
  r = await appel(E.default, { action: 'retirer', espace: id, membre: idv }, M.owner); assert.equal(r.body.journal, true);
  const tout = (await appel(E.default, { action: 'journal', espace: id }, M.owner)).body;
  assert.equal(tout.tout, true); assert.deepEqual(tout.journal.map(l => l.action).reverse(), ['creation', 'invitation', 'acceptation', 'invitation', 'acceptation', 'retrait']);
  assert.ok(!JSON.stringify(tout).includes('@'), 'aucune adresse e-mail au journal');
  const g = (await appel(E.default, { action: 'journal', espace: id }, M.guest)).body;
  assert.equal(g.tout, false); assert.ok(g.journal.length >= 1 && g.journal.every(l => l.qui === idg || l.detail.cible === idg), 'l\'invitée ne lit que ce qui la concerne');
  assert.ok(!g.journal.some(l => l.action === 'retrait'), 'pas le retrait d\'un autre');
  assert.equal((await appel(E.default, { action: 'journal', espace: id }, M.viewer)).code, 404, 'retirée : plus rien');
  await assert.rejects(pool.query("update audit set action = 'x' where space_id = $1", [id]), /ajout seul/);
  await assert.rejects(pool.query('delete from audit where space_id = $1', [id]), /ajout seul/);
});

/* Durée : un rôle peut avoir une date de fin ; après elle, il est refusé partout, et la fermeture est inscrite au journal. */
test('espaces · durée des rôles : « jusqu\'au … », refus après échéance, fermeture au journal', opts, async () => {
  let r = await appel(E.default, { action: 'creer', titre: 'Durée' }, M.owner); const id = r.body.id;
  for (const j of ['pas une date', new Date(Date.now() - 864e5).toISOString(), new Date(Date.now() + 4 * 366 * 864e5).toISOString()])
    assert.equal((await appel(E.default, { action: 'inviter', espace: id, role: 'viewer', jusquau: j }, M.owner)).code, 400, 'date refusée : ' + j);
  const fin = new Date(Date.now() + 2 * 864e5).toISOString();
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'viewer', jusquau: fin }, M.owner); assert.equal(r.body.jusquau, fin);
  r = await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, M.viewer); assert.equal(r.body.role, 'viewer');
  r = await appel(E.default, { action: 'membres', espace: id }, M.viewer); assert.equal(r.body.membres.find(m => m.role === 'viewer').jusquau, fin, 'il voit « jusqu\'au … »');
  assert.equal((await appel(E.default, { action: 'acces', espace: id }, M.viewer)).body.moi.jusquau, fin);
  /* le temps passe (on avance la date de fin dans la base de test) */
  await pool.query("update space_members set jusqu_au = now() - interval '1 minute' where space_id = $1 and role = 'viewer'", [id]);
  for (const action of ['membres', 'acces', 'journal']) assert.equal((await appel(E.default, { action, espace: id }, M.viewer)).code, 404, 'après échéance : ' + action);
  assert.ok(!(await appel(E.default, { action: 'mes' }, M.viewer)).body.espaces.some(e => e.id === id), 'plus dans « mes espaces »');
  assert.ok(!(await appel(E.default, { action: 'membres', espace: id }, M.owner)).body.membres.some(m => m.role === 'viewer'), 'plus dans la liste du propriétaire');
  assert.equal((await appel(require('../api/live/passe.js'), { espace: id }, M.viewer)).code, 403, 'plus de direct');
  const j = (await appel(E.default, { action: 'journal', espace: id }, M.owner)).body.journal;
  assert.equal(j.filter(l => l.action === 'fermeture').length, 1, 'fermeture inscrite une seule fois'); assert.ok(j.some(l => l.action === 'acceptation' && l.detail.jusqu_au === fin), 'ouverture datée');
  /* une nouvelle invitation remplace le rôle échu */
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'guest' }, M.owner);
  r = await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, M.viewer); assert.equal(r.body.role, 'guest');
});

/* « Je vois un accès inattendu » : tout membre peut le dire, sans preuve ; inscrit au journal, le propriétaire est prévenu. */
test('espaces · « Je vois un accès inattendu » : au journal, propriétaire prévenu, sans le texte ni le nom', opts, async () => {
  const id = await espaceComplet('Signalement'); liens = [];
  let r = await appel(E.default, { action: 'signaler', espace: id, motif: 'Je vois le budget <b>du traiteur</b>' }, M.guest);
  assert.equal(r.code, 200); assert.equal(r.body.journal, true); assert.equal(r.body.prevenu, true);
  assert.equal(liens.length, 1, 'un e-mail, au seul propriétaire'); assert.equal(liens[0].to, 'o@exemple.test');
  assert.ok(!/budget|traiteur|g@exemple/.test(liens[0].text + liens[0].html), 'ni le texte ni l\'auteur dans l\'e-mail');
  const j = (await appel(E.default, { action: 'journal', espace: id }, M.owner)).body.journal.find(l => l.action === 'signalement');
  assert.equal(j.detail.objet, 'acces_inattendu'); assert.equal(j.detail.role, 'guest');
  assert.ok((await appel(E.default, { action: 'journal', espace: id }, M.guest)).body.journal.some(l => l.action === 'signalement'), 'la personne relit son signalement');
  assert.ok(!(await appel(E.default, { action: 'journal', espace: id }, M.contributor)).body.journal.some(l => l.action === 'signalement'), 'un autre membre ne le lit pas');
  assert.equal((await appel(E.default, { action: 'signaler', espace: id }, M.dehors)).code, 404, 'non-membre : rien');
  for (let i = 0; i < 4; i++) await appel(E.default, { action: 'signaler', espace: id }, M.guest);
  assert.equal((await appel(E.default, { action: 'signaler', espace: id }, M.guest)).code, 429, 'cinq par jour');
});

/* Règle 5 : un espace garde toujours un propriétaire ; supprimer son compte ne détruit jamais ce que d'autres ont mis dans un espace. */
test('comptes · règle 5 : le propriétaire d\'un espace partagé ne supprime pas son compte sans retirer les membres', opts, async () => {
  const proprio = await connecter('p5@exemple.test'), invite = await connecter('i5@exemple.test');
  let r = await appel(E.default, { action: 'creer', titre: 'Règle 5' }, proprio); const id = r.body.id;
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'guest' }, proprio);
  await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, invite);
  const supprimer = c => A.auth().handler(new Request(BASE + '/api/auth/delete-user', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, cookie: c, 'x-forwarded-for': '203.0.113.' + (++ipn) }, body: '{}' }));
  let x = await supprimer(proprio); assert.equal(x.status, 400); const j = await x.json(); assert.equal(j.code, 'ESPACES_PARTAGES'); assert.match(j.message, /Règle 5/);
  assert.equal((await pool.query('select count(*)::int as n from space_members where space_id = $1', [id])).rows[0].n, 2, 'l\'espace et ses membres sont intacts');
  assert.equal((await appel(E.default, { action: 'membres', espace: id }, invite)).code, 200, 'l\'invitée y est toujours');
  const idInv = (await appel(E.default, { action: 'membres', espace: id }, proprio)).body.membres.find(m => m.role === 'guest').id;
  await appel(E.default, { action: 'retirer', espace: id, membre: idInv }, proprio);
  x = await supprimer(proprio); assert.equal(x.status, 200, 'seul dans ses espaces : il peut partir');
  assert.equal((await pool.query('select count(*)::int as n from spaces where id = $1', [id])).rows[0].n, 0);
});
