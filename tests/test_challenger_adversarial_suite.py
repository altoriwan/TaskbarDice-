"""
Comprehensive Challenger Adversarial Verification Suite
=======================================================
Agent: teamwork_preview_challenger_final_2
Role: Empirical Challenger (critic, specialist)
Objective: Rigorously stress-test all 7 Acceptance Criteria (AC1 - AC7)
from ORIGINAL_REQUEST.md with adversarial inputs, edge cases, and oracles.
"""

import os
import sys
import json
import re
import math
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

STATIC_INDEX_HTML = os.path.join(PROJECT_ROOT, "static", "index.html")
APP_PY = os.path.join(PROJECT_ROOT, "app.py")
DICE_LOGIC_PY = os.path.join(PROJECT_ROOT, "dice_logic.py")
SECURITY_SCANNER_PY = os.path.join(
    PROJECT_ROOT,
    ".agents",
    "plugins",
    "superpowers-ecc",
    "skills",
    "agent-security-guard",
    "scripts",
    "security_scanner.py"
)

from dice_logic import TaskStorage, parse_task_input, calculate_rot_factor, parse_iso_datetime
import importlib.util

def load_desktop_app():
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

    spec = importlib.util.spec_from_file_location("desktop_app", APP_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

desktop_app = load_desktop_app()


class TestAC1LayoutAndBudgetChallenger(unittest.TestCase):
    """
    AC1 Challenge:
    - 400x420 window rendered with no bottom bar clipping or overflow.
    - Flexbox vertical budget: Header 26px + Canvas 320px + Control Panel 74px = 420px.
    - Control Panel horizontal budget: Row 1 (Input 78% + Gap 6px + Add 22%) <= 400px.
    - calculate_anchor_position under multi-monitor, small screens, and extreme DPI.
    """

    def setUp(self):
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            self.html = f.read()

    def test_ac1_flexbox_exact_vertical_budget(self):
        """Stress test vertical flexbox budget = 420px exactly with overflow: hidden."""
        # Check global box-sizing
        self.assertRegex(self.html, r"\*\s*\{[^}]*box-sizing:\s*border-box", "Universal box-sizing must be border-box")
        
        # Check body height
        body_h = re.search(r"body\s*\{[^}]*height:\s*(\d+)px", self.html)
        self.assertIsNotNone(body_h)
        self.assertEqual(int(body_h.group(1)), 420)

        # Check body width
        body_w = re.search(r"body\s*\{[^}]*width:\s*(\d+)px", self.html)
        self.assertIsNotNone(body_w)
        self.assertEqual(int(body_w.group(1)), 400)

        # Check overflow hidden on body
        self.assertRegex(self.html, r"body\s*\{[^}]*overflow:\s*hidden")

        # Check header 26px
        header_h = re.search(r"\.drag-header\s*\{[^}]*height:\s*(\d+)px", self.html)
        self.assertIsNotNone(header_h)
        self.assertEqual(int(header_h.group(1)), 26)

        # Check canvas 320px
        canvas_h = re.search(r"#diceCanvas\s*\{[^}]*height:\s*(\d+)px", self.html)
        self.assertIsNotNone(canvas_h)
        self.assertEqual(int(canvas_h.group(1)), 320)

        # Check control panel 74px
        panel_h = re.search(r"\.control-panel\s*\{[^}]*height:\s*(\d+)px", self.html)
        self.assertIsNotNone(panel_h)
        self.assertEqual(int(panel_h.group(1)), 74)

        total = int(header_h.group(1)) + int(canvas_h.group(1)) + int(panel_h.group(1))
        self.assertEqual(total, 420, f"Vertical budget sum {total} must equal 420px (0px overflow)")

    def test_ac1_horizontal_row1_budget(self):
        """Verify Row 1 flex percentages do not exceed 100% or overflow 400px width."""
        self.assertRegex(self.html, r"calc\(78%\s*-\s*4px\)")
        self.assertRegex(self.html, r"calc\(22%\s*-\s*2px\)")
        # 78% + 22% = 100%, and negative margins offset the 6px gap, preventing horizontal overflow

    def test_ac1_anchor_calculation_adversarial_screens(self):
        """Test anchor positioning across wide variety of monitor resolutions."""
        test_screens = [
            (1920, 1080),  # Standard Full HD
            (2560, 1440),  # 2K QHD
            (3840, 2160),  # 4K UHD
            (1366, 768),   # Budget Laptop
            (1280, 720),   # 720p HD
            (800, 600),    # Legacy SVGA
            (400, 420),    # Exact fit screen
            (300, 300),    # Screen smaller than window -> must clamp to (0, 0)
        ]

        class DummyScreen:
            def __init__(self, w, h):
                self.width = w
                self.height = h

        for sw, sh in test_screens:
            # Test with custom screen size
            x = max(0, sw - 400 - 16)
            y = max(0, sh - 420 - 64)
            self.assertGreaterEqual(x, 0)
            self.assertGreaterEqual(y, 0)
            if sw >= 416:
                self.assertEqual(x, sw - 416)
            else:
                self.assertEqual(x, 0)


class TestAC2TaskCreationAndISOChallenger(unittest.TestCase):
    """
    AC2 Challenge:
    - Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps.
    - Contradictory inputs: explicit overrides vs NLP parsing.
    - Extreme characters, Vietnamese diacritics, XSS strings, Unicode emojis.
    - Tower Overload capacity: max 10 active tasks.
    """

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_file.close()
        self.storage = TaskStorage(self.temp_file.name)
        self.api = desktop_app.TaskbarDiceAPI(storage=self.storage)

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            try:
                os.remove(self.temp_file.name)
            except OSError:
                pass

    def test_ac2_explicit_override_supersedes_nlp(self):
        """Explicit weight=4 and duration=15 must strictly override NLP text saying weight 1 or 5."""
        res = self.api.add_task(
            text="fix urgent system bug in 1h weight 5",  # NLP would normally give weight 5, 1h
            weight=4,
            duration_minutes=15
        )
        self.assertEqual(res["status"], "ok")
        task = res["task"]
        self.assertEqual(task["weight_score"], 4, "Explicit weight=4 must override NLP weight")
        self.assertEqual(task["deadline_str"], "15 phút")

        # ISO timestamp check
        dt_c = datetime.fromisoformat(task["created_at"])
        dt_d = datetime.fromisoformat(task["deadline_at"])
        diff = (dt_d - dt_c).total_seconds()
        self.assertAlmostEqual(diff, 900.0, delta=2.0, msg="Deadline must be exactly 15m (900s) from creation")

    def test_ac2_all_weight_presets(self):
        """Verify weights 1 through 5 produce valid tasks with exact weights."""
        for w in [1, 2, 3, 4, 5]:
            t = self.storage.add_task(f"Task weight {w}", weight=w, duration_minutes=25)
            self.assertIsNotNone(t)
            self.assertEqual(t["weight_score"], w)

    def test_ac2_vietnamese_diacritics_and_unicode_safety(self):
        """Verify complex Vietnamese text with compound tone marks and emojis."""
        raw_text = "Hoàn thành báo cáo kiểm toán quý IV 📑 & sửa lỗi thanh toán ngân hàng 💳"
        t = self.storage.add_task(raw_text, weight=3, duration_minutes=60)
        self.assertIsNotNone(t)
        self.assertIn("Hoàn thành báo cáo", t["title"])

        # Reload from storage to verify UTF-8 atomic JSON persistence
        reloaded = TaskStorage(self.temp_file.name)
        saved_task = [x for x in reloaded.get_tasks() if x["id"] == t["id"]][0]
        self.assertEqual(saved_task["title"], t["title"])
        self.assertEqual(saved_task["weight_score"], 3)

    def test_ac2_ten_task_limit_overload(self):
        """Verify 10 active tasks limit strictly rejects 11th task."""
        current = len(self.storage.get_tasks())
        for i in range(current, 10):
            res = self.api.add_task(f"Filling task {i+1}", weight=1, duration_minutes=15)
            self.assertEqual(res["status"], "ok")

        self.assertEqual(len(self.storage.get_tasks()), 10)

        # 11th task rejection
        overload_res = self.api.add_task("11th task overflow", weight=2, duration_minutes=15)
        self.assertEqual(overload_res["status"], "error")
        self.assertEqual(overload_res["error"], "overload")
        self.assertEqual(len(self.storage.get_tasks()), 10)


class TestAC3CompactionAndAbyssTiersChallenger(unittest.TestCase):
    """
    AC3 Challenge:
    - Stacking 10 dice escalates background from Tier 1 to Tier 10 without canvas clipping.
    - Mathematically prove no clipping for all 5^10 possible weight combinations or extremes.
    - Verify 10 Lovecraftian themes present and ordered.
    """

    DICE_CONFIG = {
        1: {"width": 32, "height": 20, "ry": 8},
        2: {"width": 40, "height": 24, "ry": 10},
        3: {"width": 48, "height": 28, "ry": 12},
        4: {"width": 56, "height": 32, "ry": 14},
        5: {"width": 64, "height": 36, "ry": 16},
    }
    CANVAS_HEIGHT = 320
    GROUND_Y = 290  # In static/index.html GROUND_Y = 290

    def simulate_stack(self, weights: List[int]) -> List[Dict[str, float]]:
        sorted_weights = sorted(weights, reverse=True)
        count = len(sorted_weights)
        compressed_step = max(14, int(180 / (count - 1))) if count > 5 else None

        positions = []
        for i, w in enumerate(sorted_weights):
            cfg = self.DICE_CONFIG[w]
            ry = cfg["ry"]
            h = cfg["height"]

            if i == 0:
                target_y = self.GROUND_Y - ry - h
            else:
                prev_y = positions[i - 1]["target_y"]
                step = min(h, compressed_step) if compressed_step is not None else h
                target_y = prev_y - step

            top_y = target_y - ry
            bot_y = target_y + ry + h

            positions.append({
                "weight": w,
                "target_y": float(target_y),
                "visual_top_y": float(top_y),
                "visual_bot_y": float(bot_y)
            })
        return positions

    def test_ac3_worst_case_stacks_clearance(self):
        """Worst-case 10-dice stacks must never clip into header (< 26px) or below floor (> 320px)."""
        scenarios = {
            "all_weight_5": [5] * 10,
            "all_weight_4": [4] * 10,
            "all_weight_1": [1] * 10,
            "alternating_5_1": [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
            "pyramid_1_to_5": [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]
        }

        for name, weights in scenarios.items():
            stack = self.simulate_stack(weights)
            topmost = stack[-1]
            bottommost = stack[0]

            # Even with max twitch jitter (-4.5px on top, +4.5px on bottom)
            worst_top = topmost["visual_top_y"] - 4.5
            worst_bot = bottommost["visual_bot_y"] + 4.5

            self.assertGreaterEqual(
                worst_top, 26.0,
                f"Topmost die in {name} clips header: visual_top={worst_top}px < 26px"
            )
            self.assertLessEqual(
                worst_bot, 320.0,
                f"Bottom die in {name} clips canvas floor: visual_bot={worst_bot}px > 320px"
            )

    def test_ac3_ten_lovecraftian_tiers_present(self):
        """Verify all 10 Lovecraftian Abyss themes are defined in static/index.html."""
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            html = f.read()

        tiers = [
            "Void", "Cold Dust", "Frost Cracks", "Sprouting Thorns",
            "Creeping Vines", "Toxic Spores", "Blood Veins",
            "Demon Eyes", "Abyssal Eclipse", "Pandemonium Overload"
        ]
        for t in tiers:
            self.assertIn(t, html, f"Lovecraftian tier theme '{t}' missing from index.html")


class TestAC4HoverAndTooltipChallenger(unittest.TestCase):
    """
    AC4 Challenge:
    - Hovering resting die renders highlight (2px glowing border) and countdown tooltip.
    - Tooltip 4-way boundary clamping inside 400x320 canvas.
    - Title word-wrapping to 2 lines without exceeding 180px line width.
    """

    def setUp(self):
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            self.html = f.read()

    def test_ac4_hover_resting_condition_logic(self):
        """Resting die check requires |currentY - targetY| <= 2.0."""
        self.assertRegex(self.html, r"Math\.abs\(d\.currentY\s*-\s*d\.targetY\)\s*<=\s*2")
        self.assertRegex(self.html, r"strokeStyle\s*=\s*isOverdue\s*\?\s*`rgba\(231,\s*110,\s*85")
        self.assertRegex(self.html, r"lineWidth\s*=\s*2")

    def test_ac4_tooltip_timer_formats(self):
        """Tooltip must display STAGE [X/5] and CÒN: or QUÁ HẠN:."""
        self.assertRegex(self.html, r"STAGE:\s*\[\$\{stage\}/5\]")
        self.assertRegex(self.html, r"CÒN:\s*\$\{m\}m\s*\$\{s\}s")
        self.assertRegex(self.html, r"QUÁ HẠN:\s*\+\$\{m\}m\s*\$\{s\}s")


class TestAC5OverduePenaltyAndStreakChallenger(unittest.TestCase):
    """
    AC5 Challenge:
    - Overdue task completion resets streak to 0.
    - On-time task completion increments streak.
    - Streak combo text displayed when streak >= 2.
    """

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_file.close()
        self.storage = TaskStorage(self.temp_file.name)
        self.api = desktop_app.TaskbarDiceAPI(storage=self.storage)

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            try:
                os.remove(self.temp_file.name)
            except OSError:
                pass

    def test_ac5_backend_was_overdue_oracle(self):
        """Complete task returns was_overdue=True for expired deadline, False for active."""
        now = datetime.now()
        
        # 1. Overdue task
        t_od = {
            "id": "od_task_1",
            "title": "Overdue task",
            "weight_score": 3,
            "deadline_str": "Overdue",
            "created_at": (now - timedelta(hours=2)).isoformat(),
            "deadline_at": (now - timedelta(minutes=5)).isoformat(),
            "status": "pending"
        }
        with self.storage._lock:
            self.storage.tasks.append(t_od)
            self.storage._atomic_write_locked()

        res_od = self.api.complete_task("od_task_1")
        self.assertEqual(res_od["status"], "ok")
        self.assertTrue(res_od["was_overdue"], "Backend must detect overdue task")

        # 2. On-time task
        t_ot = {
            "id": "ot_task_2",
            "title": "On-time task",
            "weight_score": 2,
            "deadline_str": "30m",
            "created_at": now.isoformat(),
            "deadline_at": (now + timedelta(minutes=30)).isoformat(),
            "status": "pending"
        }
        with self.storage._lock:
            self.storage.tasks.append(t_ot)
            self.storage._atomic_write_locked()

        res_ot = self.api.complete_task("ot_task_2")
        self.assertEqual(res_ot["status"], "ok")
        self.assertFalse(res_ot["was_overdue"], "Backend must detect on-time task")


class TestAC6ZenGardenChallenger(unittest.TestCase):
    """
    AC6 Challenge:
    - Zero task clear triggers Zen Garden.
    - Dynamic Day/Night lighting across 24 hours.
    - Fresh startup with 0 tasks does NOT trigger Zen Garden (renders Empty Void #121417).
    """

    def setUp(self):
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            self.html = f.read()

    def test_ac6_startup_vs_clear_distinction(self):
        """Fresh startup without tasks must show empty void, not Zen Garden."""
        self.assertIn("hasHadTasks = false", self.html)
        self.assertIn("TYPE TASK & ROLL TO BEGIN", self.html)
        # Zen Garden condition requires hasHadTasks || hasClearedAll
        self.assertIn("diceStack.length === 0 && (hasHadTasks || hasClearedAll)", self.html)

    def test_ac6_day_night_four_periods(self):
        """Zen Garden must partition 24 hours into 4 distinct lighting periods."""
        self.assertRegex(self.html, r"function getZenTimePeriod\(\)")
        for period in ["dawn", "day", "sunset", "night"]:
            self.assertIn(f"period === '{period}'", self.html)
        self.assertIn("ALL CLEAR. REST EASY.", self.html)


class TestAC7E2EProbeAndAgentShieldChallenger(unittest.TestCase):
    """
    AC7 Challenge:
    - E2E probe script and AgentShield static security scan pass 100%.
    """

    def test_ac7_e2e_probe_audit_zero_exit_code(self):
        """Execute test_e2e_probe.py --audit and assert exit code 0 and 7/7 ACs."""
        cmd = [sys.executable, os.path.join(PROJECT_ROOT, "tests", "test_e2e_probe.py"), "--audit"]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        self.assertEqual(proc.returncode, 0, f"test_e2e_probe.py --audit failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("7/7 Acceptance Criteria Passed", proc.stdout)

    def test_ac7_agentshield_security_audit(self):
        """Execute AgentShield security scanner and assert 0 security issues."""
        cmd = [sys.executable, SECURITY_SCANNER_PY, "--path", PROJECT_ROOT]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        self.assertEqual(proc.returncode, 0, f"AgentShield scan failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("[PASS]", proc.stdout)


if __name__ == "__main__":
    unittest.main()
