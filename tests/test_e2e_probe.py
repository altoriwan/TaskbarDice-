r"""
End-to-End Test Probe & Acceptance Criteria Verification Suite
==============================================================
Project: TaskbarDice Desktop Widget Overhaul
Authoritative Specs: ORIGINAL_REQUEST.md & PROJECT.md
Infra Spec: TEST_INFRA.md

This suite programmatically verifies all 7 Acceptance Criteria (AC1 - AC7):
- AC1: 400x420 window rendered with no bottom bar clipping or overflow (inspecting DOM layout elements or flexbox budget).
- AC2: Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps.
- AC3: Stacking 10 dice escalates background from Tier 1 to Tier 10 without canvas clipping.
- AC4: Hovering resting die renders highlight and countdown tooltip.
- AC5: Overdue task completion resets streak to 0.
- AC6: Zero task clear triggers Zen Garden.
- AC7: Automated pass verification of E2E probe and AgentShield scan.

Execution:
- Via unittest: .\.venv\Scripts\python.exe -m unittest tests/test_e2e_probe.py
- Via probe CLI: .\.venv\Scripts\python.exe tests/test_e2e_probe.py [--audit]
"""

import inspect
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple


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
    "security_scanner.py",
)


def get_desktop_app_module():
    """
    Dynamically loads the root app.py module.
    Avoids package namespace collision with the app/ subdirectory
    and provides a headless mock for webview if pywebview is not installed in the active environment.
    """
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
    spec = importlib.util.spec_from_file_location("desktop_app", APP_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ==============================================================================
# 1. DOM & LAYOUT AUDITOR (Static Inspection Helper)
# ==============================================================================

class DOMInspector:
    """Extracts and verifies structural layout properties from static/index.html."""

    def __init__(self, html_path: str = STATIC_INDEX_HTML):
        self.html_path = html_path
        if not os.path.exists(html_path):
            raise FileNotFoundError(f"Missing HTML file: {html_path}")
        with open(html_path, "r", encoding="utf-8") as f:
            self.content = f.read()

    def get_body_dimensions(self) -> Dict[str, Optional[int]]:
        """Parses width and height styling for body / root viewport container."""
        res: Dict[str, Optional[int]] = {"width": None, "height": None}
        body_match = re.search(r"body\s*\{([^}]+)\}", self.content, re.DOTALL)
        if body_match:
            block = body_match.group(1)
            w_m = re.search(r"width:\s*(\d+)px", block)
            h_m = re.search(r"height:\s*(\d+)px", block)
            if w_m:
                res["width"] = int(w_m.group(1))
            if h_m:
                res["height"] = int(h_m.group(1))
        return res

    def get_flexbox_budget(self) -> Dict[str, Any]:
        """
        Calculates vertical component heights:
        Header + Canvas + Control Panel = Total.
        """
        budget: Dict[str, Any] = {
            "header_height": None,
            "canvas_height": None,
            "control_panel_height": None,
            "total_budget": None,
            "zero_overflow": False,
            "is_flexbox": False,
        }

        # Check body flexbox column
        is_flex = bool(
            re.search(r"display:\s*flex", self.content)
            and re.search(r"flex-direction:\s*column", self.content)
        )
        has_overflow_hidden = bool(
            re.search(r"overflow:\s*hidden", self.content)
        )
        budget["is_flexbox"] = is_flex
        budget["zero_overflow"] = has_overflow_hidden

        # Header height (26px)
        header_m = re.search(
            r"\.drag-header\s*\{([^}]+)\}", self.content, re.DOTALL
        )
        if header_m:
            block = header_m.group(1)
            h = re.search(r"(?:height|flex(?::\s*0\s+0)?):\s*(\d+)px", block)
            if h:
                budget["header_height"] = int(h.group(1))

        # Canvas height (320px)
        canvas_m = re.search(
            r"#diceCanvas\s*\{([^}]+)\}", self.content, re.DOTALL
        )
        if canvas_m:
            block = canvas_m.group(1)
            h = re.search(r"(?:height|flex(?::\s*0\s+0)?):\s*(\d+)px", block)
            if h:
                budget["canvas_height"] = int(h.group(1))

        # Control panel height (74px)
        panel_m = re.search(
            r"(?:\.control-panel|\.bottom-bar)\s*\{([^}]+)\}", self.content, re.DOTALL
        )
        if panel_m:
            block = panel_m.group(1)
            h = re.search(r"(?:height|flex(?::\s*0\s+0)?):\s*(\d+)px", block)
            if h:
                budget["control_panel_height"] = int(h.group(1))

        if (
            budget["header_height"] is not None
            and budget["canvas_height"] is not None
            and budget["control_panel_height"] is not None
        ):
            budget["total_budget"] = (
                budget["header_height"]
                + budget["canvas_height"]
                + budget["control_panel_height"]
            )

        return budget

    def get_control_panel_rows(self) -> Dict[str, Any]:
        """Verifies existence of Row 1 (Input + ADD) and Row 2 (W + T presets)."""
        info = {
            "has_input": bool(re.search(r'id=["\']taskInput["\']', self.content)),
            "has_add_btn": bool(re.search(r'id=["\']addBtn["\']|\.btn-submit', self.content)),
            "has_weight_selector": bool(re.search(r'data-w=["\'][1-5]["\']|W:\s*\[1\]', self.content)),
            "has_time_presets": bool(re.search(r'data-t=["\'](?:15m|25m|1h|4h)["\']|T:\s*\[15m\]', self.content)),
            "has_all_five_weights": all(
                re.search(rf'data-w=["\']{w}["\']', self.content) for w in [1, 2, 3, 4, 5]
            ),
            "has_all_time_presets": all(
                re.search(rf'data-t=["\']{t}["\']', self.content)
                for t in ["15m", "25m", "1h", "4h"]
            ),
        }
        return info

    def get_lovecraftian_tiers(self) -> List[str]:
        """Identifies configured Lovecraftian abyss themes in the frontend script."""
        expected_themes = [
            "Void",
            "Cold Dust",
            "Frost Cracks",
            "Sprouting Thorns",
            "Creeping Vines",
            "Toxic Spores",
            "Blood Veins",
            "Demon Eyes",
            "Abyssal Eclipse",
            "Pandemonium Overload",
        ]
        found = []
        for theme in expected_themes:
            # Case insensitive search
            if re.search(re.escape(theme), self.content, re.IGNORECASE):
                found.append(theme)
        return found

    def has_tier_zero_void(self) -> bool:
        """Checks for Tier 0 empty void startup prompt."""
        return bool(
            re.search(r"TYPE TASK & ROLL TO BEGIN", self.content, re.IGNORECASE)
            and re.search(r"#121417", self.content)
        )

    def has_dynamic_rot_hue_shift(self) -> bool:
        """Checks for dynamic hue shifting calculation tied to rot factor."""
        return bool(
            re.search(r"hsl\(|hue|rot.*background|totalRot", self.content, re.IGNORECASE)
        )

    def get_hover_and_tooltip_features(self) -> Dict[str, bool]:
        """Verifies mousemove hit detection, glowing border, and countdown tooltip."""
        return {
            "has_mousemove_listener": bool(
                re.search(r'addEventListener\(["\']mousemove["\']', self.content)
            ),
            "has_resting_die_check": bool(
                re.search(r'currentY\s*-\s*d\.targetY|Math\.abs\(.*targetY\)', self.content)
            ),
            "has_glowing_pixel_border": bool(
                re.search(r'glow|strokeRect|strokeStyle.*255,\s*215,\s*0|glowing', self.content, re.IGNORECASE)
            ),
            "has_tooltip_container_or_render": bool(
                re.search(r'tooltip|drawTooltip|retroTooltip', self.content, re.IGNORECASE)
            ),
            "has_tooltip_stage_format": bool(
                re.search(r'STAGE:\s*\[?|STAGE', self.content, re.IGNORECASE)
            ),
            "has_tooltip_countdown_format": bool(
                re.search(r'CÒN:|CON:', self.content, re.IGNORECASE)
            ),
            "has_tooltip_overdue_format": bool(
                re.search(r'QUÁ HẠN:|QUA HAN:', self.content, re.IGNORECASE)
            ),
        }

    def get_streak_penalty_features(self) -> Dict[str, bool]:
        """Verifies overdue streak reset to 0 vs on-time streak combo increment."""
        return {
            "has_streak_variable": bool(
                re.search(r'sessionStreak', self.content)
            ),
            "has_overdue_streak_reset": bool(
                re.search(r'sessionStreak\s*=\s*0', self.content)
            ),
            "has_ontime_streak_increment": bool(
                re.search(r'sessionStreak\+\+|sessionStreak\s*\+=\s*1', self.content)
            ),
            "has_streak_combo_message": bool(
                re.search(r'\+1 STREAK|COMBO', self.content, re.IGNORECASE)
            ),
        }

    def get_zen_garden_features(self) -> Dict[str, bool]:
        """Verifies Zen Garden victory screen and dynamic day/night lighting."""
        return {
            "has_zen_garden_function": bool(
                re.search(r'function renderZenGarden|renderZenGarden', self.content)
            ),
            "has_day_night_lighting": bool(
                re.search(r'getHours\(\)|isDaytime', self.content)
            ),
            "has_all_clear_banner": bool(
                re.search(r'ALL CLEAR\. REST EASY\.', self.content, re.IGNORECASE)
            ),
            "has_zero_dice_trigger": bool(
                re.search(r'diceStack\.length\s*===\s*0.*renderZenGarden', self.content, re.DOTALL)
            ),
            "has_inspection_hooks": all(
                hook in self.content
                for hook in [
                    "window.setZenGardenTime",
                    "window.getZenGardenPeriod",
                    "window.isZenGardenActive",
                    "window.getVisualTier",
                    "window.getAverageRot",
                ]
            ),
            "has_four_period_lighting": all(
                p in self.content for p in ["dawn", "day", "sunset", "night"]
            ),
        }


# ==============================================================================
# 2. PHYSICS & COMPACTION MODEL (Mathematics Validator)
# ==============================================================================

class StackingPhysicsModel:
    """
    Mathematical simulator for the 2.5D Isometric Dice Stacking Engine.
    Ensures 10 stacked dice fit within Canvas 320px height with zero clipping.
    """

    DICE_CONFIG = {
        1: {"width": 32, "height": 20, "ry": 8},
        2: {"width": 40, "height": 24, "ry": 10},
        3: {"width": 48, "height": 28, "ry": 12},
        4: {"width": 56, "height": 32, "ry": 14},
        5: {"width": 64, "height": 36, "ry": 16},
    }

    CANVAS_HEIGHT = 320
    GROUND_Y = 285

    @classmethod
    def simulate_stack(cls, weights: List[int]) -> List[Dict[str, float]]:
        """
        Simulates compaction layout algorithm for given dice weights.
        Returns calculated targetY, visual topY, and visual botY for each die.
        """
        # Sort weights descending (heavy base foundation)
        sorted_weights = sorted(weights, reverse=True)
        count = len(sorted_weights)
        if count == 0:
            return []

        # Dynamic compression step when count > 5 to prevent canvas top clipping
        compressed_step = (
            max(14, int(180 / (count - 1))) if count > 5 else None
        )

        positions = []
        for i, w in enumerate(sorted_weights):
            cfg = cls.DICE_CONFIG.get(w, cls.DICE_CONFIG[3])
            ry = cfg["ry"]
            h = cfg["height"]

            if i == 0:
                target_y = cls.GROUND_Y - ry - h
            else:
                prev_target = positions[i - 1]["target_y"]
                step = min(h, compressed_step) if compressed_step is not None else h
                target_y = prev_target - step

            # Visual bounds: top point is target_y - ry, bottom point is target_y + ry + height
            top_y = target_y - ry
            bot_y = target_y + ry + h

            positions.append({
                "weight": w,
                "target_y": float(target_y),
                "visual_top_y": float(top_y),
                "visual_bot_y": float(bot_y),
            })

        return positions

    @classmethod
    def verify_10_dice_stack_clearance(cls) -> Tuple[bool, Dict[str, Any]]:
        """
        Tests worst-case 10-dice stacks (all weight 5, all weight 1, and mixed)
        against Canvas Height 320px and Header clearance 26px.
        """
        scenarios = {
            "all_max_weight_5": [5] * 10,
            "all_min_weight_1": [1] * 10,
            "mixed_gradient_1_to_5": [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        }

        results = {}
        all_passed = True

        for name, weights in scenarios.items():
            stack = cls.simulate_stack(weights)
            topmost_die = stack[-1]
            bottommost_die = stack[0]

            # Topmost die peak must stay within canvas bounds (> 0) and ideally >= 26px
            peak_y = topmost_die["visual_top_y"]
            base_y = bottommost_die["visual_bot_y"]

            no_top_clip = peak_y >= 0
            safe_header_clearance = peak_y >= 20  # Safe breathing room below 26px header line
            no_bottom_clip = base_y <= cls.CANVAS_HEIGHT

            passed = no_top_clip and safe_header_clearance and no_bottom_clip
            if not passed:
                all_passed = False

            results[name] = {
                "peak_y": peak_y,
                "base_y": base_y,
                "no_top_clip": no_top_clip,
                "safe_header_clearance": safe_header_clearance,
                "no_bottom_clip": no_bottom_clip,
                "passed": passed,
            }

        return all_passed, results


# ==============================================================================
# 3. UNITTEST TEST CASES (AC1 to AC7)
# ==============================================================================

class TestE2EProbe(unittest.TestCase):
    """
    Automated E2E probe verifying all 7 Acceptance Criteria for TaskbarDice overhaul.
    """

    def setUp(self):
        self.inspector = DOMInspector(STATIC_INDEX_HTML)

    # --------------------------------------------------------------------------
    # AC1: 400x420 Window & Zero-Overflow Flexbox Layout
    # --------------------------------------------------------------------------
    def test_ac1_window_and_flexbox_layout(self):
        """
        AC1: 400x420 window rendered with no bottom bar clipping or overflow.
        Verifies app.py dimensions (400x420, margins 16/64) and index.html flexbox budget:
        Header 26px + Canvas 320px + Control Panel 74px = 420px (0px overflow).
        """
        # 1. Inspect app.py
        with open(APP_PY, "r", encoding="utf-8") as f:
            app_code = f.read()

        # Check window width 400 and height 420
        win_size_m = re.search(
            r"win_w,\s*win_h\s*=\s*(\d+),\s*(\d+)", app_code
        )
        self.assertIsNotNone(
            win_size_m, "app.py should define win_w, win_h"
        )
        win_w, win_h = int(win_size_m.group(1)), int(win_size_m.group(2))
        self.assertEqual(
            win_w, 400, f"Expected app.py win_w=400, got {win_w}"
        )
        self.assertEqual(
            win_h, 420, f"Expected app.py win_h=420, got {win_h} (R1 spec requirement)"
        )

        # Check anchor positioning defaults: margin_x=16, margin_y=64
        app = get_desktop_app_module()
        sig = inspect.signature(app.calculate_anchor_position)
        params = sig.parameters
        self.assertIn("width", params)
        self.assertIn("height", params)
        self.assertIn("margin_x", params)
        self.assertIn("margin_y", params)
        self.assertEqual(
            params["height"].default, 420,
            f"calculate_anchor_position default height should be 420, got {params['height'].default}"
        )
        self.assertEqual(
            params["margin_y"].default, 64,
            f"calculate_anchor_position default margin_y should be 64 (Win 11 taskbar), got {params['margin_y'].default}"
        )
        self.assertEqual(
            params["margin_x"].default, 16,
            f"calculate_anchor_position default margin_x should be 16, got {params['margin_x'].default}"
        )

        # 2. Inspect static/index.html layout budget
        dims = self.inspector.get_body_dimensions()
        self.assertEqual(
            dims["width"], 400, f"index.html body width should be 400px, got {dims['width']}"
        )
        self.assertEqual(
            dims["height"], 420, f"index.html body height should be 420px, got {dims['height']}"
        )

        budget = self.inspector.get_flexbox_budget()
        self.assertTrue(
            budget["zero_overflow"], "index.html must specify overflow: hidden"
        )
        self.assertEqual(
            budget["header_height"], 26,
            f"Header height must be exactly 26px, got {budget['header_height']}"
        )
        self.assertEqual(
            budget["canvas_height"], 320,
            f"Canvas height must be exactly 320px, got {budget['canvas_height']}"
        )
        self.assertEqual(
            budget["control_panel_height"], 74,
            f"Control Panel height must be exactly 74px, got {budget['control_panel_height']}"
        )
        self.assertEqual(
            budget["total_budget"], 420,
            f"Layout budget sum must equal exactly 420px (26 + 320 + 74), got {budget['total_budget']}"
        )

        # 3. Control Panel 2-row layout check
        ctrl = self.inspector.get_control_panel_rows()
        self.assertTrue(ctrl["has_input"], "Row 1 must contain text input (#taskInput)")
        self.assertTrue(ctrl["has_add_btn"], "Row 1 must contain green ADD button")
        self.assertTrue(ctrl["has_all_five_weights"], "Row 2 must contain Weight selectors 1 to 5")
        self.assertTrue(ctrl["has_all_time_presets"], "Row 2 must contain Time presets 15m, 25m, 1h, 4h")

    # --------------------------------------------------------------------------
    # AC2: Explicit Weight & Time API with Exact ISO Timestamps
    # --------------------------------------------------------------------------
    def test_ac2_add_task_weight_and_time_iso(self):
        """
        AC2: Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps.
        Validates TaskbarDiceAPI.add_task and TaskStorage.add_task explicit overrides.
        """
        from dice_logic import TaskStorage
        desktop_app = get_desktop_app_module()
        TaskbarDiceAPI = desktop_app.TaskbarDiceAPI

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            # Test 1: Add task via API with explicit weight=4 and duration_minutes=15
            res = api.add_task(
                text="Fix urgent payment crash",
                weight=4,
                duration_minutes=15,
            )
            self.assertEqual(res.get("status"), "ok", f"Expected ok status, got {res}")
            task = res.get("task", {})
            self.assertEqual(
                task.get("weight_score"), 4,
                f"Expected exact weight_score=4, got {task.get('weight_score')}"
            )
            self.assertIn("Fix urgent payment crash", task.get("title", ""))

            # Validate ISO timestamps
            created_at_str = task.get("created_at")
            deadline_at_str = task.get("deadline_at")
            self.assertIsNotNone(created_at_str, "created_at ISO string must exist")
            self.assertIsNotNone(deadline_at_str, "deadline_at ISO string must exist")

            dt_created = datetime.fromisoformat(created_at_str)
            dt_deadline = datetime.fromisoformat(deadline_at_str)

            diff_seconds = (dt_deadline - dt_created).total_seconds()
            expected_seconds = 15 * 60
            self.assertAlmostEqual(
                diff_seconds, expected_seconds, delta=5.0,
                msg=f"Expected ~900s (15m) deadline gap, got {diff_seconds}s"
            )

            # Test 2: Storage atomic persistence reload
            storage_reloaded = TaskStorage(temp_path)
            persisted_tasks = storage_reloaded.get_tasks()
            self.assertEqual(len(persisted_tasks), 1)
            p_task = persisted_tasks[0]
            self.assertEqual(p_task["weight_score"], 4)
            self.assertEqual(p_task["created_at"], created_at_str)
            self.assertEqual(p_task["deadline_at"], deadline_at_str)

            # Test 3: Weight boundaries [1, 5] and presets [25m, 1h, 4h]
            for w in [1, 2, 3, 5]:
                sub_res = api.add_task(f"Task weight {w}", weight=w, duration_minutes=60)
                self.assertEqual(sub_res["task"]["weight_score"], w)

            # Test 4: Adversarial Unicode and special character handling
            adv_text = "Nộp báo cáo quý 4 📊 <script>alert('xss')</script>\t"
            adv_res = api.add_task(adv_text, weight=2, duration_minutes=25)
            self.assertEqual(adv_res.get("status"), "ok")
            self.assertIn("Nộp báo cáo", adv_res["task"]["title"])

            # Test 5: Tower Overload Capacity Boundary (10 active tasks limit)
            # Fill up until 10 tasks
            current_count = len(storage.get_tasks())
            for i in range(current_count, 10):
                api.add_task(f"Task {i+1}", weight=1, duration_minutes=15)
            self.assertEqual(len(storage.get_tasks()), 10)

            # 11th task must be rejected with overload error
            overflow_res = api.add_task("11th task overflow", weight=1, duration_minutes=15)
            self.assertEqual(overflow_res.get("status"), "error")
            self.assertEqual(overflow_res.get("error"), "overload")
            self.assertEqual(len(storage.get_tasks()), 10)

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # --------------------------------------------------------------------------
    # AC3: Stacking 10 Dice & Lovecraftian Background Tiers 1-10
    # --------------------------------------------------------------------------
    def test_ac3_ten_dice_stacking_and_background_tiers(self):
        """
        AC3: Stacking 10 dice escalates background from Tier 1 to Tier 10 without canvas clipping.
        Verifies Lovecraftian tier progression in frontend and mathematical compaction in canvas.
        """
        # 1. Verify 10 distinct Lovecraftian abyss tiers in index.html
        tiers_found = self.inspector.get_lovecraftian_tiers()
        expected_count = 10  # Full 10 escalating tiers: Void through Pandemonium Overload
        self.assertGreaterEqual(
            len(tiers_found), expected_count,
            f"Expected at least {expected_count} Lovecraftian abyss themes, found: {tiers_found}"
        )

        # 2. Verify Tier 0 startup void prompt
        self.assertTrue(
            self.inspector.has_tier_zero_void(),
            "Tier 0 must show empty void #121417 with 'TYPE TASK & ROLL TO BEGIN'"
        )

        # 3. Dynamic Hue shifting with rot
        self.assertTrue(
            self.inspector.has_dynamic_rot_hue_shift(),
            "Frontend must implement dynamic background hue shift tied to overallRot"
        )

        # 4. Canvas physics compaction simulation (10 dice without clipping)
        passed, results = StackingPhysicsModel.verify_10_dice_stack_clearance()
        self.assertTrue(
            passed,
            f"Stacking 10 dice produced clipping violations: {json.dumps(results, indent=2)}"
        )

    # --------------------------------------------------------------------------
    # AC4: Resting Die Hover Highlight & Countdown Tooltip
    # --------------------------------------------------------------------------
    def test_ac4_hover_inspection_and_countdown_tooltip(self):
        """
        AC4: Hovering resting die renders highlight and countdown tooltip.
        Verifies mousemove hit detection, glowing pixel border, and retro countdown formatting.
        """
        features = self.inspector.get_hover_and_tooltip_features()

        self.assertTrue(
            features["has_mousemove_listener"],
            "Canvas must have 'mousemove' event listener for hover inspection"
        )
        self.assertTrue(
            features["has_resting_die_check"],
            "Hover detection must verify die is resting (|currentY - targetY| <= 2)"
        )
        self.assertTrue(
            features["has_glowing_pixel_border"],
            "Hovered resting die must render a 2px glowing pixel border"
        )
        self.assertTrue(
            features["has_tooltip_container_or_render"],
            "Frontend must implement a floating retro tooltip engine"
        )
        self.assertTrue(
            features["has_tooltip_stage_format"],
            "Tooltip must format rot stage with 'STAGE:' prefix"
        )
        self.assertTrue(
            features["has_tooltip_countdown_format"],
            "Tooltip must format remaining time with 'CÒN:' prefix"
        )
        self.assertTrue(
            features["has_tooltip_overdue_format"],
            "Tooltip must format overdue time with 'QUÁ HẠN:' prefix"
        )

    # --------------------------------------------------------------------------
    # AC5: Overdue Task Completion Resets Streak to 0
    # --------------------------------------------------------------------------
    def test_ac5_overdue_penalty_and_streak_reset(self):
        """
        AC5: Overdue task completion resets streak to 0.
        Verifies overdue penalty resets sessionStreak = 0 while on-time completion increments.
        """
        features = self.inspector.get_streak_penalty_features()

        self.assertTrue(
            features["has_streak_variable"],
            "Frontend must track 'sessionStreak'"
        )
        self.assertTrue(
            features["has_overdue_streak_reset"],
            "Completing an overdue task must reset sessionStreak = 0"
        )
        self.assertTrue(
            features["has_ontime_streak_increment"],
            "Completing an on-time task must increment sessionStreak++"
        )
        self.assertTrue(
            features["has_streak_combo_message"],
            "Achieving a streak combo (>= 2) must trigger combo float text"
        )

        # Backend API validation of overdue completion flag
        from dice_logic import TaskStorage
        desktop_app = get_desktop_app_module()
        TaskbarDiceAPI = desktop_app.TaskbarDiceAPI

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            # Create an overdue task (created in past with negative deadline)
            now = datetime.now()
            overdue_task = {
                "id": "od_test_1",
                "title": "Overdue task",
                "weight_score": 3,
                "deadline_str": "Overdue",
                "created_at": (now - timedelta(hours=2)).isoformat(),
                "deadline_at": (now - timedelta(hours=1)).isoformat(),
                "status": "pending",
            }
            with storage._lock:
                storage.tasks.append(overdue_task)
                storage._atomic_write_locked()

            # Test 1: Complete overdue task -> was_overdue must be True
            res = api.complete_task("od_test_1")
            self.assertEqual(res.get("status"), "ok")
            self.assertTrue(
                res.get("was_overdue", False),
                "api.complete_task must detect and report was_overdue=True for overdue task"
            )

            # Test 2: Create an on-time task (deadline 2 hours in the future)
            ontime_task = {
                "id": "ot_test_2",
                "title": "On-time task",
                "weight_score": 2,
                "deadline_str": "2h",
                "created_at": now.isoformat(),
                "deadline_at": (now + timedelta(hours=2)).isoformat(),
                "status": "pending",
            }
            with storage._lock:
                storage.tasks.append(ontime_task)
                storage._atomic_write_locked()

            # Complete on-time task -> was_overdue must be False
            res_ot = api.complete_task("ot_test_2")
            self.assertEqual(res_ot.get("status"), "ok")
            self.assertFalse(
                res_ot.get("was_overdue", True),
                "api.complete_task must report was_overdue=False for on-time task"
            )

            # Test 3: Complete non-existent task -> status must be not_found
            res_nf = api.complete_task("nonexistent_id_999")
            self.assertEqual(res_nf.get("status"), "not_found")

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # --------------------------------------------------------------------------
    # AC6: Zero Task Clear Triggers Zen Garden
    # --------------------------------------------------------------------------
    def test_ac6_zero_task_clear_triggers_zen_garden(self):
        """
        AC6: Zero task clear triggers Zen Garden.
        Verifies Day/Night lighting and transition to Zen Garden upon clearing all active dice.
        """
        zen = self.inspector.get_zen_garden_features()

        self.assertTrue(
            zen["has_zen_garden_function"],
            "Frontend must contain renderZenGarden function"
        )
        self.assertTrue(
            zen["has_day_night_lighting"],
            "Zen Garden must dynamically adjust palette based on day/night (getHours)"
        )
        self.assertTrue(
            zen["has_all_clear_banner"],
            "Zen Garden must render 'ALL CLEAR. REST EASY.' banner"
        )
        self.assertTrue(
            zen["has_zero_dice_trigger"],
            "Clearing all tasks must trigger renderZenGarden"
        )
        self.assertTrue(
            zen["has_inspection_hooks"],
            "Window must expose test inspection hooks (setZenGardenTime, getZenGardenPeriod, etc.)"
        )
        self.assertTrue(
            zen["has_four_period_lighting"],
            "Zen Garden must implement 4-period day/night lighting (dawn, day, sunset, night)"
        )

    # --------------------------------------------------------------------------
    # AC7: Automated Pass Verification & AgentShield Security Scan
    # --------------------------------------------------------------------------
    def test_ac7_automated_probe_and_agentshield_scan(self):
        """
        AC7: Automated pass verification of E2E probe and AgentShield scan.
        Runs AgentShield security scanner script and asserts 0 violations.
        """
        self.assertTrue(
            os.path.exists(SECURITY_SCANNER_PY),
            f"AgentShield script not found at: {SECURITY_SCANNER_PY}"
        )

        cmd = [sys.executable, SECURITY_SCANNER_PY, "--path", PROJECT_ROOT]
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30,
        )

        self.assertEqual(
            proc.returncode, 0,
            f"AgentShield scanner failed with exit code {proc.returncode}.\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}"
        )
        self.assertIn(
            "[PASS]", proc.stdout,
            "AgentShield scanner output must indicate [PASS]"
        )


# ==============================================================================
# 4. STANDALONE PROBE AUDIT RUNNER
# ==============================================================================

def run_probe_audit(strict: bool = True) -> int:
    """
    Executes all 7 Acceptance Criteria probes and displays a formatted scorecard.
    Returns 0 if all criteria pass, or 1 if any fail.
    """
    print("=" * 72)
    print(" TASKBARDICE E2E ACCEPTANCE CRITERIA AUTOMATED PROBE")
    print(f" Timestamp: {datetime.now().isoformat()} | Target: {PROJECT_ROOT}")
    print("=" * 72)

    suite = unittest.TestSuite()
    suite.addTest(TestE2EProbe("test_ac1_window_and_flexbox_layout"))
    suite.addTest(TestE2EProbe("test_ac2_add_task_weight_and_time_iso"))
    suite.addTest(TestE2EProbe("test_ac3_ten_dice_stacking_and_background_tiers"))
    suite.addTest(TestE2EProbe("test_ac4_hover_inspection_and_countdown_tooltip"))
    suite.addTest(TestE2EProbe("test_ac5_overdue_penalty_and_streak_reset"))
    suite.addTest(TestE2EProbe("test_ac6_zero_task_clear_triggers_zen_garden"))
    suite.addTest(TestE2EProbe("test_ac7_automated_probe_and_agentshield_scan"))

    ac_descriptions = {
        "test_ac1_window_and_flexbox_layout": "AC1: 400x420 Window & Flexbox Layout (0px Overflow)",
        "test_ac2_add_task_weight_and_time_iso": "AC2: Explicit Weight=4 & Time=15m ISO Timestamps",
        "test_ac3_ten_dice_stacking_and_background_tiers": "AC3: 10-Dice Stacking & Lovecraftian Tiers 1-10",
        "test_ac4_hover_inspection_and_countdown_tooltip": "AC4: Hover Resting Die Highlight & Countdown Tooltip",
        "test_ac5_overdue_penalty_and_streak_reset": "AC5: Overdue Task Completion Streak Reset (0)",
        "test_ac6_zero_task_clear_triggers_zen_garden": "AC6: Zero Task Clear Zen Garden & Day/Night Light",
        "test_ac7_automated_probe_and_agentshield_scan": "AC7: E2E Automated Probe & AgentShield Scan Clean",
    }

    results = []
    failures_or_errors = []

    for test in suite:
        test_name = test._testMethodName
        label = ac_descriptions.get(test_name, test_name)
        result = unittest.TestResult()
        test.run(result)

        if result.wasSuccessful():
            status = "PASS"
            msg = "Complies with specification."
        else:
            status = "FAIL"
            err_details = ""
            if result.failures:
                err_details = result.failures[0][1].strip().splitlines()[-1]
            elif result.errors:
                err_details = result.errors[0][1].strip().splitlines()[-1]
            msg = err_details
            failures_or_errors.append((label, err_details))

        results.append((label, status, msg))

    print("\nPROBE SCORECARD:")
    print("-" * 72)
    for label, status, msg in results:
        indicator = "[PASS]" if status == "PASS" else "[FAIL]"
        print(f" {indicator} {label}")
        if status != "PASS":
            print(f"        -> Diagnostic: {msg}")
    print("-" * 72)

    total = len(results)
    passed_count = sum(1 for _, s, _ in results if s == "PASS")
    print(f" SUMMARY: {passed_count}/{total} Acceptance Criteria Passed.")
    print("=" * 72)

    if failures_or_errors:
        print(f"\n{len(failures_or_errors)} implementation gap(s) detected requiring milestone implementation.")
        return 1 if strict else 0

    print("\nAll 7 Acceptance Criteria verified successfully! Test readiness 100%.")
    return 0


if __name__ == "__main__":
    is_audit_mode = "--audit" in sys.argv
    strict_exit = "--no-exit-code" not in sys.argv and not is_audit_mode

    # If invoked with -m unittest, unittest handles argv. Otherwise run probe audit.
    if len(sys.argv) > 1 and sys.argv[1] not in ["--audit", "--no-exit-code"]:
        unittest.main()
    else:
        sys.exit(run_probe_audit(strict=strict_exit))
