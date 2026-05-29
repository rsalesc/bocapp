#!/usr/bin/env bash
# Build a clean, versioned .zip of the extension for the Chrome Web Store.
# Includes only the files Chrome needs to run; excludes git, docs, and tooling.
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
OUT="dist/boca-plusplus-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"

zip -r -q "$OUT" \
    manifest.json \
    background.js \
    content.js \
    utils.js \
    ModalHelper.js \
    RunsTableReorderer.js \
    CodeViewer.js \
    RunsTableContentController.js \
    ScoreTableContentController.js \
    RunEditContentController.js \
    libs \
    icons \
    -x "*.DS_Store"

echo "Built $OUT"
unzip -l "$OUT"
