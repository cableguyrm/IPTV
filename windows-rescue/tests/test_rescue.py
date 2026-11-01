import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from windows_rescue import app  # noqa: E402
from windows_rescue.runner import LineBuffer, Runner, StreamDecoder  # noqa: E402
from windows_rescue.tasks import Step, Task, build_tasks, catalog, clear_folder, find_task  # noqa: E402


class CatalogTests(unittest.TestCase):
    def test_ids_unique_and_categorised(self):
        tasks = build_tasks()
        ids = [t.id for t in tasks]
        self.assertEqual(len(ids), len(set(ids)))
        grouped = catalog()
        self.assertEqual(sum(len(v) for v in grouped.values()), len(tasks))
        for task in tasks:
            self.assertTrue(task.steps, task.id)
            self.assertTrue(task.description, task.id)

    def test_find_task(self):
        self.assertEqual(find_task("sfc").name, "System File Checker")
        with self.assertRaises(KeyError):
            find_task("nope")

    def test_step_requires_one_action(self):
        with self.assertRaises(ValueError):
            Step("bad")


class DecoderTests(unittest.TestCase):
    def test_utf16_detected(self):
        text = "Verification 100% complete.\r\n"
        d = StreamDecoder(fallback="cp437")
        data = text.encode("utf-16-le")
        # split mid-character to exercise the incremental decoder
        self.assertEqual(d.decode(data[:7]) + d.decode(data[7:], final=True), text)

    def test_oem_fallback(self):
        d = StreamDecoder(fallback="cp437")
        self.assertEqual(d.decode("Ping OK\r\n".encode("cp437"), final=True), "Ping OK\r\n")

    def test_line_buffer_keeps_last_progress_frame(self):
        out = []
        lb = LineBuffer(out.append)
        lb.feed("[==  10%]\r[=====  50%]\r[==========100%]\r\nDone\r\n\r\npartial")
        lb.flush()
        self.assertEqual(out, ["[==========100%]", "Done", "partial"])


class RunnerTests(unittest.TestCase):
    def run_task(self, task):
        out = []
        ok = Runner(out.append).run_task(task)
        return ok, out

    def test_command_output_and_success(self):
        task = Task("t", "Echo", "Test", "d",
                    [Step("echo", command=[sys.executable, "-c", "print('hello rescue')"])])
        ok, out = self.run_task(task)
        self.assertTrue(ok)
        self.assertIn("  hello rescue", out)
        self.assertTrue(any(l.startswith("\n[DONE]") for l in out))

    def test_failure_and_allow_fail(self):
        fail = [sys.executable, "-c", "raise SystemExit(3)"]
        ok, _ = self.run_task(Task("t", "F", "Test", "d", [Step("x", command=fail, allow_fail=True)]))
        self.assertTrue(ok)
        ok, out = self.run_task(Task("t", "F", "Test", "d", [Step("x", command=fail)]))
        self.assertFalse(ok)
        self.assertIn("  ! Exit code 3", out)

    def test_stop_on_error_skips_rest(self):
        ran = []
        task = Task("t", "F", "Test", "d",
                    [Step("bad", func=lambda r: False), Step("next", func=lambda r: ran.append(1))],
                    stop_on_error=True)
        ok, _ = self.run_task(task)
        self.assertFalse(ok)
        self.assertEqual(ran, [])

    def test_missing_command(self):
        ok, out = self.run_task(Task("t", "M", "Test", "d",
                                     [Step("x", command=["definitely-not-a-real-tool-xyz"])]))
        self.assertFalse(ok)
        self.assertTrue(any("Command not found" in l for l in out))

    def test_cancel(self):
        out = []
        runner = Runner(out.append)
        task = Task("t", "Slow", "Test", "d", [
            Step("cancel", func=lambda r: r.cancel()),
            Step("never", func=lambda r: out.append("RAN")),
        ])
        self.assertFalse(runner.run_task(task))
        self.assertNotIn("RAN", out)
        self.assertTrue(any("[STOPPED]" in l for l in out))


class CleanupTests(unittest.TestCase):
    def test_clear_folder(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "sub"))
            for name in ("a.tmp", os.path.join("sub", "b.tmp")):
                with open(os.path.join(tmp, name), "w") as fh:
                    fh.write("x" * 100)
            out = []
            self.assertTrue(clear_folder(Runner(out.append), tmp))
            self.assertEqual(os.listdir(tmp), [])
            self.assertIn("removed 2 item(s)", out[-1])


class AppTests(unittest.TestCase):
    def test_list(self):
        self.assertEqual(app.main(["--list"]), 0)

    def test_unknown_task(self):
        os.environ.setdefault("XDG_STATE_HOME", tempfile.mkdtemp())
        self.assertEqual(app.main(["--run", "no-such-task"]), 1)


if __name__ == "__main__":
    unittest.main()
