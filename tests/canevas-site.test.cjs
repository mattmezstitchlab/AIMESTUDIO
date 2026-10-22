/* Mini-site → Canevas : un seul environnement d'édition. L'adaptateur aime-site édite le vrai mini-site (moteur de pages,
   blocs existants), sans exposer le générateur ; l'aperçu du projet relit ce qui est enregistré. */
const assert=require('assert'),fs=require('fs'),path=require('path');const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0;const t=(nom,f)=>{f();n++};
const ad=lire('canevas/adaptateurs/site.js'),cv=lire('canevas/canevas.js'),pj=lire('projet/projet.js'),pz=lire('pointzero/pz.js'),pl=lire('canevas/plan.js');
t('le Canevas ouvre ?site=<id> avec l\'adaptateur aime-site, chargé à la demande',()=>{
 assert.ok(cv.includes("site:'/canevas/adaptateurs/site.js'"));assert.ok(cv.includes("{type:'site',site:site,projet:id,de:de}"),'la scène ouvre le site');
 assert.ok(/\^\\\/canevas\\\/adaptateurs\\\/\[a-z0-9-\]\+\\\.js\$/.test(pl),'chemin d\'adaptateur toujours filtré')});
t('le rendu et les opérations sont ceux du moteur de pages ; aucun bloc réécrit, aucun générateur',()=>{
 assert.ok(ad.includes('AIMESite.document(')&&ad.includes('S.tasser(')&&ad.includes("'/vitrine/rendu.js'"));assert.ok(ad.includes('root.AIMESite.BLOCS[s.type]'),'réglages lus dans le catalogue du moteur');
 assert.ok(!/\/sites\/\?|\/sites\/'|editeur/.test(ad),'aucun lien ni chargement du générateur');assert.ok(!/bloc\(/.test(ad),'aucune définition de bloc')});
t('sélectionner, déplacer, dimensionner, régler : souris, doigt, clavier',()=>{
 ['pointerdown','pointermove','pointerup','keydown','cvs-poignee','ArrowLeft','shiftKey','Enter'].forEach(k=>assert.ok(ad.includes(k),k));
 ['gauche','droite','haut','bas','plus','moins','regler'].forEach(k=>assert.ok(ad.includes("id:'"+k+"'"),k));assert.ok(/touch-action:none/.test(lire('canevas/adaptateurs/site.css')))});
t('droits : le contenu du projet validé reste protégé ; seule la forme et le titre se règlent',()=>{
 ['pz-motif','pz-fils','pz-mesures','pz-avancement','pz-actions','pz-decisions'].forEach(k=>assert.ok(ad.includes("'"+k+"'"),k));assert.ok(/k==='texte'&&!prot/.test(ad))});
t('rien n\'est écrit sans confirmation ; Enregistrer range la page là où l\'aperçu la relit ; Annuler revient',()=>{
 const ecr=(ad.match(/ecrire\(/g)||[]).length;assert.equal(ecr,2,'une définition, un seul appel (dans enregistrer)');assert.ok(/function enregistrer\(D\)\{[^}]*ecrire\(e\)/.test(ad));
 assert.ok(ad.includes("CLE='aime-sites'")&&pj.includes("CLE='aime-sites'"),'même rangement que l\'aperçu');assert.ok(/function annuler\(D\)\{D\.site=copie\(D\.garde\)/.test(ad));assert.ok(ad.includes('beforeunload'))});
t('parcours : « Voir mon mini-site » et « Modifier dans le Canevas » ; retour au projet selon l\'origine',()=>{
 assert.ok(pz.includes("'Voir mon mini-site'")&&pz.includes("'Modifier dans le Canevas'")&&pz.includes("&canevas=1"));
 assert.ok(/q\.get\('canevas'\)==='1'\)\{location\.replace\(cv\)/.test(pj),'le projet prépare le mini-site puis l\'ouvre dans le Canevas');
 assert.ok(/if\(site\)\{r\.textContent='← Retour au projet';r\.href=\([^)]*'\/point-zero\/':de\)\+\(id\?'\?projet='/.test(cv),'retour à la carte du Bureau ou du Point Zéro')});
t('l\'inspecteur du Canevas ne couvre plus la sélection (zone à éviter, générique)',()=>{assert.ok(/function placerInsp\(X,Y,ev\)/.test(pl)&&pl.includes('placerInsp(X,Y,e.eviter)'));assert.ok(ad.includes('eviter:{'))});
console.log('canevas-site : '+n+' tests ok');
