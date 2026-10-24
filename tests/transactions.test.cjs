// creer() et rejoindre() : tout ou rien (audit Vercel, PR 1, point 2), contre une vraie base PostgreSQL de test.
// Chaque action tourne dans une transaction sur une connexion dédiée (pool.connect, BEGIN / COMMIT / ROLLBACK).
// On simule une panne entre deux étapes (la connexion refuse une requête précise) et on vérifie qu'il ne reste aucun état partiel :
// ni espace sans propriétaire, ni propriétaire sans ligne de journal, ni invitation consommée sans adhésion. Puis la même action,
// sans panne, réussit (l'invitation est restée utilisable, l'origine n'est pas bloquée), et aucune connexion n'est perdue.
// Lancé seulement si TEST_DATABASE_URL est défini.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8778';
let A, E, liens = [], pool, ipn = 0;
const U = {};
async function compte(email) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '203.0.113.' + (100 + (++ipn)) }, body: JSON.stringify({ email, callbackURL: '/projets/' }) }));
  await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '203.0.113.' + (100 + (++ipn)) } }));
  const { rows } = await pool.query('select id, email from "user" where email = $1', [email]); return rows[0];
}
/* une base « en panne » : sa connexion dédiée refuse la première requête qui correspond au motif (ou l'avale en silence) */
function enPanne(motif, { silencieuse = false } = {}) {
  let faite = false;
  return { connect: async () => { const c = await pool.connect(); return {
    query(t, v) {
      if (!faite && motif.test(t)) { faite = true;
        if (silencieuse) return c.query('select 1/0').catch(() => ({ rows: [{ t: 'audit', g: true }], rowCount: 0 }));   /* l'erreur est avalée : la base, elle, a annulé */
        return Promise.reject(Object.assign(new Error('panne simulée'), { code: 'XX000' })); }
      return c.query(t, v);
    }, release: x => c.release(x) }; } };
}
const n = async (sql, v) => (await pool.query(sql, v)).rows[0].n;
const etat = async () => ({ espaces: await n('select count(*)::int as n from spaces'), membres: await n('select count(*)::int as n from space_members'),
  journal: await n('select count(*)::int as n from audit'), libres: await n('select count(*)::int as n from invitations where used_at is null') });
const libres = () => pool.totalCount === pool.idleCount && pool.waitingCount === 0;

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/_auth/espaces.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  U.lea = await compte('lea.tx@exemple.test'); U.nora = await compte('nora.tx@exemple.test'); U.paul = await compte('paul.tx@exemple.test');
});
after(async () => { if (pool) await pool.end(); });

test('enTransaction : sans connexion dédiée, rien ne se fait (fermé par défaut)', opts, async () => {
  await assert.rejects(E.enTransaction({ query: async () => ({ rows: [] }) }, async () => 'fait'), /connexion dédiée/);
  await assert.rejects(E.enTransaction(null, async () => 'fait'), /connexion dédiée/);
});

test('creer : une panne entre deux étapes ne laisse ni espace, ni membre, ni ligne de journal', opts, async () => {
  for (const motif of [/insert into space_members/, /insert into audit/, /select count\(\*\)::int as n from spaces/]) {
    const avant = await etat();
    await assert.rejects(E.creer(enPanne(motif), U.lea, { titre: 'Mariage en panne', modele: 'mariage', origine: 'panne-creer-0001' }), /panne simulée/, String(motif));
    assert.deepEqual(await etat(), avant, String(motif) + ' : aucun état partiel');
    assert.ok(libres(), String(motif) + ' : la connexion est rendue');
  }
  const ok = await E.creer(pool, U.lea, { titre: 'Mariage en panne', modele: 'mariage', origine: 'panne-creer-0001' });
  assert.equal(ok.role, 'owner'); assert.equal(ok.journal, true); assert.ok(!ok.existant, 'l\'origine n\'était pas bloquée');
  assert.equal(await n('select count(*)::int as n from space_members where space_id = $1 and user_id = $2 and role = \'owner\'', [ok.id, U.lea.id]), 1);
  assert.equal(await n("select count(*)::int as n from audit where space_id = $1 and action = 'creation'", [ok.id]), 1);
});

