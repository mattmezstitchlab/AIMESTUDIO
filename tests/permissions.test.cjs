// Un test par case de la matrice : 5 rôles × chaque situation. Les attendus sont écrits à la main, pas recalculés.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../synchroview/permissions.js');

const S = { owner: { id: 'u-lea', role: 'owner' }, editor: { id: 'u-camille', role: 'editor' }, contributor: { id: 'u-lumen', role: 'contributor' }, viewer: { id: 'u-paul', role: 'viewer' }, guest: { id: 'u-lucie', role: 'guest' } };
const ORDER = ['owner', 'editor', 'contributor', 'viewer', 'guest'];
const space = { type: 'space', id: 'x' };
const shooting = { type: 'event', id: 'shooting', assigneeId: 'u-lumen', authorId: 'u-camille', public: false };
const publicEv = { type: 'event', id: 'ceremonie', authorId: 'u-lea', public: true };
const otherEv = { type: 'event', id: 'traiteur', assigneeId: 'u-x', authorId: 'u-camille', public: false };
const lumenEv = { type: 'event', id: 'livraison', authorId: 'u-lumen', public: false };
const contrat = { type: 'document', id: 'contrat', authorId: 'u-lumen', grants: ['u-lea'] };
const interne = { type: 'document', id: 'interne', authorId: 'u-lumen', grants: [] };
const pourPaul = { type: 'document', id: 'plan', authorId: 'u-lea', grants: ['u-paul'] };
const lucie = { type: 'personal', id: 'rsvp-lucie', subjectId: 'u-lucie' };
const nina = { type: 'personal', id: 'rsvp-nina', subjectId: 'u-nina' };
const acompte = { type: 'payment', id: 'acompte', amount: 360, payer: 'space', payeeId: 'u-lumen' };
const cagnotte = { type: 'payment', id: 'cagnotte-lucie', amount: 50, payer: 'self', payerId: 'u-lucie' };
const tx = (who, p, extra) => Object.assign({ subjectId: S[who].id, paymentId: p.id, amount: p.amount, expires: Date.now() + 60000 }, extra || {});

// [situation, action, ressource, contexte, attendus owner/editor/contributor/viewer/guest]
const CASES = [
  ['espace · lire', 'read', space, null, [1, 1, 1, 1, 1]],
  ['espace · supprimer (6)', 'delete', space, null, [1, 0, 0, 0, 0]],
  ['espace · gérer les membres (5)', 'manage_members', space, null, [1, 0, 0, 0, 0]],
  ['espace · inviter un invité (5)', 'invite', { type: 'space', role: 'guest' }, null, [1, 1, 0, 0, 0]],
  ['espace · inviter une coordination (5)', 'invite', { type: 'space', role: 'editor' }, null, [1, 0, 0, 0, 0]],
  ['moment non public · lire', 'read', shooting, null, [1, 1, 1, 1, 0]],
  ['moment public · lire', 'read', publicEv, null, [1, 1, 1, 1, 1]],
  ['moment attribué au contributeur · modifier (2)', 'edit', shooting, null, [1, 1, 1, 0, 0]],
  ['moment d\'un autre · modifier (2)', 'edit', otherEv, null, [1, 1, 0, 0, 0]],
  ['moment attribué · supprimer', 'delete', shooting, null, [1, 0, 0, 0, 0]],
  ['moment créé par le contributeur · supprimer (2)', 'delete', lumenEv, null, [1, 0, 1, 0, 0]],
  ['moment · créer', 'create', publicEv, null, [1, 1, 0, 0, 0]],
  ['document autorisé au propriétaire · lire (1)', 'read', contrat, null, [1, 0, 1, 0, 0]],
  ['document autorisé au propriétaire · modifier (1)', 'edit', contrat, null, [1, 0, 1, 0, 0]],
  ['document autorisé au propriétaire · partager (1)', 'share', contrat, null, [1, 0, 1, 0, 0]],
  ['document · supprimer (auteur seul)', 'delete', contrat, null, [0, 0, 1, 0, 0]],
  ['document sans autorisation · lire (1)', 'read', interne, null, [0, 0, 1, 0, 0]],
  ['document autorisé à la lecture seule · lire (1)', 'read', pourPaul, null, [1, 0, 0, 1, 0]],
  ['document autorisé à la lecture seule · modifier', 'edit', pourPaul, null, [1, 0, 0, 0, 0]],
  ['document · déposer', 'upload', contrat, null, [1, 1, 1, 0, 0]],
  ['données de Lucie · lire (3)', 'read', lucie, null, [1, 1, 0, 0, 1]],
  ['données de Nina · lire (3)', 'read', nina, null, [1, 1, 0, 0, 0]],
  ['données de Lucie · modifier (3)', 'edit', lucie, null, [1, 0, 0, 0, 1]],
  ['résumé sans noms · lire (3)', 'read', { type: 'summary', id: 'r' }, null, [1, 1, 1, 1, 0]],
  ['acompte · voir', 'read', acompte, null, [1, 1, 1, 0, 0]],
  ['acompte · payer sans autorisation de transaction (4)', 'pay', acompte, null, [0, 0, 0, 0, 0]],
  ['élément public · lire', 'read', { type: 'item', audience: 'public' }, null, [1, 1, 1, 1, 1]],
  ['élément d\'équipe · lire', 'read', { type: 'item', audience: 'equipe' }, null, [1, 1, 1, 0, 0]],
  ['élément de l\'organisation · lire', 'read', { type: 'item', audience: 'organisation' }, null, [1, 1, 0, 0, 0]],
  ['élément à audience inconnue · refusé', 'read', { type: 'item', audience: 'x' }, null, [0, 0, 0, 0, 0]],
  ['action inconnue · refusée par défaut', 'publish', space, null, [0, 0, 0, 0, 0]]
];

