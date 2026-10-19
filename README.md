# 🎲 Marque-Points

Compter les points de ses jeux de société, manche après manche, sans papier ni crayon.

Elle fonctionne dans le navigateur de n'importe quel appareil (iPhone, Android, ordinateur) et peut s'installer
sur l'écran d'accueil :

- **iPhone (Safari)** : bouton Partager ⬆️ → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

Les données (joueurs, jeux, parties) restent **uniquement sur l'appareil**, dans le stockage local du navigateur.

## Fonctionnalités

- Nouvelle partie guidée : jeu → joueurs → départ
- Jeux enregistrés avec leurs règles : qui gagne, score de départ, fin de partie (libre, score cible, nombre de manches)
- Joueurs réutilisables (couleur + emoji), score de départ par joueur
- Saisie des points manche par manche, correction et annulation
- Classement en direct, écart au leader, donneur de la manche
- Graphique d'évolution, tableau des manches
- Historique, reprise des parties, « Rejouer »
- Statistiques par joueur et par jeu
- Hors ligne, mode sombre, écran maintenu allumé

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests unitaires (Vitest)
npm run build    # build de production dans dist/
```

Stack : React 19 + TypeScript + Vite, PWA (vite-plugin-pwa). Aucun serveur ni dépendance d'exécution autre que React.

## Personnaliser l'apparence (thème)

Par défaut, l'app a une apparence neutre (`src/brand/`). Un dossier `theme/` à la racine (non versionné) la
remplace au build, s'il contient un `brand.json` :

- `brand.json` : nom affiché, description, accroche, message de bienvenue, couleur de la barre, lien en pied de page,
  et images optionnelles (`logo`, `logoDark`, `ornament`) ; mêmes clés que `src/brand/brand.json`.
- `theme.css` : redéfinit les variables CSS de `src/index.css` (couleurs, polices, arrondis…).
- `public/` : icônes de l'app, générées avec `node scripts/icons.mjs <image> theme/public <fond> <taille>`.

En CI, le thème est récupéré depuis le dépôt indiqué par la variable `THEME_REPO`, avec la clé SSH du secret
`THEME_DEPLOY_KEY`. Sans ces réglages, l'app est publiée avec l'apparence par défaut.

## Publier une version

1. Ajouter une section `## [X.Y.Z] - AAAA-MM-JJ` en haut de `CHANGELOG.md` (notes en français, orientées utilisateur).
2. Lancer `./scripts/release.sh X.Y.Z`.

Le tag déclenche la création de la Release GitHub, avec les notes reprises du CHANGELOG. Le push sur `main`
redéploie l'app sur GitHub Pages, et les appareils récupèrent la mise à jour automatiquement au prochain lancement.
