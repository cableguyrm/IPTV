"""Text-mode interface (works over SSH, in WinRE consoles, or without Tk)."""

import sys

from windows_rescue import APP_NAME, __version__
from windows_rescue.runner import Runner
from windows_rescue.system import is_admin, new_log_path


def _confirm(question, assume_yes):
    if assume_yes:
        return True
    try:
        answer = input("%s [y/N] " % question).strip().lower()
    except EOFError:
        return False
    return answer in ("y", "yes")


class TeeLog:
    """Prints output and appends it to the session log file."""

    def __init__(self, path):
        self.path = path
        self.handle = open(path, "a", encoding="utf-8")

    def __call__(self, line):
        print(line, flush=True)
        self.handle.write(line + "\n")
        self.handle.flush()

    def close(self):
        self.handle.close()


def run_task(task, emit, assume_yes=False):
    if task.admin and not is_admin():
        emit("! '%s' needs administrator rights. Re-run from an elevated prompt." % task.name)
        return False
    if task.confirm and not _confirm(task.confirm, assume_yes):
        emit("Skipped.")
        return False
    runner = Runner(emit)
    try:
        return runner.run_task(task)
    except KeyboardInterrupt:
        runner.cancel()
        emit("\nInterrupted.")
        return False


def list_tasks(catalog):
    for category, tasks in catalog.items():
        print("\n%s" % category)
        for task in tasks:
            flag = " (admin)" if task.admin else ""
            print("  %-18s %s%s" % (task.id, task.name, flag))


def interactive(catalog):
    log = TeeLog(new_log_path())
    print("%s %s  -  log: %s" % (APP_NAME, __version__, log.path))
    if not is_admin():
        print("Note: not running as administrator; most repairs will be unavailable.")
    numbered = []
    try:
        while True:
            numbered = []
            print()
            for category, tasks in catalog.items():
                print("== %s ==" % category)
                for task in tasks:
                    numbered.append(task)
                    print("  %2d) %s" % (len(numbered), task.name))
            print("   q) Quit")
            try:
                choice = input("\nChoose a task: ").strip().lower()
            except EOFError:
                break
            if choice in ("q", "quit", "exit"):
                break
            if not choice.isdigit() or not 1 <= int(choice) <= len(numbered):
                print("Please enter a number from the list.")
                continue
            task = numbered[int(choice) - 1]
            print("\n%s\n%s" % (task.name, task.description))
            if task.duration:
                print("Estimated time: %s" % task.duration)
            if not task.confirm and not _confirm("Run it now?", False):
                continue
            run_task(task, log)
    finally:
        log.close()
    return 0


def run_ids(task_ids, find_task, assume_yes):
    log = TeeLog(new_log_path())
    ok = True
    try:
        for tid in task_ids:
            try:
                task = find_task(tid)
            except KeyError:
                print("Unknown task: %s (use --list)" % tid, file=sys.stderr)
                ok = False
                continue
            ok = run_task(task, log, assume_yes) and ok
    finally:
        log.close()
    print("Log saved to %s" % log.path)
    return 0 if ok else 1
