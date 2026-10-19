#!/usr/bin/env bash
# Publie une nouvelle version : ./scripts/release.sh 1.1.0
# Prérequis : une section « ## [1.1.0] - AAAA-MM-JJ » dans CHANGELOG.md.
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:?Usage : scripts/release.sh X.Y.Z}"
grep -q "^## \[$version\]" CHANGELOG.md || { echo "Ajoute d'abord la section [$version] dans CHANGELOG.md" >&2; exit 1; }
[ -z "$(git status --porcelain -- ':!CHANGELOG.md' ':!package.json' ':!package-lock.json')" ] || { echo "Des fichiers ne sont pas commités" >&2; exit 1; }

npm test
npm run build
npm version "$version" --no-git-tag-version --allow-same-version >/dev/null
git add CHANGELOG.md package.json package-lock.json
git commit -m "Version $version" || true
git tag -a "v$version" -m "Version $version"
git push origin main "v$version"
echo "✓ v$version poussée : la Release et le déploiement se font sur GitHub Actions."
