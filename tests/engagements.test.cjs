// Les engagements d'un projet (V1, PR P6) : « qui doit quoi à qui, pour quand ».
// 1. Les règles (synchroview/permissions.js, type « engagement »), sans base.
// 2. Contre une vraie base PostgreSQL de test (migration 2026-10-25-15), avec de vraies sessions : un projet de mariage, le couple
//    (propriétaire), la coordination, deux prestataires et un invité. Chacun ne voit que ce qui le concerne ; on s'engage soi-même ;
//    seule l'organisation demande un engagement à quelqu'un d'autre, qui l'accepte ou le refuse ; seul celui qui s'est engagé le
//    déclare tenu ; le retard se calcule ; le journal garde le geste et l'échéance, jamais le texte ; aucun identifiant de compte
//    ne part vers le navigateur ; AI liste mes engagements ouverts ; « Mon accès » et le + du Dock ; sans la migration, 503 dit.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../synchroview/engagements.js');   /* les règles des engagements ; permissions.js reste intact */
const REG = require('../modules/registre.js');
const D = require('../dock/modele.js');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8781';

/* ---------- 1. les règles ---------- */
const e = (x) => Object.assign({ deQui: 'dj', pourQui: null, creePar: 'dj', etat: 'accepte' }, x);
const qui = (id, role) => ({ id, role });
test('règles · lire : les personnes concernées et l\'organisation, personne d\'autre', () => {
  assert.equal(P.can(qui('dj', 'contributor'), 'read', e()).allow, true, 'celui qui s\'engage');
  assert.equal(P.can(qui('couple', 'owner'), 'read', e()).allow, true, 'l\'organisation');
  assert.equal(P.can(qui('coord', 'editor'), 'read', e()).allow, true);
  assert.equal(P.can(qui('fleur', 'contributor'), 'read', e()).allow, false, 'un autre prestataire');
  assert.equal(P.can(qui('invite', 'guest'), 'read', e()).allow, false, 'un invité');
  assert.equal(P.can(qui('fleur', 'contributor'), 'read', e({ pourQui: 'fleur' })).allow, true, 'celui envers qui on s\'engage');
});
test('règles · créer : on s\'engage soi-même ; seule l\'organisation demande à quelqu\'un d\'autre ; ni invité ni lecture seule', () => {
  assert.equal(P.can(qui('dj', 'contributor'), 'create', { deQui: 'dj' }).allow, true);
  assert.equal(P.can(qui('dj', 'contributor'), 'create', { deQui: 'fleur' }).allow, false);
  assert.equal(P.can(qui('coord', 'editor'), 'create', { deQui: 'dj' }).allow, true);
  assert.equal(P.can(qui('invite', 'guest'), 'create', { deQui: 'invite' }).allow, false);
  assert.equal(P.can(qui('parent', 'viewer'), 'create', { deQui: 'parent' }).allow, false);
});
test('règles · accepter, refuser, tenir, annuler : chacun son geste, au bon état', () => {
  const dem = e({ etat: 'propose', creePar: 'couple' });
  assert.equal(P.can(qui('dj', 'contributor'), 'accept', dem).allow, true);
  assert.equal(P.can(qui('couple', 'owner'), 'accept', dem).allow, false, 'l\'organisation n\'accepte pas à la place de la personne');
  assert.equal(P.can(qui('dj', 'contributor'), 'refuse', dem).allow, true);
  assert.equal(P.can(qui('dj', 'contributor'), 'keep', dem).allow, false, 'pas tenu avant d\'être accepté');
  assert.equal(P.can(qui('dj', 'contributor'), 'keep', e()).allow, true);
  assert.equal(P.can(qui('couple', 'owner'), 'keep', e()).allow, false, 'seul celui qui s\'est engagé le déclare tenu');
  assert.equal(P.can(qui('couple', 'owner'), 'cancel', dem).allow, true, 'l\'auteur annule');
  assert.equal(P.can(qui('coord', 'editor'), 'cancel', e()).allow, false, 'ni l\'auteur ni le propriétaire');
  assert.equal(P.can(qui('couple', 'owner'), 'cancel', e({ etat: 'tenu' })).allow, false, 'un engagement clos ne s\'annule plus');
  assert.equal(P.can(qui('dj', 'contributor'), 'inventer', e()).allow, false, 'action inconnue : refusée');
});
test('registre et Dock · le module est opérationnel, sans cinquième lieu ; le + n\'offre l\'engagement qu\'à qui peut le prendre', () => {
  assert.deepEqual(REG.valider(REG.module('engagements')), []);
  assert.deepEqual(REG.servis({}), ['acces', 'journal', 'personnes'], 'aucune page de plus');
  assert.deepEqual(REG.servis({ temps: true }), ['acces', 'journal', 'personnes', 'deroule']);
  assert.equal(REG.intention('je m\'engage à envoyer la playlist').module, 'engagements');
  const g = { lire: true, inviter: [], signaler: true };
  const plus = engager => D.composerReel({ roleServeur: 'contributor', gestes: Object.assign({ engager }, g), servis: ['acces', 'journal', 'personnes'] }).plus.map(x => x.id);
  assert.deepEqual(plus(true), ['engagement']); assert.deepEqual(plus(false), []);
});

