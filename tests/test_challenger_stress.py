"""
Milestone 1 Empirical Challenger Stress Test Suite
Adversarial testing of:
1. Window dimensions and anchor positioning across screen resolutions
2. CSS box-model budget, element heights, borders, and form button types
3. Explicit Weight & Duration overrides, boundary clamping, heuristic fallbacks
4. Adversarial inputs: XSS, Unicode, long strings, whitespace, control chars
5. Thread-safe concurrency and Tower Overload capacity boundary (10 active tasks)
6. Overdue penalty detection on completion
"""

import concurrent.futures
from datetime import datetime, timedelta
import inspect
import json
import os
import re
import sys
import tempfile
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import importlib.util
if "webview" not in sys.modules:
    try:
        import webview
    except ImportError:
        from unittest.mock import MagicMock
        mock_webview = MagicMock()
        mock_screen = MagicMock()
        mock_screen.width = 1920
        mock_screen.height = 1080
        mock_webview.screens = [mock_screen]
        sys.modules["webview"] = mock_webview

APP_PY = os.path.join(PROJECT_ROOT, "app.py")
spec = importlib.util.spec_from_file_location("desktop_app", APP_PY)
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
import dice_logic


class ChallengerMilestone1StressTest(unittest.TestCase):

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_path = self.temp_file.name
        self.temp_file.close()
        self.storage = dice_logic.TaskStorage(self.temp_path)
        self.api = app.TaskbarDiceAPI(storage=self.storage)

    def tearDown(self):
        if os.path.exists(self.temp_path):
            try:
                os.remove(self.temp_path)
            except OSError:
                pass

    # =========================================================================
    # 1. SCREEN RESOLUTIONS & ANCHOR POSITIONING STRESS TEST
    # =========================================================================
    def test_anchor_positions_across_multiple_screen_resolutions(self):
        """Stress-test anchor calculations across multiple screen resolutions."""
        resolutions = [
            (1920, 1080, 1504, 596),   # Standard FHD
            (2560, 1440, 2144, 956),   # 2K QHD
            (3840, 2160, 3424, 1676),  # 4K UHD
            (1366, 768, 950, 284),     # Laptop WXGA
            (800, 600, 384, 116),      # SVGA
            (300, 300, 0, 0),          # Smaller than widget (clamped to 0,0)
            (400, 420, 0, 0),          # Exact widget size with margins exceeding screen (clamped to 0,0)
        ]

        class MockScreen:
            def __init__(self, w, h):
                self.width = w
                self.height = h

        original_screens = getattr(app.webview, "screens", None)
        try:
            for screen_w, screen_h, expected_x, expected_y in resolutions:
                app.webview.screens = [MockScreen(screen_w, screen_h)]
                x, y = app.calculate_anchor_position(width=400, height=420, margin_x=16, margin_y=64)
                self.assertEqual(x, expected_x, f"Failed x calculation for resolution {screen_w}x{screen_h}")
                self.assertEqual(y, expected_y, f"Failed y calculation for resolution {screen_w}x{screen_h}")

            # Test fallback when screens is empty
            app.webview.screens = []
            x, y = app.calculate_anchor_position(width=400, height=420, margin_x=16, margin_y=64)
            self.assertEqual((x, y), (1504, 596), "Fallback on empty screens should assume 1920x1080")

        finally:
            app.webview.screens = original_screens

    # =========================================================================
    # 2. HTML & CSS BOX MODEL VERIFICATION
    # =========================================================================
    def test_css_box_model_budget_and_zero_overflow(self):
        """Adversarially parse static/index.html to ensure zero clipping."""
        html_path = os.path.join(PROJECT_ROOT, "static", "index.html")
        self.assertTrue(os.path.exists(html_path))

        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()

        # Check body styles
        body_match = re.search(r"body\s*\{([^}]+)\}", html)
        self.assertIsNotNone(body_match, "body CSS rule missing")
        body_css = body_match.group(1)

        self.assertIn("width: 400px", body_css)
        self.assertIn("height: 420px", body_css)
        self.assertIn("overflow: hidden", body_css)
        self.assertIn("display: flex", body_css)
        self.assertIn("flex-direction: column", body_css)

        # Check header styles: 26px
        header_match = re.search(r"\.drag-header\s*\{([^}]+)\}", html)
        self.assertIsNotNone(header_match, ".drag-header CSS missing")
        header_css = header_match.group(1)
        self.assertIn("height: 26px", header_css)
        self.assertIn("box-sizing: border-box", header_css)
        self.assertIn("flex: 0 0 26px", header_css)

        # Check canvas styles: 320px
        canvas_match = re.search(r"#diceCanvas\s*\{([^}]+)\}", html)
        self.assertIsNotNone(canvas_match, "#diceCanvas CSS missing")
        canvas_css = canvas_match.group(1)
        self.assertIn("height: 320px", canvas_css)
        self.assertIn("flex: 0 0 320px", canvas_css)
        self.assertIn("display: block", canvas_css)

        # Check control panel styles: 74px
        panel_match = re.search(r"\.control-panel\s*\{([^}]+)\}", html)
        self.assertIsNotNone(panel_match, ".control-panel CSS missing")
        panel_css = panel_match.group(1)
        self.assertIn("height: 74px", panel_css)
        self.assertIn("box-sizing: border-box", panel_css)
        self.assertIn("flex: 0 0 74px", panel_css)

        # Total layout budget
        header_h = 26
        canvas_h = 320
        panel_h = 74
        total_h = header_h + canvas_h + panel_h
        self.assertEqual(total_h, 420, "Total layout budget must equal 420px exactly")

        # Check form buttons type='button' to prevent accidental form submission
        # Weight buttons
        weight_btns = re.findall(r'<button[^>]*class="[^"]*weight-btn[^"]*"[^>]*>', html)
        self.assertEqual(len(weight_btns), 5, "Expected 5 weight buttons")
        for btn in weight_btns:
            self.assertIn('type="button"', btn, f"Weight button must have type='button': {btn}")

        # Time buttons
        time_btns = re.findall(r'<button[^>]*class="[^"]*time-btn[^"]*"[^>]*>', html)
        self.assertGreaterEqual(len(time_btns), 5, "Expected at least 5 time preset buttons")
        for btn in time_btns:
            self.assertIn('type="button"', btn, f"Time button must have type='button': {btn}")

        # Submit button
        submit_btn_match = re.search(r'<button[^>]*id="addBtn"[^>]*>', html)
        self.assertIsNotNone(submit_btn_match)
        self.assertIn('type="submit"', submit_btn_match.group(0))

    # =========================================================================
    # 3. EXPLICIT WEIGHT & TIME BOUNDARIES & CLAMPING
    # =========================================================================
    def test_explicit_weight_and_time_boundary_clamping(self):
        """Test explicit parameter boundaries and clamping logic."""
        # Weight clamped to [1, 5]
        test_cases = [
            (-10, 1),
            (0, 1),
            (1, 1),
            (3, 3),
            (5, 5),
            (6, 5),
            (999, 5),
        ]
        for input_w, expected_w in test_cases:
            res = self.api.add_task(f"Task with weight {input_w}", weight=input_w, duration_minutes=15)
            self.assertEqual(res["status"], "ok")
            self.assertEqual(res["task"]["weight_score"], expected_w)
            self.storage.tasks.clear()

        # Non-integer / invalid weight falls back to heuristic score
        res = self.api.add_task("Gấp khẩn cấp", weight="invalid", duration_minutes=15)
        self.assertEqual(res["status"], "ok")
        self.assertGreaterEqual(res["task"]["weight_score"], 4, "Should fall back to heuristic (>=4)")
        self.storage.tasks.clear()

        # Duration presets & custom minutes
        durations = [
            (15, "15 phút", 900),
            (25, "25 phút", 1500),
            (60, "1 giờ", 3600),
            (240, "4 giờ", 14400),
            (120, "2 giờ", 7200),
            (45, "45 phút", 2700),
        ]
        for mins, expected_label, expected_sec in durations:
            res = self.api.add_task(f"Task {mins}m", weight=2, duration_minutes=mins)
            self.assertEqual(res["status"], "ok")
            task = res["task"]
            self.assertEqual(task["deadline_str"], expected_label)

            c_dt = datetime.fromisoformat(task["created_at"])
            d_dt = datetime.fromisoformat(task["deadline_at"])
            self.assertAlmostEqual((d_dt - c_dt).total_seconds(), expected_sec, delta=3.0)
            self.storage.tasks.clear()

    # =========================================================================
    # 4. ADVERSARIAL INPUTS (XSS, UNICODE, MASSIVE PAYLOADS)
    # =========================================================================
    def test_adversarial_inputs_security_and_encoding(self):
        """Stress-test sanitization and Unicode stability."""
        adversarial_strings = [
            "  Báo cáo tài chính Q4 & triển khai hệ thống 🚀  ",
            "<script>alert('pwned')</script>",
            "'; DROP TABLE tasks; --",
            "\x00\x07\x0bCorrupted\x1bControl\x7fChars",
            "A" * 5000,  # Massive string
            "Tiếng Việt có dấu: Ắ, Ằ, Ẳ, Ẵ, Ặ, Ế, Ề, Ể, Ễ, Ệ, Ố, Ồ, Ổ, Ỗ, Ộ",
            "   \t\n\r   ",  # Whitespace only
            "",               # Empty string
        ]

        for s in adversarial_strings:
            res = self.api.add_task(s, weight=3, duration_minutes=25)
            self.assertEqual(res["status"], "ok")
            task = res["task"]
            self.assertTrue(task["id"])
            self.assertTrue(task["created_at"])
            self.assertTrue(task["deadline_at"])
            # Ensure JSON persistence works without error
            reloaded = self.storage.load_tasks()
            self.assertEqual(len(reloaded), 1)
            self.assertEqual(reloaded[0]["id"], task["id"])
            self.storage.tasks.clear()

    # =========================================================================
    # 5. TOWER OVERLOAD CAPACITY BOUNDARY (10 ACTIVE TASKS)
    # =========================================================================
    def test_tower_overload_rejection_at_ten_tasks(self):
        """Verify strict capacity limit of 10 active tasks."""
        for i in range(10):
            res = self.api.add_task(f"Task #{i+1}", weight=1, duration_minutes=15)
            self.assertEqual(res["status"], "ok")

        self.assertEqual(len(self.storage.get_tasks()), 10)

        # 11th task attempt
        res_11 = self.api.add_task("11th Overflow Task", weight=1, duration_minutes=15)
        self.assertEqual(res_11["status"], "error")
        self.assertEqual(res_11["error"], "overload")
        self.assertEqual(len(self.storage.get_tasks()), 10)

        # Completing one task should free up a slot
        first_id = self.storage.get_tasks()[0]["id"]
        comp_res = self.api.complete_task(first_id)
        self.assertEqual(comp_res["status"], "ok")
        self.assertEqual(len(self.storage.get_tasks()), 9)

        # Now 10th slot can be filled again
        res_refill = self.api.add_task("Refill Task", weight=5, duration_minutes=60)
        self.assertEqual(res_refill["status"], "ok")
        self.assertEqual(len(self.storage.get_tasks()), 10)

    # =========================================================================
    # 6. CONCURRENT THREAD SAFETY
    # =========================================================================
    def test_multithreaded_atomic_storage(self):
        """Stress-test thread safety under concurrent writes."""
        num_threads = 8
        tasks_per_thread = 5

        def worker(thread_idx):
            results = []
            for j in range(tasks_per_thread):
                t = self.storage.add_task(f"T{thread_idx}-{j}", weight=2, duration_minutes=15)
                results.append(t)
            return results

        # Run concurrent workers
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(worker, i) for i in range(num_threads)]
            for f in concurrent.futures.as_completed(futures):
                f.result()

        # Check file integrity
        loaded = self.storage.get_tasks(include_completed=True)
        self.assertEqual(len(loaded), num_threads * tasks_per_thread)

    # =========================================================================
    # 7. OVERDUE DETECTION ON COMPLETION
    # =========================================================================
    def test_overdue_and_ontime_completion_detection(self):
        """Verify API correctly flags overdue vs on-time tasks upon completion."""
        now = datetime.now()

        # Task 1: Overdue (deadline in the past)
        past_task = {
            "id": "task_past",
            "title": "Overdue Task",
            "weight_score": 3,
            "deadline_str": "15 phút",
            "created_at": (now - timedelta(minutes=40)).isoformat(),
            "deadline_at": (now - timedelta(minutes=25)).isoformat(),
            "status": "pending"
        }
        self.storage.tasks.append(past_task)
        self.storage._atomic_write_locked()

        res1 = self.api.complete_task("task_past")
        self.assertEqual(res1["status"], "ok")
        self.assertTrue(res1["was_overdue"], "Past task must be flagged was_overdue=True")

        # Task 2: On-time (deadline in the future)
        future_task = {
            "id": "task_future",
            "title": "On-time Task",
            "weight_score": 3,
            "deadline_str": "15 phút",
            "created_at": now.isoformat(),
            "deadline_at": (now + timedelta(minutes=15)).isoformat(),
            "status": "pending"
        }
        self.storage.tasks.append(future_task)
        self.storage._atomic_write_locked()

        res2 = self.api.complete_task("task_future")
        self.assertEqual(res2["status"], "ok")
        self.assertFalse(res2["was_overdue"], "Future task must be flagged was_overdue=False")


if __name__ == "__main__":
    unittest.main()
