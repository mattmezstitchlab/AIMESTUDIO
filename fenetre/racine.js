/* Entrées cohérentes : Fenêtre par défaut, récit par univers/scene, ancienne page accessible sur demande. */
(function(){
  if(window.self!==window.top || location.pathname!=='/')return;
  const q=new URLSearchParams(location.search);
  if(q.get('historique')==='1')return;
  if(q.has('univers')||q.has('scene')||/^#(?:chapter-|moment-|tableau-)/.test(location.hash)){
    location.replace('/union/'+location.search+location.hash);
    return;
  }
  if(!location.search&&!location.hash)location.replace('/fenetre/');
})();
