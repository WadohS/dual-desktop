import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const WALLPAPER_CONFIG_DIR = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'dual-wallpaper']);
const WALLPAPER_CONFIG_PATH = GLib.build_filenamev([WALLPAPER_CONFIG_DIR, 'config.json']);
const WALLPAPER_CLI = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'dual-wallpaper', 'dual_wallpaper.py']);

const WALLPAPER_DEFAULTS = {
    mode: 'shared',
    primary_folder: GLib.build_filenamev([GLib.get_home_dir(), 'Téléchargements', 'ColorWall']),
    secondary_folder: GLib.build_filenamev([GLib.get_home_dir(), 'Téléchargements', 'ColorWall']),
    different_images: true,
    recursive: false,
    interval_minutes: 20,
    output_file: GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'dual-wallpaper', 'wallpaper-composite.jpg']),
    fill_color: 'black',
};

function ensureWallpaperConfig() {
    GLib.mkdir_with_parents(WALLPAPER_CONFIG_DIR, 0o755);
    if (!GLib.file_test(WALLPAPER_CONFIG_PATH, GLib.FileTest.EXISTS)) {
        GLib.file_set_contents(WALLPAPER_CONFIG_PATH, JSON.stringify(WALLPAPER_DEFAULTS, null, 2));
        return {...WALLPAPER_DEFAULTS};
    }

    const [ok, bytes] = GLib.file_get_contents(WALLPAPER_CONFIG_PATH);
    if (!ok)
        return {...WALLPAPER_DEFAULTS};

    const config = JSON.parse(new TextDecoder().decode(bytes));
    if (!('interval_minutes' in config)) {
        config.interval_minutes = Math.max(1, Math.floor((config.interval_seconds ?? 1200) / 60));
        delete config.interval_seconds;
        saveWallpaperConfig(config);
    }
    return {...WALLPAPER_DEFAULTS, ...config};
}

function saveWallpaperConfig(config) {
    GLib.file_set_contents(WALLPAPER_CONFIG_PATH, JSON.stringify(config, null, 2));
}

function runCommand(argv) {
    try {
        const subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
        const [, stdout, stderr] = subprocess.communicate_utf8(null, null);
        return {
            ok: subprocess.get_successful(),
            message: stdout?.trim() || stderr?.trim() || (subprocess.get_successful() ? 'OK' : 'Command failed'),
        };
    } catch (error) {
        return {ok: false, message: `${error}`};
    }
}

function createSectionHeader(iconName, titleText, subtitleText) {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        visible: true,
        margin_top: 8,
        margin_bottom: 4,
    });

    const icon = new Gtk.Image({
        icon_name: iconName,
        pixel_size: 24,
        visible: true,
        valign: Gtk.Align.START,
    });

    const textBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 2,
        visible: true,
    });
    const title = new Gtk.Label({
        label: `<b>${titleText}</b>`,
        use_markup: true,
        halign: Gtk.Align.START,
        visible: true,
    });
    const subtitle = new Gtk.Label({
        label: subtitleText,
        halign: Gtk.Align.START,
        wrap: true,
        visible: true,
    });

    textBox.append(title);
    textBox.append(subtitle);
    box.append(icon);
    box.append(textBox);
    return box;
}

function createTabLabel(iconName, text) {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 6,
        visible: true,
    });
    box.append(new Gtk.Image({icon_name: iconName, pixel_size: 16, visible: true}));
    box.append(new Gtk.Label({label: text, visible: true}));
    return box;
}

function createIconButton(iconName, tooltip, callback) {
    const button = new Gtk.Button({visible: true, tooltip_text: tooltip});
    button.add_css_class('circular');
    button.add_css_class('flat');
    button.set_size_request(38, 38);
    button.set_halign(Gtk.Align.CENTER);
    button.set_valign(Gtk.Align.CENTER);
    button.set_child(new Gtk.Image({icon_name: iconName, pixel_size: 16, visible: true}));
    button.connect('clicked', callback);
    return button;
}

