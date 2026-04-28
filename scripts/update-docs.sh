#!/usr/bin/env bash
#
# Pull the latest API docs from fastly/fastly-js into docs/.
# Usage: ./scripts/update-docs.sh [branch]

set -euo pipefail

REPO="https://github.com/fastly/fastly-js.git"
BRANCH="${1:-main}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/docs"
TMP="$(mktemp -d)"

trap 'rm -rf "$TMP"' EXIT

echo "Cloning fastly-js ($BRANCH) into temp dir..."
git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REPO" "$TMP/fastly-js" 2>&1
cd "$TMP/fastly-js"
git sparse-checkout set docs

count=$(ls docs/*Api.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$count" -eq 0 ]; then
  echo "Error: no *Api.md files found in upstream docs/" >&2
  exit 1
fi

echo "Copying $count Api.md files to $DEST..."
rm -rf "$DEST"
cp -r docs "$DEST"

echo "Done. Run 'bun test' to verify the index still builds."
