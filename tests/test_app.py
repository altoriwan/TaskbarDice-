import os
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import importlib.util
import sys
from dice_logic import TaskStorage

if "webview" not in sys.modules:
    try:
        import webview
    except ImportError:
        mock_webview = MagicMock()
        mock_screen = MagicMock()
        mock_screen.width = 1920
        mock_screen.height = 1080
        mock_webview.screens = [mock_screen]
        sys.modules["webview"] = mock_webview

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_PY_PATH = os.path.join(PROJECT_ROOT, "app.py")
spec = importlib.util.spec_from_file_location("desktop_app", APP_PY_PATH)
desktop_app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop_app)

calculate_anchor_position = desktop_app.calculate_anchor_position
TaskbarDiceAPI = desktop_app.TaskbarDiceAPI


class TestApp(unittest.TestCase):
    """Unit tests for app.py window anchor calculations and TaskbarDiceAPI bridge endpoints."""

    def test_anchor_position_default(self):
        """Default anchor calculation on 1920x1080 display with 400x420 window and 16/64 margins."""
        mock_screen = MagicMock()
        mock_screen.width = 1920
        mock_screen.height = 1080

        with patch("webview.screens", [mock_screen]):
            x, y = calculate_anchor_position()
            # x = 1920 - 400 - 16 = 1504
            # y = 1080 - 420 - 64 = 596
            self.assertEqual(x, 1504)
            self.assertEqual(y, 596)

    def test_anchor_position_custom(self):
        """Custom dimensions and margins calculation."""
        mock_screen = MagicMock()
        mock_screen.width = 2560
        mock_screen.height = 1440

        with patch("webview.screens", [mock_screen]):
            x, y = calculate_anchor_position(width=500, height=600, margin_x=32, margin_y=80)
            # x = 2560 - 500 - 32 = 2028
            # y = 1440 - 600 - 80 = 760
            self.assertEqual(x, 2028)
            self.assertEqual(y, 760)

    def test_anchor_position_clamping(self):
        """Clamps to 0 when window + margins exceed screen dimensions."""
        mock_screen = MagicMock()
        mock_screen.width = 300
        mock_screen.height = 300

        with patch("webview.screens", [mock_screen]):
            x, y = calculate_anchor_position(width=400, height=420, margin_x=16, margin_y=64)
            self.assertEqual(x, 0)
            self.assertEqual(y, 0)

    def test_anchor_position_exception_fallback(self):
        """Falls back to 1920x1080 when webview.screens raises exception."""
        with patch("webview.screens", side_effect=RuntimeError("Screen detection failed")):
            x, y = calculate_anchor_position()
            self.assertEqual(x, 1504)
            self.assertEqual(y, 596)

    def test_api_add_task_explicit_parameters(self):
        """API add_task passes explicit weight and duration to storage and returns ISO timestamps."""
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            res = api.add_task("Explicit Task", weight=4, duration_minutes=15)
            self.assertEqual(res.get("status"), "ok")
            task = res.get("task", {})
            self.assertEqual(task.get("weight_score"), 4)
            self.assertEqual(task.get("deadline_str"), "15 phút")

            # Check ISO format
            created_at = datetime.fromisoformat(task["created_at"])
            deadline_at = datetime.fromisoformat(task["deadline_at"])
            diff = (deadline_at - created_at).total_seconds()
            self.assertAlmostEqual(diff, 15 * 60, delta=2.0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_api_add_task_heuristic_fallback(self):
        """API add_task without explicit parameters falls back to heuristic parsing."""
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            res = api.add_task("mai doc sach 15p")
            self.assertEqual(res.get("status"), "ok")
            task = res.get("task", {})
            self.assertEqual(task.get("weight_score"), 1)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_api_add_task_overload_rejection(self):
        """API add_task rejects 11th active task with overload error status."""
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            # Fill up 10 tasks
            for i in range(10):
                res = api.add_task(f"Task {i+1}")
                self.assertEqual(res["status"], "ok")

            self.assertEqual(len(api.get_tasks()), 10)

            # 11th task rejected
            res_11 = api.add_task("Task 11 Overflow")
            self.assertEqual(res_11.get("status"), "error")
            self.assertEqual(res_11.get("error"), "overload")
            self.assertEqual(len(api.get_tasks()), 10)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_api_complete_task_overdue_flag(self):
        """API complete_task accurately detects whether completed task was overdue."""
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            now = datetime.now()
            # Overdue task
            overdue_task = {
                "id": "task_overdue",
                "title": "Overdue task",
                "weight_score": 3,
                "deadline_str": "Overdue",
                "created_at": (now - timedelta(hours=3)).isoformat(),
                "deadline_at": (now - timedelta(hours=1)).isoformat(),
                "status": "pending",
            }
            # On-time task
            ontime_task = {
                "id": "task_ontime",
                "title": "On-time task",
                "weight_score": 2,
                "deadline_str": "Future",
                "created_at": now.isoformat(),
                "deadline_at": (now + timedelta(hours=2)).isoformat(),
                "status": "pending",
            }
            with storage._lock:
                storage.tasks.extend([overdue_task, ontime_task])
                storage._atomic_write_locked()

            # Complete overdue
            res_od = api.complete_task("task_overdue")
            self.assertEqual(res_od.get("status"), "ok")
            self.assertTrue(res_od.get("was_overdue"))

            # Complete on-time
            res_ot = api.complete_task("task_ontime")
            self.assertEqual(res_ot.get("status"), "ok")
            self.assertFalse(res_ot.get("was_overdue"))

            # Non-existent task
            res_nf = api.complete_task("nonexistent_id")
            self.assertEqual(res_nf.get("status"), "not_found")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == "__main__":
    unittest.main()
