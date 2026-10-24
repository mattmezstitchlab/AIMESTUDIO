/* Le Dock par rôle (docs/DOCK.md) : la composition est la seule source ; une entrée interdite n'existe pas, même en texte. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const R=p=>path.join(__dirname,'..',p);const lire=p=>fs.readFileSync(R(p),'utf8');
const D=require('../dock/modele.js');

test('dock : chaque rôle serveur a un instantané stable (entrées et gestes du +)',()=>{
 const inst=r=>{const c=D.composer({roleServeur:r});return c.lieux.map(e=>e.id).join(',')+' | '+c.plus.map(a=>a.id).join(',')};
 assert.equal(inst('owner'),'notifications,messages,projet,calendrier | inviter,ecrire,tache,publier');
 assert.equal(inst('editor'),'notifications,deroule,equipe,planb | ecrireEquipe,modifierDeroule,planB,inviter');
 assert.equal(inst('contributor'),'notifications,mission,documents,messages | deposer,retard,ecrireCoordination');
 assert.equal(inst('viewer'),'controle,exports,journal | exporter,demanderPiece');
 assert.equal(inst('guest'),'programme,mareponse,lieu,messages | confirmer,ecrireOrganisateurs');
 assert.equal(inst(undefined),'coeur,exemples,lab,compte | commencer');
});

test('dock : la réponse d\'une invitée ne contient ni Budget, ni Personnes, ni aucun nom d\'entrée interdite, même en texte',()=>{
 for(const c of [D.composer({roleServeur:'guest'}),D.composer({instance:'mariage:invite'})]){const t=D.mots(c);
  for(const mot of ['Budget','Personnes','Effectif','Équipe','Déroulé','Mission','Réglages','Journal','Surprise','Plan B'])assert.ok(!t.includes(mot),mot+' ne doit pas figurer');
  assert.equal(c.pastille,0,'destinataire : silence par défaut')}
});

test('dock : la mariée n\'a pas « Surprise » ; le témoin, si',()=>{
 assert.ok(!D.mots(D.composer({instance:'mariage:couple'})).includes('Surprise'));
 assert.ok(D.composer({instance:'mariage:temoin'}).lieux.some(e=>e.nom==='Surprise'));
});

test('dock : la pastille ne compte que ce qui est à soi',()=>{
 const c=D.composer({roleServeur:'owner',notifications:[{a:'moi'},{a:'moi'},{a:'u-autre'},{a:'tous'}]});assert.equal(c.pastille,2);
 assert.equal(D.composer({notifications:[{a:'moi'}]}).pastille,0,'le public n\'a pas de pastille');
});

test('dock : quatre lieux au plus, quatre gestes au plus, et les gestes sensibles demandent confirmation',()=>{
 const toutes=[...Object.keys(D.INSTANCES).map(k=>({instance:k})),...Object.keys(D.SERVEUR).map(r=>({roleServeur:r})),{}];
 for(const d of toutes){const c=D.composer(d);if(!c)continue;assert.ok(c.lieux.length<=4,JSON.stringify(d));assert.ok(c.plus.length<=4,JSON.stringify(d));
  for(const a of c.plus)assert.equal(a.sensible,!!D.SENSIBLES[a.geste],a.id)}
 assert.ok(D.composer({roleServeur:'owner'}).plus.find(a=>a.id==='inviter').sensible);
 assert.ok(D.composer({instance:'mariage:prestataire'}).plus.find(a=>a.id==='annulerPrestation').sensible);
});

test('dock : une action non accordée disparaît ; un rôle retiré, un agent IA ou le système n\'ont pas de dock',()=>{
 const c=D.composer({roleServeur:'owner',gestes:['lire','repondre']});assert.deepEqual(c.plus.map(a=>a.id),['ecrire']);
 assert.ok(!c.plus.some(a=>a.id==='inviter'||a.id==='publier'));
 assert.equal(D.composer({roleServeur:'owner',ancien:true}),null);
 assert.equal(D.composer({famille:'Agent IA'}),null);assert.equal(D.composer({famille:'Système'}),null);assert.equal(D.composer({instance:'regie:orbe'}),null);
});

test('dock : une ouverture temporaire affiche sa date de fin ; une démonstration est dite démonstration',()=>{
 const c=D.composer({roleServeur:'viewer',fin:'2026-12-31'});assert.ok(c.mention.some(m=>/^Accès jusqu'au 31 décembre 2026$/.test(m)));
 assert.ok(D.composer({roleServeur:'guest'}).mention.includes('Démonstration'));
 assert.ok(!D.composer({roleServeur:'guest',demonstration:false}).mention.includes('Démonstration'));
 assert.ok(D.composer({instance:'g44:agent'}).mention.includes('Famille proposée'),'une famille non écrite par Matt le dit');
});

test('dock : chaque rôle de chaque scénario reçoit un dock (ou rien, s\'il est un agent), jamais une erreur',()=>{
 for(const f of fs.readdirSync(R('vitrine/scenarios'))){const u=f.replace('.json',''),sc=JSON.parse(lire('vitrine/scenarios/'+f));
  let acces=null;try{acces=JSON.parse(lire('vitrine/acces/'+u+'.json'))}catch(_){}
  for(const r of sc.roles){const d=D.pourScenario(u,r,acces),c=D.composer(d);
   if(c===null)assert.ok(/agent|ia|orbe/i.test(r.angle+' '+(r.famille||'')),u+':'+r.angle+' sans dock');else assert.ok(c.lieux.length>0,u+':'+r.angle)}}
 assert.equal(D.composer(D.pourScenario('mariage',{angle:'invite',qui:'u-lucie'},null)).famille,'Destinataire');
 assert.equal(D.composer(D.pourScenario('seminaire',{angle:'observateur',qui:'u-eric'},{membres:{'u-eric':'viewer'}})).famille,'Contrôleur');
});

test('dock : le vocabulaire est fermé ; chaque entrée a un droit, chaque action un geste',()=>{
 for(const [k,e] of Object.entries(D.ENTREES))assert.ok(e.nom&&e.droit&&e.icone,k);
 for(const [k,a] of Object.entries(D.ACTIONS))assert.ok(a.nom&&a.geste,k);
 assert.throws(()=>D.composer({instance:'mariage:inconnu'}));
});

test('dock : le composant est accessible, échappé, sans action au survol, et un seul élément irisé',()=>{
 const j=lire('dock/dock.js'),c=lire('dock/dock.css');
 for(const a of ['aria-haspopup="menu"','aria-expanded','role="menu"','role="menuitem"','aria-current','role="status"','role="alertdialog"','aria-label="Gestes possibles"'])assert.ok(j.includes(a),a);
 assert.match(j,/ArrowDown/);assert.match(j,/Escape/);assert.match(j,/function esc\(/);assert.ok(!/mouseenter|mouseover|pointerenter/.test(j),'jamais d\'action au survol');
 assert.match(c,/prefers-reduced-motion/);assert.match(c,/min-height:4[48]px/);assert.match(c,/\.dock-menu\[hidden\]/);
 assert.equal((c.match(/conic-gradient/g)||[]).length,1,'le + seul est irisé');assert.match(c,/\.dock-plus\{[^}]*conic-gradient/);
 assert.ok(!/localStorage|sessionStorage|fetch\(/.test(j+lire('dock/modele.js')),'ni stockage ni appel réseau : la composition est donnée');
});

test('dock : posé sur l\'accueil et les exemples (le public), et dans chaque écran du cœur',()=>{
 for(const f of ['index.html','exemples/index.html']){const h=lire(f);
  assert.ok(h.includes('/dock/modele.js')&&h.includes('/dock/dock.js')&&h.includes('/dock/dock.css'),f);
  assert.ok(h.indexOf('/dock/dock.js')<h.indexOf('/coeur/coeur.js'),f+' : le dock avant le cœur');assert.match(h,/AIMEDockVue\.poser\(el,AIMEDock\.composer\(\{\}\)/)}
 const k=lire('coeur/coeur.js');assert.match(k,/AIMEDock\.pourScenario|Dk\.pourScenario/);assert.match(k,/mode:'ecran'/);
});

/* ---------- Le dock d'un vrai espace (docs/GABARITS.md § 4, § 7 et § 12) ---------- */
const SERVIS=['acces','journal','personnes'];
const GESTES={owner:{lire:true,inviter:['editor','contributor','viewer','guest'],signaler:true},editor:{lire:true,inviter:['viewer','guest'],signaler:true},
 contributor:{lire:true,inviter:[],signaler:true},viewer:{lire:true,inviter:[],signaler:true},guest:{lire:true,inviter:[],signaler:true}};

