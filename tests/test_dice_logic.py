import os
import tempfile
import unittest


class TestDiceLogic(unittest.TestCase):
    """TDD tests for TaskbarDice Milestone 2 parsing and persistence logic."""

    def test_parse_lightweight_task(self):
        from dice_logic import parse_task_input

        task = parse_task_input("mai doc sach 15p")
        self.assertEqual(task["weight_score"], 1)
        self.assertIn("doc sach", task["title"].lower())
        self.assertEqual(task["status"], "pending")
        self.assertTrue(bool(task["id"]))

    def test_parse_heavyweight_task(self):
        from dice_logic import parse_task_input

        task = parse_task_input("fix bug he thong gap chieu nay")
        self.assertEqual(task["weight_score"], 5)
        self.assertIn("fix bug", task["title"].lower())
        self.assertEqual(task["status"], "pending")

    def test_parse_medium_task(self):
        from dice_logic import parse_task_input

        task = parse_task_input("nop bao cao tuan")
        self.assertEqual(task["weight_score"], 3)
        self.assertIn("bao cao", task["title"].lower())

    def test_parse_boundary_empty(self):
        from dice_logic import parse_task_input

        task = parse_task_input("")
        self.assertIn(task["weight_score"], range(1, 6))
        self.assertEqual(task["title"], "Untitled Task")
        self.assertIn("deadline_at", task)

    def test_parse_deadline_at_timestamp(self):
        from datetime import datetime
        from dice_logic import parse_task_input

        # 1. 15 minute task
        task_15m = parse_task_input("mai doc sach 15p")
        self.assertIn("deadline_at", task_15m)
        dt_15m = datetime.fromisoformat(task_15m["deadline_at"])
        dt_created = datetime.fromisoformat(task_15m["created_at"])
        self.assertGreater(dt_15m, dt_created)

        # 2. Default task without explicit deadline (should default to ~4h window)
        task_default = parse_task_input("lam viec ca nhan")
        self.assertIn("deadline_at", task_default)
        dt_def = datetime.fromisoformat(task_default["deadline_at"])
        dt_def_created = datetime.fromisoformat(task_default["created_at"])
        diff_hours = (dt_def - dt_def_created).total_seconds() / 3600.0
        self.assertAlmostEqual(diff_hours, 4.0, delta=0.5)


    def test_task_storage_persistence(self):
        from dice_logic import TaskStorage

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            self.assertEqual(storage.get_tasks(), [])

            t1 = storage.add_task("mai doc sach 15p")
            self.assertEqual(t1["weight_score"], 1)

            t2 = storage.add_task("fix bug he thong gap chieu nay")
            self.assertEqual(t2["weight_score"], 5)

            tasks = storage.get_tasks()
            self.assertEqual(len(tasks), 2)

            # Reload fresh instance from disk
            storage_reloaded = TaskStorage(temp_path)
            reloaded_tasks = storage_reloaded.get_tasks()
            self.assertEqual(len(reloaded_tasks), 2)
            self.assertEqual(reloaded_tasks[0]["id"], t1["id"])
            self.assertEqual(reloaded_tasks[1]["id"], t2["id"])

            # Milestone 4: Test complete_task
            completed_res = storage_reloaded.complete_task(t1["id"])
            self.assertTrue(completed_res)
            active_tasks = storage_reloaded.get_tasks()
            self.assertEqual(len(active_tasks), 1)
            self.assertEqual(active_tasks[0]["id"], t2["id"])

            # Verify completed task retained in persistence with completed_at
            all_persisted = storage_reloaded.get_tasks(include_completed=True)
            self.assertEqual(len(all_persisted), 2)
            t1_record = next(t for t in all_persisted if t["id"] == t1["id"])
            self.assertEqual(t1_record["status"], "completed")
            self.assertIn("completed_at", t1_record)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # --------------------------------------------------------------------------
    # Milestone 1: Explicit Weight & Duration Parsing Tests
    # --------------------------------------------------------------------------
    def test_explicit_weight_override(self):
        from dice_logic import parse_task_input

        # "mai doc sach 15p" heuristics would yield weight=1, but explicit weight=4 overrides it
        task = parse_task_input("mai doc sach 15p", weight=4)
        self.assertEqual(task["weight_score"], 4)

        # "fix bug he thong gap chieu nay" heuristics would yield weight=5, but explicit weight=2 overrides it
        task2 = parse_task_input("fix bug he thong gap chieu nay", weight=2)
        self.assertEqual(task2["weight_score"], 2)

    def test_explicit_weight_clamping(self):
        from dice_logic import parse_task_input

        # Out-of-bounds weight clamped to [1, 5]
        task_high = parse_task_input("Test task", weight=99)
        self.assertEqual(task_high["weight_score"], 5)

        task_low = parse_task_input("Test task", weight=0)
        self.assertEqual(task_low["weight_score"], 1)

        task_negative = parse_task_input("Test task", weight=-5)
        self.assertEqual(task_negative["weight_score"], 1)

    def test_explicit_duration_minutes(self):
        from datetime import datetime
        from dice_logic import parse_task_input

        # Presets: 15m, 25m, 60m (1h), 240m (4h)
        for minutes, expected_str in [
            (15, "15 phút"),
            (25, "25 phút"),
            (60, "1 giờ"),
            (240, "4 giờ"),
            (120, "2 giờ"),
            (45, "45 phút"),
        ]:
            task = parse_task_input("General task", duration_minutes=minutes)
            self.assertEqual(task["deadline_str"], expected_str)

            dt_created = datetime.fromisoformat(task["created_at"])
            dt_deadline = datetime.fromisoformat(task["deadline_at"])
            diff_seconds = (dt_deadline - dt_created).total_seconds()
            self.assertAlmostEqual(diff_seconds, minutes * 60, delta=2.0)

    def test_explicit_weight_and_duration_combined(self):
        from datetime import datetime
        from dice_logic import parse_task_input

        task = parse_task_input("Urgent task", weight=5, duration_minutes=15)
        self.assertEqual(task["weight_score"], 5)
        self.assertEqual(task["deadline_str"], "15 phút")

        dt_created = datetime.fromisoformat(task["created_at"])
        dt_deadline = datetime.fromisoformat(task["deadline_at"])
        diff_seconds = (dt_deadline - dt_created).total_seconds()
        self.assertAlmostEqual(diff_seconds, 15 * 60, delta=2.0)

    def test_empty_input_with_explicit_params(self):
        from dice_logic import parse_task_input

        task = parse_task_input("", weight=3, duration_minutes=60)
        self.assertEqual(task["weight_score"], 3)
        self.assertEqual(task["deadline_str"], "1 giờ")
        self.assertEqual(task["title"], "Untitled Task")

    def test_storage_add_task_explicit(self):
        from dice_logic import TaskStorage

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            task = storage.add_task("Explicit Task", weight=4, duration_minutes=25)
            self.assertEqual(task["weight_score"], 4)
            self.assertEqual(task["deadline_str"], "25 phút")

            reloaded = TaskStorage(temp_path)
            tasks = reloaded.get_tasks()
            self.assertEqual(len(tasks), 1)
            self.assertEqual(tasks[0]["weight_score"], 4)
            self.assertEqual(tasks[0]["deadline_str"], "25 phút")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # --------------------------------------------------------------------------
    # Milestone 1 / Requirement R3: calculate_rot_factor Helper Tests
    # --------------------------------------------------------------------------
    def test_calculate_rot_factor_fresh(self):
        from datetime import datetime, timedelta
        from dice_logic import calculate_rot_factor

        now = datetime.now()
        task = {
            "created_at": now.isoformat(),
            "deadline_at": (now + timedelta(minutes=60)).isoformat(),
        }
        rot = calculate_rot_factor(task, now=now)
        self.assertAlmostEqual(rot, 0.0, places=3)

    def test_calculate_rot_factor_progress(self):
        from datetime import datetime, timedelta
        from dice_logic import calculate_rot_factor

        now = datetime.now()
        created = now - timedelta(minutes=30)
        deadline = now + timedelta(minutes=30)  # exactly halfway (50%)
        task = {
            "created_at": created.isoformat(),
            "deadline_at": deadline.isoformat(),
        }
        rot = calculate_rot_factor(task, now=now)
        self.assertAlmostEqual(rot, 0.5, places=3)

    def test_calculate_rot_factor_overdue(self):
        from datetime import datetime, timedelta
        from dice_logic import calculate_rot_factor

        now = datetime.now()
        created = now - timedelta(minutes=90)
        deadline = now - timedelta(minutes=30)  # 60m total duration, 30m overdue (150% rot)
        task = {
            "created_at": created.isoformat(),
            "deadline_at": deadline.isoformat(),
        }
        rot = calculate_rot_factor(task, now=now)
        # Unclamped overdue: rot > 1.0
        self.assertGreater(rot, 1.0)
        self.assertAlmostEqual(rot, 1.5, places=2)

    def test_calculate_rot_factor_invalid_inputs(self):
        from datetime import datetime
        from dice_logic import calculate_rot_factor

        now = datetime.now()
        # Empty dict fallback
        rot_empty = calculate_rot_factor({}, now=now)
        self.assertGreaterEqual(rot_empty, 0.0)

        # Invalid timestamp string fallback
        task_invalid = {"created_at": "not-a-date", "deadline_at": "bad-date"}
        rot_invalid = calculate_rot_factor(task_invalid, now=now)
        self.assertGreaterEqual(rot_invalid, 0.0)


if __name__ == "__main__":
    unittest.main()
