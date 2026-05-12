import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const VARIETY_CONF = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'variety', 'variety.conf']);
const SHADOW_ALPHA = 0.27;
const BRIGHT_TEXT = 'white';
const DARK_TEXT = 'black';

function normalizeCssColor(value) {
    if (!value)
        return '#ffffff';

    const color = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color))
        return color;

    return '#ffffff';
}

function parseHexColor(value) {
    const color = normalizeCssColor(value);
    if (color.length === 4) {
        return {
            r: Number.parseInt(color[1] + color[1], 16),
            g: Number.parseInt(color[2] + color[2], 16),
            b: Number.parseInt(color[3] + color[3], 16),
        };
    }

    return {
        r: Number.parseInt(color.slice(1, 3), 16),
        g: Number.parseInt(color.slice(3, 5), 16),
        b: Number.parseInt(color.slice(5, 7), 16),
    };
}

function isDarkColor(value) {
    const {r, g, b} = parseHexColor(value);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 140;
}

function currentWallpaperPath() {
    const value = Gio.Settings.new('org.gnome.desktop.background').get_string('picture-uri');
    if (!value)
        return null;

    try {
        return Gio.File.new_for_uri(value).get_path();
    } catch (_err) {
        return null;
    }
}

function parseFontSpec(value, fallbackFamily, fallbackSize) {
    const description = Pango.FontDescription.from_string(value || `${fallbackFamily} ${fallbackSize}`);
    const family = description.get_family() || fallbackFamily;
    const size = description.get_size() > 0 ? description.get_size() / Pango.SCALE : fallbackSize;
    const weight = description.get_weight();
    const style = description.get_style();

    return {
        family,
        size,
        weight,
        style,
    };
}

function cssForFontSpec(spec, color, shadow) {
    let styleName = 'normal';
    if (spec.style === Pango.Style.ITALIC)
        styleName = 'italic';
    else if (spec.style === Pango.Style.OBLIQUE)
        styleName = 'oblique';

    return [
        `font-family: "${spec.family}"`,
        `font-size: ${spec.size}px`,
        `font-weight: ${spec.weight}`,
        `font-style: ${styleName}`,
        `color: ${color}`,
        `text-shadow: ${shadow}`,
    ].join('; ') + ';';
}

function averageLuminanceForRegion(pixbuf, x, y, width, height) {
    const pixels = pixbuf.get_pixels();
    const rowstride = pixbuf.get_rowstride();
    const channels = pixbuf.get_n_channels();
    const sampleX = Math.max(1, Math.floor(width / 12));
    const sampleY = Math.max(1, Math.floor(height / 12));
    let total = 0;
    let count = 0;

    for (let py = y; py < y + height; py += sampleY) {
        for (let px = x; px < x + width; px += sampleX) {
            const offset = py * rowstride + px * channels;
            const r = pixels[offset];
            const g = pixels[offset + 1];
            const b = pixels[offset + 2];
            total += 0.299 * r + 0.587 * g + 0.114 * b;
            count++;
        }
    }

    return count > 0 ? total / count : 0;
}

function readVarietyConfig() {
    const defaults = {
        clockFont: 'Ubuntu Medium',
        clockSize: 70,
        dateFont: 'Ubuntu Medium',
        dateSize: 30,
    };

    try {
        const [ok, bytes] = GLib.file_get_contents(VARIETY_CONF);
        if (!ok)
            return defaults;

        const text = new TextDecoder().decode(bytes);
        const values = {};
        for (const line of text.split('\n')) {
            const match = line.match(/^([a-z_]+)\s*=\s*(.+)$/);
            if (match)
                values[match[1]] = match[2].trim();
        }

        const parseFont = (value, fallbackFont, fallbackSize) => {
            const match = value?.match(/^(.*\S)\s+(\d+)$/);
            if (!match)
                return [value || fallbackFont, fallbackSize];
            return [match[1], Number.parseInt(match[2], 10)];
        };

        const [clockFont, clockSize] = parseFont(values.clock_font, defaults.clockFont, defaults.clockSize);
        const [dateFont, dateSize] = parseFont(values.clock_date_font, defaults.dateFont, defaults.dateSize);

        return { clockFont, clockSize, dateFont, dateSize };
    } catch (_err) {
        return defaults;
    }
}

function dateFormatString(index) {
    switch (index) {
    case 1:
        return '%A %d %B';
    case 2:
        return '%a %d %b';
    case 3:
        return '%d %B';
    case 4:
        return '%d/%m/%Y';
    case 5:
        return '%A %d %B %Y';
    case 6:
        return '%d.%m.%Y';
    case 7:
        return '%m/%d/%Y';
    default:
        return '%A, %B %d';
    }
}

