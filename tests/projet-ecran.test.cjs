/* PR B · l'écran de projet et la création : le navigateur affiche ce que le serveur compose, il ne calcule aucun droit ;
   une seule fonction de création, appelée depuis Mes projets et depuis le + ; l'ancien formulaire de l'accueil n'appelle pas le serveur. */
const { test } = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => fs.readFileSync(R(p), 'utf8');

test('l\'écran de projet lit /api/page, pose le Dock de la réponse et ne recalcule aucune permission', () => {
  const j = lire('compte/projet.js'), c = lire('compte/compte.js'), h = lire('compte/index.html');
  assert.match(j, /fetch\('\/api\/page\?espace='/); assert.match(j, /AIMEDockVue\.poser\(z,rep\.dock/, 'le Dock vient de la réponse');
  for (const t of [j, c]) assert.ok(!/AIMEPerms|P\.can\(|permissions\.js/.test(t), 'aucun calcul de droit dans le navigateur');
  assert.ok(!/permissions\.js/.test(h), 'la page ne charge plus la source des droits');
  assert.match(j, /aime:dock-lieu/); assert.match(j, /aime:dock-geste/); assert.match(j, /preventDefault/);
  for (const k of ['role', 'gestes', 'origine', 'fin', 'ligne', 'liste', 'invitations', 'geste']) assert.match(j, new RegExp('\\b' + k + ':function'), k);
  assert.ok(!/innerHTML\s*=\s*[^'"]/.test(j.replace(/innerHTML='';/g, '')), 'les textes de la base passent par textContent');
  assert.match(h, /id="projet"/); assert.match(h, /\/compte\/projet\.js/); assert.match(h, /\/compte\/creer\.js/);
  assert.match(c, /PJ\.ouvrir\(OUVRIR/);
});

test('une seule fonction de création : Mes projets et le + ; l\'accueil ne crée rien au serveur', () => {
  const C = require('../compte/creer.js');
  assert.deepEqual(C.corps({ titre: '  Le mariage  ', modele: 'mariage', origine: 'np-abc123' }), { action: 'creer', titre: 'Le mariage', modele: 'mariage', origine: 'np-abc123' });
  assert.deepEqual(C.corps({ titre: 'X', modele: 'pirate' }), { action: 'creer', titre: 'X' }, 'un modèle inconnu n\'est pas envoyé');
  assert.match(lire('compte/compte.js'), /C\.creer\(\{titre:\$\('eTitre'\)\.value,modele:\$\('eModele'\)\.value,origine:C\.origine\('nouveau'\)\}\)/);
  assert.ok(!/espaces\('creer'|action:\s*'creer'/.test(lire('compte/compte.js')), 'compte.js n\'appelle plus creer directement');
  const P = require('../dock/plus.js'), e = P.etat({ connecte: true }, []);
  assert.equal(e.items.find(x => x.id === 'nouveau').href, '/projets/?nouveau=1', 'le + mène à la même création');
  for (const f of ['accueil/accueil.js', 'accueil/je-suis.js', 'accueil/demo.js', 'index.html']) assert.ok(!/\/api\/espaces/.test(lire(f)), f + ' : l\'accueil n\'écrit au serveur que par AIMECreer (compte/creer.js)');
  assert.match(lire('accueil/je-suis.js'), /C\.creer\(\{titre:'Notre mariage',modele:'mariage',origine:C\.origine\('accueil'\)\}\)/, '« Créer notre mariage » : la même fonction de création');
  assert.match(lire('compte/compte.js'), /C\.creer\(\{titre:'Notre mariage',modele:'mariage',origine:CREER\}\)/, 'après le lien de connexion : la même fonction, la même origine');
});

test('la migration relation est numérotée, additive et rejouable', () => {
  const m = lire('db/migrations/2026-10-24-03-relation.sql');
  assert.ok(!/\bdrop\s+(table|column)\b|\bdelete\b|\btruncate\b/i.test(m), 'additive');
  for (const l of m.split(';').map(x => x.trim()).filter(x => /^(alter|create)/i.test(x))) assert.match(l, /if not exists/i, 'rejouable : ' + l.slice(0, 60));
  assert.match(m, /space_members add column if not exists relation text/); assert.match(m, /invitations add column if not exists relation text/);
  assert.match(m, /unique index if not exists spaces_origine_unique on spaces \(owner_id, \(data->>'origine'\)\)/);
});