/* ---------- 2. contre une base de test ---------- */
let A, E, EN, PG, M, liens = [], pool, ipn = 0, espace;
const C = {}, U = {};
function appel(fn, req) { return new Promise(d => { const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; fn(Object.assign({ headers: {} }, req), res); }); }
const H = cookie => Object.assign({ 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' }, cookie ? { cookie } : {});
const espaces = (body, k) => appel(E.default, { method: 'POST', body, headers: H(C[k]) });
const lire = (k, esp = espace) => appel(EN.default, { method: 'GET', url: '/api/engagements' + (esp ? '?espace=' + esp : ''), headers: H(C[k]) });
const poster = (k, body) => appel(EN.default, { method: 'POST', url: '/api/engagements', body: Object.assign({ espace }, body), headers: H(C[k]) });
const page = (k, gabarit) => appel(PG.default, { method: 'GET', url: '/api/page?espace=' + espace + '&gabarit=' + gabarit, headers: H(C[k]) });
async function connecter(email, nom) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '198.51.100.' + (++ipn % 250) }, body: JSON.stringify({ email, name: nom, callbackURL: '/projets/' }) }));
  assert.equal(r.status, 200, email);
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '198.51.100.' + (++ipn % 250) } }));
  await pool.query('update "user" set name = $1 where email = $2', [nom, email]);
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
/* des échéances proches (trois ans au plus, règle du serveur) */
const jourPlus = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const enFr = j => new Date(j + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const titres = r => r.body.engagements.map(x => x.titre).sort();
const trouve = (r, titre) => r.body.engagements.find(x => x.titre === titre);
const refDe = (r, nom) => (r.body.personnes.find(p => p.nom === nom) || {}).ref;

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); EN = await import('../api/engagements.mjs'); PG = await import('../api/page.mjs'); M = await import('../api/_engagements/moteur.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  await pool.query('truncate quotas').catch(() => {});
  const gens = [['couple', 'Camille Fictive', null], ['coord', 'Léa Coordination', 'editor'], ['dj', 'Alex DJ', 'contributor'], ['fleur', 'Sarah Fleurs', 'contributor'], ['invite', 'Emma Invitée', 'guest']];
  for (const [k, nom] of gens) { C[k] = await connecter(k + '.eng@exemple.test', nom); U[k] = (await pool.query('select id from "user" where email = $1', [k + '.eng@exemple.test'])).rows[0].id; }
  espace = (await espaces({ action: 'creer', titre: 'Mariage de Camille', modele: 'mariage' }, 'couple')).body.id;
  for (const [k, , r] of gens) { if (!r) continue; const inv = await espaces({ action: 'inviter', espace, role: r, email: k + '.eng@exemple.test' }, 'couple');
    assert.equal(inv.code, 200, k); assert.equal((await espaces({ action: 'rejoindre', jeton: new URL(inv.body.lien).searchParams.get('invitation') }, k)).code, 200, k); }
});
after(async () => { if (pool) await pool.end(); });

test('base · sans session 401 ; projet inconnu ou non-membre 404', opts, async () => {
  assert.equal((await appel(EN.default, { method: 'GET', url: '/api/engagements?espace=' + espace, headers: H() })).code, 401);
  C.dehors = await connecter('dehors.eng@exemple.test', 'Personne Dehors');
  assert.equal((await lire('dehors')).code, 404);
  assert.equal((await poster('dehors', { action: 'creer', titre: 'Intrusion', echeance: M.aujourdhui() })).code, 404);
  assert.equal((await lire('dj', '00000000-0000-0000-0000-000000000000')).code, 404);
});

test('base · le DJ s\'engage lui-même : accepté d\'emblée, envers l\'organisation ; aucun identifiant de compte ne part', opts, async () => {
  const r = await poster('dj', { action: 'creer', titre: 'Envoyer la playlist', echeance: jourPlus(40) });
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.etat, 'accepte');
  const v = await lire('dj'); const x = trouve(v, 'Envoyer la playlist');
  assert.equal(x.deQui, 'vous'); assert.equal(x.pourQui, 'l\'organisation du projet'); assert.equal(x.enRetard, false);
  assert.deepEqual(x.gestes.sort(), ['annuler', 'tenir']);
  for (const k of ['couple', 'coord', 'dj', 'fleur', 'invite']) { const t = JSON.stringify(await lire(k)); for (const id of Object.values(U)) assert.ok(!t.includes(id), k + ' : aucun identifiant de compte'); }
});

