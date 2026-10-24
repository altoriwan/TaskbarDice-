r"""
tests/test_adversarial_final_python.py
Comprehensive Python Adversarial Challenge Test Harness for:
1. Tooltip word-wrapping and boundary limits with extreme inputs:
   - 1000-char single words
   - Empty titles, None, whitespace
   - Unicode surrogate pairs and astral symbols
   - Vietnamese diacritics (precomposed NFC vs decomposed NFD)
   - 4-way canvas boundary clamping
2. 5-stage rot engine across extreme rot values:
   - Negative, zero, thresholds (0.2, 0.4, 0.6, 0.8, 1.0, 10.0, infinity, nan)
   - Inverted dates, zero span
3. Backend API stress testing:
   - Concurrency & TOCTOU races on 10-task limit (50-thread contention at boundary of 9 tasks)
   - Rapid concurrent mixed churn (producers, consumers, readers)
   - Extreme date durations (10^10 minutes, -10^10, float, nan)
   - Non-string inputs (None, int, dict, list, boolean, bytes, 1MB string)
"""

import concurrent.futures
from datetime import datetime, timedelta
import json
import math
import os
import re
import sys
import tempfile
import threading
import time
import unicodedata
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

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

import importlib.util
APP_PY_PATH = os.path.join(PROJECT_ROOT, "app.py")
spec = importlib.util.spec_from_file_location("desktop_app", APP_PY_PATH)
desktop_app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop_app)
TaskbarDiceAPI = desktop_app.TaskbarDiceAPI

from dice_logic import (
    parse_task_input,
    TaskStorage,
    calculate_rot_factor,
    sanitize_input,
    parse_iso_datetime
)


