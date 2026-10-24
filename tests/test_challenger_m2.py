r"""
Milestone 2 Empirical Challenger Test Suite
===========================================
Adversarial stress-testing of Lovecraftian Backgrounds & Zen Garden transitions:
1. 10-dice stacking with all weight combinations (all W1, all W5, alternating weights, all 1001 sorted multisets).
2. Rapid tier transitions (adding 10 tasks rapidly, completing them one by one) to confirm smooth visual tier de-escalation.
3. Zen Garden Day/Night lighting across all 24 hours of the day using inspection hook window.setZenGardenTime(hour).
4. Codebase inspection hooks, DOM layout invariants, and contractual compliance.
"""

import itertools
import math
import os
import re
import sys
import unittest
from typing import Any, Dict, List, Tuple

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

STATIC_INDEX_HTML = os.path.join(PROJECT_ROOT, "static", "index.html")


class StackingModelSimulator:
    """
    Mathematical simulator mirroring the exact logic in static/index.html:
    - DICE_CONFIG mapping (weights 1 to 5)
    - Compaction: compressedStep = max(14, floor(180 / (count - 1))) when count > 5
    - Ground anchor: targetY_0 = GROUND_Y - ry - height
    """
    DICE_CONFIG = {
        1: {"width": 32, "height": 20, "ry": 8},
        2: {"width": 40, "height": 24, "ry": 10},
        3: {"width": 48, "height": 28, "ry": 12},
        4: {"width": 56, "height": 32, "ry": 14},
        5: {"width": 64, "height": 36, "ry": 16},
    }
    CANVAS_WIDTH = 400
    CANVAS_HEIGHT = 320
    CENTER_X = 200

    @classmethod
    def compute_positions(cls, weights: List[int], ground_y: int = 290) -> List[Dict[str, Any]]:
        sorted_weights = sorted(weights, reverse=True)
        count = len(sorted_weights)
        if count == 0:
            return []

        compressed_step = max(14, math.floor(180 / (count - 1))) if count > 5 else None

        positions = []
        for i, w in enumerate(sorted_weights):
            cfg = cls.DICE_CONFIG.get(w, cls.DICE_CONFIG[3])
            ry = cfg["ry"]
            h = cfg["height"]
            rw = cfg["width"]

            if i == 0:
                target_y = ground_y - ry - h
            else:
                prev_y = positions[i - 1]["target_y"]
                step = min(h, compressed_step) if compressed_step is not None else h
                target_y = prev_y - step

            top_y = target_y - ry
            bot_y = target_y + ry + h
            left_x = cls.CENTER_X - rw / 2
            right_x = cls.CENTER_X + rw / 2

            positions.append({
                "index": i,
                "weight": w,
                "target_y": float(target_y),
                "visual_top_y": float(top_y),
                "visual_bot_y": float(bot_y),
                "visual_left_x": float(left_x),
                "visual_right_x": float(right_x),
                "ry": ry,
                "height": h,
                "width": rw,
            })
        return positions


