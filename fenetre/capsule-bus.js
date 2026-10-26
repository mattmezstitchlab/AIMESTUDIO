/* La Fenêtre · AIME : modes de capsule & objets typés (client, sans accès serveur). */
(function (root) {
  'use strict';
  const TYPES = Object.freeze(['temps', 'musique', 'media', 'contact', 'ticket']);
  function estObjet(o) {
    return !!o && typeof o === 'object' && !Array.isArray(o) &&
      typeof o.type === 'string' && TYPES.includes(o.type) &&
      (!o.id || (typeof o.id === 'string' && o.id.length <= 80)) &&
      (!o.mediaId || (typeof o.mediaId === 'string' && o.mediaId.length <= 80));
  }
  function activer(o) {
    if (!estObjet(o)) return false;
    if (typeof document !== 'object' || typeof CustomEvent !== 'function') return false;
    const selection = Object.freeze({
      type: o.type,
      id: typeof o.id === 'string' ? o.id : '',
      mediaId: typeof o.mediaId === 'string' ? o.mediaId : ''
    });
    document.dispatchEvent(new CustomEvent('aime:capsule', { detail: selection }));
    return true;
  }
  const api = Object.freeze({ types: TYPES, estObjet, activer });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AIMECapsule = api;
})(typeof window === 'object' ? window : globalThis);
