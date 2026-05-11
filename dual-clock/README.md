# Dual Clock

GNOME Shell extension that displays clocks on each monitor with configurable position, fonts, and formatting.

## Features

- independent offsets per monitor
- optional shared settings for both monitors
- configurable time and date formats
- font selection for time and date
- optional automatic text color based on wallpaper brightness

## Files

- `extension.js`: runtime code
- `prefs.js`: preferences window
- `schemas/org.gnome.shell.extensions.dual-clock.gschema.xml`: extension settings schema

## Local Packaging

Build the extension zip from the repository root:

```bash
./package.sh
```

This generates `dual-clock@wadohs.zip`.

## Local Installation

```bash
gnome-extensions install --force ./dual-clock@wadohs.zip
gnome-extensions enable dual-clock@wadohs
```

## Publishing Notes

To publish on `extensions.gnome.org`, create an account there and upload the generated zip.
Make sure the package contains:

- `metadata.json`
- `extension.js`
- `prefs.js`
- `schemas/org.gnome.shell.extensions.dual-clock.gschema.xml`
- `schemas/gschemas.compiled`
