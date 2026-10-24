import os
import sys

# Directory is .agents/teamwork/teamwork_preview_explorer_m1_iter2_1/
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(AGENT_DIR, "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import unittest
from unittest.mock import MagicMock

# Mock webview if needed
if "webview" not in sys.modules:
    mock_webview = MagicMock()
    mock_screen = MagicMock()
    mock_screen.width = 1920
    mock_screen.height = 1080
    mock_webview.screens = [mock_screen]
    sys.modules["webview"] = mock_webview

import dice_logic

def patched_add_task(self, raw_text, weight=None, duration_minutes=None, max_active=None):
    rec = dice_logic.parse_task_input(raw_text, weight=weight, duration_minutes=duration_minutes)
    effective_limit = max_active if max_active is not None else getattr(self, "max_active", None)
    with self._lock:
        if effective_limit is not None:
            active_tasks = [t for t in self.tasks if t.get("status") != "completed"]
            if len(active_tasks) >= effective_limit:
                return None
        self.tasks.append(rec)
        self._atomic_write_locked()
    return rec

dice_logic.TaskStorage.add_task = patched_add_task

import importlib.util
spec = importlib.util.spec_from_file_location("app", os.path.join(PROJECT_ROOT, "app.py"))
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

def patched_api_add_task(self, text, weight=None, duration_minutes=None):
    max_active = getattr(self.storage, "MAX_ACTIVE_TASKS", 10)
    task = self.storage.add_task(
        text,
        weight=weight,
        duration_minutes=duration_minutes,
        max_active=max_active
    )
    if task is None:
        return {"status": "error", "error": "overload", "message": "Tower overload (10/10)"}
    return {"status": "ok", "task": task}

app.TaskbarDiceAPI.add_task = patched_api_add_task

def run_tests():
    # 1. Run test_challenger_stress
    import tests.test_challenger_stress as stress_mod
    stress_mod.app.TaskbarDiceAPI.add_task = patched_api_add_task
    stress_suite = unittest.TestLoader().loadTestsFromModule(stress_mod)
    res_stress = unittest.TextTestRunner(verbosity=1).run(stress_suite)
    print(f"test_challenger_stress: {len(res_stress.failures)} failures, {len(res_stress.errors)} errors, wasSuccessful={res_stress.wasSuccessful()}")

    # 2. Run test_app
    import tests.test_app as app_test_mod
    app_test_mod.TaskbarDiceAPI.add_task = patched_api_add_task
    app_suite = unittest.TestLoader().loadTestsFromModule(app_test_mod)
    res_app = unittest.TextTestRunner(verbosity=1).run(app_suite)
    print(f"test_app: {len(res_app.failures)} failures, {len(res_app.errors)} errors, wasSuccessful={res_app.wasSuccessful()}")

    # 3. Run adversarial concurrency & storage integrity
    import tests.test_adversarial_m1 as adv_mod
    adv_mod.TaskbarDiceAPI.add_task = patched_api_add_task
    suite_adv = unittest.TestSuite()
    suite_adv.addTest(adv_mod.TestMilestone1Adversarial("test_api_concurrent_overload_race_condition"))
    suite_adv.addTest(adv_mod.TestMilestone1Adversarial("test_rapid_concurrent_storage_integrity"))
    res_adv = unittest.TextTestRunner(verbosity=1).run(suite_adv)
    print(f"test_adversarial (race + integrity): {len(res_adv.failures)} failures, {len(res_adv.errors)} errors, wasSuccessful={res_adv.wasSuccessful()}")

if __name__ == "__main__":
    run_tests()