for (const [label, action, r, c, want] of CASES) {
  ORDER.forEach((role, i) => {
    test(label + ' · ' + role, () => {
      const d = P.can(S[role], action, r, c);
      assert.equal(d.allow, !!want[i], d.rule + ' — ' + d.reason);
    });
  });
}

// Paiements (4) : le rôle ne suffit pas, il faut une autorisation liée à cette transaction.
test('acompte · propriétaire avec autorisation valide', () => assert.equal(P.can(S.owner, 'pay', acompte, { tx: tx('owner', acompte) }).allow, true));
test('acompte · coordination même avec une autorisation', () => assert.equal(P.can(S.editor, 'pay', acompte, { tx: tx('editor', acompte) }).allow, false));
test('acompte · autorisation expirée', () => assert.equal(P.can(S.owner, 'pay', acompte, { tx: tx('owner', acompte, { expires: Date.now() - 1 }) }).allow, false));
test('acompte · autorisation pour un autre montant', () => assert.equal(P.can(S.owner, 'pay', acompte, { tx: tx('owner', acompte, { amount: 1 }) }).allow, false));
test('acompte · autorisation d\'un autre paiement', () => assert.equal(P.can(S.owner, 'pay', acompte, { tx: tx('owner', cagnotte) }).allow, false));
test('acompte · autorisation émise pour une autre personne', () => assert.equal(P.can(S.owner, 'pay', acompte, { tx: Object.assign(tx('owner', acompte), { subjectId: 'u-camille' }) }).allow, false));
test('acompte · sans autorisation : signale qu\'elle est requise', () => { const d = P.can(S.owner, 'pay', acompte, {}); assert.equal(d.allow, false); assert.equal(d.needsTx, true); });
test('acompte · affichage : permis sous confirmation pour le propriétaire seulement', () => {
  assert.deepEqual(ORDER.map(r => P.canStart(S[r], 'pay', acompte).allow), [true, false, false, false, false]);
});
test('cagnotte · l\'invité paie pour lui avec autorisation', () => assert.equal(P.can(S.guest, 'pay', cagnotte, { tx: tx('guest', cagnotte) }).allow, true));
test('cagnotte · le propriétaire ne paie pas à la place d\'un invité', () => assert.equal(P.can(S.owner, 'pay', cagnotte, { tx: tx('owner', cagnotte) }).allow, false));
test('rôle inconnu · refusé', () => assert.equal(P.can({ id: 'x', role: 'admin' }, 'read', space).allow, false));
test('aucun rôle envoyé · refusé', () => assert.equal(P.can({ id: 'x' }, 'read', space).allow, false));
