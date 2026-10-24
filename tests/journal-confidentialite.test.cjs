// La confidentialité s'applique au lecteur partagé : journal brut et pages ne peuvent pas diverger.
const { test } = require('node:test');
const assert = require('node:assert/strict');

async function lecture(moi, rows) {
  const J = await import('../api/_auth/journal.mjs'); J._oublier();
  const db = { async query(sql) {
    if (sql.includes('to_regclass')) return { rows: [{ t: 'audit', g: true }] };
    return { rows };
  } };
  return J.lire(db, { espace: 'projet-test', moi, tout: moi === 'proprietaire' });
}
const ligne = () => ({ at: new Date('2026-10-24T07:18:42.123Z'), user_id: 'auteur-test', action: 'signalement',
  detail: { cible: 'auteur-test', role: 'guest', objet: 'acces_inattendu', motif: 'Un accès inattendu', futurIdentifiant: 'auteur-test' } });

test('signalement : tout autre lecteur ne reçoit ni auteur, ni cible, ni rôle, ni heure exacte', async () => {
  const source = ligne(), avant = structuredClone(source);
  for (const moi of ['proprietaire', 'autre-membre']) {
    const [r] = await lecture(moi, [source]);
    assert.deepEqual(r, { le: '2026-10-24', qui: null, action: 'signalement', detail: { objet: 'acces_inattendu', motif: 'Un accès inattendu' } });
    assert.ok(!JSON.stringify(r).includes('auteur-test'));
  }
  assert.deepEqual(source, avant, 'la ligne stockée reste intacte');
});

test('signalement : son auteur garde sa propre trace complète', async () => {
  const source = ligne(), [r] = await lecture('auteur-test', [source]);
  assert.equal(r.qui, source.user_id); assert.equal(r.le, source.at.toISOString());
  assert.deepEqual(r.detail, source.detail);
});

test('les autres événements du journal restent inchangés', async () => {
  const source = { ...ligne(), action: 'invitation' }, [r] = await lecture('proprietaire', [source]);
  assert.deepEqual(r, { le: source.at.toISOString(), qui: source.user_id, action: source.action, detail: source.detail });
});