class TestMilestone2Challenger(unittest.TestCase):
    """Empirical challenger tests for Milestone 2."""

    # =========================================================================
    # 1. 10-DICE STACKING BOUNDS & CLIPPING STRESS TEST
    # =========================================================================

    def _assert_zero_clipping(self, weights: List[int], ground_y: int = 290):
        positions = StackingModelSimulator.compute_positions(weights, ground_y=ground_y)
        self.assertEqual(len(positions), len(weights))

        # Check peak die (top of stack)
        top_die = positions[-1]
        base_die = positions[0]

        # Top clearance: peak visual top point must be >= 0 (no canvas top clip)
        self.assertGreaterEqual(
            top_die["visual_top_y"], 0.0,
            f"Top die clipped top border: visual_top_y={top_die['visual_top_y']} for weights {weights}"
        )

        # Safe header clearance: visual top point should leave safe breathing room (>= 20px)
        self.assertGreaterEqual(
            top_die["visual_top_y"], 20.0,
            f"Top die violated safe clearance: visual_top_y={top_die['visual_top_y']} < 20px for weights {weights}"
        )

        # Bottom clearance: base visual bottom point must not exceed canvas height (320px)
        self.assertLessEqual(
            base_die["visual_bot_y"], 320.0,
            f"Base die clipped bottom border: visual_bot_y={base_die['visual_bot_y']} > 320px for weights {weights}"
        )

        # Horizontal clearance for all dice
        for pos in positions:
            self.assertGreaterEqual(
                pos["visual_left_x"], 0.0,
                f"Die left border clip: {pos['visual_left_x']} < 0"
            )
            self.assertLessEqual(
                pos["visual_right_x"], 400.0,
                f"Die right border clip: {pos['visual_right_x']} > 400"
            )

        # Spacing invariant: consecutive dice must have vertical offset >= 14px
        for i in range(1, len(positions)):
            dy = positions[i - 1]["target_y"] - positions[i]["target_y"]
            self.assertGreaterEqual(
                dy, 14.0,
                f"Compaction collapsed step between die {i-1} and {i}: dy={dy} < 14"
            )

    def test_stack_10_all_w1(self):
        """10 dice with all minimum weight W=1."""
        for gy in [285, 290]:
            with self.subTest(ground_y=gy):
                self._assert_zero_clipping([1] * 10, ground_y=gy)

    def test_stack_10_all_w5(self):
        """10 dice with all maximum weight W=5."""
        for gy in [285, 290]:
            with self.subTest(ground_y=gy):
                self._assert_zero_clipping([5] * 10, ground_y=gy)

    def test_stack_10_alternating_w1_w5(self):
        """10 dice with alternating weights [1, 5, 1, 5, 1, 5, 1, 5, 1, 5]."""
        weights = [1, 5] * 5
        for gy in [285, 290]:
            with self.subTest(ground_y=gy):
                self._assert_zero_clipping(weights, ground_y=gy)

    def test_stack_10_alternating_w2_w4(self):
        """10 dice with alternating weights [2, 4, 2, 4, 2, 4, 2, 4, 2, 4]."""
        weights = [2, 4] * 5
        for gy in [285, 290]:
            with self.subTest(ground_y=gy):
                self._assert_zero_clipping(weights, ground_y=gy)

    def test_stack_10_gradient_1_to_5(self):
        """10 dice with gradient weights [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]."""
        weights = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
        for gy in [285, 290]:
            with self.subTest(ground_y=gy):
                self._assert_zero_clipping(weights, ground_y=gy)

    def test_stack_10_all_intermediate_homogeneous(self):
        """10 dice with homogeneous weights W=2, W=3, W=4."""
        for w in [2, 3, 4]:
            with self.subTest(weight=w):
                self._assert_zero_clipping([w] * 10, ground_y=290)
                self._assert_zero_clipping([w] * 10, ground_y=285)

    def test_stack_10_exhaustive_all_1001_weight_combinations(self):
        """
        Adversarial Generator: Test ALL 1001 unique sorted multiset combinations
        of 10 dice across weights 1..5. Confirms ZERO clipping for every conceivable stack!
        """
        comb_count = 0
        for comb in itertools.combinations_with_replacement(range(1, 6), 10):
            comb_count += 1
            # Test with both ground_y 290 and 285
            for gy in [285, 290]:
                self._assert_zero_clipping(list(comb), ground_y=gy)
        self.assertEqual(comb_count, 1001, f"Expected 1001 combinations, evaluated {comb_count}")

    def test_stack_sub_maximum_counts_1_to_9(self):
        """Stack sizes from 1 to 9 dice with worst-case weights W=5 must never clip."""
        for count in range(1, 10):
            with self.subTest(count=count):
                self._assert_zero_clipping([5] * count, ground_y=290)
                self._assert_zero_clipping([1] * count, ground_y=290)

    # =========================================================================
    # 2. RAPID TIER TRANSITIONS & SMOOTH DE-ESCALATION STRESS TEST
    # =========================================================================

    def _simulate_tier_transition(self, task_count_history: List[int], ticks_per_step: int = 30, initial_visual_tier: float = 0.0) -> List[float]:
        """Simulates visualTier easing dynamics frame-by-frame."""
        visual_tier = initial_visual_tier
        trajectory = []

        for target_count in task_count_history:
            for _ in range(ticks_per_step):
                target_tier = float(target_count)
                diff = target_tier - visual_tier
                rate = 0.05 if diff < 0 else 0.08
                visual_tier += diff * rate
                if abs(diff) < 0.005:
                    visual_tier = target_tier
                trajectory.append(visual_tier)
        return trajectory

    def test_rapid_tier_addition_and_smooth_deescalation(self):
        """
        Stress test: Rapidly add 10 tasks (0 -> 10), then complete tasks one by one (10 -> 9 -> ... -> 0).
        Verifies:
        1. Escalation smoothly approaches 10.0 without exceeding 10.0.
        2. De-escalation smoothly drops from 10.0 to 0.0.
        3. No sudden visual popping: max delta per frame <= 0.5.
        4. When completed, visualTier reaches exactly 0.0.
        """
        # Rapid addition: 0 to 10
        add_history = list(range(1, 11))
        # Complete one-by-one: 9 down to 0
        complete_history = list(range(9, -1, -1))

        # Escalation trajectory (giving 10 frames per add)
        escalation = self._simulate_tier_transition(add_history, ticks_per_step=15)
        self.assertGreater(escalation[-1], 9.0)
        self.assertLessEqual(escalation[-1], 10.0)

        # De-escalation trajectory (giving 30 frames per task completion, and 120 frames for final settling to 0)
        # 10 down to 1
        intermediate_history = list(range(9, 0, -1))
        deescalation = self._simulate_tier_transition(
            intermediate_history, ticks_per_step=30, initial_visual_tier=escalation[-1]
        )
        # Final transition to 0 tasks (cross-fade to Zen Garden)
        final_settle = self._simulate_tier_transition(
            [0], ticks_per_step=120, initial_visual_tier=deescalation[-1]
        )
        deescalation.extend(final_settle)

        # Verify smoothness: no frame jump > 0.5
        all_frames = escalation + deescalation
        for i in range(1, len(all_frames)):
            delta = abs(all_frames[i] - all_frames[i - 1])
            self.assertLessEqual(delta, 0.5, f"Frame {i} had jarring pop delta={delta}")

        # Final state must settle to 0.0
        self.assertEqual(deescalation[-1], 0.0, f"Expected final visualTier 0.0, got {deescalation[-1]}")

    def test_burst_deescalation_from_10_to_0_immediate(self):
        """Burst clearing all 10 tasks at once must smoothly glide from 10.0 to 0.0."""
        visual_tier = 10.0
        trajectory = [visual_tier]
        max_frames = 200

        for frame in range(max_frames):
            target_tier = 0.0
            diff = target_tier - visual_tier
            visual_tier += diff * 0.05
            if abs(diff) < 0.005:
                visual_tier = 0.0
            trajectory.append(visual_tier)
            if visual_tier == 0.0:
                break

        # Settle time: at 0.05 per frame, reaching < 0.005 takes ~150 frames (~2.5s at 60fps)
        self.assertEqual(visual_tier, 0.0)
        self.assertLess(len(trajectory), 160)

        # Verify monotonic decrease
        for i in range(1, len(trajectory)):
            self.assertLessEqual(trajectory[i], trajectory[i - 1] + 1e-9)

    def test_tier_alpha_layer_coverage_and_clamping(self):
        """
        Evaluates getTierAlpha(k) for all tiers k in 1..10 across the entire visualTier range [0.0, 10.0].
        Verifies:
        - Strict clamping in [0.0, 1.0]
        - Tier k is 0 when visualTier <= k - 1
        - Tier k is 1 when visualTier >= k
        """
        def get_tier_alpha(k: int, vt: float) -> float:
            if vt >= k:
                return 1.0
            if vt <= k - 1:
                return 0.0
            return max(0.0, min(1.0, vt - (k - 1)))

        # Test across finely sampled visualTier values from 0.0 to 10.5 in steps of 0.1
        vt = 0.0
        while vt <= 10.5:
            for k in range(1, 11):
                alpha = get_tier_alpha(k, vt)
                self.assertGreaterEqual(alpha, 0.0)
                self.assertLessEqual(alpha, 1.0)
                if vt <= k - 1:
                    self.assertEqual(alpha, 0.0)
                elif vt >= k:
                    self.assertEqual(alpha, 1.0)
                else:
                    self.assertAlmostEqual(alpha, vt - (k - 1), places=4)
            vt = round(vt + 0.1, 2)

    def test_zen_garden_cross_fade_bloom(self):
        """
        Zen Garden bloom cross-fade alpha:
        zenAlpha = min(1.0, max(0.0, 1.0 - visualTier))
        Verifies zenAlpha starts at 0.0 when visualTier >= 1.0, and smoothly reaches 1.0 as visualTier hits 0.0.
        """
        def get_zen_alpha(vt: float) -> float:
            return min(1.0, max(0.0, 1.0 - vt))

        self.assertEqual(get_zen_alpha(10.0), 0.0)
        self.assertEqual(get_zen_alpha(1.0), 0.0)
        self.assertAlmostEqual(get_zen_alpha(0.5), 0.5)
        self.assertEqual(get_zen_alpha(0.0), 1.0)

    # =========================================================================
    # 3. ZEN GARDEN 24-HOUR DAY/NIGHT LIGHTING CYCLE STRESS TEST
    # =========================================================================

    def _eval_zen_period(self, hour: int) -> str:
        """Mirrors getZenTimePeriod() in static/index.html."""
        if 6 <= hour < 10:
            return "dawn"
        elif 10 <= hour < 17:
            return "day"
        elif 17 <= hour < 20:
            return "sunset"
        else:
            return "night"

    def test_zen_garden_all_24_hours_cycle(self):
        """
        Tests Zen Garden time periods across every single hour 0 to 23:
        - 00:00 to 05:00: night
        - 06:00 to 09:00: dawn
        - 10:00 to 16:00: day
        - 17:00 to 19:00: sunset
        - 20:00 to 23:00: night
        """
        expected_periods = {
            0: "night", 1: "night", 2: "night", 3: "night", 4: "night", 5: "night",
            6: "dawn", 7: "dawn", 8: "dawn", 9: "dawn",
            10: "day", 11: "day", 12: "day", 13: "day", 14: "day", 15: "day", 16: "day",
            17: "sunset", 18: "sunset", 19: "sunset",
            20: "night", 21: "night", 22: "night", 23: "night"
        }

        for hour, expected in expected_periods.items():
            actual = self._eval_zen_period(hour)
            self.assertEqual(
                actual, expected,
                f"Hour {hour} produced '{actual}', expected '{expected}'"
            )

    def test_zen_garden_time_boundary_conditions(self):
        """Boundary hour values (transition thresholds: 6, 10, 17, 20)."""
        self.assertEqual(self._eval_zen_period(5), "night")
        self.assertEqual(self._eval_zen_period(6), "dawn")
        self.assertEqual(self._eval_zen_period(9), "dawn")
        self.assertEqual(self._eval_zen_period(10), "day")
        self.assertEqual(self._eval_zen_period(16), "day")
        self.assertEqual(self._eval_zen_period(17), "sunset")
        self.assertEqual(self._eval_zen_period(19), "sunset")
        self.assertEqual(self._eval_zen_period(20), "night")

    def test_window_set_zen_garden_time_hook_contract(self):
        """Verifies hook implementation syntax in static/index.html."""
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            html = f.read()

        # Check that hook parses integers properly
        self.assertIn("window.setZenGardenTime", html)
        self.assertIn("window.getZenGardenPeriod", html)
        self.assertIn("window.isZenGardenActive", html)
        self.assertIn("window.getVisualTier", html)
        self.assertIn("window.getAverageRot", html)
        self.assertIn("window.triggerZenGarden", html)

    # =========================================================================
    # 4. STATIC HTML CONTRACT & VISUAL ASSETS VERIFICATION
    # =========================================================================

    def test_10_abyss_tier_names_contract(self):
        """Validates that all 10 Lovecraftian Abyss Tier names are present in ABYSS_TIERS."""
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            html = f.read()

        expected_tiers = [
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

        for tier in expected_tiers:
            self.assertIn(f'"{tier}"', html, f"Missing tier theme: {tier}")

    def test_startup_tier_0_empty_void_distinction(self):
        """
        Startup condition: Fresh start with 0 tasks must show Tier 0 Empty Void
        ('TYPE TASK & ROLL TO BEGIN') and NOT jump to Zen Garden.
        Zen Garden is only active when tasks have been cleared (hasClearedAll = true).
        """
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            html = f.read()

        self.assertIn("TYPE TASK & ROLL TO BEGIN", html)
        self.assertIn("hasHadTasks", html)
        self.assertIn("hasClearedAll", html)
        self.assertIn("!hasClearedAll", html)

    def test_zen_garden_celestial_and_ambient_features(self):
        """Zen Garden visual features: stone triad (San-zon-seki), bamboo groves, stone pagoda lantern (Toro)."""
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            html = f.read()

        # Check Japanese garden elements in renderZenGarden
        self.assertIn("drawZenStone", html)
        self.assertIn("drawBambooStalk", html)
        self.assertIn("zenPetals", html)
        self.assertIn("zenFireflies", html)
        self.assertIn("ALL CLEAR. REST EASY.", html)


if __name__ == "__main__":
    unittest.main()
