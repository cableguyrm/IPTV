"""Entry point: ``python -m windows_rescue`` (GUI) or ``python -m windows_rescue --cli``."""

from windows_rescue.app import main

if __name__ == "__main__":
    raise SystemExit(main())
