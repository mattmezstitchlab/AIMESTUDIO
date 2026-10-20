# AIME : la grammaire d'interaction

Une action = **un verbe + un objet + une portée**.

- **Pointeurs** (barre de fenêtre, bande du bas) : ↖ normal, **+** ici seulement, **×** partout. Ils fixent la portée, ils ne remplacent pas les outils.
- **« Où ? »** (dossier arc-en-ciel) : retrouve les occurrences et les destinations d'un objet.
- **Aperçu avant propagation** : toute action en × (et toute action définitive) affiche les éléments concernés, leur nombre et chaque propriété avant → après, puis attend la validation.
- **Annulation** : chaque action exécutée est annulable (« Annuler » dans la bande de l'orbe).

## Registre (Bureau, `VERBS`)

| Verbe | Intention | Objets acceptés | Paramètre | Destructif | Annulation | Permission |
|---|---|---|---|---|---|---|
| Pipette | Reprendre ce que je touche, puis l'appliquer ailleurs | point brodé, style de texte, couleur de photo | échantillon | non | oui | modifier |
| Remplir | Appliquer à une zone entière | zone de points, élément de support, photo | couleur active | non | oui | modifier |
| Gomme | Retirer, du plus doux au définitif | point brodé, élément de support, retouches de photo | niveau | niveau « supprimer » | oui | modifier ; supprimer |
| Texte | Écrire ou modifier les mots | texte de support, grille (texte brodé) | texte | non | oui | modifier |

Niveaux de Gomme : **effacer** (vide, réversible), **masquer** (cache), **retirer une propriété** (enlève un réglage), **supprimer définitivement** (confirmation écrite obligatoire, jamais un simple clic).

## Ce que chaque studio déclare (message `verbs`)

| Studio | Pipette | Remplir | Gomme | Texte |
|---|---|---|---|---|
| Supports (Docs…) | style d'un texte (alignement, couleur, taille, graisse) | fond aux couleurs de la marque | 4 niveaux | modifier le texte |
| Stitchlab | fil d'un point | zone contiguë (+) ou tout un fil (×) | effacer, supprimer | outil Texte de Stitchlab |
| Image | couleur de la photo → couleur principale | ambiance « Couleurs de marque » | retirer les retouches | indisponible (pas de calque texte) |
| Web Studio | bientôt | bientôt | bientôt | bientôt |

Un verbe non déclaré est grisé, avec son explication. Les commandes d'origine des studios restent en place.

## Protocole

Bureau → studio : `verb {v, level, scope}`, `vdo {id}`, `vcancel`, `selundo`.
Studio → Bureau : `verbs {caps}`, `vinfo {t}`, `vsample {t, hex}`, `vprev {id, title, rows[[où, propriété, avant, après]], n, destructive, confirm}`, `vdone {msg, undo}`.

Les permissions sont déclarées ; elles seront appliquées côté serveur avec les fonctions Neon.
