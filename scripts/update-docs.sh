#!/usr/bin/env bash
#
# Pull the API docs of the pinned fastly SDK from fastly/fastly-js into docs/.
# Usage: ./scripts/update-docs.sh [branch or tag]
#
# Without an argument, the ref is release/v<version> for the exact fastly
# version in package.json, so the docs describe the SDK that actually runs.

set -euo pipefail

REPO="https://github.com/fastly/fastly-js.git"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/docs"

if [ $# -gt 0 ]; then
  BRANCH="$1"
else
  VERSION="$(node -p 'require(process.argv[1]).dependencies?.fastly ?? ""' "$ROOT/package.json")"
  if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: package.json must pin fastly to an exact version, found '$VERSION'. Pin it, or pass a branch or tag." >&2
    exit 1
  fi
  BRANCH="release/v$VERSION"
fi

TMP="$(mktemp -d)"

trap 'rm -rf "$TMP"' EXIT

echo "Cloning fastly-js ($BRANCH) into temp dir..."
git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REPO" "$TMP/fastly-js" 2>&1
cd "$TMP/fastly-js"
git sparse-checkout set docs

count=$(find docs -maxdepth 1 -type f -name '*Api.md' -print | wc -l | tr -d ' ')
if [ "$count" -eq 0 ]; then
  echo "Error: no *Api.md files found in upstream docs/" >&2
  exit 1
fi

echo "Copying $count Api.md files to $DEST..."
rm -rf "$DEST"
cp -r docs "$DEST"
find "$DEST" -type f -name '*.md' -exec perl -pi -e 's/[ \t]+(\r?)$/$1/' {} +

echo "Done. Run 'bun test' to verify the index still builds."
