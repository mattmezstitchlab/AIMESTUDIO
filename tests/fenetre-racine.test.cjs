// Régression des deux entrées: accueil public historique + Fenêtre, sans perdre les 12 univers en iframe.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../fenetre/racine.js'),'utf8');
function navigate(url,embedded=false){
  const parsed=new URL(url,'https://example.test');
  let destination=null;
  const location={pathname:parsed.pathname,search:parsed.search,hash:parsed.hash,replace:p=>{destination=p}};
  const window={};window.self=window;window.top=embedded?{}:window;
  vm.runInNewContext(src,{window,location,URLSearchParams});
  return destination;
}
test('racine: la Fenêtre reste l’entrée unique par défaut et l’accueil historique est préservé',()=>{
  assert.equal(navigate('/'),'/fenetre/');
  assert.equal(navigate('/?historique=1'),null);
  assert.equal(navigate('/?ancien-lien=1'),null);
  assert.equal(navigate('/#contact'),null);
});
test('racine: univers, Renaissance, ancres du récit sont conservés à travers la redirection',()=>{
  assert.equal(navigate('/?univers=mariage'),'/union/?univers=mariage');
  assert.equal(navigate('/?univers=spectacle&mode=lecture#moment-x'),'/union/?univers=spectacle&mode=lecture#moment-x');
  assert.equal(navigate('/?scene=renaissance'),'/union/?scene=renaissance');
  assert.equal(navigate('/#chapter-idea'),'/union/#chapter-idea');
});
test('racine: les lecteurs embarqués dans la Fenêtre gardent leurs 12 univers',()=>{
  assert.equal(navigate('/?univers=formation',true),'/union/?univers=formation');
  assert.equal(navigate('/?scene=renaissance',true),'/union/?scene=renaissance');
  assert.equal(navigate('/',true),null);
});
test('racine: le lecteur et les écrans compte ne subissent aucune redirection parasite',()=>{
  assert.equal(navigate('/union/?univers=mariage'),null);
  assert.equal(navigate('/fenetre/'),null);
  assert.equal(navigate('/compte/'),null);
});
