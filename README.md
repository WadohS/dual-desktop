# Dual Desktop

`Dual Desktop` is the umbrella project that merges:

- `dual-clock`: GNOME Shell extension for dual-monitor clocks
- `dual-wallpaper`: local dual-monitor wallpaper rotator for GNOME

At this stage, the repository keeps both components side by side and provides a shared install and control center.

## Repository Layout

- `dual-clock/`: GNOME Shell extension
- `dual-wallpaper/`: local wallpaper rotator utility, service and preferences app
- `dual_desktop.py`: unified launcher/control center
- `install.sh`: unified installer

## Install

From the repository root:

```bash
./install.sh
```

This installs:

- `Dual Clock`
- `Dual Wallpaper`
- a desktop launcher named `Dual Desktop`

## Current Integration

`Dual Desktop` provides one visible entry point while still keeping the code split into two stable components.

The control center allows you to:

- open `Dual Clock` settings
- open `Dual Wallpaper` settings
- apply the next wallpaper pair
- apply the previous wallpaper pair
- restart the wallpaper service

## Merge Roadmap

1. stabilize `dual-clock`
2. stabilize `dual-wallpaper`
3. define shared configuration model
4. unify naming, docs and packaging
5. decide whether final delivery remains split or becomes one integrated app/extension set
