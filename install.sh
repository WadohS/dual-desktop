#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/.local/share/dual-desktop"
BIN_DIR="$HOME/.local/bin"
APPLICATIONS_DIR="$HOME/.local/share/applications"
ICONS_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"

mkdir -p "$APP_DIR" "$BIN_DIR" "$APPLICATIONS_DIR" "$ICONS_DIR"

cp "$ROOT_DIR/dual_desktop.py" "$APP_DIR/dual_desktop.py"
cp "$ROOT_DIR/assets/dual-desktop.svg" "$ICONS_DIR/dual-desktop.svg"
chmod +x "$APP_DIR/dual_desktop.py"
ln -sf "$APP_DIR/dual_desktop.py" "$BIN_DIR/dual-desktop"

cat > "$APPLICATIONS_DIR/dual-desktop.desktop" <<'EOF'
[Desktop Entry]
Name=Dual Desktop
Comment=Unified control center for Dual Clock and Dual Wallpaper
Exec=/home/wadohs/.local/share/dual-desktop/dual_desktop.py
Icon=dual-desktop
Terminal=false
Type=Application
Categories=Utility;GNOME;
NoDisplay=true
EOF

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

printf 'Installed Dual Desktop control center in %s\n' "$APP_DIR"
