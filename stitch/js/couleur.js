/* AIME STITCH · mesures de couleur (sRGB → CIELAB, écart CIEDE2000). Calcul pur, déterministe. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.StitchCouleur=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
function lin(c){c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)}
function f(t){return t>216/24389?Math.cbrt(t):(24389/27*t+16)/116}
/* D65 */
function lab(r,g,b){var R=lin(r),G=lin(g),B=lin(b),X=(R*.4124564+G*.3575761+B*.1804375)/.95047,Y=R*.2126729+G*.7151522+B*.072175,Z=(R*.0193339+G*.119192+B*.9503041)/1.08883;
 var fx=f(X),fy=f(Y),fz=f(Z);return[116*fy-16,500*(fx-fy),200*(fy-fz)]}
function hex(h){h=String(h).replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function versHex(c){return'#'+c.map(function(v){return('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2)}).join('')}
/* CIEDE2000 (Sharma, Wu, Dalal 2005) */
function de2000(a,b){var L1=a[0],a1=a[1],b1=a[2],L2=b[0],a2=b[1],b2=b[2],rad=Math.PI/180,
 C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cm=(C1+C2)/2,G=.5*(1-Math.sqrt(Math.pow(Cm,7)/(Math.pow(Cm,7)+Math.pow(25,7)))),
 a1p=(1+G)*a1,a2p=(1+G)*a2,C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2),
 h1p=(Math.atan2(b1,a1p)/rad+360)%360,h2p=(Math.atan2(b2,a2p)/rad+360)%360,dLp=L2-L1,dCp=C2p-C1p,dhp=0;
 if(C1p*C2p!==0){dhp=h2p-h1p;if(dhp>180)dhp-=360;else if(dhp<-180)dhp+=360}
 var dHp=2*Math.sqrt(C1p*C2p)*Math.sin(dhp*rad/2),Lpm=(L1+L2)/2,Cpm=(C1p+C2p)/2,hpm=h1p+h2p;
 if(C1p*C2p!==0){if(Math.abs(h1p-h2p)>180)hpm=(h1p+h2p+(h1p+h2p<360?360:-360))/2;else hpm=(h1p+h2p)/2}
 var T=1-.17*Math.cos((hpm-30)*rad)+.24*Math.cos(2*hpm*rad)+.32*Math.cos((3*hpm+6)*rad)-.2*Math.cos((4*hpm-63)*rad),
 dTh=30*Math.exp(-Math.pow((hpm-275)/25,2)),Rc=2*Math.sqrt(Math.pow(Cpm,7)/(Math.pow(Cpm,7)+Math.pow(25,7))),
 Sl=1+.015*Math.pow(Lpm-50,2)/Math.sqrt(20+Math.pow(Lpm-50,2)),Sc=1+.045*Cpm,Sh=1+.015*Cpm*T,Rt=-Math.sin(2*dTh*rad)*Rc;
 return Math.sqrt(Math.pow(dLp/Sl,2)+Math.pow(dCp/Sc,2)+Math.pow(dHp/Sh,2)+Rt*(dCp/Sc)*(dHp/Sh))}
function de76(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])}
return{lab:lab,hex:hex,versHex:versHex,de2000:de2000,de76:de76};
});
