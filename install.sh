#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/.local/share/dual-desktop"
BIN_DIR="$HOME/.local/bin"
ICONS_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"

mkdir -p "$APP_DIR" "$BIN_DIR" "$ICONS_DIR"

cp "$ROOT_DIR/assets/dual-desktop.svg" "$ICONS_DIR/dual-desktop.svg"

(
  cd "$ROOT_DIR/dual-clock"
  ./package.sh
  gnome-extensions install --force ./dual-clock@wadohs.zip
  gnome-extensions enable dual-clock@wadohs || true
)

(
  cd "$ROOT_DIR/dual-wallpaper"
  ./install.sh
)

printf 'Installed Dual Desktop assets in %s\n' "$APP_DIR"