function timeFormatString(index) {
    switch (index) {
    case 1:
        return '%Hh%M';
    case 2:
        return '%I:%M %p';
    case 3:
        return '%H:%M:%S';
    case 4:
        return '%I:%M:%S %p';
    default:
        return '%H:%M';
    }
}

function nowStrings(dateFormatIndex, timeFormatIndex) {
    const now = GLib.DateTime.new_now_local();
    return {
        clock: now.format(timeFormatString(timeFormatIndex)),
        date: now.format(dateFormatString(dateFormatIndex)),
    };
}

function monitorSettingKey(baseKey, monitorIndex) {
    return `${baseKey}-${monitorIndex + 1}`;
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

class ClockOverlay {
    constructor(monitor, monitorIndex, settings, varietyConfig) {
        this.monitor = monitor;
        this.monitorIndex = monitorIndex;
        this.settings = settings;
        this.varietyConfig = varietyConfig;

        this.actor = new St.Widget({
            reactive: false,
            visible: true,
        });

        this.clockLabel = new St.Label({ x_expand: false, y_expand: false });
        this.dateLabel = new St.Label({ x_expand: false, y_expand: false });

        this.clockLabel.get_clutter_text().ellipsize = 0;
        this.dateLabel.get_clutter_text().ellipsize = 0;

        this.actor.add_child(this.clockLabel);
        this.actor.add_child(this.dateLabel);
        Main.layoutManager.addChrome(this.actor, {
            trackFullscreen: false,
        });
    }

    _sameSettings() {
        return this.settings.get_boolean('same-on-both-monitors');
    }

    _scale(value) {
        const scalePercent = this.settings.get_int('scale-percent');
        return Math.max(1, Math.round(value * scalePercent / 100));
    }

    _settingInt(keyBase) {
        if (this.monitorIndex === 0 || this._sameSettings())
            return this.settings.get_int(keyBase);

        return this.settings.get_int(monitorSettingKey(keyBase, this.monitorIndex));
    }

    _positionX() {
        return this._settingInt('position-x');
    }

    _positionY() {
        return this._settingInt('position-y');
    }

    _blockOffsetX() {
        return this._settingInt('block-offset-x');
    }

    _blockOffsetY() {
        return this._settingInt('block-offset-y');
    }

    _settingString(key, fallback) {
        const value = this.settings.get_string(key);
        return value || fallback;
    }

    _clockFontSpec() {
        return parseFontSpec(this._settingString('clock-font-family', ''), this.varietyConfig.clockFont, this.varietyConfig.clockSize);
    }

    _dateFontSpec() {
        return parseFontSpec(this._settingString('date-font-family', ''), this.varietyConfig.dateFont, this.varietyConfig.dateSize);
    }

    _padding() {
        return this._scale(6);
    }

    _spacing() {
        return this._scale(4);
    }

    _dateOffsetX() {
        return this.settings.get_int('date-offset-x');
    }

    _updateOrder(texts) {
        this.clockLabel.text = texts.clock;
        this.dateLabel.text = texts.date;
    }

    _applyStyles() {
        const clockFont = this._clockFontSpec();
        const dateFont = this._dateFontSpec();
        clockFont.size = this._scale(clockFont.size);
        dateFont.size = this._scale(dateFont.size);
        const shadowOffset = this._scale(2);
        const textColor = this._textColor ?? BRIGHT_TEXT;
        const shadowColor = isDarkColor(textColor)
            ? `rgba(255, 255, 255, ${SHADOW_ALPHA})`
            : `rgba(0, 0, 0, ${SHADOW_ALPHA})`;
        const shadow = `${shadowOffset}px ${shadowOffset}px 0 ${shadowColor}`;
        const clockStyle = cssForFontSpec(clockFont, textColor, shadow);
        const dateStyle = cssForFontSpec(dateFont, textColor, shadow);

        this.clockLabel.style = clockStyle;
        this.dateLabel.style = dateStyle;
    }

    relayout() {
        const padding = this._padding();
        const spacing = this._spacing();
        const secondLineOffset = this._scale(this._dateOffsetX());
        const [, clockWidth] = this.clockLabel.get_preferred_width(-1);
        const [, clockHeight] = this.clockLabel.get_preferred_height(-1);
        const [, dateWidth] = this.dateLabel.get_preferred_width(-1);
        const [, dateHeight] = this.dateLabel.get_preferred_height(-1);

        const dateBelowClock = this.settings.get_boolean('date-below-clock');
        const firstLabel = dateBelowClock ? this.clockLabel : this.dateLabel;
        const secondLabel = dateBelowClock ? this.dateLabel : this.clockLabel;
        const firstWidth = dateBelowClock ? clockWidth : dateWidth;
        const firstHeight = dateBelowClock ? clockHeight : dateHeight;
        const secondWidth = dateBelowClock ? dateWidth : clockWidth;
        const secondHeight = dateBelowClock ? dateHeight : clockHeight;

        const firstX = 0;
        const secondX = secondLineOffset;
        const minX = Math.min(firstX, secondX);
        const maxX = Math.max(firstX + firstWidth, secondX + secondWidth);
        const contentWidth = maxX - minX;
        const contentHeight = firstHeight + spacing + secondHeight;
        const actorWidth = contentWidth + padding * 2;
        const actorHeight = contentHeight + padding * 2;

        const xPercent = clamp(this._positionX(), 0, 100) / 100;
        const yPercent = clamp(this._positionY(), 0, 100) / 100;
        const rawX = Math.round(this.monitor.x + xPercent * (this.monitor.width - actorWidth) + this._blockOffsetX());
        const rawY = Math.round(this.monitor.y + yPercent * (this.monitor.height - actorHeight) + this._blockOffsetY());
        const x = clamp(rawX, this.monitor.x, this.monitor.x + this.monitor.width - actorWidth);
        const y = clamp(rawY, this.monitor.y, this.monitor.y + this.monitor.height - actorHeight);

        firstLabel.set_position(padding + firstX - minX, padding);
        secondLabel.set_position(padding + secondX - minX, padding + firstHeight + spacing);

        this.actor.set_position(x, y);
        this.actor.set_size(actorWidth, actorHeight);
    }

    update(texts) {
        this._updateOrder(texts);
        this._textColor = this._resolveTextColor();
        this._applyStyles();
        this.relayout();
    }

    _resolveTextColor() {
        if (!this.settings.get_boolean('auto-text-color'))
            return normalizeCssColor(this.settings.get_string('manual-text-color'));

        const path = currentWallpaperPath();
        if (!path)
            return BRIGHT_TEXT;

        try {
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(path);
            const width = pixbuf.get_width();
            const height = pixbuf.get_height();
            const sampleWidth = Math.max(1, Math.min(width - this.monitor.x, Math.floor(this.monitor.width * 0.2)));
            const sampleHeight = Math.max(1, Math.min(height - this.monitor.y, Math.floor(this.monitor.height * 0.2)));
            const sampleX = Math.max(0, Math.min(width - sampleWidth, this.monitor.x + this.monitor.width - sampleWidth));
            const sampleY = Math.max(0, Math.min(height - sampleHeight, this.monitor.y + this.monitor.height - sampleHeight));
            const luminance = averageLuminanceForRegion(pixbuf, sampleX, sampleY, sampleWidth, sampleHeight);
            return luminance >= 170 ? DARK_TEXT : BRIGHT_TEXT;
        } catch (_err) {
            return BRIGHT_TEXT;
        }
    }

    destroy() {
        this.actor.destroy();
    }
}

export default class DualClockExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._varietyConfig = readVarietyConfig();
        this._overlays = [];
        this._timeoutId = 0;
        this._signals = [];

        this._signals.push(Main.layoutManager.connect('monitors-changed', () => this._rebuild()));
        this._signals.push(this._settings.connect('changed', () => this._updateAll()));

        this._rebuild();
        this._scheduleTick();
    }

    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        for (const signal of this._signals)
            this._settings.disconnect(signal);
        this._signals = [];

        for (const overlay of this._overlays)
            overlay.destroy();
        this._overlays = [];
        this._settings = null;
    }

    _rebuild() {
        for (const overlay of this._overlays)
            overlay.destroy();
        this._overlays = [];

        Main.layoutManager.monitors.forEach((monitor, index) => {
            this._overlays.push(new ClockOverlay(monitor, index, this._settings, this._varietyConfig));
        });

        this._updateAll();
    }

    _updateAll() {
        const texts = nowStrings(this._settings.get_int('date-format'), this._settings.get_int('time-format'));
        for (const overlay of this._overlays)
            overlay.update(texts);
    }

    _scheduleTick() {
        if (this._timeoutId)
            GLib.source_remove(this._timeoutId);

        const now = GLib.DateTime.new_now_local();
        const delay = Math.max(1, 61 - now.get_second());

        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, delay, () => {
            this._updateAll();
            this._scheduleTick();
            return GLib.SOURCE_REMOVE;
        });
    }
}
