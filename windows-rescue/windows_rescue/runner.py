"""Runs rescue tasks step by step, streaming output to a callback."""

import codecs
import locale
import subprocess
import threading
import time

from windows_rescue.system import IS_WINDOWS


class Cancelled(Exception):
    """Raised inside a step when the user pressed Stop."""


def console_encoding():
    """Encoding used by Windows console tools (the OEM code page)."""
    if IS_WINDOWS:
        try:
            import ctypes

            return "cp%d" % ctypes.windll.kernel32.GetOEMCP()
        except Exception:
            pass
    return locale.getpreferredencoding(False) or "utf-8"


class StreamDecoder:
    """Decodes tool output incrementally.

    Some Windows tools (sfc.exe in particular) write UTF-16LE while most
    write the OEM code page; the first chunk decides which one is used.
    """

    def __init__(self, fallback=None):
        self.fallback = fallback or console_encoding()
        self._decoder = None

    @staticmethod
    def looks_utf16(chunk):
        if chunk.startswith(codecs.BOM_UTF16_LE):
            return True
        sample = chunk[:200]
        if len(sample) < 4:
            return False
        odd_nulls = sample[1::2].count(0)
        return odd_nulls >= len(sample[1::2]) * 0.6

    def decode(self, chunk, final=False):
        if self._decoder is None:
            if not chunk and not final:
                return ""
            enc = "utf-16-le" if self.looks_utf16(chunk) else self.fallback
            try:
                self._decoder = codecs.getincrementaldecoder(enc)(errors="replace")
            except LookupError:
                self._decoder = codecs.getincrementaldecoder("utf-8")(errors="replace")
        text = self._decoder.decode(chunk, final)
        return text.replace("﻿", "")


class LineBuffer:
    """Turns decoded text into whole lines, handling \\r progress updates."""

    def __init__(self, emit):
        self.emit = emit
        self.pending = ""

    def feed(self, text):
        self.pending += text.replace("\r\n", "\n")
        while True:
            nl = self.pending.find("\n")
            if nl < 0:
                break
            line, self.pending = self.pending[:nl], self.pending[nl + 1:]
            # Tools like DISM redraw a progress bar with bare \r: keep the last frame.
            line = line.split("\r")[-1]
            if line.strip():
                self.emit(line.rstrip())

    def flush(self):
        if self.pending.strip():
            self.emit(self.pending.split("\r")[-1].rstrip())
        self.pending = ""


class Runner:
    """Executes a Task's steps.

    ``emit(text)`` receives every line of output; it may be called from a
    worker thread, so GUI callers should marshal it to the UI thread.
    """

    def __init__(self, emit):
        self.emit = emit
        self._cancel = threading.Event()
        self._proc = None
        self._lock = threading.Lock()

    # -- control ---------------------------------------------------------
    def cancel(self):
        self._cancel.set()
        with self._lock:
            proc = self._proc
        if proc and proc.poll() is None:
            try:
                if IS_WINDOWS:
                    # Kill the whole tree (DISM spawns helpers).
                    subprocess.call(
                        ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        creationflags=_no_window(),
                    )
                else:
                    proc.kill()
            except Exception:
                pass

    @property
    def cancelled(self):
        return self._cancel.is_set()

    def check_cancel(self):
        if self._cancel.is_set():
            raise Cancelled()

    # -- execution -------------------------------------------------------
    def run_task(self, task):
        """Run every step of ``task``. Returns True if all required steps passed."""
        self._cancel.clear()
        started = time.time()
        self.emit("=" * 60)
        self.emit("> %s" % task.name)
        self.emit("=" * 60)
        ok = True
        for index, step in enumerate(task.steps, 1):
            if self._cancel.is_set():
                ok = False
                break
            self.emit("")
            self.emit("[%d/%d] %s" % (index, len(task.steps), step.label))
            try:
                step_ok = self.run_step(step)
            except Cancelled:
                ok = False
                break
            except Exception as exc:  # a broken step must not kill the app
                self.emit("  ! Error: %s" % exc)
                step_ok = False
            if not step_ok:
                if step.allow_fail:
                    self.emit("  (step reported a problem; continuing)")
                else:
                    ok = False
                    if task.stop_on_error:
                        self.emit("  Stopping: this step is required.")
                        break
        elapsed = time.time() - started
        if self._cancel.is_set():
            self.emit("\n[STOPPED] %s was cancelled after %.0fs." % (task.name, elapsed))
        elif ok:
            self.emit("\n[DONE] %s finished in %.0fs." % (task.name, elapsed))
            if task.reboot_hint:
                self.emit("Restart the computer to complete this repair.")
        else:
            self.emit("\n[FAILED] %s finished with errors (%.0fs)." % (task.name, elapsed))
        return ok and not self._cancel.is_set()

    def run_step(self, step):
        if step.func is not None:
            result = step.func(self)
            return result is not False
        return self.run_command(step.command, ok_codes=step.ok_codes)

    def run_command(self, command, ok_codes=(0,)):
        self.emit("  $ %s" % subprocess.list2cmdline(command))
        try:
            proc = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                creationflags=_no_window(),
            )
        except FileNotFoundError:
            self.emit("  ! Command not found: %s" % command[0])
            return False
        with self._lock:
            self._proc = proc
        decoder = StreamDecoder()
        lines = LineBuffer(lambda line: self.emit("  " + line))
        try:
            while True:
                chunk = proc.stdout.read1(4096)
                if not chunk:
                    break
                lines.feed(decoder.decode(chunk))
            lines.feed(decoder.decode(b"", final=True))
            lines.flush()
            code = proc.wait()
        finally:
            proc.stdout.close()
            with self._lock:
                self._proc = None
        if self._cancel.is_set():
            raise Cancelled()
        if code in ok_codes:
            return True
        self.emit("  ! Exit code %s" % code)
        return False


def _no_window():
    return getattr(subprocess, "CREATE_NO_WINDOW", 0) if IS_WINDOWS else 0
