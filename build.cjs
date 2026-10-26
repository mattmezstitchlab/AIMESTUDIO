// Vérification du bundle statique en déploiement.
// Ne charge pas /scripts ni /tests : ils sont exclus de Vercel par .vercelignore.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const required = [
  'index.html', 'fenetre/index.html', 'fenetre/fenetre.css', 'fenetre/media/provence.jpg',
  'union/app.js', 'union/model.js', 'union/style.css', 'union/immersive.js',
  'union/immersive.css', 'union/editorial.css', 'union/compact.css', 'union/navigation.css',
  'fenetre/editorial.css', 'union/media/terrace.jpg', 'union/data/story.json',
  'union/data/templates.json', 'union/data/worlds.json', 'union/journey.css',
  'union/supports.css', 'union/integrations/catalogue.json', 'union/integrations/objects.json',
  'union/integrations/ticketaime/renderer.js'
];
for (const path of required) assert.ok(fs.statSync(path).size > 0, path);
const modules = [
  'union/app.js', 'union/model.js', 'union/editorial.js', 'union/navigation.js',
  'union/immersive.js', 'union/world-config.js', 'union/projects.js',
  'union/render-story.js', 'union/icons.js', 'union/scenography.js',
  'union/atlas.js', 'union/supports.js', 'union/support-renderers.js',
  'union/renaissance.js', 'fenetre/fenetre.js', 'fenetre/route.js', 'fenetre/inventaire.js'
];
for (const path of modules) cp.execFileSync(process.execPath, ['--input-type=module', '--check'], {
  input: fs.readFileSync(path), stdio: ['pipe', 'inherit', 'inherit']
});
console.log('AIME: fichiers et syntaxe des modules statiques validés. Tests applicatifs exécutés séparément en CI.');
