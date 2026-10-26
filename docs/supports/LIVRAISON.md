# Fenêtre vivante — pilote Supports

## Livrables

| Livrable | Fichier / parcours | État |
|---|---|---|
| Audit structuré de 322 références | `inventaire.json`, générateur `scripts/inventaire-supports.cjs` | Produit ; sources et limites nommées, aucun effacement |
| Matrice 40 packs → formats → contextes | `fenetre/supports/matrice.json` | Disponible ; Brodeuse seule activée, autres classements à valider |
| Contrat contexte, état suspendable, projection partagée | `contexte.js`, `ARCHITECTURE.md` | Fonctionnel pour les modèles publics ; aucun accès projet ajouté |
| Bande au scroll | `/fenetre/supports/` | Pilote fonctionnel, trois sections réversibles, six formats existants |
| Rubans | Mêmes données et resolver, interrupteur dans Commercialiser | Fonctionnels et optionnels, pas catalogue parallèle |
| Capsule | Fermée 56 px / ouverte / contexte suspendu, lecture/précédent/suivant | Fonctionnelle dans le pilote ; historique conservé |
| Orbe | Sphère, clic/clavier/appui long, supports et outil source du contexte | Fonctionnelle ; pas de compagnon, curseur remplacé, ou faux geste |
| Sélection | Fiche latérale, aperçu natif, consentement puis copie vers Studio | Fonctionnelle, atelier ouvert dans un autre onglet |
| Ajout à la Fenêtre/Canevas | Référence de support ou extrait en post-it dans un nouveau dossier local | Réutilise modèle et IndexedDB dossiers ; aucun projet ancien migré |
| Visuels | 6 PNG distincts issus du moteur + `provenance.json`, contrôlés au build | Produits ; pas d’IA ni d’images privées ; briefs des autres métiers à valider |
| Entrée Fenêtre | Une carte opt-in dans la Fenêtre existante | Pas de remplacement global du header, capsule ou architecture |

## Validation réellement exécutée

- Tests ciblés contexte / supports / Orbe : **23 réussis**.
- Archive isolée de la tête de branche avec ce seul incrément : build réussi ; suite Node **814 tests, 671 réussis, 0 échec, 143 ignorés**. Les ignorés demandent notamment une DB ; aucune nouvelle preuve d’authentification, d’e-mail ou de sécurité multiutilisateur n’est inventée.
- Parcours navigateur du pilote : sélection du métier, trois sections au scroll dans les deux sens, verrouillage pendant survol, aperçu au clavier, vrai renderer Studio, copie consentie, ouverture du véritable Studio, retour au même scroll, conservation de la création sentinelle historique et de Publication, référence ajoutée au dossier existant par son API locale. Aucun appel d’API privée pendant les aperçus.
- Smoke performance locale : douze changements de section synchronisés après deux frames, maximum observé **34 ms**, deux cartes et un seul iframe de détail dans le DOM. Ce n’est pas un benchmark de production.
- Mobile avec vrai contexte tactile Playwright : premier toucher → aperçu, pas d’édition implicite ; consentement avant copie ; mise à jour au scroll après fermeture ; Orbe accessible. Reduced-motion activé.
- Axe WCAG 2.1 AA de la **coque pilote** : aucun défaut remonté à 1440, 390 et 320 px, y compris Orbe ouverte ; pas de débordement horizontal. Le moteur historique en iframe est exclu de ce contrôle : pas de certification générale d’accessibilité du Studio.
- Ancien `scripts/test-supports-browser.cjs` exécuté sans modification du dépôt (hôte local et argument Chromium adaptés en mémoire) : **les cinq objets pilotes historiques passent**, avec rendu Studio/TICKETAIME/Publication, isolation des stockages, handoffs, recherche/pagination mobile et refus des actions de l’invité. Zéro erreur JS observée.
- Six captures natives régénérées avec le vrai moteur : fichiers distincts, format et pack Brodeuse vérifiés, empreintes enregistrées. Les exports natifs n’ont pas été testés format par format.

## Captures de la véritable interface

Produites hors Git dans `/home/user/` par le test navigateur :

- `fenetre-supports-desktop.png` : bande contextuelle ouverte ;
- `fenetre-supports-mobile.png` : vue tactile ;
- `fenetre-supports-compact.png` : capsule fermée ;
- `fenetre-supports-selection.png` : sélection et fiche latérale ;
- `fenetre-supports-orbe.png` : actions de l’Orbe.

Ces vues sont les maquettes desktop/mobile et états demandés, obtenus depuis le prototype réellement utilisable. Elles ne remplacent pas un test humain sur appareil.

## Périmètre restant

1. Validation humaine du pilote avant généralisation aux 39 autres packs ou remplacement de la Fenêtre historique.
2. Validation des suggestions de contextes hors Brodeuse ; réservation, QR, emballage, mini-catalogue ou nouveaux supports non raccordés ne sont pas inventés.
3. Attribution métier des autres aperçus et validation des briefs d’ambiance avant toute génération/remplacement (voir `VISUELS.md`). Le premier relevé image contenait 982 fichiers et 31 chemins réutilisés ; le relevé après ajout des six aperçus en contient 988 et 34 chemins référencés plusieurs fois. Ces trois références supplémentaires sont les figures du pilote avec leur provenance, pas des copies d’assets.
4. Projection d’instances privées par les API et droits existants ; les rôles de démonstration ne deviennent pas une authentification réelle.
5. Mini-studios embarqués, liens/groupes avancés, publication et collaboration : non livrés par ce pilote.

## Publication

Branche Arena imposée `arena/2d4424b5-aimestudio`, PR existante #153. Incrément isolé sur HEAD, sans emporter les fichiers locaux anciens. Aucune fusion de #153 ou #155. L’URL et le statut Vercel du commit final seront indiqués dans la PR après publication ; les interactions ci-dessus sont testées localement, pas sur l’hébergement Vercel.
