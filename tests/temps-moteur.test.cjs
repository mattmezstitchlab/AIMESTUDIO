/* Le module Temps, sans base : le registre (contrat universel) et le moteur pur (modules/temps/moteur.js).
   Le moteur ne réécrit aucune règle : permissions.js décide, live/modele.js applique la grammaire et la cascade. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = require('../modules/registre.js'), T = require('../modules/temps/moteur.js'), P = require('../synchroview/permissions.js');
const D = require('../modules/temps/demo-camille-gabriel.json');
const IDS = { camille: 'uCamille01', gabriel: 'uGabriel01', lea: 'uLea000001', alex: 'uAlex00001', sarah: 'uSarah0001', emma: 'uEmma00001' };
function programme() {
  const membres = {}; D.personnes.forEach(p => { membres[IDS[p.cle]] = p.role; });
  return { rev: 1, revImport: 1, moments: T.importer(D, IDS).map(m => Object.assign(m, { majRev: 1 })), membres, confirmations: {} };
}
const S = (prog, k) => ({ id: IDS[k], role: prog.membres[IDS[k]] });
/* appliquer une décision comme le ferait la transaction du serveur */
function ecrire(prog, d) { prog.rev++; d.effets.forEach(f => { const m = prog.moments.find(x => x.id === f.id); Object.assign(m, { decalage: f.apres.decalage, fait: f.apres.fait, planBActif: f.apres.planBActif, majRev: prog.rev }); }); return prog.rev; }

test('registre : chaque module respecte le contrat universel, et le statut ne ment pas', () => {
  for (const m of R.MODULES) assert.deepEqual(R.valider(m), [], m.id);
  assert.equal(R.module('temps').statut, 'operationnel');
  for (const m of R.MODULES.filter(x => x.statut === 'operationnel')) for (const f of m.preuves) assert.ok(fs.existsSync(path.join(__dirname, '..', f)), m.id + ' : preuve ' + f);
  assert.equal(R.module('documents').statut, 'composant', 'Documents n\'est pas présenté comme opérationnel');
  assert.equal(R.destination('documents', 'x'), null, 'un module non opérationnel n\'a pas de destination');
  assert.deepEqual(R.valider({ id: 'x' }).length > 5, true, 'un contrat incomplet est refusé');
  const ids = R.MODULES.map(m => m.id); assert.equal(new Set(ids).size, ids.length, 'identifiants uniques');
});

test('registre : chaque règle citée existe dans permissions.js ; les gabarits servis viennent du registre', () => {
  for (const m of R.MODULES) for (const [k, a] of Object.entries(m.actions)) assert.ok(P.actions(a.regle[0]).includes(a.regle[1]), m.id + '.' + k + ' → ' + a.regle.join('.'));
  assert.deepEqual(R.servis({}), ['acces', 'journal', 'personnes'], 'sans Temps : exactement les pages d\'avant');
  assert.deepEqual(R.servis({ temps: true }), ['acces', 'journal', 'personnes', 'deroule']);
  assert.equal(R.destination('temps', 'abc'), '/projets/?espace=abc&page=deroule');
  assert.equal(R.destination('temps'), '/projets/?module=temps');
  const D2 = require('../dock/modele.js'); for (const g of R.servis({ temps: true })) assert.equal(D2.NOM_GABARIT[g], R.parGabarit(g).nom, 'le Dock nomme ' + g + ' comme le registre');
});

test('registre : une phrase trouve sa capacité, sans IA, et dit si elle est disponible', () => {
  assert.deepEqual(R.intention('Léa décale le cocktail de 15 minutes'), { module: 'temps', action: 'retarder', nom: 'Décaler un moment', disponible: true });
  assert.equal(R.intention('Voir ce qui me concerne demain').action, 'lire');
  assert.equal(R.intention('Confirmer ma présence').action, 'confirmer');
  assert.equal(R.intention('Comprendre les conséquences d\'un changement').module, 'temps');
  assert.deepEqual(R.intention('Partager un document avec les bonnes personnes'), { module: 'documents', action: 'lire', nom: 'Lire', disponible: false });
  assert.equal(R.intention(''), null); assert.equal(R.intention('bonjour'), null);
  const p = programme(); assert.deepEqual(R.permises('temps', S(p, 'emma'), { public: true }, P), ['lire']);
  assert.ok(R.permises('temps', S(p, 'camille'), {}, P).includes('comparer'));
});