function createSwitch(active, callback) {
    const widget = new Gtk.Switch({active, visible: true});
    widget.set_halign(Gtk.Align.START);
    widget.set_valign(Gtk.Align.CENTER);
    widget.set_hexpand(false);
    widget.connect('notify::active', callback);
    return widget;
}

export default class DualClockPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        const settings = this.getSettings();
        const wallpaperConfig = ensureWallpaperConfig();

        const outer = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            visible: true,
        });
        outer.set_size_request(980, 1200);

        const title = new Gtk.Label({
            label: `<b>${this.metadata.name}</b>`,
            use_markup: true,
            halign: Gtk.Align.START,
            visible: true,
        });
        outer.append(title);

        const notebook = new Gtk.Notebook({
            hexpand: true,
            vexpand: true,
            visible: true,
        });
        const clockPage = new Gtk.ScrolledWindow({
            hexpand: true,
            vexpand: true,
            visible: true,
        });
        const wallpaperPage = new Gtk.ScrolledWindow({
            hexpand: true,
            vexpand: true,
            visible: true,
        });
        const clockContent = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            visible: true,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
        });
        const wallpaperContent = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            visible: true,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
        });
        clockPage.set_child(clockContent);
        wallpaperPage.set_child(wallpaperContent);
        notebook.append_page(clockPage, createTabLabel('preferences-system-time-symbolic', 'Horloge'));
        notebook.append_page(wallpaperPage, createTabLabel('video-display-symbolic', 'Fonds'));
        outer.append(notebook);

        const clockGrid = new Gtk.Grid({
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
        });
        clockContent.append(createSectionHeader('preferences-system-time-symbolic', 'Horloge', 'Horloges sur les deux ecrans avec style coherent et position reglable.'));
        clockContent.append(clockGrid);

        let clockRow = 0;
        const secondMonitorRows = [];

        const addSpin = (grid, row, labelText, getter, setter, min, max, step, extraRows = null) => {
            const label = new Gtk.Label({label: labelText, halign: Gtk.Align.START, visible: true});
            const spin = Gtk.SpinButton.new_with_range(min, max, step);
            spin.set_value(getter());
            spin.set_visible(true);
            spin.connect('value-changed', widget => setter(widget.get_value_as_int()));
            grid.attach(label, 0, row, 1, 1);
            grid.attach(spin, 1, row, 1, 1);
            if (extraRows)
                extraRows.push(label, spin);
        };

        const addFontButton = (grid, row, labelText, key) => {
            const label = new Gtk.Label({label: labelText, halign: Gtk.Align.START, visible: true});
            const button = new Gtk.FontButton({visible: true, use_font: true, use_size: false});
            const current = settings.get_string(key);
            if (current)
                button.set_font(current);
            button.connect('font-set', widget => {
                const desc = Pango.FontDescription.from_string(widget.get_font());
                settings.set_string(key, desc.get_family() ?? '');
            });
            grid.attach(label, 0, row, 1, 1);
            grid.attach(button, 1, row, 1, 1);
        };

        const addEntry = (grid, row, labelText, key, placeholder) => {
            const label = new Gtk.Label({label: labelText, halign: Gtk.Align.START, visible: true});
            const entry = new Gtk.Entry({visible: true, placeholder_text: placeholder});
            entry.set_text(settings.get_string(key));
            entry.connect('changed', widget => settings.set_string(key, widget.get_text()));
            grid.attach(label, 0, row, 1, 1);
            grid.attach(entry, 1, row, 1, 1);
        };

        const addCombo = (grid, row, labelText, key, labels) => {
            const label = new Gtk.Label({label: labelText, halign: Gtk.Align.START, visible: true});
            const combo = new Gtk.ComboBoxText({visible: true});
            labels.forEach((text, index) => combo.append(String(index), text));
            combo.set_active(settings.get_int(key));
            combo.connect('changed', widget => settings.set_int(key, widget.get_active()));
            grid.attach(label, 0, row, 1, 1);
            grid.attach(combo, 1, row, 1, 1);
        };

        const updateSecondMonitorVisibility = visible => {
            for (const widget of secondMonitorRows)
                widget.set_visible(visible);
        };

        addSpin(clockGrid, clockRow++, 'Ecran 1 : offset droite', () => settings.get_int('offset-right'), value => settings.set_int('offset-right', value), 0, 2000, 5);
        addSpin(clockGrid, clockRow++, 'Ecran 1 : offset bas', () => settings.get_int('offset-bottom'), value => settings.set_int('offset-bottom', value), 0, 2000, 5);

        const sameLabel = new Gtk.Label({label: 'Memes reglages sur les 2 ecrans', halign: Gtk.Align.START, visible: true});
        const sameSwitch = createSwitch(settings.get_boolean('same-on-both-monitors'), widget => {
            const active = widget.get_active();
            settings.set_boolean('same-on-both-monitors', active);
            updateSecondMonitorVisibility(!active);
        });
        clockGrid.attach(sameLabel, 0, clockRow, 1, 1);
        clockGrid.attach(sameSwitch, 1, clockRow, 1, 1);
        clockRow += 1;

        addSpin(clockGrid, clockRow++, 'Ecran 2 : offset droite', () => settings.get_int('offset-right-2'), value => settings.set_int('offset-right-2', value), 0, 2000, 5, secondMonitorRows);
        addSpin(clockGrid, clockRow++, 'Ecran 2 : offset bas', () => settings.get_int('offset-bottom-2'), value => settings.set_int('offset-bottom-2', value), 0, 2000, 5, secondMonitorRows);
        addSpin(clockGrid, clockRow++, 'Agrandissement (%)', () => settings.get_int('scale-percent'), value => settings.set_int('scale-percent', value), 25, 400, 5);
        addFontButton(clockGrid, clockRow++, 'Typo heure', 'clock-font-family');
        addFontButton(clockGrid, clockRow++, 'Typo date', 'date-font-family');
        addSpin(clockGrid, clockRow++, 'Decalage horizontal 2e ligne', () => settings.get_int('date-offset-x'), value => settings.set_int('date-offset-x', value), -1000, 1000, 5);

        const colorAutoLabel = new Gtk.Label({label: 'Couleur auto noir/blanc selon le fond', halign: Gtk.Align.START, visible: true});
        const colorAutoSwitch = createSwitch(settings.get_boolean('auto-text-color'), widget => settings.set_boolean('auto-text-color', widget.get_active()));
        clockGrid.attach(colorAutoLabel, 0, clockRow, 1, 1);
        clockGrid.attach(colorAutoSwitch, 1, clockRow, 1, 1);
        clockRow += 1;

        addEntry(clockGrid, clockRow++, 'Couleur manuelle (#rrggbb)', 'manual-text-color', '#ffffff');

        const orderLabel = new Gtk.Label({label: 'Heure au-dessus de la date', halign: Gtk.Align.START, visible: true});
        const orderSwitch = createSwitch(settings.get_boolean('date-below-clock'), widget => settings.set_boolean('date-below-clock', widget.get_active()));
        clockGrid.attach(orderLabel, 0, clockRow, 1, 1);
        clockGrid.attach(orderSwitch, 1, clockRow, 1, 1);
        clockRow += 1;

        addCombo(clockGrid, clockRow++, 'Format d\'heure', 'time-format', [
            'FR / GB / DE 24h: 14:35',
            'FR 24h: 14h35',
            'US 12h: 02:35 PM',
            '24h avec secondes: 14:35:20',
            'US 12h avec secondes: 02:35:20 PM',
        ]);
        addCombo(clockGrid, clockRow++, 'Format de date', 'date-format', [
            'Lundi, Mai 11',
            'Lundi 11 Mai',
            'Lun 11 Mai',
            '11 May',
            '11/05/2026',
            'Lundi 11 Mai 2026',
            '11.05.2026',
            '05/11/2026',
        ]);
        updateSecondMonitorVisibility(!settings.get_boolean('same-on-both-monitors'));

        const wallpaperGrid = new Gtk.Grid({
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
        });
        wallpaperContent.append(createSectionHeader('preferences-desktop-wallpaper-symbolic', 'Dual Wallpaper', 'Deux fonds sur deux ecrans avec un ou deux dossiers locaux et rotation temporisee.'));
        wallpaperContent.append(wallpaperGrid);

        let wallpaperRow = 0;
        const wallpaperStatus = new Gtk.Label({label: '', halign: Gtk.Align.START, visible: true});
        const runWallpaperCommand = argv => {
            const result = runCommand(argv);
            wallpaperStatus.set_text(result.ok ? result.message : `Error: ${result.message}`);
            return result;
        };

        const saveWallpaper = () => {
            const updated = {
                mode: modeCombo.get_active_id() || 'shared',
                primary_folder: primaryEntry.get_text(),
                secondary_folder: secondaryEntry.get_text() || primaryEntry.get_text(),
                different_images: differentSwitch.get_active(),
                recursive: recursiveSwitch.get_active(),
                interval_minutes: intervalSpin.get_value_as_int(),
                output_file: outputEntry.get_text(),
                fill_color: fillCombo.get_active_id() || 'black',
            };
            saveWallpaperConfig(updated);
            wallpaperStatus.set_text('Wallpaper settings saved.');
        };

        const chooseFolder = entry => {
            const dialog = Gtk.FileChooserNative.new('Choose folder', outer.get_root(), Gtk.FileChooserAction.SELECT_FOLDER, 'Choose', 'Cancel');
            dialog.connect('response', (_d, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const file = dialog.get_file();
                    if (file?.get_path())
                        entry.set_text(file.get_path());
                }
                dialog.destroy();
            });
            dialog.show();
        };

        const addWallpaperEntry = (row, labelText, entry, choose = false) => {
            const label = new Gtk.Label({label: labelText, halign: Gtk.Align.START, visible: true});
            wallpaperGrid.attach(label, 0, row, 1, 1);
            wallpaperGrid.attach(entry, 1, row, 1, 1);
            if (choose) {
                const button = new Gtk.Button({label: 'Choose...', visible: true});
                button.connect('clicked', () => chooseFolder(entry));
                wallpaperGrid.attach(button, 2, row, 1, 1);
            }
        };

        const modeCombo = new Gtk.ComboBoxText({visible: true});
        modeCombo.append('shared', 'One folder for both monitors');
        modeCombo.append('split', 'One folder per monitor');
        modeCombo.set_active_id(wallpaperConfig.mode);

        const primaryEntry = new Gtk.Entry({text: wallpaperConfig.primary_folder, visible: true});
        const secondaryEntry = new Gtk.Entry({text: wallpaperConfig.secondary_folder, visible: true});
        const outputEntry = new Gtk.Entry({text: wallpaperConfig.output_file, visible: true});
        const differentSwitch = createSwitch(wallpaperConfig.different_images, () => {});
        const recursiveSwitch = createSwitch(wallpaperConfig.recursive, () => {});
        const intervalSpin = Gtk.SpinButton.new_with_range(1, 1440, 1);
        intervalSpin.set_value(wallpaperConfig.interval_minutes);
        const fillCombo = new Gtk.ComboBoxText({visible: true});
        for (const color of ['black', 'white', 'gray20'])
            fillCombo.append(color, color);
        fillCombo.set_active_id(wallpaperConfig.fill_color);

        addWallpaperEntry(wallpaperRow++, 'Mode', modeCombo, false);
        addWallpaperEntry(wallpaperRow++, 'Dossier ecran 1', primaryEntry, true);
        const secondaryLabel = new Gtk.Label({label: 'Dossier ecran 2', halign: Gtk.Align.START, visible: wallpaperConfig.mode === 'split'});
        wallpaperGrid.attach(secondaryLabel, 0, wallpaperRow, 1, 1);
        wallpaperGrid.attach(secondaryEntry, 1, wallpaperRow, 1, 1);
        const secondaryButton = new Gtk.Button({label: 'Choose...', visible: wallpaperConfig.mode === 'split'});
        secondaryButton.connect('clicked', () => chooseFolder(secondaryEntry));
        wallpaperGrid.attach(secondaryButton, 2, wallpaperRow, 1, 1);
        wallpaperRow += 1;

        modeCombo.connect('changed', widget => {
            const split = widget.get_active_id() === 'split';
            secondaryLabel.set_visible(split);
            secondaryEntry.set_visible(split);
            secondaryButton.set_visible(split);
        });

        const differentLabel = new Gtk.Label({label: 'Forcer des images differentes', halign: Gtk.Align.START, visible: true});
        wallpaperGrid.attach(differentLabel, 0, wallpaperRow, 1, 1);
        wallpaperGrid.attach(differentSwitch, 1, wallpaperRow, 1, 1);
        wallpaperRow += 1;

        const recursiveLabel = new Gtk.Label({label: 'Recherche recursive', halign: Gtk.Align.START, visible: true});
        wallpaperGrid.attach(recursiveLabel, 0, wallpaperRow, 1, 1);
        wallpaperGrid.attach(recursiveSwitch, 1, wallpaperRow, 1, 1);
        wallpaperRow += 1;

        const intervalLabel = new Gtk.Label({label: 'Intervalle (minutes)', halign: Gtk.Align.START, visible: true});
        wallpaperGrid.attach(intervalLabel, 0, wallpaperRow, 1, 1);
        wallpaperGrid.attach(intervalSpin, 1, wallpaperRow, 1, 1);
        wallpaperRow += 1;

        const fillLabel = new Gtk.Label({label: 'Couleur de remplissage', halign: Gtk.Align.START, visible: true});
        wallpaperGrid.attach(fillLabel, 0, wallpaperRow, 1, 1);
        wallpaperGrid.attach(fillCombo, 1, wallpaperRow, 1, 1);
        wallpaperRow += 1;

        addWallpaperEntry(wallpaperRow++, 'Fichier de sortie', outputEntry, false);

        const buttonBox = new Gtk.Box({spacing: 12, visible: true});
        const saveButton = createIconButton('document-save-symbolic', 'Enregistrer', saveWallpaper);
        const applyButton = createIconButton('view-refresh-symbolic', 'Appliquer maintenant', () => {
            saveWallpaper();
            runWallpaperCommand([WALLPAPER_CLI, '--apply']);
        });
        const previousButton = createIconButton('media-skip-backward-symbolic', 'Precedent', () => {
            saveWallpaper();
            runWallpaperCommand([WALLPAPER_CLI, '--previous']);
        });
        const nextButton = createIconButton('media-skip-forward-symbolic', 'Suivant', () => {
            saveWallpaper();
            runWallpaperCommand([WALLPAPER_CLI, '--apply']);
        });
        const restartButton = createIconButton('system-reboot-symbolic', 'Redemarrer le service', () => {
            saveWallpaper();
            runWallpaperCommand(['systemctl', '--user', 'restart', 'dual-wallpaper.service']);
        });
        for (const button of [saveButton, applyButton, previousButton, nextButton, restartButton])
            buttonBox.append(button);
        wallpaperGrid.attach(buttonBox, 0, wallpaperRow++, 3, 1);
        wallpaperGrid.attach(wallpaperStatus, 0, wallpaperRow, 3, 1);

        return outer;
    }
}
