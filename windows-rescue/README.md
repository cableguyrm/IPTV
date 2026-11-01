# Windows Rescue

A one-stop toolkit for fixing a sick Windows 10/11 PC. It puts the built-in Windows repair
tools behind one window, runs them in the right order, shows their output live,
and keeps a log of everything it did.

It uses only the Python standard library (Tkinter), so it runs from source with a
stock Python install, or you can build it into a single portable `WindowsRescue.exe`.

## What it can do

| Category | Tasks |
|---|---|
| **Quick Fix** | Quick Repair (DISM RestoreHealth → SFC → flush DNS), Fix Internet Connection, Free Up Disk Space |
| **System Repair** | SFC, DISM CheckHealth / ScanHealth / RestoreHealth, component store cleanup, chkdsk online scan, chkdsk /f /r at next boot |
| **Network** | Connectivity test, flush DNS, renew IP, reset Winsock, reset TCP/IP (v4 + v6), reset WinHTTP proxy |
| **Windows Update** | Full reset of update components (services + SoftwareDistribution / catroot2), open Windows Update |
| **Cleanup** | Temp files, Recycle Bin, stuck print queue, restart Explorer, Disk Cleanup |
| **Recovery** | Create / list restore points, open System Restore, WinRE status, restart to Advanced Startup, enter / leave Safe Mode |
| **Diagnostics** | System summary, disk SMART health and free space, recent critical errors, problem devices, startup programs, battery report, memory diagnostic |
| **Tools** | One-click launchers for Task Manager, Device Manager, Event Viewer, Services, Disk Management, msconfig, Reliability Monitor, Resource Monitor, CMD, PowerShell, Registry Editor |

Safety:
- Anything that deletes data, drops the network, or restarts the PC asks for confirmation first.
- Windows Update caches are **renamed** to `*.bak-<timestamp>`, not deleted.
- Files that are in use are skipped during cleanup.
- Every session is logged to `%LOCALAPPDATA%\WindowsRescue\logs\` (the **Open Logs** button opens that folder).
- Long tasks can be stopped at any time; the whole process tree is terminated.

## Running it

### Option 1: build a portable .exe (recommended)

Run this on a Windows machine with Python 3.8+:

```bat
cd windows-rescue
build.bat
```

This produces `dist\WindowsRescue.exe`. It asks for administrator rights when it starts, and you
can copy it to a USB stick to carry from PC to PC.

### Option 2: run from source

Double-click `WindowsRescue.cmd` (it asks for admin rights), or run:

```bat
python -m windows_rescue            :: window
python -m windows_rescue --elevate  :: window, restarted as administrator
```

### Command line / scripting

```bat
python -m windows_rescue --cli                      :: interactive text menu
python -m windows_rescue --list                     :: show all task IDs
python -m windows_rescue --run dism-restore sfc     :: run tasks in order
python -m windows_rescue --run quick-network --yes  :: skip confirmations
```

`--run` exits with code 0 when every task succeeded, and 1 otherwise. Text mode starts
automatically when Tkinter is not available.

## Suggested repair order

1. **Diagnostics → Recent Critical Errors / Disk Health**: find out what is actually wrong.
   If a disk reports anything other than *Healthy*, **back up your data first**.
2. **Recovery → Create Restore Point**.
3. **Quick Fix → Quick Repair**, then restart.
4. Still broken? Try **System Repair → Check Disk (repair at next boot)**, **Windows Update → Reset**,
   or **Recovery → Open System Restore**.
5. If Windows will not boot at all, use **Restart to Advanced Startup** (or hold Shift while clicking
   Restart). From there, try *Startup Repair*, *Uninstall Updates*, or *System Restore*.

## Development

```bash
cd windows-rescue
python -m unittest discover -s tests -v
```

The tests cover the task catalog, the output decoder (including the UTF-16 output of `sfc.exe`),
the step runner, cancellation, and cleanup. They run on any OS.

Project layout:

```
windows_rescue/
  tasks.py    task catalog (add new repairs here)
  runner.py   runs steps, streams/decodes output, handles cancel
  gui.py      Tkinter interface
  cli.py      text menu and --run mode
  system.py   admin detection, UAC elevation, log paths
  app.py      argument parsing and mode selection
```

To add a task, add a `Task(...)` to `build_tasks()` in `tasks.py`. Its steps can be
`run("label", "exe", "arg", ...)` for a command or `call("label", func)` for Python code.

## Disclaimer

These tools change system settings. Make a restore point and back up important files before
you repair anything. The software is provided as-is, without warranty (see `../LICENSE`).
