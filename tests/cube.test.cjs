/* Phase C : le cube-personne, un seul modèle ; les cartes postales du Monde AIME. */
const assert=require('assert'),fs=require('fs'),path=require('path');const C=require('../cube/modele.js');const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0;const t=(nom,f)=>{f();n++};

t('Régie personnelle : le Bureau et le dock lisent le même cube, par le même stockage et la même vue',()=>{const A=require('../os/apps.js'),c=A.catalogue([]);
 assert.equal(A.epingles(c)[0].id,'cube','le cube en tête du dock');assert.equal(A.epingles(c,['regie','stitch'])[0].id,'cube','même avec des épingles choisies');assert.equal(A.epingles(c,['cube','regie']).filter(a=>a.id==='cube').length,1,'jamais en double');
 const os=lire('os/os.js'),b=lire('bureau/index.html'),r=lire('cube/regie.js'),i=lire('cube/index.html'),v=lire('cube/vue3d.js');
 assert.ok(os.includes("a.id==='cube'&&window.AIMECubeVue")&&os.includes('AIMECubeVue.miniHTML()'),'miniature du cube dans le dock');
 ['/cube/modele.js','/cube/stock.js','/cube/vue3d.js'].forEach(f=>{assert.ok(b.includes(f),'Bureau : '+f);assert.ok(i.includes(f),'Mon cube : '+f)});
 assert.ok(!/localStorage|sessionStorage/.test(r+v),'les vues ne touchent pas au stockage');assert.ok(r.includes('S.charger(moi)')&&r.includes('V.monter('),'même modèle, même vue');
 assert.ok(r.includes("'/aime/?carte='")&&lire('cube/cartes.js').includes("get('carte')"),'écrire ou corriger la carte dans Le Monde AIME');
 assert.ok(/droitsOrbe/.test(r)&&/aucun/.test(r),'l\'orbe : préférences affichées, droits vides');assert.ok(!/regie\/regie\.js|\/regie\/index/.test(i),'la Régie maîtresse n\'est pas chargée');
 assert.ok(v.includes("'keydown'")&&v.includes("'pointerdown'")&&/RM\)box\.classList/.test(v.replace('if(!RM)','RM)')),'tourner au doigt, à la souris, au clavier ; mouvement réduit');});
t('six facettes, les catégories demandées, chacune sur une face distincte du cube de la grande page',()=>{
 assert.deepStrictEqual(C.IDS,['identite','medias','temps','relations','documents','activites']);
 assert.deepStrictEqual(C.FACETTES.map(f=>f.face).sort(),[0,1,2,3,4,5]);
 C.FACETTES.forEach(f=>{assert.ok(f.champs.length>=1&&f.champs.length<=3,f.id);assert.ok(Array.isArray(f.blocs)&&f.blocs.length,f.id)});
 assert.ok(C.facette('identite').blocs.includes('timbre')&&C.facette('identite').blocs.includes('orbe'),'la face Identité prévoit les blocs Timbre et Orbe')});

t('un cube neuf est vide, privé, et ne copie ni le nom ni le timbre du compte',()=>{const c=C.vide('u1');
 C.IDS.forEach(id=>{assert.equal(c.facettes[id].etat,'vide');assert.equal(c.facettes[id].visibilite,'prive')});
 assert.deepStrictEqual(C.progression(c),{posees:0,total:6});const s=C.aGarder(c);assert.ok(!/"nom"|"name"|"email"|"image"/.test(s),'aucune donnée de profil dupliquée')});

t('le trajet d\'une carte : écrite → timbrée → posée ; impossible de sauter une étape',()=>{const c=C.vide('u1');
 assert.throws(()=>C.timbrer(c,'temps'),/au moins une ligne/);assert.throws(()=>C.poser(c,'temps'),/timbrée/);
 C.ecrire(c,'temps',{moment:'  Le 14 juin  ',rythme:'Le soir'});assert.equal(c.facettes.temps.etat,'ecrite');assert.equal(c.facettes.temps.champs.moment,'Le 14 juin');
 assert.throws(()=>C.poser(c,'temps'),/timbrée/);C.timbrer(c,'temps');assert.equal(c.facettes.temps.etat,'timbree');
 C.poser(c,'temps',Date.UTC(2026,9,22));assert.equal(c.facettes.temps.etat,'posee');assert.equal(c.facettes.temps.le,'2026-10-22T00:00:00.000Z');
 assert.deepStrictEqual(C.progression(c),{posees:1,total:6})});

