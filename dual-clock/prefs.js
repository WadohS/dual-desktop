import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DoubleClockPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        const settings = this.getSettings();

        const grid = new Gtk.Grid({
            column_spacing: 12,
            row_spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            visible: true,
        });

        const title = new Gtk.Label({
            label: `<b>${this.metadata.name}</b>`,
            use_markup: true,
            halign: Gtk.Align.START,
            visible: true,
        });
        grid.attach(title, 0, 0, 2, 1);

        const addSpin = (row, labelText, key, min, max, step) => {
            const label = new Gtk.Label({ label: labelText, halign: Gtk.Align.START, visible: true });
            const spin = Gtk.SpinButton.new_with_range(min, max, step);
            spin.set_value(settings.get_int(key));
            spin.set_visible(true);
            spin.connect('value-changed', widget => settings.set_int(key, widget.get_value_as_int()));
            grid.attach(label, 0, row, 1, 1);
            grid.attach(spin, 1, row, 1, 1);
        };

        const addFontButton = (row, labelText, key) => {
            const label = new Gtk.Label({ label: labelText, halign: Gtk.Align.START, visible: true });
            const button = new Gtk.FontButton({ visible: true, use_font: true, use_size: false });
            const current = settings.get_string(key);
            if (current)
                button.set_font(current);
            button.connect('font-set', widget => {
                const font = widget.get_font();
                const desc = Pango.FontDescription.from_string(font);
                settings.set_string(key, desc.get_family() ?? '');
            });
            grid.attach(label, 0, row, 1, 1);
            grid.attach(button, 1, row, 1, 1);
        };

        const addEntry = (row, labelText, key, placeholder) => {
            const label = new Gtk.Label({ label: labelText, halign: Gtk.Align.START, visible: true });
            const entry = new Gtk.Entry({ visible: true, placeholder_text: placeholder });
            entry.set_text(settings.get_string(key));
            entry.connect('changed', widget => settings.set_string(key, widget.get_text()));
            grid.attach(label, 0, row, 1, 1);
            grid.attach(entry, 1, row, 1, 1);
        };

        const secondMonitorRows = [];
        const setSecondMonitorVisibility = visible => {
            for (const widget of secondMonitorRows)
                widget.set_visible(visible);
        };

        const addSecondMonitorSpin = (row, labelText, key, min, max, step) => {
            const label = new Gtk.Label({ label: labelText, halign: Gtk.Align.START, visible: true });
            const spin = Gtk.SpinButton.new_with_range(min, max, step);
            spin.set_value(settings.get_int(key));
            spin.set_visible(true);
            spin.connect('value-changed', widget => settings.set_int(key, widget.get_value_as_int()));
            grid.attach(label, 0, row, 1, 1);
            grid.attach(spin, 1, row, 1, 1);
            secondMonitorRows.push(label, spin);
        };

        addSpin(1, 'Ecran 1: offset droite', 'offset-right', 0, 2000, 5);
        addSpin(2, 'Ecran 1: offset bas', 'offset-bottom', 0, 2000, 5);
        const sameLabel = new Gtk.Label({ label: 'Memes reglages sur les 2 ecrans', halign: Gtk.Align.START, visible: true });
        const sameSwitch = new Gtk.Switch({ active: settings.get_boolean('same-on-both-monitors'), visible: true });
        sameSwitch.connect('notify::active', widget => {
            const active = widget.get_active();
            settings.set_boolean('same-on-both-monitors', active);
            setSecondMonitorVisibility(!active);
        });
        grid.attach(sameLabel, 0, 3, 1, 1);
        grid.attach(sameSwitch, 1, 3, 1, 1);

        addSecondMonitorSpin(4, 'Ecran 2: offset droite', 'offset-right-2', 0, 2000, 5);
        addSecondMonitorSpin(5, 'Ecran 2: offset bas', 'offset-bottom-2', 0, 2000, 5);
        addSpin(6, 'Agrandissement (%)', 'scale-percent', 25, 400, 5);
        addFontButton(7, 'Typo heure', 'clock-font-family');
        addFontButton(8, 'Typo date', 'date-font-family');
        addSpin(9, 'Decalage horizontal 2e ligne', 'date-offset-x', -1000, 1000, 5);

        const colorLabel = new Gtk.Label({
            label: 'Couleur auto noir/blanc selon le fond',
            halign: Gtk.Align.START,
            visible: true,
        });
        const colorSwitch = new Gtk.Switch({
            active: settings.get_boolean('auto-text-color'),
            visible: true,
        });
        colorSwitch.connect('notify::active', widget => settings.set_boolean('auto-text-color', widget.get_active()));
        grid.attach(colorLabel, 0, 10, 1, 1);
        grid.attach(colorSwitch, 1, 10, 1, 1);
        addEntry(11, 'Couleur manuelle (#rrggbb)', 'manual-text-color', '#ffffff');

        const orderLabel = new Gtk.Label({
            label: 'Heure au-dessus de la date',
            halign: Gtk.Align.START,
            visible: true,
        });
        const orderSwitch = new Gtk.Switch({
            active: settings.get_boolean('date-below-clock'),
            visible: true,
        });
        orderSwitch.connect('notify::active', widget => settings.set_boolean('date-below-clock', widget.get_active()));
        grid.attach(orderLabel, 0, 12, 1, 1);
        grid.attach(orderSwitch, 1, 12, 1, 1);

        const timeLabel = new Gtk.Label({
            label: 'Format d\'heure',
            halign: Gtk.Align.START,
            visible: true,
        });
        const timeCombo = new Gtk.ComboBoxText({ visible: true });
        const times = [
            'FR / GB / DE 24h: 14:35',
            'FR 24h: 14h35',
            'US 12h: 02:35 PM',
            '24h avec secondes: 14:35:20',
            'US 12h avec secondes: 02:35:20 PM',
        ];
        times.forEach((label, index) => timeCombo.append(String(index), label));
        timeCombo.set_active(settings.get_int('time-format'));
        timeCombo.connect('changed', widget => settings.set_int('time-format', widget.get_active()));
        grid.attach(timeLabel, 0, 13, 1, 1);
        grid.attach(timeCombo, 1, 13, 1, 1);

        const formatLabel = new Gtk.Label({
            label: 'Format de date',
            halign: Gtk.Align.START,
            visible: true,
        });
        const formatCombo = new Gtk.ComboBoxText({ visible: true });
        const formats = [
            'Lundi, Mai 11',
            'Lundi 11 Mai',
            'Lun 11 Mai',
            '11 Mai',
            '11/05/2026',
            'Lundi 11 Mai 2026',
            '11.05.2026',
            '05/11/2026',
        ];
        formats.forEach((label, index) => formatCombo.append(String(index), label));
        formatCombo.set_active(settings.get_int('date-format'));
        formatCombo.connect('changed', widget => settings.set_int('date-format', widget.get_active()));
        grid.attach(formatLabel, 0, 14, 1, 1);
        grid.attach(formatCombo, 1, 14, 1, 1);

        setSecondMonitorVisibility(!settings.get_boolean('same-on-both-monitors'));

        return grid;
    }
}
