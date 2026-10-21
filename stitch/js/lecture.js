/* AIME STITCH · lecture d'un patron existant (page de PDF rendue en image, ou photo d'une grille).
   Un PDF de patron n'est PAS reconstructible automatiquement : la grille doit être calibrée, les symboles
   regroupés, et chaque groupe validé par une personne (référence DMC). Ce module fait seulement ce qui est sûr :
   1 · détecter le pas de la grille (proposition) ; 2 · lire chaque case (couleur de fond + forme du symbole) ;
   3 · regrouper les cases identiques ; 4 · proposer un fil DMC quand la case est colorée. Rien n'est inventé. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./couleur.js'));else root.StitchLecture=factory(root.StitchCouleur)})(typeof self!=='undefined'?self:this,function(C){'use strict';
var SIG=16;/* signature d'un symbole : 16 × 16 taux d'encre (0 à 255) ; un rond plein et un rond creux doivent se distinguer */
function lum(d,i){return d[i]*.299+d[i+1]*.587+d[i+2]*.114}
/* 1 · le pas de la grille. Le profil ne mesure pas l'encre (les symboles et les aplats en ont beaucoup) mais la « finesse » :
   l'écart d'un pixel à ses voisins à ±2, dont on prend la MÉDIANE le long de la ligne. Une ligne de grille est fine et traverse
   toute la grille : elle répond sur presque toute sa longueur. Un symbole ne répond que sur quelques cases : la médiane l'efface. */
function pas(img,z,axe){var n=axe==='x'?z.l:z.h,lim=axe==='x'?z.h:z.l,prof=new Float64Array(n),moy=0,col=[],d=img.data,L=img.l;
 var enc=function(a,b){var x=axe==='x'?z.x+a:z.x+b,y=axe==='x'?z.y+b:z.y+a;x=Math.max(0,Math.min(L-1,x));y=Math.max(0,Math.min(img.h-1,y));return 255-lum(d,(y*L+x)*4)};
 for(var a=0;a<n;a++){col.length=0;for(var b=1;b<lim;b+=2){var aa=axe==='x'?a:a;col.push(Math.abs(enc(aa,b)-(enc(aa-2,b)+enc(aa+2,b))/2))}col.sort(function(u,v){return u-v});prof[a]=col[col.length>>1];moy+=prof[a]}
 var brut=Float64Array.from(prof);moy/=n;for(var c=0;c<n;c++)prof[c]-=moy;var best=0,bv=-Infinity;
 for(var p=4;p<=Math.min(120,n/2);p++){var v=0;for(var t=0;t+p<n;t++)v+=prof[t]*prof[t+p];v/=(n-p);if(v>bv*1.0001){bv=v;best=p}}
 return{p:best,prof:brut}}
/* le pas entier ne suffit pas (une case de PDF mesure rarement un nombre rond de pixels) : le cadre étant posé sur les bords
   de la grille, on cherche le nombre de cases N dont TOUTES les lignes (k × n / N) tombent sur un pic d'encre étroit. Une ligne
   de grille traverse toute la grille et forme un pic net ; un symbole, non. Une ligne sur deux (N/2) touche aussi : on garde
   donc le plus grand N dont presque toutes les lignes touchent ; des lignes au milieu des cases (2N) en manquent la moitié. */
function affiner(r,n){var prof=r.prof;if(!r.p)return 0;var tri=Array.prototype.slice.call(prof).sort(function(a,b){return a-b}),seuil=tri[n>>1]+Math.max(3,.12*(tri[Math.floor(n*.99)]-tri[n>>1])),best=0,repli=0,bf=-1,
 pic=function(t){var i=Math.round(t),m=0;for(var dd=-1;dd<=1;dd++){var j=i+dd;if(j>=0&&j<n&&prof[j]>m)m=prof[j]}return m};
 for(var N=Math.max(2,Math.floor(n/120));N<=Math.floor(n/4);N++){var st=n/N,ok=0;for(var k=1;k<N;k++)if(pic(k*st)>seuil)ok++;var f=ok/Math.max(1,N-1);if(f>=.9)best=N;if(f>bf){bf=f;repli=N}}
 return best||repli}
function detecterGrille(img,z){var rx=pas(img,z,'x'),ry=pas(img,z,'y'),C=affiner(rx,z.l),L=affiner(ry,z.h);return{pasX:C?z.l/C:0,pasY:L?z.h/L:0,colonnes:C,lignes:L}}

/* 2 · une case : fond (couleur dominante) et symbole (pixels qui s'en distinguent nettement).
   La signature est prise sur le cadre de l'encre, ramené à 16 × 16 : la position exacte du symbole dans la case (qui varie
   d'un pixel selon l'arrondi) ne compte plus ; sa taille relative est gardée à part. Un rond creux et un rond plein diffèrent. */
