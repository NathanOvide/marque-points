# Marque-Points — contexte projet pour Claude

Web app (PWA) de comptage de points pour jeux de société, publiée sur GitHub Pages.
Le dépôt est **public** : rien de personnel ni de spécifique au thème ne doit y figurer (code, docs, commits,
CHANGELOG). Les notes privées sont dans `CLAUDE.local.md` et `theme/` (non versionnés).

## Principes

- **Français uniquement** (interface, release notes, commits).
- Les utilisateurs doivent prendre l'app en main **sans explication** : chaque écran
  doit être guidé (assistant par étapes, textes d'aide `<Hint>`, états vides avec un bouton d'action clair).
- Utilisée sur téléphone (iPhone et Android) : cibles tactiles ≥ 44 px, pas de survol obligatoire.
  Le pavé numérique de l'iPhone n'a pas de touche « − » : d'où le bouton +/− de la saisie.
- Données uniquement en local (`localStorage`, clé `marque-points:v1`). Toute évolution du format doit rester
  compatible avec les données existantes (migration dans `loadState`).

## Organisation

- `src/logic.ts` : calculs purs (totaux, classement, donneur, fin de partie, stats), testés dans `logic.test.ts`.
- `src/store.tsx` : état global + persistance. `src/ui.tsx` : navigation par hash, composants communs.
- `src/screens/*` : un fichier par écran. `src/components/*` : formulaires jeu/joueur, graphique.
- Apparence : variables CSS dans `:root` de `src/index.css` (clair + sombre), textes et images via le module
  `virtual:brand` (plugin dans `vite.config.ts`). Thème par défaut dans `src/brand/`, remplacé par `theme/` s'il existe.
- Modes de comptage (`GameKind` dans `types.ts`) : points, wins (gagnant de chaque manche), sheet (feuille de score
  par catégories), coop. Catalogue de jeux : `src/catalogue.ts` (recherche tolérante), données via `virtual:catalogue`.
- Vérification de bout en bout : `node ~/outils/capture/scenario-modes.mjs <url> <dossier> <seed.json>` joue une partie
  de chaque mode et capture chaque étape (seed = joueurs seuls).
- Couleurs des joueurs : palette catégorielle `--p0`…`--p7` dans `index.css` (validée daltonisme, clair et sombre).

## À chaque nouvelle version

1. `npm test` et `npm run build` doivent passer, avec et sans `theme/`.
2. Ajouter la section `## [X.Y.Z] - AAAA-MM-JJ` dans `CHANGELOG.md` (notes orientées utilisateur, sans rien de spécifique au thème).
3. `./scripts/release.sh X.Y.Z` : commit, tag, push. GitHub Actions crée la Release (notes reprises du
   CHANGELOG) et redéploie GitHub Pages.

## À venir

- Une liste de **modèles de jeux** à inclure de base (préchargés au premier lancement).
- Plus tard peut-être : partage du résultat, export/import JSON.