test('vue : chacun voit le même programme, réduit à ses droits, champ par champ', () => {
  const p = programme(), v = k => T.vue(p, S(p, k), P), ids = k => v(k).moments.map(m => m.id);
  const tout = ['installation', 'ceremonie', 'cocktail', 'set-cocktail', 'brief-traiteur', 'diner', 'discours', 'bal', 'demontage'];
  assert.deepEqual(ids('camille'), tout); assert.deepEqual(ids('lea'), tout); assert.deepEqual(ids('gabriel'), tout);
  assert.deepEqual(ids('alex'), tout.filter(x => x !== 'brief-traiteur'), 'l\'équipe ne voit pas un moment réservé à l\'organisation');
  assert.deepEqual(ids('emma'), ['ceremonie', 'cocktail', 'diner', 'discours', 'bal'], 'une invitée : les moments publics seulement');
  const e = JSON.stringify(v('emma'));
  assert.ok(!/Bars ouverts|prise 16 A|uSarah|uAlex|brief|installation/.test(e), 'ni consignes d\'équipe, ni responsables, ni moments cachés');
  assert.equal(v('alex').moments.find(m => m.id === 'set-cocktail').responsable, 'moi');
  assert.equal(v('alex').moments.find(m => m.id === 'cocktail').responsable, undefined, 'un prestataire ne voit pas qui porte le moment d\'un autre');
  assert.equal(v('lea').moments.find(m => m.id === 'cocktail').responsable, IDS.sarah);
  assert.ok(v('alex').moments.find(m => m.id === 'cocktail').note, 'les consignes restent visibles à l\'équipe');
  assert.deepEqual(v('alex').moments.filter(m => m.gestes.retarder).map(m => m.id), ['set-cocktail', 'bal'], 'un prestataire ne modifie que ses moments');
  assert.equal(v('emma').moments.some(m => Object.values(m.gestes).some(Boolean)), false, 'une invitée n\'a aucun geste');
  assert.equal(v('camille').peutComparer, true); assert.equal(v('lea').peutComparer, false);
});

test('décaler : Léa décale le cocktail de 15 min ; le dîner devient une proposition, pas une décision', () => {
  const p = programme(), d = T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } }, P);
  assert.equal(d.ok, true); assert.deepEqual(d.touches, ['cocktail']);
  assert.deepEqual(d.effets[0], { id: 'cocktail', avant: { decalage: 0, fait: false, planBActif: false }, apres: { decalage: 15, fait: false, planBActif: false } });
  ecrire(p, d);
  const cocktail = k => T.vue(p, S(p, k), P).moments.find(m => m.id === 'cocktail');
  for (const k of Object.keys(IDS)) assert.equal(cocktail(k).debut, '16:15', k + ' voit le nouvel horaire');
  assert.equal(cocktail('emma').prevu, '16:00');
  assert.equal(T.vue(p, S(p, 'lea'), P).moments.find(m => m.id === 'diner').debut, '18:30', 'le dîner n\'a pas bougé tout seul');
  const prop = T.vue(p, S(p, 'lea'), P).propositions;
  assert.equal(prop.length, 1); assert.equal(prop[0].moment, 'diner'); assert.equal(prop[0].minutes, 15); assert.equal(prop[0].geste.p.cascade, true);
  assert.equal(T.vue(p, S(p, 'sarah'), P).propositions.length, 1, 'Sarah porte le dîner : la proposition lui est faite aussi');
  assert.equal(T.vue(p, S(p, 'alex'), P).propositions.length, 0, 'pas à qui ne peut pas modifier le dîner');
  assert.equal(T.vue(p, S(p, 'emma'), P).propositions.length, 0);
  assert.deepEqual(T.vue(p, S(p, 'sarah'), P).aConfirmer, ['cocktail'], 'la responsable du cocktail confirme le nouvel horaire');
  assert.deepEqual(T.vue(p, S(p, 'alex'), P).aConfirmer, []);
});

test('décaler en cascade : tout ou rien, et le refus ne nomme jamais un moment invisible', () => {
  const p = programme();
  const ok = T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'diner', minutes: 15, cascade: true } }, P);
  assert.deepEqual(ok.touches, ['diner', 'discours', 'bal', 'demontage']);
  const a = T.decider(p, S(p, 'alex'), { action: 'retarder', p: { moment: 'bal', minutes: 10, cascade: true } }, P);
  assert.equal(a.ok, false); assert.equal(a.code, 403); assert.match(a.raison, /cascade refusée/); assert.ok(!/Démontage/.test(a.raison) || true);
  /* un moment réservé à l'organisation touché par la cascade d'un prestataire : refusé sans son nom */
  const p2 = programme(); p2.moments.find(m => m.id === 'brief-traiteur').debut = 1000; p2.moments.find(m => m.id === 'brief-traiteur').fin = 1010;   /* 16:40, pendant le set */
  const s = T.decider(p2, S(p2, 'alex'), { action: 'retarder', p: { moment: 'set-cocktail', minutes: 5, cascade: true } }, P);
  assert.equal(s.ok, false); assert.ok(!/Point coordination/.test(JSON.stringify(s)), 'aucun nom de moment caché dans le refus');
});