test('creer : une erreur avalée en route (COMMIT répond ROLLBACK) est refusée, rien n\'est écrit', opts, async () => {
  const avant = await etat();
  await assert.rejects(E.creer(enPanne(/insert into space_members/, { silencieuse: true }), U.lea, { titre: 'Annulé par la base' }), /annulée par la base|current transaction is aborted/);
  assert.deepEqual(await etat(), avant); assert.ok(libres());
});

test('creer : deux envois simultanés de la même origine donnent un seul projet', opts, async () => {
  const b = { titre: 'Notre mariage', modele: 'mariage', origine: 'double-envoi-0001' };
  const r = await Promise.all([E.creer(pool, U.paul, b), E.creer(pool, U.paul, b)]);
  assert.equal(r[0].id, r[1].id); assert.equal(await n("select count(*)::int as n from spaces where owner_id = $1 and data->>'origine' = $2", [U.paul.id, b.origine]), 1);
  assert.equal(await n("select count(*)::int as n from audit where space_id = $1 and action = 'creation'", [r[0].id]), 1, 'une seule ligne de journal');
  assert.ok(libres());
});

test('rejoindre : une panne entre deux étapes laisse l\'invitation utilisable, sans adhésion ni journal', opts, async () => {
  const projet = (await E.creer(pool, U.lea, { titre: 'Projet des invitations', modele: 'mariage', origine: 'tx-rejoindre-0001' })).id;
  const inv = await E.inviter(pool, U.lea, { espace: projet, role: 'contributor', email: U.nora.email, relation: 'photographe' }, BASE);
  const jeton = new URL(inv.lien).searchParams.get('invitation');
  for (const motif of [/insert into space_members/, /update space_members set relation/, /insert into audit/, /select title from spaces/]) {
    const avant = await etat();
    await assert.rejects(E.rejoindre(enPanne(motif), U.nora, { jeton }), /panne simulée/, String(motif));
    assert.deepEqual(await etat(), avant, String(motif) + ' : aucun état partiel');
    assert.equal(await n('select count(*)::int as n from invitations where space_id = $1 and used_at is null', [projet]), 1, String(motif) + ' : l\'invitation n\'est pas consommée');
    assert.equal(await n('select count(*)::int as n from space_members where space_id = $1 and user_id = $2', [projet, U.nora.id]), 0, String(motif) + ' : pas d\'adhésion');
    assert.ok(libres(), String(motif) + ' : la connexion est rendue');
  }
  const ok = await E.rejoindre(pool, U.nora, { jeton });
  assert.deepEqual([ok.espace, ok.role, ok.journal], [projet, 'contributor', true]);
  assert.equal(await n("select count(*)::int as n from space_members where space_id = $1 and user_id = $2 and relation = 'photographe'", [projet, U.nora.id]), 1);
  await assert.rejects(E.rejoindre(pool, U.nora, { jeton }), e => e.code === 410, 'usage unique, toujours');
});

test('rejoindre : un même lien ouvert deux fois en même temps ne fait entrer qu\'une personne', opts, async () => {
  const projet = (await E.creer(pool, U.lea, { titre: 'Lien sans adresse', origine: 'tx-rejoindre-0002' })).id;
  const jeton = new URL((await E.inviter(pool, U.lea, { espace: projet, role: 'viewer' }, BASE)).lien).searchParams.get('invitation');
  const r = await Promise.allSettled([E.rejoindre(pool, U.nora, { jeton }), E.rejoindre(pool, U.paul, { jeton })]);
  assert.equal(r.filter(x => x.status === 'fulfilled').length, 1); assert.equal(r.find(x => x.status === 'rejected').reason.code, 410);
  assert.equal(await n("select count(*)::int as n from space_members where space_id = $1 and role = 'viewer'", [projet]), 1);
  assert.equal(await n("select count(*)::int as n from audit where space_id = $1 and action = 'acceptation'", [projet]), 1);
  assert.ok(libres());
});

test('les refus métier (400, 404, 410, 429) annulent aussi proprement, sans fuite de connexion', opts, async () => {
  await assert.rejects(E.rejoindre(pool, U.paul, { jeton: 'x'.repeat(40) }), e => e.code === 410);
  await assert.rejects(E.creer(pool, U.paul, { titre: '' }), e => e.code === 400);
  for (let i = 0; i < 12; i++) await assert.rejects(E.rejoindre(pool, U.paul, { jeton: 'y'.repeat(30 + i) }), e => e.code === 410);
  assert.ok(libres(), 'le pool (max 3) n\'a perdu aucune connexion');
});
