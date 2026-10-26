# Composant TICKETAIME repris sans modification
Source : https://github.com/mattmezstitchlab/ticketaime/tree/43ebb52d13572fa76cb149217c083882cc971e55/ticketaime/src
`Show.tsx` (seul export OperaTicket utilisé), primitives.tsx et les cinq dépendances lib importées : copies intactes. L'entrée d'adaptation, les styles utilitaires isolés et le bundle sont spécifiques à l'expérimentation. Le composant utilise React 19.2.6 / React DOM 19.2.6 (licence MIT incluse ci-dessous).
Aucun autre des 168 composants n'est chargé. Le catalogue complet n'est qu'un inventaire de métadonnées. Le parcours public, l'atelier, le wallet et les créations du dépôt source ne sont pas modifiés.
Aucune licence générale du dépôt source n'a été trouvée à sa racine : cette reprise est limitée à l'expérimentation demandée par le propriétaire de ces dépôts. Vérifier les droits avant redistribution publique indépendante.
Reconstruction du bundle : installer les dépendances React et esbuild dans un environnement de build, puis compiler entry.tsx en ESM navigateur (JSX automatique, NODE_ENV production). Le runtime serveur React est bundlé ; aucun CDN requis.
L'atelier TICKETAIME externe n'est pas ouvert tant qu'une URL déployée et un contrat d'édition aller-retour n'ont pas été vérifiés. Une URL `?module=opera` seule est un aperçu, pas un transfert de création vers l'atelier.