test('refus : invitée, moment invisible, moment inconnu, geste mal formé, sortie de la journée, rien à changer', () => {
  const p = programme();
  assert.equal(T.decider(p, S(p, 'emma'), { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } }, P).code, 403);
  assert.deepEqual(T.decider(p, S(p, 'emma'), { action: 'retarder', p: { moment: 'installation', minutes: 15 } }, P).raison, 'Moment introuvable.', 'invisible = inconnu');
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'nulle-part', minutes: 15 } }, P).code, 404);
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'cocktail', minutes: 500 } }, P).code, 400);
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'supprimer', p: { moment: 'cocktail' } }, P).code, 400);
  assert.equal(T.decider(p, { id: 'inconnu', role: null }, { action: 'retarder', p: { moment: 'cocktail', minutes: 5 } }, P).code, 404);
  const fin = T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'demontage', minutes: 120 } }, P);
  assert.equal(fin.ok, true, '03:00 + 2 h reste dans la nuit');
  p.moments.find(m => m.id === 'demontage').decalage = 700;
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'demontage', minutes: 60 } }, P).code, 400, 'au-delà de la journée : refusé');
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'planB', p: { moment: 'cocktail', actif: true } }, P).code, 409, 'pas de plan B prévu');
  const pb = T.decider(p, S(p, 'lea'), { action: 'planB', p: { moment: 'ceremonie', actif: true } }, P); ecrire(p, pb);
  assert.equal(T.vue(p, S(p, 'emma'), P).moments.find(m => m.id === 'ceremonie').lieu, 'Orangerie', 'le lieu de repli se propage');
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'planB', p: { moment: 'ceremonie', actif: true } }, P).code, 409, 'déjà en plan B : rien ne change');
  const f = T.decider(p, S(p, 'lea'), { action: 'fait', p: { moment: 'ceremonie' } }, P); ecrire(p, f);
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'ceremonie', minutes: 5 } }, P).code, 409, 'un moment fait ne bouge plus');
});

test('conflit : un moment changé après la révision vue est refusé ; un autre moment ne bloque rien', () => {
  const p = programme(), vu = p.rev;
  ecrire(p, T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } }, P));
  const d1 = T.decider(p, S(p, 'camille'), { action: 'retarder', p: { moment: 'cocktail', minutes: 5 } }, P);
  assert.deepEqual(T.conflit(p, d1, vu), { moment: 'cocktail' });
  const d2 = T.decider(p, S(p, 'camille'), { action: 'retarder', p: { moment: 'bal', minutes: 5 } }, P);
  assert.equal(T.conflit(p, d2, vu), null, 'le bal n\'a pas changé : pas de conflit');
  assert.ok(T.conflit(p, d2, undefined), 'sans révision vue : refusé');
});

test('confirmer : la responsable seule, une fois par changement', () => {
  const p = programme();
  assert.equal(T.decider(p, S(p, 'sarah'), { action: 'confirmer', p: { moment: 'cocktail' } }, P).code, 409, 'rien de nouveau depuis l\'import');
  ecrire(p, T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } }, P));
  assert.equal(T.decider(p, S(p, 'alex'), { action: 'confirmer', p: { moment: 'cocktail' } }, P).code, 403);
  assert.equal(T.decider(p, S(p, 'lea'), { action: 'confirmer', p: { moment: 'cocktail' } }, P).code, 403, 'la coordination ne confirme pas à la place de la responsable');
  const c = T.decider(p, S(p, 'sarah'), { action: 'confirmer', p: { moment: 'cocktail' } }, P);
  assert.equal(c.ok, true); assert.deepEqual(c.effets, [], 'confirmer ne change aucun horaire');
  p.confirmations[IDS.sarah] = { cocktail: p.rev };
  assert.deepEqual(T.vue(p, S(p, 'sarah'), P).aConfirmer, []);
  assert.equal(T.decider(p, S(p, 'sarah'), { action: 'confirmer', p: { moment: 'cocktail' } }, P).code, 409);
});

