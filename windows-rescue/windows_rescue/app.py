"""Command-line parsing and mode selection."""

import argparse
import sys

from windows_rescue import APP_NAME, __version__, cli
from windows_rescue.system import IS_WINDOWS, is_admin, relaunch_as_admin
from windows_rescue.tasks import catalog, find_task


def parse_args(argv=None):
    p = argparse.ArgumentParser(
        prog="WindowsRescue",
        description="%s - diagnose and repair common Windows problems." % APP_NAME,
    )
    p.add_argument("--version", action="version", version="%s %s" % (APP_NAME, __version__))
    p.add_argument("--cli", action="store_true", help="use the text menu instead of the window")
    p.add_argument("--list", action="store_true", help="list task IDs and exit")
    p.add_argument("--run", nargs="+", metavar="TASK", help="run one or more tasks by ID and exit")
    p.add_argument("-y", "--yes", action="store_true", help="do not ask for confirmation with --run")
    p.add_argument("--elevate", action="store_true",
                   help="restart as administrator (UAC prompt) before doing anything")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    if args.elevate and IS_WINDOWS and not is_admin():
        rest = [a for a in (argv if argv is not None else sys.argv[1:]) if a != "--elevate"]
        sys.argv = [sys.argv[0]] + rest
        if relaunch_as_admin():
            return 0
        print("Elevation was declined; continuing without administrator rights.")

    if args.list:
        cli.list_tasks(catalog())
        return 0
    if args.run:
        return cli.run_ids(args.run, find_task, args.yes)
    if args.cli:
        return cli.interactive(catalog())

    try:
        from windows_rescue.gui import run_gui
    except ImportError as exc:  # Tk missing (e.g. Windows PE, minimal Python)
        print("GUI unavailable (%s); starting text mode." % exc)
        return cli.interactive(catalog())
    return run_gui(catalog())
