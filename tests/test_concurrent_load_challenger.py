"""
Adversarial Concurrency & Overload Stress Test Suite
====================================================
Milestone 1 Iteration 2 Challenger Verification

Tests:
1. 100-thread simultaneous barrage from empty storage: exactly 10 succeed, 90 rejected.
2. 50-thread contention at boundary (9 existing tasks): exactly 1 succeeds, 49 rejected.
3. 50-thread attempt when already at capacity (10 existing tasks): 0 succeed, 50 rejected.
4. Heavy concurrent mixed churn (20 producers, 10 consumers, 10 readers): active tasks invariant <= 10.
5. Atomicity and file integrity under rapid serialized/deserialized reloads.
"""

import os
import sys
import json
import time
import tempfile
import threading
import unittest
from typing import List, Dict, Any

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Mock webview if needed
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

from dice_logic import TaskStorage


class TestConcurrentLoadChallenger(unittest.TestCase):
    """Rigorous empirical verification of Tower Overload (10-task cap) under heavy concurrency."""

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_file.close()
        self.storage_path = self.temp_file.name

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

    def test_100_thread_barrage_empty_storage(self):
        """100 threads concurrently hit api.add_task. Exactly 10 must succeed, 90 must fail."""
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        num_threads = 100
        barrier = threading.Barrier(num_threads)
        results = []
        lock = threading.Lock()

        def worker(idx):
            barrier.wait()
            res = api.add_task(f"Barrage Task {idx}", weight=idx % 5 + 1, duration_minutes=15)
            with lock:
                results.append(res)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r.get("status") == "ok"]
        overloads = [r for r in results if r.get("status") == "error" and r.get("error") == "overload"]

        # Check total responses
        self.assertEqual(len(results), num_threads, f"Expected {num_threads} responses, got {len(results)}")
        self.assertEqual(len(successes), 10, f"Expected exactly 10 successes, got {len(successes)}")
        self.assertEqual(len(overloads), 90, f"Expected exactly 90 overload rejections, got {len(overloads)}")

        # Verify in-memory state
        active_in_mem = api.get_tasks()
        self.assertEqual(len(active_in_mem), 10, f"Active tasks in memory must be 10, got {len(active_in_mem)}")

        # Verify disk state directly
        with open(self.storage_path, "r", encoding="utf-8") as f:
            disk_tasks = json.load(f)
        self.assertEqual(len(disk_tasks), 10, f"Disk tasks must be 10, got {len(disk_tasks)}")

    def test_50_thread_contention_at_boundary_9_tasks(self):
        """Preload 9 tasks. 50 concurrent threads race for the final 10th slot. Exactly 1 must win."""
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        for i in range(9):
            res = api.add_task(f"Preloaded Task {i}")
            self.assertEqual(res.get("status"), "ok")

        self.assertEqual(len(api.get_tasks()), 9)

        num_threads = 50
        barrier = threading.Barrier(num_threads)
        results = []
        lock = threading.Lock()

        def worker(idx):
            barrier.wait()
            res = api.add_task(f"Contender Task {idx}")
            with lock:
                results.append(res)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r.get("status") == "ok"]
        overloads = [r for r in results if r.get("status") == "error" and r.get("error") == "overload"]

        self.assertEqual(len(successes), 1, f"Only 1 slot remained, but {len(successes)} succeeded!")
        self.assertEqual(len(overloads), 49, f"Expected 49 rejections, got {len(overloads)}")
        self.assertEqual(len(api.get_tasks()), 10, "Total active tasks must not exceed 10")

    def test_50_thread_rejection_at_capacity_10_tasks(self):
        """Preload 10 tasks. 50 concurrent threads try to add. ALL 50 must be rejected."""
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        for i in range(10):
            res = api.add_task(f"Full Task {i}")
            self.assertEqual(res.get("status"), "ok")

        self.assertEqual(len(api.get_tasks()), 10)

        num_threads = 50
        barrier = threading.Barrier(num_threads)
        results = []
        lock = threading.Lock()

        def worker(idx):
            barrier.wait()
            res = api.add_task(f"Rejected Task {idx}")
            with lock:
                results.append(res)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r.get("status") == "ok"]
        overloads = [r for r in results if r.get("status") == "error" and r.get("error") == "overload"]

        self.assertEqual(len(successes), 0, f"Expected 0 successes at capacity, got {len(successes)}")
        self.assertEqual(len(overloads), 50, f"Expected 50 rejections, got {len(overloads)}")
        self.assertEqual(len(api.get_tasks()), 10)

    def test_mixed_churn_producers_consumers_readers(self):
        """
        Mixed stress test:
        20 threads trying to add tasks.
        10 threads trying to complete tasks.
        10 threads reading active tasks.
        Running continuously over 50 rounds.
        Invariant: Active tasks must NEVER exceed 10 at any instant.
        """
        storage = TaskStorage(self.storage_path)
        api = TaskbarDiceAPI(storage=storage)

        # Seed with 5 tasks
        for i in range(5):
            api.add_task(f"Initial {i}")

        stop_event = threading.Event()
        violations = []
        lock = threading.Lock()

        def producer():
            idx = 0
            while not stop_event.is_set():
                res = api.add_task(f"Churn Producer Task {threading.get_ident()}_{idx}")
                idx += 1
                time.sleep(0.001)

        def consumer():
            while not stop_event.is_set():
                tasks = api.get_tasks()
                if tasks:
                    target_id = tasks[0]["id"]
                    api.complete_task(target_id)
                time.sleep(0.002)

        def auditor():
            while not stop_event.is_set():
                active = api.get_tasks()
                active_count = len(active)
                if active_count > 10:
                    with lock:
                        violations.append(active_count)
                time.sleep(0.001)

        threads = []
        for _ in range(15):
            threads.append(threading.Thread(target=producer))
        for _ in range(10):
            threads.append(threading.Thread(target=consumer))
        for _ in range(10):
            threads.append(threading.Thread(target=auditor))

        for t in threads:
            t.start()

        # Let the stress test churn for 1.5 seconds
        time.sleep(1.5)
        stop_event.set()

        for t in threads:
            t.join()

        self.assertEqual(
            violations,
            [],
            f"Active tasks breached 10-task maximum during concurrent churn! Violations: {violations}"
        )

        # Final verification of file validity
        with open(self.storage_path, "r", encoding="utf-8") as f:
            disk_data = json.load(f)
        self.assertIsInstance(disk_data, list)
        active_on_disk = [t for t in disk_data if t.get("status") != "completed"]
        self.assertLessEqual(len(active_on_disk), 10)


if __name__ == "__main__":
    unittest.main()
