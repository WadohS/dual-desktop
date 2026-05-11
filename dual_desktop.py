#!/usr/bin/env python3

from __future__ import annotations

import subprocess
from pathlib import Path

import gi

gi.require_version('Gtk', '4.0')
from gi.repository import Gtk  # noqa: E402


HOME = Path.home()
WALLPAPER_CLI = str(HOME / '.local' / 'share' / 'dual-wallpaper' / 'dual_wallpaper.py')
WALLPAPER_PREFS = str(HOME / '.local' / 'share' / 'dual-wallpaper' / 'dual_wallpaper_prefs.py')


def run_command(command: list[str]) -> tuple[bool, str]:
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return True, result.stdout.strip() or result.stderr.strip() or 'OK'
    except subprocess.CalledProcessError as err:
        return False, err.stderr.strip() or err.stdout.strip() or str(err)


class DualDesktop(Gtk.Application):
    def __init__(self) -> None:
        super().__init__(application_id='com.wadohs.DualDesktop')

    def do_activate(self) -> None:
        window = self.props.active_window
        if window:
            window.present()
            return

        window = Gtk.ApplicationWindow(application=self)
        window.set_title('Dual Desktop')
        window.set_default_size(560, 320)

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        outer.set_margin_top(12)
        outer.set_margin_bottom(12)
        outer.set_margin_start(12)
        outer.set_margin_end(12)

        title = Gtk.Label(label='<b>Dual Desktop</b>', use_markup=True, halign=Gtk.Align.START)
        subtitle = Gtk.Label(label='Control center for Dual Clock and Dual Wallpaper', halign=Gtk.Align.START)
        outer.append(title)
        outer.append(subtitle)

        frame_clock = Gtk.Frame(label='Dual Clock')
        box_clock = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        btn_clock_prefs = Gtk.Button(label='Open Clock Settings')
        btn_clock_prefs.connect('clicked', self._open_clock_settings)
        box_clock.append(btn_clock_prefs)
        frame_clock.set_child(box_clock)
        outer.append(frame_clock)

        frame_wallpaper = Gtk.Frame(label='Dual Wallpaper')
        box_wallpaper = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        buttons_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)

        for label, callback in (
            ('Open Wallpaper Settings', self._open_wallpaper_settings),
            ('Apply Now', self._apply_now),
            ('Previous', self._previous),
            ('Next', self._next),
            ('Restart Service', self._restart_service),
        ):
            button = Gtk.Button(label=label)
            button.connect('clicked', callback)
            buttons_row.append(button)

        self.status = Gtk.Label(label='', halign=Gtk.Align.START)
        box_wallpaper.append(buttons_row)
        box_wallpaper.append(self.status)
        frame_wallpaper.set_child(box_wallpaper)
        outer.append(frame_wallpaper)

        window.set_child(outer)
        window.present()

    def _open_clock_settings(self, *_args) -> None:
        subprocess.Popen(['gnome-extensions', 'prefs', 'dual-clock@wadohs'])

    def _open_wallpaper_settings(self, *_args) -> None:
        subprocess.Popen([WALLPAPER_PREFS])

    def _set_status(self, ok: bool, success: str, failure: str, msg: str) -> None:
        self.status.set_text(success if ok else f'{failure}: {msg}')

    def _apply_now(self, *_args) -> None:
        ok, msg = run_command([WALLPAPER_CLI, '--apply'])
        self._set_status(ok, 'Wallpaper pair applied.', 'Apply failed', msg)

    def _previous(self, *_args) -> None:
        ok, msg = run_command([WALLPAPER_CLI, '--previous'])
        self._set_status(ok, 'Previous wallpaper pair applied.', 'Previous failed', msg)

    def _next(self, *_args) -> None:
        ok, msg = run_command([WALLPAPER_CLI, '--apply'])
        self._set_status(ok, 'Next wallpaper pair applied.', 'Next failed', msg)

    def _restart_service(self, *_args) -> None:
        ok, msg = run_command(['systemctl', '--user', 'restart', 'dual-wallpaper.service'])
        self._set_status(ok, 'Dual Wallpaper service restarted.', 'Restart failed', msg)


def main() -> int:
    app = DualDesktop()
    return app.run(None)


if __name__ == '__main__':
    raise SystemExit(main())
