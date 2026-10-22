/* AIME Magazine n° 001 : un site du moteur de pages, public, sans aucune donnée privée, aux liens et images vérifiés. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), lire = f => fs.readFileSync(path.join(R, f), 'utf8');
const M = require('../scripts/magazine.cjs'), S = require('../vitrine/rendu.js').site;
let n = 0; const t = (nom, f) => { try { f() } catch (e) { e.message = nom + ' : ' + e.message; throw e } n++ };
const site = M.source(), pages = M.generer(), html = pages.map(p => p.contenu).join('\n');

t('la source est un site « aime-site » ordinaire, en Design System Éditorial Magazine', () => {
  assert.equal(site.format, 'aime-site'); assert.deepEqual(site.presentation.design, { id: 'aime-editorial', revision: '1.0.0' });
  site.pages.forEach(p => p.sections.forEach(s => assert.ok(S.BLOCS[s.type], p.id + ' : bloc ' + s.type + ' du moteur')));
  assert.deepEqual(site.pages.map(p => p.id), ['index', 'edito', 'point-zero', 'metiers']); assert.equal(site.infos.date, '2026-10-22', 'numéro daté')});

t('les pages publiées correspondent à la source (node scripts/magazine.cjs)', () => {
  pages.forEach(p => assert.ok(p.contenu.includes('<base href="/magazine/">'), p.chemin + ' : liens relatifs sûrs avec ou sans barre finale'));
  pages.forEach(p => assert.equal(lire('magazine/' + p.chemin), p.contenu, p.chemin + ' à régénérer'));
  assert.ok(/--c1:#99472C;/.test(html) && /Instrument\+Serif/.test(html), 'Éditorial Magazine appliqué')});

t('aucune donnée privée : ni Régie, ni compte, ni coordonnée, ni stockage', () => {
  assert.ok(!/\/regie|\/api\/|aime-sites|localStorage\.getItem|@[a-z0-9-]+\.[a-z]{2,}|\+33|0[67](\s?\d{2}){4}/i.test(JSON.stringify(site)), 'source');
  ['email', 'tel', 'adresse'].forEach(k => assert.equal(site.infos[k], '', k));
  site.pages.forEach(p => p.sections.forEach(s => assert.equal(s.audience, 'public', p.id + ' : tout est public')))});

t('chaque lien interne mène à une page du magazine ou à un outil qui existe', () => {
  const liens = new Set(); html.replace(/href="([^"#]+)"/g, (m, u) => { if (!/^https:\/\/fonts\./.test(u)) liens.add(u) });
  assert.ok(liens.size >= 5); liens.forEach(u => { assert.ok(!/^https?:/.test(u), 'aucun lien externe non prévu : ' + u);
    const f = u.startsWith('/') ? path.join(R, u, u.endsWith('/') ? 'index.html' : '') : path.join(R, 'magazine', u); assert.ok(fs.existsSync(f), u + ' existe') })});

t('chaque image existe, en local, avec un texte qui dit ce qu\'elle montre', () => {
  const imgs = []; html.replace(/<img src="([^"]+)" alt="([^"]*)"/g, (m, u, a) => imgs.push([u, a])); assert.ok(imgs.length >= 8);
  imgs.forEach(([u, a]) => { assert.ok(u.startsWith('/magazine/medias/') && fs.existsSync(path.join(R, u)), u);
    if (!/class="hero/.test(html.slice(Math.max(0, html.indexOf(u) - 400), html.indexOf(u)))) assert.ok(a.length >= 20, 'texte alternatif : ' + u) });
  M.medias(site).filter(i => !i.startsWith('ecran-')).forEach(i => assert.ok(fs.existsSync(path.join(R, 'sites/bibliotheque', i + '.webp')), 'photo de la bibliothèque : ' + i))});

t('ce qui n\'existe pas encore est dit comme tel', () => {
  const ouvertes = site.listes.etapes.filter(e => !/à paraître/.test(e.detail)).map(e => e.date); assert.deepEqual(ouvertes, ['00', '01', '09']);
  assert.ok((JSON.stringify(site).match(/À venir/g) || []).length >= 4)});

t('les métiers demandés sont présents, avec ce qui est disponible aujourd\'hui', () => {
  const m = site.pages.find(p => p.id === 'metiers').sections.map(s => s.titre || '');
  ['Musicien et artiste', 'Prestataire événementiel et wedding planner', 'Formateur et organisme de formation', 'Atelier de broderie', 'Couple', 'Artisan, association, séminaire'].forEach(k => assert.ok(m.includes(k), k));
  /* les fonctions citées existent dans le moteur */
  ['setlist', 'tarifs', 'plantable', 'rsvp', 'programme', 'hebergement'].forEach(b => assert.ok(S.BLOCS[b], b));
  const sup = lire('vitrine/rendu.js'); ['"Programme de formation"', '"Convention de formation"', '"Feuille d\'émargement"', '"Certificat de réalisation"', '"Fiche technique"', '"Setlist de scène"', '"Relevé d\'heures"'].forEach(k => assert.ok(sup.includes(k), k))});

t('l\'en-tête peut porter sa propre image (src), sinon la première photo de la galerie, comme avant', () => {
  const v = S.vide('vierge'); v.listes.galerie = [{ src: 'https://exemple.test/a.webp', legende: '' }]; S.ajouterSection(v, 'index', 'hero');
  assert.ok(S.document(v, {}).html.includes('src="https://exemple.test/a.webp"'), 'repli inchangé');
  v.pages[0].sections[0].src = 'https://exemple.test/b.webp'; assert.ok(S.document(v, {}).html.includes('src="https://exemple.test/b.webp"'));
  v.pages[0].sections[0].src = 'javascript:alert(1)'; assert.ok(!S.document(v, {}).html.includes('javascript:'), 'adresse filtrée comme toute image')});

t('la Régie n\'est pas modifiée', () => { assert.ok(!/magazine/.test(fs.readdirSync(path.join(R, 'regie')).join(' '))) });

console.log('magazine : ' + n + ' tests ok');
