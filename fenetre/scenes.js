/* Scene contract v1: manual visual presets only, no permission or availability decisions. */
(function (root) {
  'use strict';
  const scenes = [
    { id: 'matin-brume', title: 'Matin embué', description: 'Une vitre à explorer au réveil.', phase: 'matin', season: 'automne', weather: 'brume' },
    { id: 'pluie-calme', title: 'Pluie au calme', description: 'Observer les gouttes depuis la fenêtre.', phase: 'jour', season: 'automne', weather: 'pluie' },
    { id: 'nuit-etoilee', title: 'Nuit étoilée', description: 'Le ciel et les informations en constellation.', phase: 'nuit', season: 'ete', weather: 'clair' },
    { id: 'neige', title: 'Neige d’hiver', description: 'Un paysage hivernal simulé.', phase: 'matin', season: 'hiver', weather: 'neige' },
    { id: 'printemps', title: 'Matin de printemps', description: 'Une lumière claire pour commencer.', phase: 'matin', season: 'printemps', weather: 'clair' },
    { id: 'golden', title: 'Lumière dorée', description: 'La lumière du soir, sans événement associé.', phase: 'golden', season: 'ete', weather: 'clair' }
  ].map(scene => Object.freeze({ version: 1, mode: 'manual', meaning: 'decorative', audience: 'local', narration: null, ...scene }));
  const catalog = Object.freeze(scenes);
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  else root.OpenAimeScenes = catalog;
})(typeof window === 'object' ? window : globalThis);