test('base · chacun ne voit que ce qui le concerne ; l\'organisation voit tout', opts, async () => {
  await poster('fleur', { action: 'creer', titre: 'Livrer les bouquets', echeance: jourPlus(41) });
  assert.deepEqual(titres(await lire('couple')), ['Envoyer la playlist', 'Livrer les bouquets']);
  assert.deepEqual(titres(await lire('coord')), ['Envoyer la playlist', 'Livrer les bouquets']);
  assert.deepEqual(titres(await lire('dj')), ['Envoyer la playlist'], 'pas celui de la fleuriste');
  assert.deepEqual(titres(await lire('fleur')), ['Livrer les bouquets']);
  assert.deepEqual(titres(await lire('invite')), [], 'l\'invité ne voit rien qui ne le concerne pas');
  const vc = trouve(await lire('couple'), 'Livrer les bouquets');
  assert.equal(vc.deQui, 'Sarah Fleurs'); assert.deepEqual(vc.gestes, ['annuler'], 'le propriétaire peut annuler, pas déclarer tenu à la place de la fleuriste');
});

test('base · l\'organisation demande un engagement : proposé, puis accepté par la personne seule ; tenu par elle seule', opts, async () => {
  const lc = await lire('coord'), refDj = refDe(lc, 'Alex DJ');
  assert.ok(refDj, 'la coordination peut choisir le DJ'); assert.equal(lc.body.peutDemander, true);
  const r = await poster('coord', { action: 'creer', titre: 'Confirmer l\'horaire du bal', echeance: jourPlus(30), de: refDj });
  assert.equal(r.code, 200); assert.equal(r.body.etat, 'propose');
  const ref = r.body.ref;
  assert.equal((await poster('coord', { action: 'geste', ref, geste: 'accepter' })).code, 403, 'la coordination n\'accepte pas à sa place');
  assert.equal((await poster('fleur', { action: 'geste', ref, geste: 'accepter' })).code, 404, 'hors de portée : introuvable');
  assert.equal((await poster('dj', { action: 'geste', ref, geste: 'tenir' })).code, 409, 'pas tenu avant d\'être accepté');
  const vd = trouve(await lire('dj'), 'Confirmer l\'horaire du bal'); assert.deepEqual(vd.gestes.sort(), ['accepter', 'refuser']); assert.equal(vd.deQui, 'vous');
  assert.equal((await poster('dj', { action: 'geste', ref, geste: 'accepter' })).code, 200);
  assert.equal((await poster('dj', { action: 'geste', ref, geste: 'accepter' })).code, 409, 'déjà accepté');
  assert.equal((await poster('couple', { action: 'geste', ref, geste: 'tenir' })).code, 403);
  const t = await poster('dj', { action: 'geste', ref, geste: 'tenir' }); assert.equal(t.code, 200); assert.equal(t.body.etat, 'tenu');
  assert.equal((await poster('coord', { action: 'geste', ref, geste: 'annuler' })).code, 409, 'un engagement tenu ne s\'annule plus');
});

test('base · refus de demander pour un prestataire ; refus de références inconnues, d\'échéances passées ou invalides ; invité et texte', opts, async () => {
  const lf = await lire('fleur');
  assert.equal(lf.body.peutDemander, false); assert.ok(lf.body.personnes.every(p => ['Camille Fictive', 'Léa Coordination'].includes(p.nom)), 'un prestataire ne voit que l\'organisation');
  const refCouple = refDe(lf, 'Camille Fictive');
  assert.equal((await poster('fleur', { action: 'creer', titre: 'Pour le couple', echeance: jourPlus(20), de: refCouple })).code, 403, 'un prestataire ne demande pas d\'engagement');
  assert.equal((await poster('fleur', { action: 'creer', titre: 'Pour le couple', echeance: jourPlus(20), pour: 'ffffffffffffffff' })).code, 400, 'référence inconnue');
  assert.equal((await poster('fleur', { action: 'creer', titre: 'Hier', echeance: '2001-01-01' })).code, 400, 'échéance passée');
  assert.equal((await poster('fleur', { action: 'creer', titre: 'Bizarre', echeance: '2027-02-30' })).code, 400, 'date impossible');
  assert.equal((await poster('fleur', { action: 'creer', titre: 'x', echeance: jourPlus(21) })).code, 400, 'trop court');
  assert.equal((await poster('invite', { action: 'creer', titre: 'Venir', echeance: jourPlus(21) })).code, 403, 'un invité ne prend pas d\'engagement');
  const p = await poster('fleur', { action: 'creer', titre: 'Envoyer le devis au couple', echeance: jourPlus(22), pour: refCouple });
  assert.equal(p.code, 200); const vc = trouve(await lire('couple'), 'Envoyer le devis au couple'); assert.equal(vc.pourQui, 'vous');
});

