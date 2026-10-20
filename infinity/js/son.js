/* AIME INFINITY · musique générative (Web Audio, aucune dépendance, aucun échantillon).
   Chaque vague d'une cascade joue une note d'une gamme pentatonique : une petite cascade = quelques notes,
   une grande = une phrase qui monte. La position horizontale place la note à gauche ou à droite.
   Le son ne démarre qu'après un geste du joueur, et le jeu reste complet sans lui. */
(function(root,factory){root.AIMEInfinitySon=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var ctx=null,maitre=null,echo=null,muet=false,dernier=0;
try{muet=localStorage.getItem('aime-infinity-muet')==='1'}catch(_){}
/* ré majeur pentatonique sur trois octaves */
var GAMME=[];for(var o=0;o<4;o++)[0,2,4,7,9].forEach(function(s){GAMME.push(146.83*Math.pow(2,(o*12+s)/12))});
function pret(){if(muet)return false;if(!ctx){var A=window.AudioContext||window.webkitAudioContext;if(!A)return false;ctx=new A();
  maitre=ctx.createGain();maitre.gain.value=.16;var comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;maitre.connect(comp);comp.connect(ctx.destination);
  /* un écho doux, pour la sensation d'espace */
  echo=ctx.createDelay(1);echo.delayTime.value=.23;var fb=ctx.createGain();fb.gain.value=.28;var f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=2200;
  echo.connect(f);f.connect(fb);fb.connect(echo);f.connect(maitre)}
 if(ctx.state==='suspended')ctx.resume();return true}
function note(freq,quand,vol,pan){var t=ctx.currentTime+Math.max(0,quand||0),o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
 o.type='triangle';o.frequency.value=freq;o2.type='sine';o2.frequency.value=freq*2;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.5,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+.55);
 o.connect(g);o2.connect(g);var out=g;if(p){p.pan.value=Math.max(-.8,Math.min(.8,pan||0));g.connect(p);out=p}out.connect(maitre);out.connect(echo);o.start(t);o2.start(t);o.stop(t+.6);o2.stop(t+.6)}
/* une cascade : liste de vagues [{t (s), n (cases), x (−1..1)}] */
function cascade(vagues,niveau){if(!pret())return;var base=(niveau||1)%3,max=Math.min(vagues.length,22),prev=-1;
 for(var i=0;i<max;i++){var v=vagues[i];if(v.t-prev<.045&&i)continue;prev=v.t;var deg=Math.min(GAMME.length-1,base+i);var vol=Math.min(.55,.22+Math.log2(1+v.n)*.06);
  note(GAMME[deg],v.t,vol,v.x);if(v.n>12&&i%3===2)note(GAMME[Math.max(0,deg-5)],v.t,vol*.6,-v.x)}}
function accord(niveau){if(!pret())return;var b=((niveau||1)%3)+5;[0,2,4,5].forEach(function(d,i){note(GAMME[b+d],i*.07,.38,(i-1.5)*.3)})}
function echec(){if(!pret())return;note(GAMME[6],0,.3,0);note(GAMME[3],.18,.3,0)}
function toucher(){if(!pret())return;var n=performance.now();if(n-dernier<40)return;dernier=n;note(GAMME[2],0,.12,0)}
return{cascade:cascade,accord:accord,echec:echec,toucher:toucher,reveil:pret,
 muet:function(v){if(v!=null){muet=!!v;try{localStorage.setItem('aime-infinity-muet',muet?'1':'0')}catch(_){}if(!muet)pret()}return muet}};
});
