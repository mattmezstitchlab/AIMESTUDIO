/* AIME · un timbre pour une personne. Construit au DOM, nœud par nœud ; la photo n'est acceptée que comme image encodée.
   AIMETimbre.creer({id, nom, role, image, mini, legende}) → <button class="timbre"> (ou <span> si mini) */
(function(){'use strict';if(window.AIMETimbre)return;
var ROLES={owner:'Propriétaire',editor:'Coordination',contributor:'Contributeur',viewer:'Lecture seule',guest:'Invité'};
var TEINTES=[['#22D3EE','#7C5CFF','#3B2B8F'],['#FB7185','#F59E0B','#9A3412'],['#86EFAC','#22D3EE','#0F5964'],['#F59E0B','#FB7185','#7C2D52'],['#7C5CFF','#FB7185','#3C1F5C'],['#F59E0B','#7C5CFF','#22D3EE'],['#22D3EE','#86EFAC','#145233']];
function hache(s){var h=2166136261;s=String(s||'');for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function initiales(n){var m=String(n||'?').replace(/\([^)]*\)/g,' ').trim().split(/[^A-Za-zÀ-ÿ0-9]+/).filter(Boolean);return((m[0]||'?').charAt(0)+(m[1]?m[1].charAt(0):'')).toUpperCase()}
function imageOk(v){return typeof v==='string'&&v.length<=160000&&/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(v)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function creer(o){o=o||{};var b=el(o.mini?'span':'button','timbre'+(o.mini?' mini':'')+(o.legende?' legende':''));if(!o.mini){b.type='button'}
 var nom=String(o.nom||'').slice(0,80)||'Sans nom',role=ROLES[o.role]||o.detail||'';b.setAttribute('aria-label',nom+(role?', '+role:''));if(o.mini)b.title=nom+(role?' · '+role:'');
 var p=el('span','tb-papier'),im=el('span','tb-image');im.setAttribute('aria-hidden','true');p.appendChild(im);b.appendChild(p);if(o.mini)b.setAttribute('role','img');
 if(imageOk(o.image)){var g=document.createElement('img');g.alt='';g.decoding='async';g.src=o.image;im.appendChild(g)}
 else{var T=TEINTES[hache(o.id||nom)%TEINTES.length],gen=el('span','tb-gen');gen.style.setProperty('--tb-a',T[0]);gen.style.setProperty('--tb-b',T[1]);gen.style.setProperty('--tb-c',T[2]);
  gen.appendChild(el('i',null,'AIME'));gen.appendChild(el('b',null,initiales(nom)));gen.appendChild(el('u',null,String(2026+hache(nom)%3)));im.appendChild(gen)}
 if(!o.mini){var lg=el('span','tb-legende');lg.setAttribute('aria-hidden','true');lg.appendChild(el('b',null,nom));if(role)lg.appendChild(el('span',null,role));p.appendChild(lg)}
 return b}
/* réduire une photo choisie en image encodée légère (WebP 4:5, 360 × 450) */
function preparer(fichier){return new Promise(function(ok,ko){if(!fichier||!/^image\//.test(fichier.type))return ko(new Error('Choisissez une image.'));if(fichier.size>15e6)return ko(new Error('Image trop lourde (15 Mo au plus).'));
 var u=URL.createObjectURL(fichier),g=new Image();g.onload=function(){var W=360,H=450,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d'),k=Math.max(W/g.naturalWidth,H/g.naturalHeight),w=g.naturalWidth*k,h=g.naturalHeight*k;
  x.drawImage(g,(W-w)/2,(H-h)/2,w,h);URL.revokeObjectURL(u);var q=.82,d=c.toDataURL('image/webp',q);if(!/^data:image\/webp/.test(d))d=c.toDataURL('image/jpeg',q);while(d.length>150000&&q>.4){q-=.1;d=c.toDataURL(/^data:image\/webp/.test(d)?'image/webp':'image/jpeg',q)}ok(d)};
 g.onerror=function(){URL.revokeObjectURL(u);ko(new Error('Image illisible.'))};g.src=u})}
window.AIMETimbre={creer:creer,preparer:preparer,ROLES:ROLES,imageOk:imageOk};
})();