function lireCase(img,x0,y0,cw,ch){var d=img.data,L=img.l,ins=.12,ax=Math.round(x0+cw*ins),ay=Math.round(y0+ch*ins),bx=Math.round(x0+cw*(1-ins)),by=Math.round(y0+ch*(1-ins)),pix=[];
 for(var y=ay;y<by;y++)for(var x=ax;x<bx;x++){var i=(y*L+x)*4;pix.push([d[i],d[i+1],d[i+2],x,y])}
 if(!pix.length)return null;
 /* fond : médiane par canal (le symbole occupe rarement plus de la moitié de la case) */
 var med=[0,1,2].map(function(c){var v=pix.map(function(p){return p[c]}).sort(function(a,b){return a-b});return v[v.length>>1]}),Lf=med[0]*.299+med[1]*.587+med[2]*.114;
 var lw=bx-ax,lh=by-ay,enc=new Uint8Array(lw*lh),encre=0,mx0=lw,my0=lh,mx1=-1,my1=-1;
 pix.forEach(function(p){var l=p[0]*.299+p[1]*.587+p[2]*.114;if(Math.abs(l-Lf)>45||Math.hypot(p[0]-med[0],p[1]-med[1],p[2]-med[2])>100){var X=p[3]-ax,Y=p[4]-ay;enc[Y*lw+X]=1;encre++;if(X<mx0)mx0=X;if(X>mx1)mx1=X;if(Y<my0)my0=Y;if(Y>my1)my1=Y}});
 var sig=new Uint8Array(SIG*SIG),f=med,blanc=f[0]>246&&f[1]>246&&f[2]>246,taille=[0,0];
 if(encre>=3){var bw=mx1-mx0+1,bh=my1-my0+1;taille=[bw/lw,bh/lh];var E=function(X,Y){X=Math.max(mx0,Math.min(mx1,X));Y=Math.max(my0,Math.min(my1,Y));return enc[Y*lw+X]};
  /* rééchantillonnage bilinéaire du cadre d'encre : même grain quel que soit le nombre de pixels de la case */
  for(var sy=0;sy<SIG;sy++)for(var sx=0;sx<SIG;sx++){var u=mx0+(sx+.5)/SIG*bw-.5,v=my0+(sy+.5)/SIG*bh-.5,u0=Math.floor(u),v0=Math.floor(v),fu=u-u0,fv=v-v0;
   sig[sy*SIG+sx]=Math.round(255*((E(u0,v0)*(1-fu)+E(u0+1,v0)*fu)*(1-fv)+(E(u0,v0+1)*(1-fu)+E(u0+1,v0+1)*fu)*fv))}}
 return{fond:f,sig:sig,taille:taille,vide:blanc&&encre<3,encre:encre/pix.length,couleur:!blanc&&(Math.max(f[0],f[1],f[2])-Math.min(f[0],f[1],f[2])>12||f[0]<215)}}
/* écart entre deux symboles : différence moyenne de taux d'encre (0 = identiques, 1 = inverses) */
function hamming(a,b){var n=0;for(var i=0;i<a.length;i++)n+=Math.abs(a[i]-b[i]);return n/(a.length*255)}
/* deux symboles identiques peuvent être décalés d'une sous-case (lignes de grille, arrondis) : on tolère un décalage de 1, avec une petite pénalité */
function distSymbole(a,b){var best=hamming(a,b);for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var n=0;for(var y=0;y<SIG;y++)for(var x=0;x<SIG;x++){var X=x+dx,Y=y+dy,v=X>=0&&Y>=0&&X<SIG&&Y<SIG?b[Y*SIG+X]:0;n+=Math.abs(a[y*SIG+x]-v)}n=n/(a.length*255)+.01;if(n<best)best=n}return best}

/* 3 · lire toute la grille et regrouper les cases identiques. z = zone de la grille en pixels (du premier coin au dernier) */
function ecart(G,lu){return hamming(G.sig,lu.sig)+(Math.abs(G.taille[0]-lu.taille[0])+Math.abs(G.taille[1]-lu.taille[1]))*.3}
/* regroupement en trois temps : 1 · chaque case rejoint le groupe le plus proche (ou en ouvre un) ; 2 · les groupes voisins
   fusionnent tant que leurs moyennes se ressemblent ; 3 · chaque case est réaffectée au groupe moyen le plus proche.
   Mieux vaut deux groupes de trop (la personne valide le même fil deux fois) qu'un groupe qui mélange deux fils. */