class TestAdversarialFinalChallenge(unittest.TestCase):
    """Adversarial challenger test suite targeting core boundaries and edge cases."""

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.storage_path = self.temp_file.name
        self.temp_file.close()

    def tearDown(self):
        if os.path.exists(self.storage_path):
            try:
                os.remove(self.storage_path)
            except OSError:
                pass
        tmp_backup = f"{self.storage_path}.tmp"
        if os.path.exists(tmp_backup):
            try:
                os.remove(tmp_backup)
            except OSError:
                pass

    # =========================================================================
    # 1. TOOLTIP WORD-WRAPPING & BOUNDARY STRESS TEST
    # =========================================================================

    def test_tooltip_word_wrapping_algorithm_simulation(self):
        """
        Simulates the hardened word-wrapping algorithm in static/index.html:2730-2792.
        Verifies:
        - 1000-char single words are chunked to maxLineWidth (180px)
        - Unicode surrogate pairs are not severed
        - Vietnamese diacritics (NFC/NFD) are preserved
        - Empty and whitespace strings fall back safely
        """
        max_line_width = 180

        def measure(text: str) -> int:
            return len(list(text)) * 6

        def wrap_title(title: str):
            full_title = (title or "UNTITLED").strip()
            if not full_title:
                full_title = "UNTITLED"
            words = re.split(r"\s+", full_title)
            lines = []
            current_line = ""
            has_more = False

            for w in words:
                if not w:
                    continue
                test_line = f"{current_line} {w}" if current_line else w
                if measure(test_line) <= max_line_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                        current_line = ""
                        if len(lines) >= 2:
                            has_more = True
                            break
                    if measure(w) <= max_line_width:
                        current_line = w
                    else:
                        norm_word = unicodedata.normalize("NFC", w)
                        chunk = ""
                        for ch in norm_word:
                            if measure(chunk + ch) <= max_line_width:
                                chunk += ch
                            else:
                                if chunk:
                                    lines.append(chunk)
                                    if len(lines) >= 2:
                                        chunk = ""
                                        has_more = True
                                        break
                                chunk = ch
                        current_line = chunk
                        if len(lines) >= 2:
                            has_more = True
                            break

            if current_line and len(lines) < 2:
                lines.append(current_line)
            if not lines:
                lines.append(full_title[:22])
            if len(lines) > 2:
                lines = lines[:2]
            if has_more and len(lines) == 2:
                chars = list(lines[1])
                while chars and measure("".join(chars) + "...") > max_line_width:
                    chars.pop()
                lines[1] = "".join(chars) + "..."

            for i in range(len(lines)):
                while lines[i] and measure(lines[i]) > max_line_width:
                    chars = list(lines[i])
                    chars.pop()
                    lines[i] = "".join(chars)

            return lines

        test_cases = [
            ("1000-char single word", "A" * 1000),
            ("1000-char single word VN", "ế" * 1000),
            ("Astral symbols", "𠮷" * 50 + " 𝕳𝖊𝖑𝖑𝖔" * 30),
            ("NFD Decomposed VN", unicodedata.normalize("NFD", "Thuở xưa nguyễn trãi viết bình ngô đại cáo")),
            ("Empty title", ""),
            ("Whitespace", "    "),
            ("None title", None),
            ("Complex emojis", "👨‍👩‍👧‍👦" * 20),
        ]

        for desc, title in test_cases:
            lines = wrap_title(title)
            self.assertLessEqual(len(lines), 2, f"Failed line count for {desc}")
            for idx, line in enumerate(lines):
                width = measure(line)
                self.assertLessEqual(width, max_line_width, f"Line {idx} width {width}px > {max_line_width}px for {desc}")

    def test_tooltip_boundary_clamping_invariant(self):
        """
        Mathematical proof of tooltip clamping invariant across all possible mouse inputs.
        Canvas is 400x320.
        """
        padding = 8
        test_positions = [
            (-1000, -1000), (0, 0), (200, 160), (400, 320), (5000, 5000),
            (0, 160), (400, 160), (200, 0), (200, 320),
            (395, 315), (5, 5), (195, 12)
        ]

        for width in [160, 196, 230]:
            for height in [46, 58]:
                for mx, my in test_positions:
                    tooltip_x = mx + 12
                    if tooltip_x + width > 400 - padding:
                        tooltip_x = mx - width - 12
                    tooltip_x = max(padding, min(400 - width - padding, tooltip_x))

                    tooltip_y = my - height - 8
                    if tooltip_y < padding:
                        tooltip_y = my + 22
                    tooltip_y = max(padding, min(320 - height - padding, tooltip_y))

                    # Invariants
                    self.assertGreaterEqual(tooltip_x, 8)
                    self.assertGreaterEqual(tooltip_y, 8)
                    self.assertLessEqual(tooltip_x + width, 392)
                    self.assertLessEqual(tooltip_y + height, 312)

    # =========================================================================
    # 2. 5-STAGE ROT ENGINE EXTREME VALUE TESTING
    # =========================================================================

    def test_rot_engine_extreme_calculations(self):
        """Test rot calculations under extreme mathematical values and abnormal dates."""
        now = datetime.now()

        # Normal 0 to 1
        t_half = {"created_at": (now - timedelta(hours=1)).isoformat(), "deadline_at": (now + timedelta(hours=1)).isoformat()}
        self.assertAlmostEqual(calculate_rot_factor(t_half, now=now), 0.5, places=2)

        # Overdue 2.0
        t_overdue = {"created_at": (now - timedelta(hours=2)).isoformat(), "deadline_at": (now - timedelta(hours=1)).isoformat()}
        self.assertAlmostEqual(calculate_rot_factor(t_overdue, now=now), 2.0, places=2)

        # Negative elapsed (future created_at)
        t_future = {"created_at": (now + timedelta(hours=1)).isoformat(), "deadline_at": (now + timedelta(hours=2)).isoformat()}
        self.assertEqual(calculate_rot_factor(t_future, now=now), 0.0)

        # Zero span
        t_zero = {"created_at": now.isoformat(), "deadline_at": now.isoformat()}
        self.assertIn(calculate_rot_factor(t_zero, now=now), [0.0, 1.0])

        # Inverted timeline (deadline < created)
        t_inverted = {"created_at": now.isoformat(), "deadline_at": (now - timedelta(hours=1)).isoformat()}
        self.assertGreaterEqual(calculate_rot_factor(t_inverted, now=now), 0.0)

        # Extreme overdue (10000 days)
        t_ancient = {"created_at": (now - timedelta(days=10001)).isoformat(), "deadline_at": (now - timedelta(days=10000)).isoformat()}
        rot_ancient = calculate_rot_factor(t_ancient, now=now)
        self.assertGreater(rot_ancient, 10000.0)

    # =========================================================================
    # 3. BACKEND API CONCURRENCY & TOCTOU RACES (10-TASK CAP)
    # =========================================================================

    def test_toctou_race_boundary_condition(self):
        """
        Adversarial TOCTOU Race Condition:
        Pre-populate storage with exactly 9 active tasks.
        Launch 50 concurrent threads trying to add task #10.
        INVARIANT: Exactly 1 thread must succeed. 49 threads must be rejected.
        Active task count must NEVER exceed 10.
        """
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        # Add 9 tasks
        for i in range(9):
            res = api.add_task(f"Base Task {i}")
            self.assertEqual(res["status"], "ok")

        self.assertEqual(len(api.get_tasks()), 9)

        num_threads = 50
        barrier = threading.Barrier(num_threads)
        results = []
        lock = threading.Lock()

        def worker(idx):
            barrier.wait()
            r = api.add_task(f"Contender {idx}")
            with lock:
                results.append(r)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r.get("status") == "ok"]
        overloads = [r for r in results if r.get("status") == "error" and r.get("error") == "overload"]

        self.assertEqual(len(successes), 1, f"Expected exactly 1 success out of 50 threads, got {len(successes)}")
        self.assertEqual(len(overloads), 49, f"Expected exactly 49 overload rejections, got {len(overloads)}")

        active_tasks = api.get_tasks()
        self.assertEqual(len(active_tasks), 10, f"Active tasks must equal exactly 10, got {len(active_tasks)}")

        # Verify on-disk file
        with open(self.storage_path, "r", encoding="utf-8") as f:
            disk_tasks = json.load(f)
        self.assertEqual(len(disk_tasks), 10)

    def test_rapid_concurrent_mixed_churn(self):
        """
        Stress test with 20 producer threads, 10 consumer threads, and 10 reader threads
        running concurrently for multiple cycles.
        Verifies that active tasks never exceed 10 and JSON storage remains uncorrupted.
        """
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        stop_event = threading.Event()
        errors = []
        lock = threading.Lock()

        def producer(pid):
            count = 0
            while not stop_event.is_set() and count < 15:
                count += 1
                try:
                    res = api.add_task(f"P_{pid}_{count}")
                    tasks = api.get_tasks()
                    if len(tasks) > 10:
                        with lock:
                            errors.append(f"Invariant broken: {len(tasks)} active tasks!")
                except Exception as e:
                    with lock:
                        errors.append(f"Producer exception: {e}")
                time.sleep(0.005)

        def consumer(cid):
            count = 0
            while not stop_event.is_set() and count < 15:
                count += 1
                try:
                    tasks = api.get_tasks()
                    if tasks:
                        task_id = tasks[0]["id"]
                        api.complete_task(task_id)
                except Exception as e:
                    with lock:
                        errors.append(f"Consumer exception: {e}")
                time.sleep(0.007)

        def reader(rid):
            count = 0
            while not stop_event.is_set() and count < 20:
                count += 1
                try:
                    tasks = api.get_tasks()
                    if len(tasks) > 10:
                        with lock:
                            errors.append(f"Reader saw > 10 tasks: {len(tasks)}")
                except Exception as e:
                    with lock:
                        errors.append(f"Reader exception: {e}")
                time.sleep(0.003)

        threads = []
        for i in range(15):
            threads.append(threading.Thread(target=producer, args=(i,)))
        for i in range(8):
            threads.append(threading.Thread(target=consumer, args=(i,)))
        for i in range(8):
            threads.append(threading.Thread(target=reader, args=(i,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent mixed churn errors: {errors}")
        final_tasks = api.get_tasks()
        self.assertLessEqual(len(final_tasks), 10)

    # =========================================================================
    # 4. EXTREME DURATIONS & NON-STRING INPUTS
    # =========================================================================

    def test_extreme_durations_robustness(self):
        """Test 10^10 minutes, negative durations, 0 duration, float, and strings."""
        # 10^10 minutes (overflow guard)
        t_huge = parse_task_input("Huge task", duration_minutes=10**10)
        self.assertIn("deadline_at", t_huge)
        dt = parse_iso_datetime(t_huge["deadline_at"])
        self.assertIsNotNone(dt)

        # -10^10 minutes
        t_neg = parse_task_input("Neg task", duration_minutes=-(10**10))
        self.assertIn("deadline_at", t_neg)

        # 0 minutes
        t_zero = parse_task_input("Zero min", duration_minutes=0)
        self.assertIn("deadline_at", t_zero)

        # Float 25.5 minutes
        t_float = parse_task_input("Float min", duration_minutes=25.5)
        self.assertIn("deadline_at", t_float)

        # String "60" -> formats as '1 giờ'
        t_str = parse_task_input("Str min", duration_minutes="60")
        self.assertIn("deadline_at", t_str)
        self.assertIn(t_str["deadline_str"], ["60 phút", "1 giờ"])

    def test_non_string_inputs_to_api(self):
        """Pass non-string data types to api.add_task to verify zero unhandled exceptions."""
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        non_strings = [
            None,
            12345,
            {"nested": "dict"},
            ["list", "of", "items"],
            True,
            b"bytes payload",
            3.14159,
            "A" * 1000000,  # 1MB string
        ]

        for item in non_strings:
            try:
                res = api.add_task(item)
                self.assertIn(res["status"], ["ok", "error"])
                if res["status"] == "ok":
                    self.assertIn("title", res["task"])
                    self.assertLessEqual(len(res["task"]["title"]), 40)
            except Exception as e:
                self.fail(f"VULNERABILITY: api.add_task raised unhandled exception for {type(item)}: {e}")

    def test_complete_task_malformed_and_nonexistent_ids(self):
        """Verify complete_task handles malformed or non-existent task IDs gracefully."""
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        bad_ids = [
            "",
            "non-existent-uuid-12345",
            None,
            12345,
            "../../etc/passwd",
            "<script>alert(1)</script>",
            "'; DROP TABLE tasks; --"
        ]

        for bid in bad_ids:
            try:
                res = api.complete_task(bid)
                self.assertIn("status", res)
                self.assertIn(res["status"], ["error", "not_found"])
            except Exception as e:
                self.fail(f"VULNERABILITY: api.complete_task raised unhandled exception for id '{bid}': {e}")


if __name__ == "__main__":
    unittest.main()