t('une facette peut rester partielle ; corriger une carte posée la laisse posée',()=>{const c=C.vide('u1');
 C.ecrire(c,'identite',{phrase:'Je relie les gens'});C.timbrer(c,'identite');C.poser(c,'identite');assert.equal(C.completude(c,'identite'),.5);
 C.ecrire(c,'identite',{phrase:'Je relie les gens',intention:'Un atelier'});assert.equal(c.facettes.identite.etat,'posee');assert.equal(C.completude(c,'identite'),1);
 C.ecrire(c,'identite',{});assert.equal(c.facettes.identite.etat,'vide','tout effacer vide la facette')});

t('les champs sont bornés : clés connues, choix fermés, longueur maximale',()=>{const c=C.vide('u1');
 C.ecrire(c,'medias',{titre:'x'.repeat(500),nature:'Hologramme',pirate:'<script>'});
 assert.equal(c.facettes.medias.champs.titre.length,60);assert.ok(!('nature' in c.facettes.medias.champs),'choix inconnu refusé');assert.ok(!('pirate' in c.facettes.medias.champs));
 assert.throws(()=>C.ecrire(c,'inconnue',{}),/inconnue/)});

t('privé par défaut : apparaître dans le cube ne publie rien ; publier est un geste explicite sur une facette posée',()=>{const c=C.vide('u1');
 C.ecrire(c,'relations',{cercle:'Amis',partage:'La musique'});C.timbrer(c,'relations');
 assert.throws(()=>C.publier(c,'relations',true),/posée/);C.poser(c,'relations');assert.deepStrictEqual(C.publiques(c),{},'posée mais privée : rien pour le Réseau');
 C.publier(c,'relations',true);assert.deepStrictEqual(Object.keys(C.publiques(c)),['relations']);C.publier(c,'relations',false);assert.deepStrictEqual(C.publiques(c),{});
 C.publier(c,'relations',true);C.retirer(c,'relations');assert.equal(c.facettes.relations.visibilite,'prive','retirer dépublie')});

t('l\'orbe : des préférences bornées qui ne donnent jamais de droits',()=>{const c=C.vide('u1');assert.deepStrictEqual(c.droitsOrbe,[]);
 C.reglerOrbe(c,{autonomie:'prepare',apparence:'calme',droitsOrbe:['tout'],permissions:['lire'],couleurs:'fluo'});
 assert.equal(c.orbe.autonomie,'prepare');assert.equal(c.orbe.apparence,'calme');assert.equal(c.orbe.couleurs,'aime','valeur inconnue ignorée');
 assert.deepStrictEqual(c.droitsOrbe,[],'plus autonome ≠ plus de droits');assert.ok(!('permissions' in c.orbe)&&!('droitsOrbe' in c.orbe));
 const r=C.relire(JSON.stringify(Object.assign(C.vide('u1'),{droitsOrbe:['tout']})),'u1');assert.deepStrictEqual(r.droitsOrbe,[],'les droits ne se relisent pas depuis le stockage local')});

t('relire : aller-retour fidèle, et rien d\'un autre compte ni d\'une version inconnue',()=>{const c=C.vide('u1');C.ecrire(c,'documents',{besoin:'Contrats'});C.timbrer(c,'documents');C.poser(c,'documents');C.publier(c,'documents',true);
 const r=C.relire(C.aGarder(c),'u1');assert.deepStrictEqual(r,c);
 assert.equal(C.relire(C.aGarder(c),'u2').facettes.documents.etat,'vide','le cube de u1 ne s\'ouvre pas pour u2');
 assert.equal(C.relire('{"v":99}','u1').facettes.documents.etat,'vide');assert.equal(C.relire('pas du json','u1').v,1);
 const faux=JSON.parse(C.aGarder(c));faux.facettes.temps={etat:'posee',champs:{},visibilite:'publie'};assert.equal(C.relire(faux,'u1').facettes.temps.etat,'vide','une facette posée sans contenu redevient vide')});