test('base · le retard se calcule (accepté, échéance passée) ; AI liste mes engagements ouverts, avec le projet', opts, async () => {
  await pool.query("update engagements set echeance = current_date - 2 where titre = 'Envoyer la playlist'");
  const x = trouve(await lire('dj'), 'Envoyer la playlist'); assert.equal(x.enRetard, true);
  const m = await lire('dj', null);
  assert.equal(m.code, 200); assert.deepEqual(m.body.engagements.map(e => e.titre), ['Envoyer la playlist'], 'ouverts seulement (le bal est tenu)');
  assert.equal(m.body.engagements[0].projet, 'Mariage de Camille'); assert.equal(m.body.engagements[0].espace, espace);
  const mc = await lire('couple', null);
  assert.deepEqual(mc.body.engagements.map(e => e.titre), ['Envoyer le devis au couple'], 'le couple : ce qu\'on lui doit, nommément');
});

test('base · le journal garde le geste et l\'échéance, jamais le texte ; chacun lit ses lignes', opts, async () => {
  const rows = (await pool.query("select detail from audit where space_id = $1 and action = 'engagement'", [espace])).rows;
  assert.ok(rows.length >= 6); assert.ok(rows.every(r => !JSON.stringify(r.detail).match(/playlist|bouquets|bal|devis/i)), 'aucun texte d\'engagement');
  const j = await page('dj', 'journal'); const t = j.body.blocs.map(b => b.texte).join(' | ');
  assert.ok(t.includes('vous avez pris un engagement (échéance le ' + enFr(jourPlus(40)) + ')'), t); assert.match(t, /vous avez tenu un engagement/);
  assert.match(t, /demandé un engagement de votre part/);
  assert.ok(!/bouquets|Livrer/.test(t));
});

test('base · « Mon accès » porte le bloc des engagements ; le + du Dock l\'offre à qui peut s\'engager, pas à l\'invité', opts, async () => {
  const a = await page('dj', 'acces');
  assert.ok(a.body.blocs.some(b => b.type === 'engagements')); assert.deepEqual(a.body.dock.plus.map(x => x.id), ['engagement']);
  const i = await page('invite', 'acces');
  assert.ok(i.body.blocs.some(b => b.type === 'engagements'), 'l\'invité voit le bloc (ce qu\'on lui demanderait)'); assert.deepEqual(i.body.dock.plus.map(x => x.id), []);
  assert.deepEqual((await page('couple', 'acces')).body.dock.plus.map(x => x.id), ['inviter', 'engagement']);
});

test('base · retiré du projet : plus rien (404), ses engagements restent lisibles par l\'organisation', opts, async () => {
  const r = await espaces({ action: 'retirer', espace, membre: U.fleur }, 'couple');
  assert.equal(r.code, 200, JSON.stringify(r.body));
  assert.equal((await lire('fleur')).code, 404); assert.deepEqual((await lire('fleur', null)).body.engagements, []);
  const vc = await lire('couple'); assert.ok(trouve(vc, 'Livrer les bouquets'));
  assert.ok(!vc.body.personnes.some(p => p.nom === 'Sarah Fleurs'), 'on ne demande plus rien à une personne partie');
});

test('base · sans la migration 2026-10-25-15 : 503 dit, et « Mon accès » sans le bloc', opts, async () => {
  const faux = { query: async (sql, v) => { if (/to_regclass\('public\.engagements'\)/.test(sql)) return { rows: [{ t: null }] }; return pool.query(sql, v); }, connect: () => pool.connect() };
  M._oublier(); EN._db(faux);
  try {
    const r = await lire('dj'); assert.equal(r.code, 503); assert.match(r.body.raison, /pas encore installés/);
    assert.equal((await poster('dj', { action: 'creer', titre: 'Rien', echeance: jourPlus(20) })).code, 503);
  } finally { EN._db(null); M._oublier(); }
  PG._db && PG._db(faux); M._oublier();
  try { if (PG._db) { const a = await page('dj', 'acces'); assert.ok(!a.body.blocs.some(b => b.type === 'engagements')); } } finally { if (PG._db) PG._db(null); M._oublier(); }
});
