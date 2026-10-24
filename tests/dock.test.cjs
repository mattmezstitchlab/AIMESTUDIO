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
