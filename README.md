# Dual Desktop

`Dual Desktop` is the umbrella project that will merge:

- `dual-clock`: GNOME Shell extension for dual-monitor clocks
- `dual-wallpaper`: local dual-monitor wallpaper rotator for GNOME

At this stage, the repository keeps both components side by side while they are stabilized independently.

## Repository Layout

- `dual-clock/`: GNOME Shell extension
- `dual-wallpaper/`: local wallpaper rotator utility, service and preferences app

## Current Goal

Keep the two working independently, then progressively integrate them into a single end-user project.

## Merge Roadmap

1. stabilize `dual-clock`
2. stabilize `dual-wallpaper`
3. define shared configuration model
4. unify naming, docs and packaging
5. decide whether final delivery remains split or becomes one integrated app/extension set
