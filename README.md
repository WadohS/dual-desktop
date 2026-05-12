# Dual Desktop

## EN

`Dual Desktop` combines two user-facing components for GNOME:

- `dual-clock`: GNOME Shell extension for dual-monitor clocks
- `dual-wallpaper`: local dual-monitor wallpaper rotator for GNOME

The repository already provides a shared installer and a unified settings flow while both parts stay independently maintainable.

### Repository Layout

- `dual-clock/`: GNOME Shell extension
- `dual-wallpaper/`: local wallpaper rotator utility, service and preferences app
- `install.sh`: unified installer
- `package-extension.sh`: build the GNOME Shell extension archive from `dual-clock/`

### Install

```bash
./install.sh
```

This installs:

- `Dual Desktop` clock extension
- `Dual Wallpaper` service and indicator
- shared branding assets

Settings are opened either from:

- GNOME Extensions / Extension Manager (`Dual Desktop`)
- the top bar indicator

### GNOME Extensions Packaging

```bash
./package-extension.sh
```

This generates:

- `dual-clock/dual-clock@wadohs.zip`

Current extension UUID:

- `dual-clock@wadohs`

Before a public GNOME Extensions release, review whether you want to keep this UUID or rename it to match the final public identity.

## FR

`Dual Desktop` regroupe deux composants visibles cote utilisateur pour GNOME :

- `dual-clock` : extension GNOME Shell pour les horloges double ecran
- `dual-wallpaper` : gestionnaire local de fonds double ecran pour GNOME

Le depot fournit deja un installateur commun et un flux de reglages unifie, tout en gardant les deux briques separees et maintenables.

### Structure du depot

- `dual-clock/` : extension GNOME Shell
- `dual-wallpaper/` : utilitaire local de rotation de fonds, service et fenetre de preferences
- `install.sh` : installateur unifie
- `package-extension.sh` : fabrique l'archive de l'extension GNOME a partir de `dual-clock/`

### Installation

```bash
./install.sh
```

Cela installe :

- l'extension d'horloge `Dual Desktop`
- le service et l'indicateur `Dual Wallpaper`
- les ressources de branding partagees

Les reglages s'ouvrent soit depuis :

- GNOME Extensions / Extension Manager (`Dual Desktop`)
- le menu de l'icone en haut

### Packaging GNOME Extensions

```bash
./package-extension.sh
```

Cela genere :

- `dual-clock/dual-clock@wadohs.zip`

UUID actuel de l'extension :

- `dual-clock@wadohs`

Avant une publication publique sur `extensions.gnome.org`, il faudra verifier si cet UUID doit rester tel quel ou etre renomme pour coller a l'identite finale du projet.
