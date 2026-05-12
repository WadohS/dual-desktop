#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$ROOT_DIR/dual-clock"

cd "$EXT_DIR"
./package.sh

printf 'Created %s\n' "$EXT_DIR/dual-clock@wadohs.zip"
