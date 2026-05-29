#!/usr/bin/env bash
#
# Boca++ installer — downloads the latest release ZIP and unpacks it to a stable
# folder, ready for Chrome's "Load unpacked". Works on macOS, Linux, and Windows
# (Git Bash / WSL).
#
# Quick install:
#   curl -fsSL https://raw.githubusercontent.com/rsalesc/bocapp/main/install.sh | bash
#
# Install to a custom folder:
#   BOCAPP_DIR="/path/to/folder" bash install.sh
#
set -euo pipefail

REPO="rsalesc/bocapp"
# Unpack into ./boca-plusplus in the current working directory by default.
INSTALL_DIR="${BOCAPP_DIR:-$PWD/boca-plusplus}"

say()  { printf '%s\n' "$*"; }
die()  { printf 'Error: %s\n' "$*" >&2; exit 1; }

command -v curl  >/dev/null 2>&1 || die "curl is required but not found."
command -v unzip >/dev/null 2>&1 || die "unzip is required but not found."

say "Boca++ installer"
say "Looking up the latest release of $REPO ..."

# Find the .zip asset URL from the latest release (no jq dependency).
ASSET_URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*\.zip"' \
  | head -n1 \
  | sed 's/.*"\(https[^"]*\)"/\1/')

[ -n "$ASSET_URL" ] || die "Could not find a release ZIP. Check https://github.com/$REPO/releases"

say "Found: $ASSET_URL"

# Download to a temp file that is cleaned up on exit.
TMP_ZIP=$(mktemp "${TMPDIR:-/tmp}/bocapp.XXXXXX.zip") || die "Could not create a temp file."
trap 'rm -f "$TMP_ZIP"' EXIT

say "Downloading ..."
curl -fSL --progress-bar "$ASSET_URL" -o "$TMP_ZIP"

# Refuse to clobber a non-Boca++ directory.
if [ -e "$INSTALL_DIR" ] && [ ! -e "$INSTALL_DIR/manifest.json" ] && [ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null || true)" ]; then
  die "$INSTALL_DIR exists and is not a Boca++ install. Set BOCAPP_DIR to a different path."
fi

say "Unpacking to $INSTALL_DIR ..."
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
unzip -q -o "$TMP_ZIP" -d "$INSTALL_DIR"

[ -e "$INSTALL_DIR/manifest.json" ] || die "Unpack failed: manifest.json not found in $INSTALL_DIR"

# Open the install folder in the file manager (best effort, non-fatal).
case "$(uname -s)" in
  Darwin)                 open "$INSTALL_DIR"        >/dev/null 2>&1 || true ;;
  MINGW*|MSYS*|CYGWIN*)   explorer.exe "$(cygpath -w "$INSTALL_DIR" 2>/dev/null || echo "$INSTALL_DIR")" >/dev/null 2>&1 || true ;;
  Linux)                  command -v xdg-open >/dev/null 2>&1 && xdg-open "$INSTALL_DIR" >/dev/null 2>&1 || true ;;
esac

say ""
say "Done. Boca++ is unpacked at:"
say "    $INSTALL_DIR"
say ""
say "Finish in Chrome (one-time):"
say "  1. Open  chrome://extensions"
say "  2. Turn on 'Developer mode' (top-right)"
say "  3. Click 'Load unpacked' and select the folder above"
say "  4. Pin the Boca++ icon, open your BOCA server, and click the icon to enable it"
say ""
say "To update later, just run this installer again, then click the reload icon on the Boca++ card."
