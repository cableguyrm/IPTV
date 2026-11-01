"""Catalog of rescue tasks.

Every task is a list of steps; a step is either an external command
(``command``) or a Python function (``func``) that receives the Runner.
"""

import os
import shutil
import subprocess
import time
from collections import OrderedDict
from datetime import datetime

from windows_rescue.system import IS_WINDOWS, data_dir, system_drive, windows_dir


class Step:
    def __init__(self, label, command=None, func=None, ok_codes=(0,), allow_fail=False):
        if (command is None) == (func is None):
            raise ValueError("a step needs exactly one of command / func")
        self.label = label
        self.command = command
        self.func = func
        self.ok_codes = tuple(ok_codes)
        self.allow_fail = allow_fail


class Task:
    def __init__(self, id, name, category, description, steps, admin=True,
                 confirm=None, reboot_hint=False, stop_on_error=False, duration=None):
        self.id = id
        self.name = name
        self.category = category
        self.description = description
        self.steps = steps
        self.admin = admin
        self.confirm = confirm          # text shown before running, or None
        self.reboot_hint = reboot_hint
        self.stop_on_error = stop_on_error
        self.duration = duration        # rough human estimate, e.g. "10-30 min"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _wow64():
    """True for a 32-bit Python running on 64-bit Windows."""
    return IS_WINDOWS and "PROCESSOR_ARCHITEW6432" in os.environ


def sys32_dir():
    """Real System32 folder, bypassing WOW64 redirection when needed."""
    return os.path.join(windows_dir(), "Sysnative" if _wow64() else "System32")


def tool(name):
    """Path to a System32 tool such as sfc.exe (redirection-safe)."""
    if not IS_WINDOWS:
        return name
    return os.path.join(sys32_dir(), name if name.endswith(".exe") else name + ".exe")


def ps(script):
    """Command line that runs a PowerShell snippet."""
    return ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-Command", script]


def ps_table(expression):
    """PowerShell snippet whose table output is not truncated to 80 columns."""
    return ps("%s | Out-String -Width 220" % expression)


def run(label, *command, **kw):
    return Step(label, command=list(command), **kw)


def call(label, func, **kw):
    return Step(label, func=func, **kw)


def human_size(num):
    for unit in ("B", "KB", "MB", "GB"):
        if num < 1024:
            return "%.0f %s" % (num, unit) if unit == "B" else "%.1f %s" % (num, unit)
        num /= 1024.0
    return "%.1f TB" % num


def _path_size(path):
    if os.path.isfile(path) or os.path.islink(path):
        try:
            return os.lstat(path).st_size
        except OSError:
            return 0
    total = 0
    for root, _dirs, files in os.walk(path):
        for f in files:
            try:
                total += os.lstat(os.path.join(root, f)).st_size
            except OSError:
                pass
    return total


