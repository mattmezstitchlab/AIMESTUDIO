/* Lot A : contexte déclaré de l'orbe, et logique des six modes (Ligne, Relation, Grille, Composition, Projet). */
const assert=require('assert');const C=require('../orbe/contexte.js');const B=require('../pointzero/broderie.js');const M=require('../pointzero/modes.js');
let n=0;const t=(nom,f)=>{f();n++};
t('verifier : nombre borné et arrondi',()=>{const p={type:'curseur',min:4,max:120,pas:1,unite:'cm'};
 assert.deepStrictEqual(C.verifier(p,'15.4'),{ok:true,valeur:15});assert.strictEqual(C.verifier(p,2).ok,false);assert.strictEqual(C.verifier(p,500).ok,false);assert.strictEqual(C.verifier(p,'abc').ok,false)});
t('verifier : choix, date, texte',()=>{const c={type:'choix',options:[{id:'a'},{id:'b'}]};assert.strictEqual(C.verifier(c,'b').valeur,'b');assert.strictEqual(C.verifier(c,'z').ok,false);
 assert.strictEqual(C.verifier({type:'date'},'2027-06-12').ok,true);assert.strictEqual(C.verifier({type:'date'},'2027-02-30').ok,false);
 assert.strictEqual(C.verifier({type:'texte',max:5},' abcdefgh ').valeur,'abcde');assert.strictEqual(C.verifier(null,1).ok,false)});
t('cycle et types',()=>{assert.deepStrictEqual(C.CYCLE,['observer','proposer','regler','confirmer','enregistrer']);['reglage','noeud','lien','cellule','bloc','projet'].forEach(k=>assert.ok(C.TYPES[k]))});

const fils=[{code:'310',nom:'Noir',hex:'#000000'},{code:'B5200',nom:'Blanc',hex:'#FFFFFF'},{code:'321',nom:'Rouge',hex:'#C72B3B'},{code:'666',nom:'Rouge vif',hex:'#E31D42'},{code:'3371',nom:'Noir brun',hex:'#1E1108'},{code:'06',nom:'Test',hex:'#E0B0A0'}];
function projet(){return{id:'x',choix:{largeurCm:15,usage:'patron',toile:'aida14',finesse:'fidele',couleurs:'equilibre'},confirme:{},ratio:1,
 palette:[{dmc:'310',nom:'Noir',hex:'#000000',ecran:'#050505',points:4},{dmc:'321',nom:'Rouge',hex:'#C72B3B',ecran:'#C02838',points:3},{dmc:'B5200',nom:'Blanc',hex:'#FFFFFF',ecran:'#FAFAFA',points:2}],
 cases:Uint8Array.from([1,1,1,1,2,2,2,3,3,0]),dims:{l:5,h:2}}}
t('Ligne : paramètres, conséquence, réglage confirmé et tracé',()=>{const p=projet();const L=M.parametres(p);assert.deepStrictEqual(L.map(x=>x.id),['largeurCm','usage','toile','finesse','couleurs']);assert.ok(L.every(x=>!x.valide));
 assert.match(M.consequence(p,'largeurCm',30),/points/);M.regler(p,'largeurCm',30);assert.strictEqual(p.confirme.format,true);assert.strictEqual(p.grille.l,B.grille(p.choix,1).l);
 assert.strictEqual(p.decisions.largeurCm.source,'utilisateur');assert.strictEqual(p.historique.length,1);
 M.regler(p,'couleurs','simple');assert.ok(!p.confirme.couleurs,'les couleurs exigent une reconversion')});
t('Relation : voisins réels hors palette, remplacement uniquement par une entrée du nuancier',()=>{const p=projet();const v=M.voisins(p,0,fils,2);assert.strictEqual(v[0].code,'3371');assert.ok(v.every(x=>!['310','321','B5200'].includes(x.code)));
 assert.throws(()=>M.remplacer(p,0,'99999',fils),/nuancier/);assert.throws(()=>M.remplacer(p,0,'321',fils),/déjà/);
 M.remplacer(p,0,'3371',fils);assert.deepStrictEqual([p.palette[0].dmc,p.palette[0].hex,p.palette[0].nom],['3371','#1E1108','Noir brun']);assert.strictEqual(p.confirme.dmc,false);
 const q=projet();q.palette[2]=Object.assign({},q.palette[2],{dmc:'06',hex:'#E0B0A0',nom:'Test'});M.remplacer(q,0,'3371',fils);assert.strictEqual(q.palette[2].dmc,'06','les autres références restent intactes')});
t('Relation : paires proches',()=>{const p=projet();const r=M.paires(p,1)[0];assert.ok(r.a!==r.b&&r.ecart>=0)});
t('Grille : regrouper renumérote les cases et additionne les points',()=>{const p=projet();M.regrouper(p,0,[1]);assert.deepStrictEqual(p.palette.map(x=>x.dmc),['310','B5200']);assert.strictEqual(p.palette[0].points,7);
 assert.deepStrictEqual(Array.from(p.cases),[1,1,1,1,1,1,1,2,2,0]);assert.strictEqual(M.total(p),9)});
t('Grille : déplacer garde chaque case sur son fil',()=>{const p=projet();const avant=Array.from(p.cases).map(v=>v?p.palette[v-1].dmc:null);M.deplacer(p,0,2);assert.deepStrictEqual(p.palette.map(x=>x.dmc),['321','B5200','310']);
 assert.deepStrictEqual(Array.from(p.cases).map(v=>v?p.palette[v-1].dmc:null),avant)});
t('Composition : ordre, tailles bornées, validation',()=>{const p=projet();const c=M.composition(p);assert.strictEqual(c.blocs.length,5);M.bouger(c,'grille',-1);assert.strictEqual(c.blocs[2].id,'grille');
 M.dimensionner(c,'image',9,0);assert.deepStrictEqual([M.composition({composition:c}).blocs[0].l,c.blocs[0].h],[4,1]);assert.strictEqual(c.valide,false);M.valider(p,c);assert.strictEqual(p.composition.valide,true)});
t('Projet : avancements séparés, jamais 100 % de réalisation sans atelier',()=>{const p=projet();B.ETAPES.forEach(e=>p.confirme[e.id]=true);const a=M.avancements(p);
 assert.deepStrictEqual(a.map(x=>x.id),['analyse','confirmations','realisation','livrables']);assert.strictEqual(a[1].v,100);assert.strictEqual(a[2].v,0);assert.strictEqual(a[3].v,0);
 assert.deepStrictEqual(M.manques(p),['La composition']);M.valider(p,M.composition(p));assert.deepStrictEqual(M.manques(p),[])});
t('remontée : ni image ni cases',()=>{const p=projet();p.image='blob';const r=B.remontee(p);assert.ok(!('image' in r)&&!('cases' in r))});
console.log('lot-a : '+n+' tests ok');
