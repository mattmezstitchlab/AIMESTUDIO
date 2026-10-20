/* AIME STITCH · export PDF d'une VERSION précise du patron canonique. Le PDF n'est jamais la source :
   il se régénère à l'identique depuis le patron. Tout est vectoriel (cases, symboles, lignes), donc net à l'impression.
   Contenu : couverture, informations, consignes, légende et fournitures, plan d'assemblage, grilles en couleur,
   grilles en noir et blanc, repères de continuité, numéro de version et empreinte, attribution des couleurs DMC. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./patron.js'),require('./symboles.js'),require('./mesures.js'),require('./couleur.js'));else root.StitchPDF=factory(root.StitchPatron,root.StitchSymboles,root.StitchMesures,root.StitchCouleur)})(typeof self!=='undefined'?self:this,function(P,S,M,C){'use strict';
var A4={l:595.28,h:841.89},MARGE=36,COLS=55,LIGNES=75;
function txt(s){return String(s==null?'':s).replace(/[≈]/g,'~').replace(/[  ]/g,' ').replace(/[’]/g,"'")}
function rgb(hex){return C.hex(hex)}
function clair(hex){var c=rgb(hex);return(c[0]*299+c[1]*587+c[2]*114)/1000>150}

/* le découpage en pages : blocs de 55 × 75 points, numérotés de gauche à droite puis de haut en bas */
function decoupage(p){var su=P.surface(p),x0=su.x||0,y0=su.y||0,l=su.l||p.l,h=su.h||p.h,blocs=[];
 for(var by=0;by<Math.ceil(h/LIGNES);by++)for(var bx=0;bx<Math.ceil(l/COLS);bx++)blocs.push({bx:bx,by:by,x:x0+bx*COLS,y:y0+by*LIGNES,l:Math.min(COLS,l-bx*COLS),h:Math.min(LIGNES,h-by*LIGNES)});
 return{blocs:blocs,nx:Math.ceil(l/COLS),ny:Math.ceil(h/LIGNES),x0:x0,y0:y0,l:l,h:h}}