function analyser(img,z,cols,lignes,o){return analyserPages([{img:img,z:z,cols:cols,lignes:lignes,x:0,y:0}],o)}
/* plusieurs pages d'un même patron : chaque page est lue à sa place dans la grille d'ensemble (x, y en cases), et les symboles
   sont regroupés sur TOUTES les pages à la fois : un même fil garde un seul groupe, quelle que soit sa page. */
function analyserPages(pages,o){o=o||{};var tolS=o.tolSymbole==null?.13:o.tolSymbole,tolC=o.tolCouleur==null?14:o.tolCouleur,x0=Infinity,y0=Infinity,W=0,H=0,lus=[],G=[],t0=Date.now(),N=SIG*SIG,recouvre=0;
 pages.forEach(function(p){x0=Math.min(x0,p.x||0);y0=Math.min(y0,p.y||0)});pages.forEach(function(p){W=Math.max(W,(p.x||0)-x0+p.cols);H=Math.max(H,(p.y||0)-y0+p.lignes)});
 if(W*H>4e6)throw new Error('Grille d\'ensemble trop grande.');var cols=W,lignes=H,cases=new Int16Array(W*H).fill(-1),pris=new Uint8Array(W*H);
 var nouveau=function(lu){return{sig:Float32Array.from(lu.sig),taille:lu.taille.slice(),lab:lu.lab,fond:lu.fond,somme:{s:Float64Array.from(lu.sig),t:lu.taille.slice(),f:lu.fond.slice(),n:1}}};
 var ajouter=function(g,lu){var S=g.somme;for(var i=0;i<N;i++)S.s[i]+=lu.sig[i];S.t[0]+=lu.taille[0];S.t[1]+=lu.taille[1];S.f[0]+=lu.fond[0];S.f[1]+=lu.fond[1];S.f[2]+=lu.fond[2];S.n++};
 var moyenne=function(g){var S=g.somme;for(var i=0;i<N;i++)g.sig[i]=S.s[i]/S.n;g.taille=[S.t[0]/S.n,S.t[1]/S.n];g.fond=[S.f[0]/S.n,S.f[1]/S.n,S.f[2]/S.n];g.lab=C.lab(g.fond[0],g.fond[1],g.fond[2])};
 var proche=function(lu,tol){var bon=-1,bd=Infinity;for(var g=0;g<G.length;g++){if(!G[g])continue;var ds=ecart(G[g],lu),dc=C.de76(G[g].lab,lu.lab);if(ds<=tol&&dc<=tolC){var sc=ds*100+dc;if(sc<bd){bd=sc;bon=g}}}return bon};
 pages.forEach(function(P,ip){var z=P.z,w=z.l/P.cols,h=z.h/P.lignes,ox=(P.x||0)-x0,oy=(P.y||0)-y0;
  for(var r=0;r<P.lignes;r++)for(var c=0;c<P.cols;c++){var k=(oy+r)*W+ox+c;if(pris[k]){recouvre++;continue}pris[k]=1;var lu=lireCase(P.img,z.x+c*w,z.y+r*h,w,h);if(!lu||lu.vide)continue;lu.lab=C.lab(lu.fond[0],lu.fond[1],lu.fond[2]);lu.k=k;lu.src={page:ip,c:c,r:r};lus.push(lu);
   var bon=proche(lu,tolS);if(bon<0){G.push(nouveau(lu));bon=G.length-1}else{ajouter(G[bon],lu);if(G[bon].somme.n<=8||G[bon].somme.n%16===0)moyenne(G[bon])}lu.g=bon}});
 G.forEach(moyenne);
 for(;;){var bi=-1,bj=-1,bd=Infinity;for(var i=0;i<G.length;i++)for(var j=i+1;j<G.length;j++){var d1=ecart(G[i],G[j]);if(d1<=tolS&&C.de76(G[i].lab,G[j].lab)<=tolC&&d1<bd){bd=d1;bi=i;bj=j}}
  if(bi<0)break;var A=G[bi].somme,B=G[bj].somme;for(var q=0;q<N;q++)A.s[q]+=B.s[q];A.t[0]+=B.t[0];A.t[1]+=B.t[1];A.f[0]+=B.f[0];A.f[1]+=B.f[1];A.f[2]+=B.f[2];A.n+=B.n;moyenne(G[bi]);G.splice(bj,1)}
 /* réaffectation au groupe moyen le plus proche (sans seuil : chaque case a déjà un groupe) */
 var groupes=G.map(function(g,i){return{id:i,sig:Uint8Array.from(g.sig,function(v){return Math.round(v)}),taille:g.taille,lab:g.lab,fond:g.fond,n:0,exemple:-1,couleur:false}});
 lus.forEach(function(lu){var bon=0,bd=Infinity;groupes.forEach(function(g,i){var sc=ecart(g,lu)*100+C.de76(g.lab,lu.lab);if(sc<bd){bd=sc;bon=i}});var g=groupes[bon];g.n++;cases[lu.k]=bon;
  /* l'exemple montré à la personne : la case la plus typique du groupe */
  if(g.exemple<0||bd<g._bd){g.exemple=lu.k;g.source=lu.src;g._bd=bd}lu.couleur&&(g.couleur=true)});
 groupes=groupes.filter(function(g){return g.n>0});groupes.sort(function(a,b){return b.n-a.n});
 /* page en couleur : au moins un groupe significatif est coloré ; alors toutes les cases colorées (même pâles) reçoivent une suggestion */
 var enCouleur=groupes.some(function(g){return g.couleur&&g.n>=3});groupes.forEach(function(g){g.couleur=enCouleur&&!(g.fond[0]>246&&g.fond[1]>246&&g.fond[2]>246);delete g._bd});var re={};groupes.forEach(function(g,i){re[g.id]=i;g.id=i});for(var q2=0;q2<cases.length;q2++)if(cases[q2]>=0)cases[q2]=re[cases[q2]];
 var P0=pages[0];return{cols:cols,lignes:lignes,cases:cases,groupes:groupes,couleur:enCouleur,ms:Date.now()-t0,pasX:P0.z.l/P0.cols,pasY:P0.z.h/P0.lignes,pages:pages.length,recouvrement:recouvre}}