test('dock réel : jamais la table par défaut ; sans gestes calculés par le serveur, il refuse',()=>{
 assert.throws(()=>D.composerReel({roleServeur:'owner',servis:SERVIS}),/gestes calculés par le serveur/);
 assert.throws(()=>D.composerReel({roleServeur:'owner',gestes:{lire:true},servis:SERVIS}));
 assert.equal(D.composerReel({roleServeur:'owner',gestes:{lire:false,inviter:[],signaler:false},servis:SERVIS}),null,'sans lecture, pas de dock');
});

test('dock réel : aucun lieu dont le gabarit n\'est pas servi, aucun geste non accordé',()=>{
 for(const r of Object.keys(GESTES)){const c=D.composerReel({roleServeur:r,gestes:GESTES[r],servis:SERVIS});
  assert.ok(c.lieux.every(l=>SERVIS.includes(l.gabarit)),r+' : lieux servis seulement');assert.equal(c.lieux[0].gabarit,'acces',r+' : Mon accès en tête, toujours');
  assert.ok(c.plus.every(a=>a.id==='inviter'),r+' : au lot 1, le seul geste du + est Inviter');
  assert.equal(c.plus.length>0,GESTES[r].inviter.length>0,r+' : Inviter seulement si permissions.js l\'accorde');
  assert.equal(c.inattendu,true,r+' : signaler un accès inattendu, toujours');
  assert.ok(!c.mention.includes('Démonstration'),r+' : un vrai espace n\'est pas une démonstration');
  for(const mot of ['Messages','Projet','Calendrier','Déroulé','Documents','Mission'])assert.ok(!c.lieux.some(l=>l.nom===mot),r+' : '+mot+' n\'est pas encore servi')}
 const servisTous=['acces','journal','personnes','projet','deroule','documents','messages'];
 assert.ok(D.composerReel({roleServeur:'owner',gestes:GESTES.owner,servis:servisTous}).lieux.some(l=>l.gabarit==='messages'),'servi plus tard, il apparaîtra');
});