/* génère le document. jsPDF = le constructeur ; dmc = table [{code, nom, hex}] ; o = {count, createur, attribution, date} */
function exporter(jsPDF,p,dmc,o){o=o||{};P.fixer(p);var idx={};dmc.forEach(function(d){idx[d.code]=d});
 var doc=new jsPDF({unit:'pt',format:'a4',compress:o.compresser!==false}),g=doc.context2d,count=o.count||p.toile.count||14,m=M.mesurer(p),q=P.fournitures(p,count),d=P.dimensions(p,count),dec=decoupage(p),
  emp=P.empreinte(p),pages=0,mat=P.matrice(p),cols=p.palette.map(function(c){return(idx[c.dmc]||{}).hex||'#999999'});
 var pied=function(){pages++;doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(110);
  doc.text(txt('AIME STITCH · '+p.titre+' · version '+p.version+' · empreinte '+emp),MARGE,A4.h-20);doc.text(txt(o.attribution||'Couleurs DMC : craft-color-codes (MakeBead), CC BY 4.0. DMC est une marque de DMC.'),MARGE,A4.h-11);doc.setTextColor(0)};
 var nouvelle=function(){doc.addPage();};
 doc.setProperties({title:txt(p.titre+' · patron de point de croix'),subject:JSON.stringify({id:p.id,version:p.version,empreinte:emp,l:p.l,h:p.h,palette:p.palette.map(function(c){return c.dmc+':'+c.symbole})}),creator:'AIME STITCH',author:txt(o.createur||'')});

 /* 1 · couverture : l'aperçu en cases colorées, les chiffres essentiels */
 doc.setFont('helvetica','bold');doc.setFontSize(30);doc.text(txt(p.titre),MARGE,MARGE+40);
 doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(90);doc.text(txt((o.createur?o.createur+' · ':'')+'Patron de point de croix · version '+p.version),MARGE,MARGE+60);doc.setTextColor(0);
 var zone={x:MARGE,y:MARGE+84,l:A4.l-2*MARGE,h:430},cs=Math.min(zone.l/dec.l,zone.h/dec.h),ox=zone.x+(zone.l-cs*dec.l)/2,oy=zone.y+(zone.h-cs*dec.h)/2;
 doc.setFillColor(246,241,231);doc.rect(zone.x,zone.y,zone.l,zone.h,'F');
 for(var y=0;y<dec.h;y++)for(var x=0;x<dec.l;x++){var v=mat[(dec.y0+y)*p.l+dec.x0+x];if(!v)continue;var c=rgb(cols[v-1]);doc.setFillColor(c[0],c[1],c[2]);doc.rect(ox+x*cs,oy+y*cs,cs+.05,cs+.05,'F')}
 var info=[['Motif',d.points.l+' × '+d.points.h+' points'],['Taille brodée',String(d.cm.l).replace('.',',')+' × '+String(d.cm.h).replace('.',',')+' cm sur toile '+count+' points par pouce'],['Autres toiles',[11,16,18].map(function(c2){var d2=P.dimensions(p,c2);return c2+' ct : '+String(d2.cm.l).replace('.',',')+' × '+String(d2.cm.h).replace('.',',')+' cm'}).join(' · ')],
  ['Couleurs',p.palette.length+' fils DMC'],['Points',m.points+' croix entières'+(m.demi?', '+m.demi+' demi-points':'')+(m.contours?', backstitch':'')],['Niveau',m.niveau+' · effort '+String(m.indice).replace('.',',')+' équivalent point par point'],['Temps indicatif','de '+m.heures.min+' à '+m.heures.max+' heures ('+m.cadence.lente+' à '+m.cadence.rapide+' points par heure)']];
 doc.setFontSize(10);info.forEach(function(r,i){var yy=zone.y+zone.h+28+i*17;doc.setTextColor(110);doc.text(txt(r[0]),MARGE,yy);doc.setTextColor(0);doc.text(txt(r[1]),MARGE+110,yy)});pied();

 /* 2 · consignes, légende et fournitures */
 nouvelle();doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('Légende et fournitures',MARGE,MARGE+24);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(70);
 doc.text(doc.splitTextToSize(txt('Brodez à 2 brins sur Aida '+count+'. Commencez au centre, repéré par les flèches sur les grilles. Une case = un point de croix. Les lignes épaisses marquent les blocs de 10 points. Quantités indicatives : environ '+Math.round(P.POINTS_PAR_ECHEVEAU_14*count/14)+' points par écheveau de 8 m.'),A4.l-2*MARGE),MARGE,MARGE+44);doc.setTextColor(0);
 var y0=MARGE+86,rh=19;doc.setFontSize(8);doc.setTextColor(110);['Symbole','Couleur','DMC','Nom','Croix','Demi','Contour','Échev.'].forEach(function(t,i){doc.text(txt(t),MARGE+[0,40,84,130,330,375,415,470][i],y0)});doc.setTextColor(0);doc.setFontSize(10);
 var par=Math.floor((A4.h-70-y0-10)/rh),base=y0;q.forEach(function(r,i){if(i&&i%par===0){pied();nouvelle();base=MARGE}var yy=base+10+(i%par)*rh;var hex=(idx[r.dmc]||{}).hex||'#999999',c=rgb(hex);
  doc.setDrawColor(180);doc.setLineWidth(.5);doc.rect(MARGE,yy,14,14,'S');S.dessiner(g,r.symbole,MARGE+1,yy+1,12,'#000000');
  doc.setFillColor(c[0],c[1],c[2]);doc.rect(MARGE+40,yy,30,14,'F');doc.text(txt(r.dmc),MARGE+84,yy+10.5);doc.text(txt(((idx[r.dmc]||{}).nom||'').slice(0,34)),MARGE+130,yy+10.5);doc.text(String(r.points),MARGE+330,yy+10.5);doc.text(String(r.demi||'–'),MARGE+375,yy+10.5);doc.text(r.backstitch?String(r.backstitch).replace('.',',')+' c.':'–',MARGE+415,yy+10.5);doc.text(String(r.echeveaux),MARGE+470,yy+10.5)});
 pied();

 /* 3 · plan d'assemblage */
 nouvelle();doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text("Plan d'assemblage",MARGE,MARGE+24);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(70);
 doc.text(txt('Le motif tient sur '+dec.blocs.length+' page'+(dec.blocs.length>1?'s':'')+' de grille, en couleur puis en noir et blanc. Chaque page indique ses colonnes et ses lignes, et la page voisine.'),MARGE,MARGE+44);doc.setTextColor(0);
 var pl=Math.min((A4.l-2*MARGE)/dec.nx,300/dec.ny);dec.blocs.forEach(function(b,i){var x=MARGE+b.bx*pl,y=MARGE+70+b.by*pl;doc.setDrawColor(40);doc.setLineWidth(1);doc.rect(x,y,pl*b.l/COLS,pl*b.h/LIGNES,'S');doc.setFontSize(12);doc.text('Grille '+(i+1),x+8,y+18);doc.setFontSize(8);doc.setTextColor(110);doc.text(txt('col. '+(b.x+1)+'–'+(b.x+b.l)+' · lig. '+(b.y+1)+'–'+(b.y+b.h)),x+8,y+30);doc.setTextColor(0)});pied();

 /* 4 · les grilles : couleur, puis noir et blanc */
 var cx=dec.x0+Math.floor(dec.l/2),cy=dec.y0+Math.floor(dec.h/2);
 ['couleur','nb'].forEach(function(mode){dec.blocs.forEach(function(b,i){nouvelle();var cell=Math.min((A4.l-2*MARGE-14)/COLS,(A4.h-2*MARGE-70)/LIGNES),gx=MARGE+14,gy=MARGE+40;
  doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(txt('Grille '+(i+1)+'/'+dec.blocs.length+(mode==='nb'?' · noir et blanc':' · couleur')),MARGE,MARGE+14);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(90);
  var voisins=[];dec.blocs.forEach(function(o2,j){if(o2.by===b.by&&o2.bx===b.bx+1)voisins.push('à droite : grille '+(j+1));if(o2.by===b.by+1&&o2.bx===b.bx)voisins.push('en dessous : grille '+(j+1))});
  doc.text(txt('Colonnes '+(b.x+1)+' à '+(b.x+b.l)+' · lignes '+(b.y+1)+' à '+(b.y+b.h)+(voisins.length?' · suite '+voisins.join(', '):'')),MARGE,MARGE+27);doc.setTextColor(0);
  for(var yy=0;yy<b.h;yy++)for(var xx=0;xx<b.l;xx++){var v=mat[(b.y+yy)*p.l+b.x+xx];if(!v)continue;var X=gx+xx*cell,Y=gy+yy*cell,hex=cols[v-1];
   if(mode==='couleur'){var c3=rgb(hex);doc.setFillColor(c3[0],c3[1],c3[2]);doc.rect(X,Y,cell,cell,'F')}
   S.dessiner(g,p.palette[v-1].symbole,X+cell*.1,Y+cell*.1,cell*.8,mode==='couleur'&&!clair(hex)?'#FFFFFF':'#000000')}
  /* lignes fines, lignes épaisses tous les 10 points (comptés depuis le début du motif), numéros */
  doc.setDrawColor(170);doc.setLineWidth(.25);for(var a=0;a<=b.l;a++)doc.line(gx+a*cell,gy,gx+a*cell,gy+b.h*cell);for(var c4=0;c4<=b.h;c4++)doc.line(gx,gy+c4*cell,gx+b.l*cell,gy+c4*cell);
  doc.setDrawColor(0);doc.setLineWidth(.9);doc.setFontSize(6.5);
  for(var a2=0;a2<=b.l;a2++){var col=b.x-dec.x0+a2;if(col%10===0){doc.line(gx+a2*cell,gy,gx+a2*cell,gy+b.h*cell);if(col)doc.text(String(col),gx+a2*cell,gy-3,{align:'center'})}}
  for(var c5=0;c5<=b.h;c5++){var row=b.y-dec.y0+c5;if(row%10===0){doc.line(gx,gy+c5*cell,gx+b.l*cell,gy+c5*cell);if(row)doc.text(String(row),gx-3,gy+c5*cell+2,{align:'right'})}}
  doc.setLineWidth(.6);doc.rect(gx,gy,b.l*cell,b.h*cell,'S');
  /* les flèches du centre */
  doc.setFillColor(168,50,45);if(cx>=b.x&&cx<b.x+b.l){var ax=gx+(cx-b.x)*cell;doc.triangle(ax-4,gy-9,ax+4,gy-9,ax,gy-2,'F');doc.triangle(ax-4,gy+b.h*cell+9,ax+4,gy+b.h*cell+9,ax,gy+b.h*cell+2,'F')}
  if(cy>=b.y&&cy<b.y+b.h){var ay=gy+(cy-b.y)*cell;doc.triangle(gx-12,ay-4,gx-12,ay+4,gx-5,ay,'F');doc.triangle(gx+b.l*cell+12,ay-4,gx+b.l*cell+12,ay+4,gx+b.l*cell+5,ay,'F')}
  /* demi-points : une diagonale */
  (p.demi||[]).forEach(function(dd){if(dd.x<b.x||dd.x>=b.x+b.l||dd.y<b.y||dd.y>=b.y+b.h)return;var pal=p.palette.filter(function(z){return z.id===dd.c})[0],c7=rgb(pal?((idx[pal.dmc]||{}).hex||'#000000'):'#000000'),X=gx+(dd.x-b.x)*cell,Y=gy+(dd.y-b.y)*cell;
   doc.setDrawColor(mode==='nb'?0:c7[0],mode==='nb'?0:c7[1],mode==='nb'?0:c7[2]);doc.setLineWidth(1.6);if(dd.s==='/')doc.line(X+cell*.12,Y+cell*.88,X+cell*.88,Y+cell*.12);else doc.line(X+cell*.12,Y+cell*.12,X+cell*.88,Y+cell*.88)});
  /* backstitch par-dessus, en vectoriel */
  (p.contours||[]).forEach(function(k){var pal=p.palette.filter(function(z){return z.id===k.c})[0],c6=rgb(pal?((idx[pal.dmc]||{}).hex||'#000000'):'#000000');doc.setDrawColor(mode==='nb'?0:c6[0],mode==='nb'?0:c6[1],mode==='nb'?0:c6[2]);doc.setLineWidth(1.4);
   for(var t=1;t<k.pts.length;t++){var p0=k.pts[t-1],p1=k.pts[t],dans=function(q2){return q2[0]>=b.x&&q2[0]<=b.x+b.l&&q2[1]>=b.y&&q2[1]<=b.y+b.h};if(!dans(p0)||!dans(p1))continue;doc.line(gx+(p0[0]-b.x)*cell,gy+(p0[1]-b.y)*cell,gx+(p1[0]-b.x)*cell,gy+(p1[1]-b.y)*cell)}});
  pied()})});
 return{doc:doc,pages:pages,empreinte:emp,blocs:dec.blocs.length}}
return{exporter:exporter,decoupage:decoupage,COLS:COLS,LIGNES:LIGNES};
});