t('la grande page charge le modèle et les cartes, sans toucher au titre ni au cube du héros',()=>{const h=lire('aime/index.html');
 assert.ok(h.includes('/cube/modele.js')&&h.includes('/cube/cartes.js')&&h.includes('/cube/cartes.css'));
 assert.ok(h.indexOf('/compte/timbre.js')<h.indexOf('/cube/cartes.js'),'le timbre existant est chargé avant');
 const v=JSON.parse(lire('vercel.json')),pris=(v.rewrites||[]).map(r=>r.source.split('/')[1]).filter(Boolean);['/cube/modele.js','/cube/cartes.js','/cube/cartes.css'].forEach(f=>assert.ok(!pris.includes(f.split('/')[1]),f+' : dossier non réécrit par vercel.json'));
 assert.ok(h.includes('<h1 class="h0t" id="h0t" aria-label="Le monde AIME"><span aria-hidden="true">Le m<span class="hcube" id="hcube"><span class="hc3" id="hc3"></span></span>nde</span><em aria-hidden="true">AIME</em></h1>'),'titre intact')});

t('les cartes : timbre existant, glisser-déposer ET commande accessible, fente, voyage contrôlable, mouvement réduit',()=>{const j=lire('cube/cartes.js'),s=lire('cube/cartes.css');
 assert.ok(j.includes('AIMETimbre')&&!/\.timbre\{/.test(s.replace(/\.cp[^{]*\.timbre\{/g,'')),'pas de second timbre');
 assert.ok(j.includes("'pointerdown'")&&j.includes('cp-apposer'),'glisser et bouton');assert.ok(j.includes('cp-fente')&&j.includes('cp-pause')&&j.includes('cp-passer'));
 assert.ok(j.includes('aimeRuler')&&j.includes('svAnchors'),'la règle et les repères de la page sont réutilisés');
 assert.ok(/if\(RM\)\{versY\(voyage\.b\);arriver\(\)/.test(j),'mouvement réduit : arrivée directe');assert.ok(/prefers-reduced-motion/.test(s));
 {const st=lire('cube/stock.js');assert.ok(st.includes("'aime-cube:'")&&st.includes('sessionStorage'),'local par compte ; la démonstration ne persiste pas');assert.ok(j.includes('AIMECubeStock')&&!j.includes('localStorage'),'un seul endroit pour le stockage : cube/stock.js')}
 assert.ok(!/fetch\([^)]*(POST|method)/.test(j),'rien n\'est envoyé au serveur');assert.ok(j.includes("'Démonstration'"),'la démonstration est dite')});

t('assemblage : même cube, faces en attente en verre, ouverture et orbe de la page, compagnon existant',()=>{const j=lire('cube/assemblage.js'),s=lire('cube/assemblage.css'),h=lire('aime/index.html'),c=lire('cube/cartes.js');
 assert.ok(h.indexOf('/cube/cartes.js')<h.indexOf('/cube/assemblage.js'),'chargé après les cartes');assert.ok(c.includes("signal('posee',V.id)")&&c.includes("'aime:cube'"),'les cartes signalent la pose');
 assert.ok(j.includes('AIMECartes.cube()')&&!/AIMECube\.vide|aGarder|localStorage/.test(j),'lecture seule du modèle, aucune seconde copie');
 assert.ok(j.includes('#cube2 .f2')&&!/cube2'\)\.innerHTML|\.style\.transform\s*=/.test(j.replace(/orbe\.style|jauge\.style/g,'')),'le cube de la page garde ses faces et ses transformations');
 assert.ok(j.includes('AIMECompagnon')&&j.includes('converser'),'l\'orbe ouvre le compagnon existant');assert.ok(/var\(--conic/.test(s)&&/animation:hue 6s linear infinite/.test(s),'même orbe que la page');
 assert.ok(/if\(RM\|\|jeu\)return/.test(j)&&/prefers-reduced-motion/.test(s),'mouvement réduit : pas d\'ouverture jouée');assert.ok(j.includes("addEventListener('wheel',main"),'la personne reprend la main')});
console.log('cube : '+n+' tests ok');
