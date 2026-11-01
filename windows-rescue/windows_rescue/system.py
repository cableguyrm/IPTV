"""Platform helpers: admin detection, elevation, and log locations."""

import os
import sys
import tempfile
from datetime import datetime

IS_WINDOWS = os.name == "nt"


def is_admin():
    """Return True when running with administrator rights."""
    if IS_WINDOWS:
        try:
            import ctypes

            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
    geteuid = getattr(os, "geteuid", None)
    return bool(geteuid and geteuid() == 0)


def relaunch_as_admin(extra_args=None):
    """Restart this program elevated through the UAC prompt.

    Returns True when the elevated copy was started (the caller should exit),
    False if the user declined UAC or elevation is not possible.
    """
    if not IS_WINDOWS:
        return False
    import ctypes
    import subprocess

    args = list(sys.argv[1:]) + list(extra_args or [])
    if getattr(sys, "frozen", False):
        executable = sys.executable
        params = args
    else:
        executable = sys.executable
        gui_mode = not {"--cli", "--run", "--list"} & set(args)
        pythonw = os.path.join(os.path.dirname(executable), "pythonw.exe")
        if gui_mode and os.path.exists(pythonw):
            executable = pythonw  # no stray console window behind the GUI
        params = ["-m", "windows_rescue"] + args
    # ShellExecuteW returns a value > 32 on success.
    rc = ctypes.windll.shell32.ShellExecuteW(
        None, "runas", executable, subprocess.list2cmdline(params), os.getcwd(), 1
    )
    return rc > 32


def data_dir():
    """Folder for logs and reports (created on demand)."""
    if IS_WINDOWS:
        base = os.environ.get("LOCALAPPDATA") or tempfile.gettempdir()
    else:
        base = os.environ.get("XDG_STATE_HOME") or os.path.expanduser("~/.local/state")
    path = os.path.join(base, "WindowsRescue")
    os.makedirs(path, exist_ok=True)
    return path


def new_log_path():
    logs = os.path.join(data_dir(), "logs")
    os.makedirs(logs, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return os.path.join(logs, "rescue-%s.log" % stamp)


def system_drive():
    return os.environ.get("SystemDrive", "C:") if IS_WINDOWS else "/"


def windows_dir():
    return os.environ.get("SystemRoot", r"C:\Windows")