/* placement des pages en puzzle, porté de POINTZERO (PdfPrep.positionsPuzzle, licence MIT, même auteur) :
   les blocs se posent de gauche à droite, « colonnes » blocs par rangée ; une rangée a la hauteur de son plus grand bloc. */
function positionsPuzzle(blocs,colonnes,uniforme,taille){var pos={},n=Math.max(1,colonnes),x=0,y=0,hr=0;
 blocs.forEach(function(b,i){if(i>0&&i%n===0){y+=hr;x=0;hr=0}pos[b.id]={x:x,y:y};x+=uniforme?taille.cols:b.cols;hr=Math.max(hr,uniforme?taille.rows:b.rows)});return pos}
/* une page qui dit où elle se trouve (« Colonnes 56 à 80 · lignes 1 à 75 ») se place d'elle-même ; sinon, rien n'est deviné */
function lirePosition(texte){var t=String(texte||'').replace(/\s+/g,' '),m=t.match(/colonnes?\s+(\d+)\s*(?:à|a|-|–)\s*(\d+).{0,12}?lignes?\s+(\d+)\s*(?:à|a|-|–)\s*(\d+)/i)||t.match(/columns?\s+(\d+)\s*(?:to|-|–)\s*(\d+).{0,12}?rows?\s+(\d+)\s*(?:to|-|–)\s*(\d+)/i);
 if(!m)return null;var c0=+m[1],c1=+m[2],r0=+m[3],r1=+m[4];if(c1<c0||r1<r0)return null;return{x:c0-1,y:r0-1,cols:c1-c0+1,lignes:r1-r0+1}}
/* 4 · suggestion DMC pour un groupe coloré (le plus proche en CIEDE2000) ; un patron en noir et blanc n'en a pas */
function suggerer(groupe,dmc){if(!groupe.couleur)return null;var b=null,bd=Infinity;dmc.forEach(function(d){var x=C.hex(d.hex),dd=C.de2000(groupe.lab,C.lab(x[0],x[1],x[2]));if(dd<bd){bd=dd;b=d}});return b?{code:b.code,ecart:+bd.toFixed(1)}:null}
/* de l'analyse validée au contenu d'un patron : choix[g] = code DMC, ou null pour « toile » */
function construire(a,choix){var codes=[],idx={},points=new Uint16Array(a.cases.length);a.groupes.forEach(function(g,i){var c=choix[i];if(c&&idx[c]==null){codes.push(c);idx[c]=codes.length}});
 for(var k=0;k<a.cases.length;k++){var g=a.cases[k];points[k]=g>=0&&choix[g]?idx[choix[g]]:0}
 var usage=codes.map(function(c){var n=0;for(var k=0;k<points.length;k++)if(points[k]===idx[c])n++;return n});
 return{l:a.cols,h:a.lignes,points:points,palette:codes.map(function(c,i){return{dmc:c,points:usage[i]}}),mode:'import',reglages:{},rapport:{groupes:a.groupes.length}}}
return{detecterGrille:detecterGrille,lireCase:lireCase,analyser:analyser,analyserPages:analyserPages,positionsPuzzle:positionsPuzzle,lirePosition:lirePosition,suggerer:suggerer,construire:construire,hamming:hamming,distSymbole:distSymbole};
});