def clear_folder(runner, folder):
    """Delete the contents of ``folder``, skipping files that are in use."""
    if not os.path.isdir(folder):
        runner.emit("  (not found: %s)" % folder)
        return True
    freed = removed = skipped = 0
    for name in os.listdir(folder):
        runner.check_cancel()
        path = os.path.join(folder, name)
        size = _path_size(path)
        try:
            if os.path.isdir(path) and not os.path.islink(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            freed += size
            removed += 1
        except OSError:
            # In use or protected: try to at least empty a directory.
            if os.path.isdir(path):
                before = _path_size(path)
                shutil.rmtree(path, ignore_errors=True)
                freed += max(0, before - _path_size(path))
            skipped += 1
    runner.emit("  %s: removed %d item(s), freed %s, skipped %d in use"
                % (folder, removed, human_size(freed), skipped))
    return True


def _temp_folders():
    folders = []
    for var in ("TEMP", "TMP"):
        value = os.environ.get(var)
        if value and value not in folders:
            folders.append(value)
    if IS_WINDOWS:
        folders.append(os.path.join(windows_dir(), "Temp"))
    return folders


def clear_temp(runner):
    for folder in _temp_folders():
        clear_folder(runner, folder)
    return True


def rename_aside(paths):
    """Return a step function that renames each folder to <name>.bak-<stamp>."""
    def _do(runner):
        ok = True
        stamp = datetime.now().strftime("%Y%m%d%H%M%S")
        for path in paths():
            if not os.path.exists(path):
                runner.emit("  (not found: %s)" % path)
                continue
            target = "%s.bak-%s" % (path, stamp)
            try:
                os.rename(path, target)
                runner.emit("  Renamed %s -> %s" % (path, os.path.basename(target)))
            except OSError as exc:
                runner.emit("  ! Could not rename %s: %s" % (path, exc))
                ok = False
        return ok
    return _do


def launch(target, *args):
    """Return a step function that opens a program/console without waiting."""
    def _do(runner):
        if not IS_WINDOWS:
            runner.emit("  (only available on Windows)")
            return False
        # "start" resolves .msc / .cpl files and opens a new window for consoles.
        subprocess.Popen(["cmd", "/c", "start", "", target] + list(args),
                         creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        runner.emit("  Opened %s" % target)
        return True
    return _do


def restart_explorer(runner):
    runner.run_command(["taskkill", "/F", "/IM", "explorer.exe"], ok_codes=(0, 128))
    # Winlogon normally restarts the shell by itself; give it a moment.
    for _ in range(6):
        runner.check_cancel()
        time.sleep(0.5)
        out = subprocess.run(["tasklist", "/FI", "IMAGENAME eq explorer.exe", "/NH"],
                             capture_output=True, text=True,
                             creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)).stdout
        if "explorer.exe" in out.lower():
            runner.emit("  Explorer is running again.")
            return True
    subprocess.Popen([os.path.join(windows_dir(), "explorer.exe")])
    runner.emit("  Started explorer.exe")
    return True


def battery_report(runner):
    path = os.path.join(data_dir(), "battery-report.html")
    if not runner.run_command(["powercfg", "/batteryreport", "/output", path]):
        runner.emit("  (no battery found? This is normal on desktop PCs.)")
        return False
    return launch(path)(runner)


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

def _drive():
    return system_drive()


def build_tasks():
    d = _drive()
    win = windows_dir()

    sfc = run("System File Checker (sfc /scannow)", tool("sfc"), "/scannow")
    dism_restore = run("Repair component store (DISM /RestoreHealth)",
                       tool("dism"), "/Online", "/Cleanup-Image", "/RestoreHealth")
    flushdns = run("Flush DNS cache", "ipconfig", "/flushdns")
    stop = lambda svc: run("Stop %s" % svc, "net", "stop", svc, "/y", allow_fail=True)
    start = lambda svc: run("Start %s" % svc, "net", "start", svc, allow_fail=True)

    tasks = [
        # -- Quick fixes -----------------------------------------------------
        Task("quick-repair", "Quick Repair (recommended)", "Quick Fix",
             "The standard first-aid sequence for a misbehaving PC: repairs the Windows "
             "component store with DISM, then verifies and restores protected system files "
             "with SFC, and finally flushes the DNS cache.",
             [dism_restore, sfc, flushdns], duration="15-45 min", reboot_hint=True),
        Task("quick-network", "Fix Internet Connection", "Quick Fix",
             "Flushes DNS, renews the IP address, and resets Winsock and the TCP/IP "
             "stack. Fixes most 'connected, no internet' problems.",
             [flushdns,
              run("Release IP address", "ipconfig", "/release", allow_fail=True),
              run("Renew IP address", "ipconfig", "/renew", allow_fail=True),
              run("Reset Winsock catalog", "netsh", "winsock", "reset"),
              run("Reset TCP/IP stack", "netsh", "int", "ip", "reset", allow_fail=True)],
             confirm="Your network connection will drop briefly. Continue?",
             reboot_hint=True, duration="1 min"),
        Task("quick-cleanup", "Free Up Disk Space", "Quick Fix",
             "Deletes temporary files and empties the Recycle Bin. Files that are in "
             "use are skipped safely.",
             [call("Delete temporary files", clear_temp),
              run("Empty Recycle Bin", *ps("Clear-RecycleBin -Force -ErrorAction SilentlyContinue"),
                  allow_fail=True)],
             confirm="This permanently deletes temporary files and the Recycle Bin contents. Continue?",
             duration="1-5 min"),

        # -- System repair ---------------------------------------------------
        Task("sfc", "System File Checker", "System Repair",
             "Scans all protected system files and replaces corrupted ones with a cached copy.",
             [sfc], duration="5-20 min"),
        Task("dism-check", "DISM Quick Health Check", "System Repair",
             "Checks whether the Windows image has been flagged as corrupted. Fast, makes no changes.",
             [run("DISM /CheckHealth", tool("dism"), "/Online", "/Cleanup-Image", "/CheckHealth")],
             duration="< 1 min"),
        Task("dism-scan", "DISM Deep Scan", "System Repair",
             "Thoroughly scans the component store for corruption. Makes no changes.",
             [run("DISM /ScanHealth", tool("dism"), "/Online", "/Cleanup-Image", "/ScanHealth")],
             duration="5-15 min"),
        Task("dism-restore", "DISM Restore Health", "System Repair",
             "Repairs the component store using Windows Update as the source. "
             "Run this before SFC when SFC cannot fix files.",
             [dism_restore], duration="10-30 min"),
        Task("component-cleanup", "Clean Up Component Store", "System Repair",
             "Removes superseded update files from WinSxS to reclaim space.",
             [run("DISM /StartComponentCleanup", tool("dism"), "/Online", "/Cleanup-Image",
                  "/StartComponentCleanup")], duration="5-20 min"),
        Task("chkdsk-scan", "Check Disk (online scan)", "System Repair",
             "Scans the system drive for file system errors while Windows keeps running.",
             [run("chkdsk %s /scan" % d, tool("chkdsk"), d, "/scan", ok_codes=(0, 1, 2))],
             duration="2-15 min"),
        Task("chkdsk-repair", "Check Disk (repair at next boot)", "System Repair",
             "Schedules a full chkdsk /f /r of the system drive on the next restart. "
             "This fixes errors and recovers bad sectors but can take hours on large disks.",
             [run("Schedule chkdsk /f /r", "cmd", "/c", "echo Y|%s %s /f /r" % (tool("chkdsk"), d),
                  ok_codes=(0, 1, 2, 3))],
             confirm="chkdsk will run on the next restart and may take a long time. Schedule it?",
             reboot_hint=True),

        # -- Network ---------------------------------------------------------
        Task("net-test", "Connectivity Test", "Network",
             "Pings well-known servers and tests DNS resolution to locate the problem.",
             [run("Network adapters", "ipconfig", "/all", allow_fail=True),
              run("Ping gateway-independent IP (1.1.1.1)", "ping", "-n", "4", "1.1.1.1", allow_fail=True),
              run("DNS lookup (www.microsoft.com)", "nslookup", "www.microsoft.com", allow_fail=True),
              run("Ping by name (www.google.com)", "ping", "-n", "4", "www.google.com", allow_fail=True)],
             admin=False, duration="< 1 min"),
        Task("net-flushdns", "Flush DNS Cache", "Network",
             "Clears cached DNS records. Fixes sites that will not load after a DNS change.",
             [flushdns], admin=False, duration="seconds"),
        Task("net-renew", "Renew IP Address", "Network",
             "Releases and requests a new IP address from your router.",
             [run("Release", "ipconfig", "/release", allow_fail=True),
              run("Renew", "ipconfig", "/renew")],
             confirm="Your network connection will drop briefly. Continue?", duration="< 1 min"),
        Task("net-winsock", "Reset Winsock", "Network",
             "Resets the Winsock catalog, undoing damage from VPNs, malware or broken LSPs.",
             [run("netsh winsock reset", "netsh", "winsock", "reset")],
             reboot_hint=True, duration="seconds"),
        Task("net-tcpip", "Reset TCP/IP", "Network",
             "Restores TCP/IP settings to their defaults. Static IP settings will be lost.",
             [run("netsh int ip reset", "netsh", "int", "ip", "reset", allow_fail=True),
              run("netsh int ipv6 reset", "netsh", "int", "ipv6", "reset", allow_fail=True)],
             confirm="Static IP addresses and custom TCP/IP settings will be reset. Continue?",
             reboot_hint=True, duration="seconds"),
        Task("net-proxy", "Reset Proxy Settings", "Network",
             "Removes a system-wide WinHTTP proxy, often left behind by adware or old VPNs.",
             [run("Show proxy", "netsh", "winhttp", "show", "proxy", allow_fail=True),
              run("Reset proxy", "netsh", "winhttp", "reset", "proxy")], duration="seconds"),

        # -- Windows Update --------------------------------------------------
        Task("wu-reset", "Reset Windows Update", "Windows Update",
             "Stops the update services, moves the SoftwareDistribution and catroot2 "
             "caches aside (kept as .bak folders), and restarts the services. Fixes "
             "updates that are stuck or keep failing.",
             [stop("wuauserv"), stop("bits"), stop("cryptsvc"), stop("msiserver"),
              call("Move update caches aside", rename_aside(lambda: [
                  os.path.join(win, "SoftwareDistribution"),
                  os.path.join(sys32_dir(), "catroot2")])),
              start("cryptsvc"), start("bits"), start("wuauserv"), start("msiserver")],
             confirm="Windows Update history will be cleared (updates stay installed). Continue?",
             reboot_hint=True, duration="1-2 min"),
        Task("wu-open", "Open Windows Update", "Windows Update",
             "Opens the Windows Update page in Settings.",
             [call("Open Settings", launch("ms-settings:windowsupdate"))], admin=False),

        # -- Cleanup ---------------------------------------------------------
        Task("clean-temp", "Delete Temporary Files", "Cleanup",
             "Empties the user and Windows temp folders.",
             [call("Delete temporary files", clear_temp)],
             confirm="Delete all temporary files? Files in use are skipped.", duration="1-5 min"),
        Task("clean-recycle", "Empty Recycle Bin", "Cleanup",
             "Permanently deletes everything in the Recycle Bin on all drives.",
             [run("Empty Recycle Bin", *ps("Clear-RecycleBin -Force -ErrorAction SilentlyContinue"))],
             confirm="Permanently delete everything in the Recycle Bin?", admin=False),
        Task("clean-print", "Clear Stuck Print Queue", "Cleanup",
             "Stops the print spooler, deletes stuck print jobs and restarts it.",
             [stop("spooler"),
              call("Delete queued jobs", lambda r: clear_folder(r, os.path.join(sys32_dir(), "spool", "PRINTERS"))),
              start("spooler")],
             confirm="All pending print jobs will be cancelled. Continue?"),
        Task("clean-explorer", "Restart Windows Explorer", "Cleanup",
             "Restarts the taskbar, Start menu and desktop when they freeze.",
             [call("Restart explorer.exe", restart_explorer)], admin=False),
        Task("clean-cleanmgr", "Open Disk Cleanup", "Cleanup",
             "Opens the built-in Disk Cleanup tool for the system drive.",
             [call("Open cleanmgr", launch("cleanmgr", "/d", d))], admin=False),

        # -- Recovery --------------------------------------------------------
        Task("restore-point", "Create Restore Point", "Recovery",
             "Creates a System Restore point you can roll back to. Do this before risky changes. "
             "Windows allows only one new restore point per 24 hours by default.",
             [run("Enable System Restore on %s" % d,
                  *ps("Enable-ComputerRestore -Drive '%s\\' -ErrorAction SilentlyContinue" % d),
                  allow_fail=True),
              run("Create restore point", *ps(
                  "Checkpoint-Computer -Description 'Windows Rescue' "
                  "-RestorePointType MODIFY_SETTINGS -ErrorAction Stop; "
                  "Get-ComputerRestorePoint | Select-Object -Last 3 | "
                  "Format-Table CreationTime, Description -AutoSize | Out-String"))],
             duration="1-3 min"),
        Task("restore-open", "Open System Restore", "Recovery",
             "Opens System Restore to roll Windows back to an earlier restore point.",
             [call("Open rstrui", launch("rstrui.exe"))]),
        Task("restore-list", "List Restore Points", "Recovery",
             "Shows the restore points available on this PC.",
             [run("Restore points", *ps_table(
                 "Get-ComputerRestorePoint | Format-Table SequenceNumber, CreationTime, Description -AutoSize"),
                 allow_fail=True)]),
        Task("winre-info", "Recovery Environment Status", "Recovery",
             "Shows whether the Windows Recovery Environment (WinRE) is enabled.",
             [run("reagentc /info", tool("reagentc"), "/info")]),
        Task("boot-advanced", "Restart to Advanced Startup", "Recovery",
             "Restarts into the blue recovery menu (Startup Repair, Safe Mode, "
             "Command Prompt, Uninstall Updates, System Restore, Reset this PC).",
             [run("Restart to recovery menu", "shutdown", "/r", "/o", "/f", "/t", "10")],
             confirm="The PC will restart into Advanced Startup in 10 seconds. Save your work first. Continue?"),
        Task("boot-safe", "Restart in Safe Mode", "Recovery",
             "Sets Windows to boot into Safe Mode (with networking) and restarts. Use "
             "'Leave Safe Mode' from inside Safe Mode to boot normally again.",
             [run("Enable Safe Mode", "bcdedit", "/set", "{current}", "safeboot", "network"),
              run("Restart", "shutdown", "/r", "/f", "/t", "10")],
             confirm="The PC will keep booting into Safe Mode until you run 'Leave Safe Mode'. "
                     "It will restart in 10 seconds. Continue?",
             stop_on_error=True),
        Task("boot-normal", "Leave Safe Mode", "Recovery",
             "Removes the Safe Mode boot flag so Windows starts normally on the next restart.",
             [run("Disable Safe Mode", "bcdedit", "/deletevalue", "{current}", "safeboot", allow_fail=True)],
             reboot_hint=True),

        # -- Diagnostics -----------------------------------------------------
        Task("diag-system", "System Summary", "Diagnostics",
             "OS version, install date, uptime, memory and installed hotfixes.",
             [run("systeminfo", "systeminfo")], admin=False, duration="< 1 min"),
        Task("diag-disk", "Disk Health", "Diagnostics",
             "SMART health status of physical disks and free space on each volume.",
             [run("Physical disks", *ps_table(
                 "Get-PhysicalDisk | Format-Table FriendlyName, MediaType, HealthStatus, "
                 "OperationalStatus, @{n='Size(GB)';e={[math]::Round($_.Size/1GB)}} -AutoSize"),
                 allow_fail=True),
              run("Volumes", *ps_table(
                  "Get-Volume | Where-Object DriveLetter | Format-Table DriveLetter, FileSystemLabel, "
                  "FileSystem, HealthStatus, @{n='Free(GB)';e={[math]::Round($_.SizeRemaining/1GB,1)}}, "
                  "@{n='Size(GB)';e={[math]::Round($_.Size/1GB,1)}} -AutoSize"), allow_fail=True)],
             admin=False),
        Task("diag-events", "Recent Critical Errors", "Diagnostics",
             "The latest critical and error events from the System log (last 3 days), "
             "including crashes, driver failures and unexpected shutdowns.",
             [run("System log errors", *ps_table(
                 "Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; "
                 "StartTime=(Get-Date).AddDays(-3)} -MaxEvents 30 -ErrorAction SilentlyContinue | "
                 "Format-Table TimeCreated, Id, ProviderName, Message -Wrap"), allow_fail=True)]),
        Task("diag-devices", "Problem Devices", "Diagnostics",
             "Lists hardware with driver problems (the yellow warnings in Device Manager).",
             [run("Devices not OK", *ps_table(
                 "$d = Get-PnpDevice -PresentOnly | Where-Object Status -ne 'OK'; "
                 "if ($d) { $d | Format-Table Status, Class, FriendlyName, InstanceId -AutoSize } "
                 "else { 'All devices are working properly.' }"), allow_fail=True)], admin=False),
        Task("diag-startup", "Startup Programs", "Diagnostics",
             "Programs that launch at sign-in. Too many slow down boot.",
             [run("Startup entries", *ps_table(
                 "Get-CimInstance Win32_StartupCommand | Format-Table Name, Command, Location -AutoSize"),
                 allow_fail=True)], admin=False),
        Task("diag-battery", "Battery Report", "Diagnostics",
             "Generates and opens a battery health report (laptops only).",
             [call("Generate report", battery_report)], admin=False),
        Task("diag-memory", "Windows Memory Diagnostic", "Diagnostics",
             "Opens the memory tester, which checks RAM on the next restart.",
             [call("Open mdsched", launch("mdsched.exe"))]),

        # -- Tools -------------------------------------------------------------
    ]

    for tid, name, target, desc, admin in [
        ("tool-taskmgr", "Task Manager", "taskmgr", "End frozen programs and check resource usage.", False),
        ("tool-devmgmt", "Device Manager", "devmgmt.msc", "Update, roll back or disable drivers.", True),
        ("tool-eventvwr", "Event Viewer", "eventvwr.msc", "Browse all Windows logs.", False),
        ("tool-services", "Services", "services.msc", "Start, stop and configure services.", True),
        ("tool-diskmgmt", "Disk Management", "diskmgmt.msc", "Partitions, drive letters and volumes.", True),
        ("tool-msconfig", "System Configuration", "msconfig", "Boot options and selective startup.", True),
        ("tool-reliability", "Reliability Monitor", "perfmon", "Timeline of crashes and updates.", False),
        ("tool-resmon", "Resource Monitor", "resmon", "Detailed CPU, disk, network and memory use.", False),
        ("tool-cmd", "Command Prompt", "cmd", "Open a command prompt window.", False),
        ("tool-powershell", "PowerShell", "powershell", "Open a PowerShell window.", False),
        ("tool-regedit", "Registry Editor", "regedit", "Edit the registry (advanced users).", True),
    ]:
        args = ("/rel",) if tid == "tool-reliability" else ()
        tasks.append(Task(tid, name, "Tools", desc, [call("Open %s" % name, launch(target, *args))],
                          admin=admin))
    return tasks


CATEGORIES = ["Quick Fix", "System Repair", "Network", "Windows Update", "Cleanup",
              "Recovery", "Diagnostics", "Tools"]


def catalog():
    """OrderedDict of category -> [Task]."""
    grouped = OrderedDict((c, []) for c in CATEGORIES)
    for task in build_tasks():
        grouped.setdefault(task.category, []).append(task)
    return grouped


def find_task(task_id):
    for task in build_tasks():
        if task.id == task_id:
            return task
    raise KeyError(task_id)
