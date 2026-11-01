"""Tkinter window: task tree on the left, details and live output on the right."""

import os
import queue
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from windows_rescue import APP_NAME, __version__
from windows_rescue.runner import Runner
from windows_rescue.system import IS_WINDOWS, is_admin, new_log_path, relaunch_as_admin

ACCENT = "#0f6cbd"
OK_GREEN = "#107c10"
WARN = "#c50f1f"


class RescueApp:
    def __init__(self, root, catalog):
        self.root = root
        self.catalog = catalog
        self.tasks = {t.id: t for tasks in catalog.values() for t in tasks}
        self.messages = queue.Queue()
        self.runner = None
        self.worker = None
        self.admin = is_admin()
        self.log_path = new_log_path()
        self.log_file = open(self.log_path, "a", encoding="utf-8")

        root.title("%s %s" % (APP_NAME, __version__))
        root.geometry("1040x680")
        root.minsize(820, 520)
        root.protocol("WM_DELETE_WINDOW", self.on_close)
        self._style()
        self._build()
        self._select_first()
        self.root.after(100, self._drain)

    # ------------------------------------------------------------------ UI
    def _style(self):
        style = ttk.Style(self.root)
        if "vista" in style.theme_names():
            style.theme_use("vista")
        base = ("Segoe UI", 10) if IS_WINDOWS else ("TkDefaultFont", 10)
        style.configure("Title.TLabel", font=(base[0], 16, "bold"))
        style.configure("Meta.TLabel", foreground="#555555")
        style.configure("Banner.TFrame", background="#fff4ce")
        style.configure("Banner.TLabel", background="#fff4ce")
        style.configure("Accent.TButton", font=(base[0], 10, "bold"))
        style.configure("Treeview", rowheight=24)

    def _build(self):
        if IS_WINDOWS and not self.admin:
            banner = ttk.Frame(self.root, style="Banner.TFrame", padding=(12, 6))
            banner.pack(fill="x")
            ttk.Label(banner, style="Banner.TLabel",
                      text="Running without administrator rights - most repairs need them.").pack(side="left")
            ttk.Button(banner, text="Restart as Administrator",
                       command=self.elevate).pack(side="right")

        paned = ttk.PanedWindow(self.root, orient="horizontal")
        paned.pack(fill="both", expand=True, padx=8, pady=8)

        # Left: task tree
        left = ttk.Frame(paned)
        self.tree = ttk.Treeview(left, show="tree", selectmode="browse")
        scroll = ttk.Scrollbar(left, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        for category, tasks in self.catalog.items():
            if not tasks:
                continue
            node = self.tree.insert("", "end", text=category, open=category != "Tools")
            for task in tasks:
                label = task.name + ("  \U0001F6E1" if task.admin and not self.admin else "")
                self.tree.insert(node, "end", iid=task.id, text=label)
        self.tree.bind("<<TreeviewSelect>>", self.on_select)
        self.tree.bind("<Double-1>", lambda e: self.run_selected())
        self.tree.bind("<Return>", lambda e: self.run_selected())
        paned.add(left, weight=1)

        # Right: details + output
        right = ttk.Frame(paned, padding=(12, 0, 0, 0))
        paned.add(right, weight=3)

        self.title_var = tk.StringVar()
        self.meta_var = tk.StringVar()
        ttk.Label(right, textvariable=self.title_var, style="Title.TLabel").pack(anchor="w")
        ttk.Label(right, textvariable=self.meta_var, style="Meta.TLabel").pack(anchor="w", pady=(2, 6))
        self.desc = ttk.Label(right, wraplength=640, justify="left")
        self.desc.pack(anchor="w", fill="x")
        right.bind("<Configure>", lambda e: self.desc.configure(wraplength=max(300, e.width - 24)))

        buttons = ttk.Frame(right)
        buttons.pack(fill="x", pady=10)
        self.run_btn = ttk.Button(buttons, text="Run", style="Accent.TButton", command=self.run_selected)
        self.run_btn.pack(side="left")
        self.stop_btn = ttk.Button(buttons, text="Stop", command=self.stop, state="disabled")
        self.stop_btn.pack(side="left", padx=6)
        ttk.Button(buttons, text="Save Output...", command=self.save_output).pack(side="right")
        ttk.Button(buttons, text="Clear", command=self.clear_output).pack(side="right", padx=6)
        ttk.Button(buttons, text="Open Logs", command=self.open_logs).pack(side="right")

        self.progress = ttk.Progressbar(right, mode="indeterminate")
        self.progress.pack(fill="x")

        out_frame = ttk.Frame(right)
        out_frame.pack(fill="both", expand=True, pady=(8, 0))
        mono = ("Consolas", 10) if IS_WINDOWS else ("Courier", 10)
        self.output = tk.Text(out_frame, wrap="word", font=mono, bg="#0c0c0c", fg="#e6e6e6",
                              insertbackground="#e6e6e6", relief="flat", padx=8, pady=6,
                              state="disabled")
        out_scroll = ttk.Scrollbar(out_frame, orient="vertical", command=self.output.yview)
        self.output.configure(yscrollcommand=out_scroll.set)
        self.output.pack(side="left", fill="both", expand=True)
        out_scroll.pack(side="right", fill="y")
        self.output.tag_configure("head", foreground="#60cdff")
        self.output.tag_configure("ok", foreground="#6ccb5f")
        self.output.tag_configure("bad", foreground="#ff99a4")
        self.output.tag_configure("cmd", foreground="#9d9d9d")

        self.status_var = tk.StringVar(value="Ready.  Log: %s" % self.log_path)
        ttk.Label(self.root, textvariable=self.status_var, relief="sunken",
                  padding=(8, 2)).pack(fill="x", side="bottom")

    def _select_first(self):
        first = next((t for tasks in self.catalog.values() for t in tasks), None)
        if first:
            self.tree.selection_set(first.id)
            self.tree.focus(first.id)

    # -------------------------------------------------------------- events
    def selected_task(self):
        sel = self.tree.selection()
        return self.tasks.get(sel[0]) if sel else None

    def on_select(self, _event=None):
        task = self.selected_task()
        if not task:
            self.title_var.set(self.tree.item(self.tree.selection()[0], "text") if self.tree.selection() else "")
            self.meta_var.set("Choose a task from the list.")
            self.desc.configure(text="")
            self.run_btn.configure(state="disabled")
            return
        meta = [task.category]
        if task.duration:
            meta.append("about %s" % task.duration)
        meta.append("requires administrator" if task.admin else "no admin needed")
        if task.reboot_hint:
            meta.append("restart recommended afterwards")
        self.title_var.set(task.name)
        self.meta_var.set("  •  ".join(meta))
        self.desc.configure(text=task.description)
        busy = self.worker is not None and self.worker.is_alive()
        self.run_btn.configure(state="disabled" if busy else "normal")

    def run_selected(self):
        task = self.selected_task()
        if not task or (self.worker and self.worker.is_alive()):
            return
        if task.admin and not self.admin:
            if IS_WINDOWS and messagebox.askyesno(
                    APP_NAME, "'%s' needs administrator rights.\n\nRestart %s as administrator now?"
                    % (task.name, APP_NAME)):
                self.elevate()
            return
        if task.confirm and not messagebox.askyesno(task.name, task.confirm, icon="warning"):
            return
        self.runner = Runner(self.messages.put)
        self.worker = threading.Thread(target=self._work, args=(task,), daemon=True)
        self.run_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.progress.start(12)
        self.status_var.set("Running: %s ..." % task.name)
        self.worker.start()

    def _work(self, task):
        try:
            ok = self.runner.run_task(task)
        except Exception as exc:  # never leave the UI stuck in "running"
            self.messages.put("! Unexpected error: %s" % exc)
            ok = False
        self.messages.put(("__finished__", task, ok))

    def stop(self):
        if self.runner:
            self.status_var.set("Stopping...")
            self.stop_btn.configure(state="disabled")
            threading.Thread(target=self.runner.cancel, daemon=True).start()

    def elevate(self):
        if relaunch_as_admin():
            self.on_close(force=True)
        else:
            messagebox.showwarning(APP_NAME, "Administrator rights were not granted.")

    # -------------------------------------------------------------- output
    def _drain(self):
        lines = []
        try:
            for _ in range(500):
                item = self.messages.get_nowait()
                if isinstance(item, tuple) and item and item[0] == "__finished__":
                    self._append(lines)
                    lines = []
                    self._finished(item[1], item[2])
                else:
                    lines.append(item)
        except queue.Empty:
            pass
        self._append(lines)
        self.root.after(80, self._drain)

    def _append(self, lines):
        if not lines:
            return
        self.output.configure(state="normal")
        for line in lines:
            self.output.insert("end", line + "\n", self._tag_for(line))
            self.log_file.write(line + "\n")
        self.log_file.flush()
        self.output.see("end")
        self.output.configure(state="disabled")

    @staticmethod
    def _tag_for(line):
        s = line.lstrip()
        if s.startswith("[DONE]"):
            return "ok"
        if s.startswith(("!", "[FAILED]", "[STOPPED]")):
            return "bad"
        if s.startswith(("> ", "====")) or (s.startswith("[") and "/" in s[:8]):
            return "head"
        if s.startswith("$ "):
            return "cmd"
        return ""

    def _finished(self, task, ok):
        self.progress.stop()
        self.stop_btn.configure(state="disabled")
        self.on_select()
        if self.runner and self.runner.cancelled:
            self.status_var.set("Stopped: %s" % task.name)
        elif ok:
            self.status_var.set("Finished: %s" % task.name)
            if task.reboot_hint:
                messagebox.showinfo(APP_NAME, "%s finished.\n\nRestart the PC to complete the repair."
                                    % task.name)
        else:
            self.status_var.set("Finished with problems: %s (see output)" % task.name)

    def clear_output(self):
        self.output.configure(state="normal")
        self.output.delete("1.0", "end")
        self.output.configure(state="disabled")

    def save_output(self):
        path = filedialog.asksaveasfilename(defaultextension=".txt", initialfile="rescue-report.txt",
                                            filetypes=[("Text files", "*.txt"), ("All files", "*.*")])
        if path:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(self.output.get("1.0", "end"))
            self.status_var.set("Saved output to %s" % path)

    def open_logs(self):
        folder = os.path.dirname(self.log_path)
        if IS_WINDOWS:
            os.startfile(folder)
        else:
            messagebox.showinfo(APP_NAME, folder)

    def on_close(self, force=False):
        if not force and self.worker and self.worker.is_alive():
            if not messagebox.askyesno(APP_NAME, "A task is still running. Stop it and quit?"):
                return
            self.runner.cancel()
        try:
            self.log_file.close()
        finally:
            self.root.destroy()


def run_gui(catalog):
    if IS_WINDOWS:
        try:  # crisp text on high-DPI screens
            import ctypes

            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass
    root = tk.Tk()
    RescueApp(root, catalog)
    root.mainloop()
    return 0


if __name__ == "__main__":
    from windows_rescue.tasks import catalog as _catalog

    sys.exit(run_gui(_catalog()))
