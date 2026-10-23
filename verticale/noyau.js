/* AIME · Noyau réactif de la Grande Partition verticale.
   Une seule vérité saisie une fois (ou choisie parmi 5 archétypes réels),
   convertie à chaque instant en contrat canonique « aime-projet » v1 (contrats/projet.js),
   et propagée sans recopie aux 9 Actes de la page verticale.
   Aucune écriture automatique dans les anciens projets du navigateur. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../contrats/projet.js'));
  } else {
    root.AIMEVerticale = factory(root.AIMEProjetContrat);
  }
})(typeof self !== 'undefined' ? self : this, function(Contrat) {
  'use strict';

  var VILLES = {
    paris:       { id: 'paris',       nom: 'Paris',        pays: 'FR', lat: 48.8566, lon: 2.3522 },
    newyork:     { id: 'newyork',     nom: 'New York',     pays: 'US', lat: 40.7128, lon: -74.0060 },
    armentieres: { id: 'armentieres', nom: 'Armentières',  pays: 'FR', lat: 50.6882, lon: 2.8814 },
    lyon:        { id: 'lyon',        nom: 'Lyon',         pays: 'FR', lat: 45.7640, lon: 4.8357 },
    lisbonne:    { id: 'lisbonne',    nom: 'Lisbonne',     pays: 'PT', lat: 38.7223, lon: -9.1393 },
    tokyo:       { id: 'tokyo',       nom: 'Tokyo',        pays: 'JP', lat: 35.6762, lon: 139.6503 },
    montreal:    { id: 'montreal',    nom: 'Montréal',     pays: 'CA', lat: 45.5017, lon: -73.5673 },
    bruxelles:   { id: 'bruxelles',   nom: 'Bruxelles',    pays: 'BE', lat: 50.8503, lon: 4.3517 },
    milan:       { id: 'milan',       nom: 'Milan',        pays: 'IT', lat: 45.4642, lon: 9.1900 },
    londres:     { id: 'londres',     nom: 'Londres',      pays: 'GB', lat: 51.5074, lon: -0.1278 }
  };

  /* Les 4 regards partagés avec /tout/ (?mode=moi|coord|pro|proche) et avec vitrine/perspectives/world.json */
  var MODES = {
    moi:    { id: 'moi',    court: 'Propriétaire', complet: 'Couple / Propriétaire', world: 'couple',       live: 'lea',    timbreRole: 'owner',       indice: 'Voit tout, arbitre le budget et valide les missions.' },
    coord:  { id: 'coord',  court: 'Coordination', complet: 'Agence & Coordination', world: 'agence',       live: 'claire', timbreRole: 'editor',      indice: 'Pilote la chronologie, les affectations et le Plan B.' },
    pro:    { id: 'pro',    court: 'Prestataire',  complet: 'Prestataire & Métier',  world: 'fleuriste',    live: 'lumen',  timbreRole: 'contributor', indice: 'Ne voit que sa mission, ses accès et ses horaires à jour.' },
    proche: { id: 'proche', court: 'Invité',       complet: 'Invité & Public',       world: 'invite',       live: 'paul',   timbreRole: 'guest',       indice: 'Reçoit uniquement le programme public et sa propre réponse.' }
  };

  /* Cinq archétypes couvrant l'intégralité de l'écosystème AIMESTUDIO */
  var CAS = {
    mariage: {
      id: 'mariage',
      etiquette: 'Mariage · Paris ⇄ New York',
      univers: 'mariage',
      liveEspace: 'mariage',
      design: 'aime-original',
      titre: 'Inès & Théo',
      sousTitre: 'Cinquante proches entre deux rives',
      date: '2027-09-18',
      lieu: 'Verrière du Marais & Brooklyn Loft',
      villes: ['paris', 'newyork'],
      intention: 'Réunir deux villes, cinquante proches et douze missions sans jamais ressaisir.',
      roleAuteur: 'Futurs mariés',
      palette: ['#FB7185', '#F59E0B', '#7C5CFF', '#22D3EE'],
      contact: 'contact@ines-theo.example',
      lignesDevis: [
        { libelle: 'Site multi-perspectives (Couple, Agence, Prestataires, Invités)', qte: 1, pu: 2400 },
        { libelle: 'Identité, Timbre & papeterie coordonnée (faire-part, menus, plans)', qte: 1, pu: 1150 },
        { libelle: 'Régie Jour J en direct & journal causal Plan B', qte: 1, pu: 850 }
      ]
    },
    seminaire: {
      id: 'seminaire',
      etiquette: 'Séminaire · Maison Orée',
      univers: 'web',
      liveEspace: 'seminaire',
      design: 'aime-pro',
      titre: 'Maison Orée',
      sousTitre: 'Rencontres annuelles des ateliers',
      date: '2027-05-14',
      lieu: 'Domaine des Cèdres · Lyon',
      villes: ['paris', 'lyon', 'bruxelles'],
      intention: 'Coordonner quatre-vingts intervenants, plénières et ateliers avec une seule source fiable.',
      roleAuteur: 'Direction & Production',
      palette: ['#22D3EE', '#7C5CFF', '#34D399', '#F59E0B'],
      contact: 'production@maison-oree.example',
      lignesDevis: [
        { libelle: 'Portail programme & inscriptions filtré par rôle', qte: 1, pu: 3200 },
        { libelle: 'Signalétique millimétrique, badges & carnet de session 12×16', qte: 1, pu: 1400 },
        { libelle: 'Poste de pilotage live & annonces par salle', qte: 1, pu: 950 }
      ]
    },
    createur: {
      id: 'createur',
      etiquette: 'Studio & Créateur',
      univers: 'documents',
      liveEspace: 'seminaire',
      design: 'aime-editorial',
      titre: 'Atelier Sillage',
      sousTitre: 'Direction artistique & objets éditoriaux',
      date: '2027-03-21',
      lieu: 'Armentières · Paris · Milan',
      villes: ['armentieres', 'paris', 'milan'],
      intention: 'Décliner une même direction artistique sur le web, l’imprimé, le catalogue et la facturation.',
      roleAuteur: 'Fondateur · Direction de création',
      palette: ['#F59E0B', '#FB7185', '#7C5CFF', '#34D399'],
      contact: 'bonjour@atelier-sillage.example',
      lignesDevis: [
        { libelle: 'Design System vérifié WCAG AA (4 directions commutables)', qte: 1, pu: 2600 },
        { libelle: 'Catalogue éditorial Studio Publication (grille 12 × 16)', qte: 1, pu: 1650 },
        { libelle: 'Kit commercial autonome & facturation Factur-X EN 16931', qte: 1, pu: 900 }
      ]
    },
    institution: {
      id: 'institution',
      etiquette: 'Institution · Dossier G44',
      univers: 'causalite',
      liveEspace: 'seminaire',
      design: 'aime-minimal',
      titre: 'Pilote G44 · Dossier causal',
      sousTitre: 'Simulation sans risque avant décision humaine',
      date: '2027-02-10',
      lieu: 'Caisse pilote · France entière',
      villes: ['paris', 'lyon', 'armentieres'],
      intention: 'Mesurer chaque conséquence documentaire et réglementaire avant de modifier un dossier réel.',
      roleAuteur: 'Équipe Méthode & Formation',
      palette: ['#22D3EE', '#34D399', '#7C5CFF', '#F59E0B'],
      contact: 'pilote-methode@organisme.example',
      lignesDevis: [
        { libelle: 'Modélisation du graphe causal & règles métier explicites', qte: 1, pu: 4200 },
        { libelle: 'Simulateur isolé Rewind avec empreinte & rapport PDF', qte: 1, pu: 2800 },
        { libelle: 'Kit de mesure contrebalancé sur agents volontaires', qte: 1, pu: 1500 }
      ]
    },
    broderie: {
      id: 'broderie',
      etiquette: 'Édition & Point de croix',
      univers: 'broderie',
      liveEspace: 'mariage',
      design: 'aime-original',
      titre: 'Collection Point Compte',
      sousTitre: 'De la photographie au fil DMC et au livre',
      date: '2027-06-05',
      lieu: 'Armentières · Tokyo · Londres',
      villes: ['armentieres', 'londres', 'tokyo'],
      intention: 'Transformer une image originale en patron DMC exact, liseuse de broderie et planche d’édition.',
      roleAuteur: 'Créateur textile & Éditeur',
      palette: ['#FB7185', '#7C5CFF', '#F59E0B', '#22D3EE'],
      contact: 'atelier@point-compte.example',
      lignesDevis: [
        { libelle: 'Pipeline déterministe CIEDE2000 + Sobel vers nuancier DMC', qte: 1, pu: 1900 },
        { libelle: 'Liseuse interactive de broderie & export PDF vectoriel', qte: 1, pu: 1450 },
        { libelle: 'Cahier de collection en doubles-pages & fiches boutique', qte: 1, pu: 1100 }
      ]
    }
  };

  function hache(s) {
    var h = 2166136261;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function initiales(nom) {
    var m = String(nom || 'AIME').replace(/[&+⇄·]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!m.length) return 'AI';
    if (m.length === 1) return m[0].slice(0, 2).toUpperCase();
    return (m[0].charAt(0) + m[1].charAt(0)).toUpperCase();
  }

  function cloner(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function jalons(dateIso, titre, lieu) {
    var base = new Date((dateIso || '2027-09-18') + 'T12:00:00Z');
    if (isNaN(base.getTime())) base = new Date('2027-09-18T12:00:00Z');
    function decaler(jours) {
      var d = new Date(base.getTime() + jours * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return [
      { id: 'j-360', ecart: 'J − 360', date: decaler(-360), titre: 'Impulsion & Timbre', detail: 'Ouverture de « ' + titre + ' » — une seule source créée.' },
      { id: 'j-180', ecart: 'J − 180', date: decaler(-180), titre: 'Lieux & Invitations', detail: 'Publication du site filtré et envoi coordonné (' + lieu + ').' },
      { id: 'j-45',  ecart: 'J − 45',  date: decaler(-45),  titre: 'Supports & Missions', detail: 'Impression millimétrique, validations finales et feuille de route.' },
      { id: 'j-0',   ecart: 'Jour J',  date: decaler(0),    titre: titre,                 detail: 'Régie en direct, journal causal et Plan B prêt sans ressaisie.' },
      { id: 'j+21',  ecart: 'J + 21',  date: decaler(21),   titre: 'Mémoire & Édition',   detail: 'Album 12 × 16, archive JSON souveraine et bilan complet.' }
    ];
  }

  function creerNoyau(init) {
    var casInitial = (init && CAS[init.cas]) ? init.cas : 'mariage';
    var modeInitial = (init && MODES[init.mode]) ? init.mode : 'moi';
    var base = cloner(CAS[casInitial]);
    var etat = {
      cas: casInitial,
      mode: modeInitial,
      revision: 1,
      modifie: false,
      titre: base.titre,
      sousTitre: base.sousTitre,
      date: base.date,
      lieu: base.lieu,
      villes: base.villes.slice(),
      intention: base.intention,
      roleAuteur: base.roleAuteur,
      design: base.design,
      palette: base.palette.slice(),
      image: '',
      contact: base.contact,
      lignesDevis: cloner(base.lignesDevis),
      derniereCle: 'init'
    };
    if (init) {
      ['titre', 'sousTitre', 'date', 'lieu', 'intention', 'roleAuteur', 'design', 'image'].forEach(function(k) {
        if (typeof init[k] === 'string' && init[k]) etat[k] = init[k];
      });
    }

    var abonnes = [];

    function contrat() {
      var id = 'prj-' + etat.cas + '-' + hache(etat.titre + '|' + etat.date);
      var c = Contrat ? Contrat.creer({
        id: id,
        titre: etat.titre || 'Projet sans titre',
        module: 'aime-verticale',
        identifiant: etat.cas
      }) : {
        format: 'aime-projet',
        schema: 1,
        id: id,
        titre: etat.titre || 'Projet sans titre',
        provenance: { module: 'aime-verticale', identifiant: etat.cas },
        contenus: [],
        medias: [],
        relations: [],
        extensions: {}
      };
      c.contenus = [
        { id: 'c-intention', type: 'intention', texte: etat.intention, sousTitre: etat.sousTitre, roleAuteur: etat.roleAuteur },
        { id: 'c-calendrier', type: 'calendrier', dateCle: etat.date, lieu: etat.lieu, jalons: jalons(etat.date, etat.titre, etat.lieu) },
        { id: 'c-devis', type: 'chiffrage', devise: 'EUR', lignes: cloner(etat.lignesDevis) }
      ];
      c.medias = [
        { id: 'm-palette', type: 'palette', couleurs: etat.palette.slice(), initiale: initiales(etat.titre), imageEncodee: !!etat.image }
      ];
      c.relations = etat.villes.map(function(v, i) {
        var info = VILLES[v] || { id: v, nom: v, lat: 48.85, lon: 2.35 };
        return {
          id: 'rel-ville-' + info.id,
          type: i === 0 ? 'ancrage-principal' : 'ville-reliee',
          ville: info.nom,
          lat: info.lat,
          lon: info.lon
        };
      });
      c.extensions = {
        verticale: {
          revision: etat.revision,
          regardActif: etat.mode,
          designSystem: etat.design,
          univers: (CAS[etat.cas] || CAS.mariage).univers
        }
      };
      return c;
    }

    function empreinte() {
      var c = contrat();
      return hache(JSON.stringify({
        t: c.titre,
        c: c.contenus,
        m: c.medias,
        r: c.relations
      }));
    }

    function notifier(cle) {
      etat.derniereCle = cle || 'maj';
      var snap = lire();
      abonnes.slice().forEach(function(fn) {
        try { fn(snap, cle); } catch (e) { /* isoler chaque acte */ }
      });
    }

    function lire() {
      var c = contrat();
      var v = Contrat ? Contrat.valide(c) : { ok: true, erreurs: [] };
      var totalHT = etat.lignesDevis.reduce(function(s, l) { return s + l.qte * l.pu; }, 0);
      return {
        etat: cloner(etat),
        modeInfo: MODES[etat.mode] || MODES.moi,
        casInfo: CAS[etat.cas] || CAS.mariage,
        initiales: initiales(etat.titre),
        jalons: jalons(etat.date, etat.titre, etat.lieu),
        villes: etat.villes.map(function(id) { return VILLES[id]; }).filter(Boolean),
        totalHT: totalHT,
        totalTTC: Math.round(totalHT * 120) / 100,
        contrat: c,
        contratValide: v,
        empreinte: empreinte()
      };
    }

    function choisirCas(id) {
      if (!CAS[id]) return lire();
      var b = cloner(CAS[id]);
      etat.cas = id;
      etat.titre = b.titre;
      etat.sousTitre = b.sousTitre;
      etat.date = b.date;
      etat.lieu = b.lieu;
      etat.villes = b.villes.slice();
      etat.intention = b.intention;
      etat.roleAuteur = b.roleAuteur;
      etat.design = b.design;
      etat.palette = b.palette.slice();
      etat.contact = b.contact;
      etat.lignesDevis = cloner(b.lignesDevis);
      etat.revision++;
      notifier('cas');
      return lire();
    }

    function modifier(patch, source) {
      if (!patch || typeof patch !== 'object') return lire();
      var change = false;
      ['titre', 'sousTitre', 'date', 'lieu', 'intention', 'roleAuteur', 'design', 'image', 'contact'].forEach(function(k) {
        if (typeof patch[k] === 'string' && patch[k] !== etat[k]) {
          etat[k] = patch[k].slice(0, k === 'image' ? 180000 : 280);
          change = true;
        }
      });
      if (patch.mode && MODES[patch.mode] && patch.mode !== etat.mode) {
        etat.mode = patch.mode;
        change = true;
      }
      if (Array.isArray(patch.palette) && patch.palette.length >= 2) {
        etat.palette = patch.palette.slice(0, 4);
        change = true;
      }
      if (Array.isArray(patch.villes) && patch.villes.length >= 1) {
        var vs = patch.villes.filter(function(x) { return !!VILLES[x]; });
        if (vs.length) {
          etat.villes = vs;
          etat.lieu = vs.map(function(x) { return VILLES[x].nom; }).join(' ⇄ ');
          change = true;
        }
      }
      if (Array.isArray(patch.lignesDevis)) {
        etat.lignesDevis = cloner(patch.lignesDevis);
        change = true;
      }
      if (change) {
        etat.modifie = true;
        etat.revision++;
        notifier(source || 'champ');
      }
      return lire();
    }

    function basculerVille(villeId) {
      if (!VILLES[villeId]) return lire();
      var i = etat.villes.indexOf(villeId), suiv = etat.villes.slice();
      if (i >= 0) {
        if (suiv.length <= 1) return lire();
        suiv.splice(i, 1);
      } else {
        if (suiv.length >= 5) suiv.shift();
        suiv.push(villeId);
      }
      return modifier({ villes: suiv }, 'globe');
    }

    function abonner(fn) {
      if (typeof fn !== 'function') return function() {};
      abonnes.push(fn);
      return function() {
        var i = abonnes.indexOf(fn);
        if (i >= 0) abonnes.splice(i, 1);
      };
    }

    /* Génère un fichier XML Factur-X 1.0 (EN 16931 Cross Industry Invoice) réel depuis le chiffrage du Fil Rouge */
    function facturX() {
      var s = lire();
      var numero = 'AIME-' + s.etat.date.slice(0, 4) + '-' + s.empreinte.slice(0, 4).toUpperCase();
      var dCompact = s.etat.date.replace(/-/g, '');
      function x(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function(ch) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch];
        });
      }
      var tva = (s.totalHT * 0.2).toFixed(2);
      var ht = s.totalHT.toFixed(2);
      var ttc = (s.totalHT * 1.2).toFixed(2);
      var lignesXml = s.etat.lignesDevis.map(function(l, idx) {
        var lht = (l.qte * l.pu).toFixed(2);
        return '    <ram:IncludedSupplyChainTradeLineItem>\n' +
          '      <ram:AssociatedDocumentLineDocument><ram:LineID>' + (idx + 1) + '</ram:LineID></ram:AssociatedDocumentLineDocument>\n' +
          '      <ram:SpecifiedTradeProduct><ram:Name>' + x(l.libelle) + '</ram:Name></ram:SpecifiedTradeProduct>\n' +
          '      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>' + l.pu.toFixed(2) + '</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>\n' +
          '      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">' + l.qte + '</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>\n' +
          '      <ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>20.00</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>' + lht + '</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>\n' +
          '    </ram:IncludedSupplyChainTradeLineItem>';
      }).join('\n');

      return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"\n' +
        '  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"\n' +
        '  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">\n' +
        '  <rsm:ExchangedDocumentContext>\n' +
        '    <ram:GuidelineSpecifiedDocumentContextParameter>\n' +
        '      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>\n' +
        '    </ram:GuidelineSpecifiedDocumentContextParameter>\n' +
        '  </rsm:ExchangedDocumentContext>\n' +
        '  <rsm:ExchangedDocument>\n' +
        '    <ram:ID>' + x(numero) + '</ram:ID>\n' +
        '    <ram:TypeCode>380</ram:TypeCode>\n' +
        '    <ram:IssueDateTime><udt:DateTimeString format="102">' + x(dCompact) + '</udt:DateTimeString></ram:IssueDateTime>\n' +
        '    <ram:IncludedNote><ram:Content>' + x(s.etat.titre + ' — ' + s.etat.intention) + '</ram:Content></ram:IncludedNote>\n' +
        '  </rsm:ExchangedDocument>\n' +
        '  <rsm:SupplyChainTradeTransaction>\n' +
        lignesXml + '\n' +
        '    <ram:ApplicableHeaderTradeAgreement>\n' +
        '      <ram:SellerTradeParty><ram:Name>AIME Studio</ram:Name></ram:SellerTradeParty>\n' +
        '      <ram:BuyerTradeParty><ram:Name>' + x(s.etat.titre) + '</ram:Name></ram:BuyerTradeParty>\n' +
        '    </ram:ApplicableHeaderTradeAgreement>\n' +
        '    <ram:ApplicableHeaderTradeDelivery/>\n' +
        '    <ram:ApplicableHeaderTradeSettlement>\n' +
        '      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n' +
        '      <ram:ApplicableTradeTax><ram:CalculatedAmount>' + tva + '</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>' + ht + '</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>20.00</ram:RateApplicablePercent></ram:ApplicableTradeTax>\n' +
        '      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n' +
        '        <ram:LineTotalAmount>' + ht + '</ram:LineTotalAmount>\n' +
        '        <ram:TaxBasisTotalAmount>' + ht + '</ram:TaxBasisTotalAmount>\n' +
        '        <ram:TaxTotalAmount currencyID="EUR">' + tva + '</ram:TaxTotalAmount>\n' +
        '        <ram:GrandTotalAmount>' + ttc + '</ram:GrandTotalAmount>\n' +
        '        <ram:DuePayableAmount>' + ttc + '</ram:DuePayableAmount>\n' +
        '      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n' +
        '    </ram:ApplicableHeaderTradeSettlement>\n' +
        '  </rsm:SupplyChainTradeTransaction>\n' +
        '</rsm:CrossIndustryInvoice>\n';
    }

    function briefContact() {
      var s = lire();
      return 'Projet esquissé sur la page AIME : ' + s.etat.titre + '\n' +
        'Univers : ' + s.casInfo.etiquette + ' · Regard testé : ' + s.modeInfo.complet + '\n' +
        'Date envisagée : ' + s.etat.date + ' · Lieux : ' + s.etat.lieu + '\n' +
        'Intention : ' + s.etat.intention + '\n' +
        'Estimation repère : ' + s.totalHT.toLocaleString('fr-FR') + ' € HT (contrat ' + s.contrat.id + ')';
    }

    return {
      lire: lire,
      modifier: modifier,
      choisirCas: choisirCas,
      basculerVille: basculerVille,
      abonner: abonner,
      facturX: facturX,
      briefContact: briefContact,
      VILLES: VILLES,
      MODES: MODES,
      CAS: CAS
    };
  }

  /* Lecture initiale depuis l'URL (?mode=moi|pro|proche|coord & ?cas=...) pour compatibilité native avec /tout/ */
  var instance = null;
  function initialiserDepuisURL() {
    var init = {};
    if (typeof location !== 'undefined' && location.search) {
      try {
        var q = new URLSearchParams(location.search);
        if (q.get('mode') && MODES[q.get('mode')]) init.mode = q.get('mode');
        if (q.get('cas') && CAS[q.get('cas')]) init.cas = q.get('cas');
        if (q.get('titre')) init.titre = q.get('titre');
      } catch (e) {}
    }
    instance = creerNoyau(init);
    return instance;
  }

  return {
    creer: creerNoyau,
    instance: function() { return instance || initialiserDepuisURL(); },
    VILLES: VILLES,
    MODES: MODES,
    CAS: CAS,
    initiales: initiales,
    jalons: jalons,
    hache: hache
  };
});
