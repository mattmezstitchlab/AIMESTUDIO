/* L'accueil de la PR C (brief unique du 24/10) : « Je suis… », la démo des téléphones, les métiers en un seul fichier, la migration des activités,
   les vidéos. Ce qui se vérifie sans navigateur ; le parcours (tests/navigateur/parcours.cjs) vérifie le reste à l'écran. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const D = require('../accueil/demo.js'), M = require('../vitrine/metiers.json');
const code = f => lire(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

test('les métiers : un seul fichier de données, les huit du brief, chacun complet ; l\'intermittent « en préparation »', () => {
  assert.deepEqual(M.metiers.map(m => m.id), ['fleuriste', 'traiteur', 'musicien', 'musicien-intermittent', 'videaste', 'photographe', 'dj', 'lieu']);
  for (const m of M.metiers) {
    for (const k of ['nom', 'titre', 'c', 'desc', 'lead', 'live', 'dock', 'gestes', 'messages']) assert.ok(m[k], m.id + ' : ' + k);
    assert.equal(m.dock.length, 4, m.id + ' : quatre lieux autour du +'); assert.ok(/^[a-z][a-z-]{1,39}$/.test(m.id), m.id + ' : accepté par la contrainte de la migration');
    assert.ok(!('publiee' in m) && !('role' in m) && !('droits' in m), m.id + ' : un métier nomme, il n\'accorde rien');
  }
  assert.ok(M.metiers.find(m => m.id === 'musicien-intermittent').preparation, 'le module intermittent reste « en préparation »');
});

test('« Je suis… » : la liste de l\'accueil est exactement celle du brief, et les métiers viennent du fichier', () => {
  const h = lire('index.html'), sel = h.match(/<select id="jsChoix"[\s\S]*?<\/select>/)[0];
  const vals = [...sel.matchAll(/<option value="([^"]*)"/g)].map(x => x[1]);
  assert.deepEqual(vals, ['', 'maries', 'coordination', ...M.metiers.map(m => 'metier:' + m.id), 'invite']);
  assert.match(sel, /<optgroup label="Prestataire">/); assert.match(sel, />Futurs mariés</); assert.match(sel, />Coordinatrice \/ coordinateur</); assert.match(sel, />Invité·e</);
  assert.match(sel, /Musicien intermittent \(en préparation\)/);
});

test('chaque choix compose des téléphones, le rôle choisi au centre ; un métier prend le gabarit prestataire avec ses mots', () => {
  for (const v of ['maries', 'coordination', 'invite', ...M.metiers.map(m => 'metier:' + m.id)]) {
    const c = D.composer(M, v); assert.ok(c && c.tels.length >= 7, v);
    assert.equal(c.tels[c.centre], c.choisi, v + ' : au centre'); assert.equal(c.centre, Math.floor((c.tels.length - 1) / 2), v + ' : vraiment au milieu');
    assert.equal(new Set(c.tels.map(t => t.id)).size, c.tels.length, v + ' : chaque personne une fois');
    if (v.startsWith('metier:')) { const m = M.metiers.find(x => 'metier:' + x.id === v); assert.equal(c.choisi.titre, m.titre); assert.equal(c.choisi.lead, m.lead); assert.ok(c.choisi.prestataire); }
  }
  assert.equal(D.composer(M, 'metier:astronaute'), null); assert.equal(D.composer(M, ''), null);
});

test('le scénario : qui sonne et qui reste muet ; chaque prestataire reçoit les mots de son métier', () => {
  const c = D.composer(M, 'metier:fleuriste'), e = D.scenario(c.tels), pluie = e.find(x => x.id === 'pluie');
  assert.deepEqual(e.map(x => x.id), ['rsvp', 'retard', 'pluie']);
  assert.deepEqual(pluie.vers['m-fleuriste'], M.metiers.find(m => m.id === 'fleuriste').messages.pluie);
  assert.ok(c.tels.every(t => pluie.vers[t.id]), 'il pleut : tout le monde sonne');
  const rsvp = e.find(x => x.id === 'rsvp');
  assert.ok(!rsvp.vers.coord && !rsvp.vers.temoin, 'une réponse d\'invitée ne dérange ni la coordination ni le témoin');
  assert.equal(rsvp.vers['m-traiteur'][2], 'calme', 'l\'effectif change, sans nom et sans sonnerie');
  for (const x of e) assert.ok(c.tels.some(t => t.id === x.de), x.id + ' : parti d\'un téléphone présent');
});

test('la démo : aucun son avant « Activer la démo », un bouton coupe le son ; aucune donnée de démo ne part dans un vrai compte', () => {
  const d = code('accueil/demo.js'), j = code('accueil/je-suis.js');
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(d), 'la démo ne lit ni n\'écrit rien hors de la page');
  assert.match(d, /function jouer\(\)\{var mien=\+\+jeton;audio\(\)/, 'le contexte audio naît dans jouer(), après le clic');
  assert.ok(!/audio\(\)/.test(d.replace(/function audio\(\)[\s\S]*?\n function hz/, '').replace(/function jouer\(\)\{var mien=\+\+jeton;audio\(\)/, '')), 'nulle part ailleurs');
  assert.match(j, /\$\('dmSon'\)\.addEventListener\('click'/);
  assert.ok(!/Léa|Marc|Aulnes|Lucie/.test(j), 'la création ne reprend aucune donnée de la démo');
  assert.match(j, /titre:'Notre mariage'/);
});

test('l\'accueil n\'appelle le serveur qu\'après « Créer » : la session, puis le lien de connexion ; la création passe par AIMECreer', () => {
  const j = code('accueil/je-suis.js'), avant = j.slice(0, j.indexOf('function creer(t,b)'));
  assert.ok(!/\/api\//.test(avant), 'rien vers /api/ avant la fonction creer()');
  assert.ok(!/\/api\/espaces/.test(j), 'pas d\'appel direct : compte/creer.js');
  assert.match(j, /C\.activite\(t\.metier\)/); assert.match(j, /'\/projets\/\?activite='/); assert.match(j, /'\/projets\/\?creer=mariage&origine='/);
  const C = require('../compte/creer.js'); assert.equal(typeof C.activite, 'function');
});

test('la migration activites : numérotée après relation, additive, rejouable, non publiée par défaut, une fois par métier', () => {
  const m = lire('db/migrations/2026-10-24-04-activites.sql');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'db/migrations/2026-10-24-03-relation.sql')));
  assert.ok(!/\bdrop\b|\btruncate\b|\bdelete\b/i.test(m.replace(/--.*$/gm, '').replace(/on delete cascade/gi, '')), 'additive');
  assert.match(m, /create table if not exists activites/); assert.match(m, /publiee boolean not null default false/);
  assert.match(m, /create unique index if not exists activites_user_metier on activites \(user_id, metier\)/);
  assert.match(m, /references "user"\(id\) on delete cascade/, 'effacée avec le compte');
  assert.match(m, /if not exists \(select 1 from pg_constraint where conname = 'activites_metier_court'\)/, 'la contrainte aussi est rejouable');
});

test('le serveur : une activité n\'accepte que les métiers du fichier, et ne touche ni aux projets ni aux rôles', () => {
  const a = code('api/_auth/activites.mjs');
  assert.match(a, /require\('\.\.\/\.\.\/vitrine\/metiers\.json'\)/);
  assert.ok(!/\b(spaces|space_members|invitations)\b/.test(a.replace("from './espaces.mjs'", '')), 'aucun projet, aucun rôle');
  assert.ok(!/publiee\s*=\s*true|set publiee/.test(a), 'jamais publiée depuis le navigateur');
  assert.match(code('api/espaces.mjs'), /Object\.hasOwn\(ACTIONS, b\.action\)/, 'une action héritée d\'Object n\'est pas une action');
});

test('les vidéos : deux vignettes, fichiers présents dans media/, pas de lecture automatique, preload="none", sous-titres', () => {
  const h = lire('index.html');
  for (const [n, t] of [['aime-film', 'AIME en 2 minutes'], ['aime-accueil', 'L\'accueil en 45 secondes']]) {
    assert.match(h, new RegExp('data-video="' + n + '" data-vtt data-titre="' + t.replace(/'/g, "'") + '"'));
    for (const ext of ['.mp4', '.jpg', '.fr.vtt']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'media', n + ext)), n + ext);
    assert.match(lire('media/' + n + '.fr.vtt'), /^WEBVTT/);
    assert.ok(fs.statSync(path.join(__dirname, '..', 'media', n + '.mp4')).size < 25e6, n + ' : moins de 25 Mo');
  }
  assert.match(h, /<video id="lecteurVideo" controls playsinline preload="none"><\/video>/); assert.ok(!/autoplay/.test(h));
  const j = code('accueil/je-suis.js'); assert.match(j, /tr\.default=true/); assert.match(j, /e\.key==='Escape'/); assert.match(j, /dlg\.addEventListener\('cancel'/);
});