test('dock réel : l\'invitée n\'a que Mon accès ; le propriétaire invite depuis Personnes ; la coordination n\'invite que lecteurs et invités',()=>{
 const g=D.composerReel({roleServeur:'guest',gestes:GESTES.guest,servis:SERVIS});assert.deepEqual(g.lieux.map(l=>l.gabarit),['acces']);
 assert.ok(!D.mots(g).includes('Personnes')&&!D.mots(g).includes('Inviter'));
 const o=D.composerReel({roleServeur:'owner',gestes:GESTES.owner,servis:SERVIS});assert.deepEqual(o.lieux.map(l=>l.gabarit),['acces','journal','personnes']);
 assert.ok(o.plus[0].sensible,'inviter demande confirmation');
 const e=D.composerReel({roleServeur:'editor',gestes:GESTES.editor,servis:SERVIS});assert.deepEqual(e.plus[0].roles,['viewer','guest']);
});

test('dock réel : chaque nom de lieu des docks se rattache à un gabarit (ou est hors gabarit)',()=>{
 const ids=new Set(Object.keys(D.ENTREES));for(const k in D.INSTANCES)(D.INSTANCES[k].lieux||[]).forEach(l=>ids.add(typeof l==='string'?l:l.id));
 for(const id of ids)assert.ok(id in D.GABARIT_DE,id+' : rattaché');
 for(const v of Object.values(D.GABARIT_DE))assert.ok(v===null||D.NOM_GABARIT[v],String(v));
});

test('le + unique (docs/IDENTITE.md) : sans compte « Commencer », connecté ses projets puis « Nouveau projet », jamais /#entrer ni le Timbre',()=>{
 const P=require('../dock/plus.js');
 assert.deepEqual(P.etat({connecte:false}).items.map(x=>x.nom),['Commencer']);assert.deepEqual(P.etat(null).items.map(x=>x.href),['/?commencer=1']);
 const e=P.etat({connecte:true,timbre:null},[{id:'11111111-1111-4111-8111-111111111111',titre:'Mariage Léa & Marc',role:'owner'},{id:'22222222-2222-4222-8222-222222222222',titre:'Séminaire',role:'guest'}]);
 assert.equal(e.mode,'projets');assert.deepEqual(e.items.map(x=>x.nom),['Mariage Léa & Marc','Séminaire','Nouveau projet']);
 assert.equal(e.items[0].href,'/projets/?espace=11111111-1111-4111-8111-111111111111');assert.equal(e.items[1].sous,'invité');
 assert.equal(P.etat({connecte:true},Array.from({length:9},(_,i)=>({id:'x'+i,titre:'P'+i,role:'viewer'}))).items.length,6,'cinq projets au plus, puis « Nouveau projet »');
 const j=lire('dock/plus.js');assert.ok(!/timbre|Timbre\./.test(j.replace(/\/\*[\s\S]*?\*\//g,'')),'le + ne dépend pas du Timbre');assert.ok(!/#entrer/.test(j));assert.ok(!/localStorage|sessionStorage/.test(j));
 assert.equal(require('../dock/modele.js').ACTIONS.commencer.href,'/?commencer=1');
});

test('le Bureau garde ses fenêtres ; ses classes sont préfixées pour ne jamais heurter le Dock (.dock)',()=>{
 for(const f of ['bureau/index.html','os/os.js','os/coque.js'])assert.ok(!/class="dock/.test(lire(f)),f);
 for(const f of ['os/os.css','os/coque.css'])assert.ok(!/(^|[^-\w])\.dock[-\s{,:.\[)]/.test(lire(f)),f);
 assert.match(lire('bureau/index.html'),/id="dockApps"/);
});
