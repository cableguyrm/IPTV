"""Launcher used for double-click runs and by PyInstaller (build.bat)."""

import sys

from windows_rescue.app import main

if __name__ == "__main__":
    sys.exit(main())