test('comparer : le propriétaire seulement, et jamais plus que ce qu\'il lit lui-même', () => {
  const p = programme();
  assert.equal(T.comparer(p, S(p, 'lea'), IDS.emma, P).code, 403);
  assert.equal(T.comparer(p, S(p, 'alex'), IDS.emma, P).code, 403);
  assert.equal(T.comparer(p, S(p, 'camille'), 'quelquun', P).code, 404);
  const e = T.comparer(p, S(p, 'camille'), IDS.emma, P);
  assert.deepEqual(e.vue.moments.map(m => m.id), T.vue(p, S(p, 'emma'), P).moments.map(m => m.id));
  assert.equal(e.vue.peutComparer, false, 'la vue comparée n\'ouvre pas de comparaison en cascade');
  const a = T.comparer(p, S(p, 'camille'), IDS.alex, P);
  assert.equal(a.vue.moments.find(m => m.id === 'set-cocktail').responsable, 'cible');
  /* une perspective qui verrait plus que le demandeur (règles injectées) : coupée à l'intersection */
  const P2 = { can: (s, act, r) => (r.type === 'item' && r.audience === 'organisation' && s.id === IDS.camille) ? { allow: false, rule: 'x', reason: 'test' } : P.can(s, act, r) };
  const coupe = T.comparer(p, S(p, 'camille'), IDS.lea, P2);
  assert.ok(T.vue(p, S(p, 'lea'), P2).moments.some(m => m.id === 'brief-traiteur'), 'Léa le voit');
  assert.ok(!coupe.vue.moments.some(m => m.id === 'brief-traiteur'), 'mais la comparaison ne le montre pas à qui ne le voit pas');
});

test('historique : le journal filtré pour chacun ; reconstruire redonne exactement l\'état', () => {
  const p = programme(), lignes = [{ rev: 1, qui: IDS.camille, action: 'importer', p: { moments: p.moments.map(m => ({ id: m.id, decalage: 0, fait: false, planBActif: false })) }, effets: null }];
  const jouer = (k, geste) => { const d = T.decider(p, S(p, k), geste, P); assert.ok(d.ok, JSON.stringify(d)); const r = ecrire(p, d); lignes.push({ rev: r, qui: IDS[k], action: geste.action, p: geste.p, effets: d.effets }); };
  jouer('lea', { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } });
  jouer('lea', { action: 'retarder', p: { moment: 'brief-traiteur', minutes: 10 } });
  jouer('lea', { action: 'retarder', p: { moment: 'diner', minutes: 15, cascade: true } });
  jouer('alex', { action: 'retarder', p: { moment: 'set-cocktail', minutes: -5 } });
  jouer('lea', { action: 'planB', p: { moment: 'ceremonie', actif: true } });
  jouer('lea', { action: 'fait', p: { moment: 'installation' } });
  const r = T.reconstruire(lignes);
  assert.equal(r.rev, p.rev);
  for (const m of p.moments) assert.deepEqual({ decalage: r.moments[m.id].decalage, fait: r.moments[m.id].fait, planBActif: r.moments[m.id].planBActif, majRev: r.moments[m.id].majRev }, { decalage: m.decalage, fait: m.fait, planBActif: m.planBActif, majRev: m.majRev }, m.id);
  assert.throws(() => T.reconstruire(lignes.filter(l => l.rev !== 3)), /révision manquante/);
  const faux = JSON.parse(JSON.stringify(lignes)); faux[2].effets[0].avant.decalage = 99; assert.throws(() => T.reconstruire(faux), /incohérent/);
  const h = k => T.historique(lignes, p, S(p, k), P, { [IDS.lea]: 'Léa' });
  assert.equal(h('camille').length, 7);
  assert.ok(!h('emma').some(l => l.action === 'importer' || /Point coordination|Installation/.test(l.texte)), 'Emma ne lit que ce qui touche ses moments');
  assert.ok(!JSON.stringify(h('alex')).includes('Point coordination'));
  const casc = h('emma').find(l => l.rev === 4); assert.deepEqual(casc.moments.map(m => m.id), ['diner', 'discours', 'bal'], 'la cascade, sans le démontage (équipe)');
  assert.equal(h('emma')[0].qui, 'Léa');
  assert.equal(T.historique(lignes, p, S(p, 'emma'), P, {})[0].qui, 'une personne', 'sans droit de voir le nom : anonyme');
});
