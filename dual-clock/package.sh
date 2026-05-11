#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ZIP_FILE="$ROOT_DIR/dual-clock@wadohs.zip"

glib-compile-schemas "$ROOT_DIR/schemas"
rm -f "$ZIP_FILE"

python3 - <<'PY' "$ROOT_DIR" "$ZIP_FILE"
import os
import sys
import zipfile

root = sys.argv[1]
zip_path = sys.argv[2]
files = [
    'metadata.json',
    'extension.js',
    'prefs.js',
    'schemas/org.gnome.shell.extensions.dual-clock.gschema.xml',
    'schemas/gschemas.compiled',
]

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for rel in files:
        zf.write(os.path.join(root, rel), rel)
PY

printf 'Created %s\n' "$ZIP_FILE"
