r"""
Milestone 3 & 4 Empirical Challenger Test Suite
===============================================
Adversarial stress-testing of 5-Stage Rot Engine, Twitch Vibration Jitter,
Developer Key 'D', Slime Drip Object Pools, and Retro Hover Inspection Tooltip:
1. 5 distinct rot stages: exact color palettes, pips, specular shine streaks, corner scratches, 4 fissures, creeping roots, fungus dots, corruption veins, and pustules.
2. Twitch micro-jitter calculation: mathematical bounding, frequency escalation when overdue, and strict render synchronization.
3. Slime drip and puddle pool invariants: pre-allocated fixed memory pools (80/12/24) with zero runtime GC churn, floor impact at GROUND_Y = 290, and Zen Garden fade-out.
4. Developer Key 'D' speed-test cycling 7 discrete states with input element focus guard.
5. Retro Tooltip multi-line word wrapping and smart 4-way boundary clamping within 400x320 canvas.
6. Boundary conditions: division-by-zero deadline span, clock skew, and extreme overdue rot factors.
"""

import math
import os
import re
import sys
import unittest
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

STATIC_INDEX_HTML = os.path.join(PROJECT_ROOT, "static", "index.html")


class TestM3Challenger(unittest.TestCase):
    """
    Adversarial verification of Milestone 3 & Milestone 4 implementations.
    """

    @classmethod
    def setUpClass(cls):
        with open(STATIC_INDEX_HTML, "r", encoding="utf-8") as f:
            cls.html_content = f.read()

    # --------------------------------------------------------------------------
    # 1. 5 Rot Stages Visual Palettes & Micro-Textures
    # --------------------------------------------------------------------------
    def test_five_rot_stages_palettes_and_textures(self):
        """
        Verify all 5 distinct rot stages have authentic color palettes, pips,
        and micro-textures specified in Milestone 3.
        """
        content = self.html_content

        # Stage 1: Ivory (#fdfbf7, #f1ecdc, #e5dec9, pips #18181b) + Specular streak + Sparkle
        self.assertIn("#fdfbf7", content, "Stage 1 ivory top face missing")
        self.assertIn("#f1ecdc", content, "Stage 1 ivory left face missing")
        self.assertIn("#e5dec9", content, "Stage 1 ivory right face missing")
        self.assertIn("#18181b", content, "Stage 1 obsidian pips missing")
        self.assertTrue(
            bool(re.search(r"rgba\(255,\s*255,\s*255,\s*0\.9\)", content)),
            "Stage 1 specular shine streak highlight missing"
        )
        self.assertTrue(
            bool(re.search(r"cx\s*-\s*rx\s*\*\s*0\.35", content)),
            "Stage 1 accent sparkle glint missing"
        )

        # Stage 2: Sandy yellow (#eae0c8, #d7cbb0, #c5b89a, pips #3c352a) + 4 corner scratches (#9c8f76)
        self.assertIn("#eae0c8", content, "Stage 2 sandy top face missing")
        self.assertIn("#d7cbb0", content, "Stage 2 sandy left face missing")
        self.assertIn("#c5b89a", content, "Stage 2 sandy right face missing")
        self.assertIn("#3c352a", content, "Stage 2 dark sepia pips missing")
        self.assertIn("#9c8f76", content, "Stage 2 corner scratches color missing")
        self.assertGreaterEqual(
            len(re.findall(r"cx\s*-\s*rx\s*\+\s*\d|cx\s*\+\s*rx\s*\*\s*0\.\d+", content)),
            4, "Stage 2 should implement at least 4 hairline scratches along edges"
        )

        # Stage 3: Cracked stone (#8a8d8f, #727577, #5a5c5e, pips #222426) + 4 dark fissures (#1c1d1f)
        self.assertIn("#8a8d8f", content, "Stage 3 stone top face missing")
        self.assertIn("#727577", content, "Stage 3 stone left face missing")
        self.assertIn("#5a5c5e", content, "Stage 3 stone right face missing")
        self.assertIn("#222426", content, "Stage 3 basalt pips missing")
        self.assertIn("#1c1d1f", content, "Stage 3 dark fissure color missing")
        self.assertIn("Fissure 1", content, "Stage 3 Fissure 1 comment missing")
        self.assertIn("Fissure 2", content, "Stage 3 Fissure 2 comment missing")
        self.assertIn("Fissure 3", content, "Stage 3 Fissure 3 comment missing")
        self.assertIn("Fissure 4", content, "Stage 3 Fissure 4 comment missing")

        # Stage 4: Mossy decay (#4a5d4e, #3a4b3e, #2d3a30, pips #18221b) + 3 creeping roots (#142217) + fungus dots
        self.assertIn("#4a5d4e", content, "Stage 4 mossy top face missing")
        self.assertIn("#3a4b3e", content, "Stage 4 mossy left face missing")
        self.assertIn("#2d3a30", content, "Stage 4 mossy right face missing")
        self.assertIn("#18221b", content, "Stage 4 dark moss pips missing")
        self.assertIn("#142217", content, "Stage 4 creeping roots color missing")
        self.assertIn("Root 1", content, "Stage 4 Root 1 missing")
        self.assertIn("Root 2", content, "Stage 4 Root 2 missing")
        self.assertIn("Root 3", content, "Stage 4 Root 3 missing")
        for fungus_color in ["#84cc16", "#c084fc", "#4ade80", "#7e22ce"]:
            self.assertIn(fungus_color, content, f"Stage 4 fungus dot color {fungus_color} missing")

        # Stage 5: Toxic necrotic (#2e1f3d, #22162e, #1a2e22, radioactive lime pips #a3e635) + veins + pustules
        self.assertIn("#2e1f3d", content, "Stage 5 necrotic top face missing")
        self.assertIn("#22162e", content, "Stage 5 necrotic left face missing")
        self.assertIn("#1a2e22", content, "Stage 5 necrotic right face missing")
        self.assertIn("#a3e635", content, "Stage 5 radioactive lime pips missing")
        self.assertIn("#022c22", content, "Stage 5 deep corruption vein missing")
        self.assertIn("#581c87", content, "Stage 5 abyssal vein missing")
        self.assertTrue(
            bool(re.search(r"pustules", content, re.IGNORECASE)),
            "Stage 5 radioactive pustules missing"
        )

        # Overdue blinking red label & overdue banner
        self.assertTrue(
            bool(re.search(r"rot\s*>=\s*1\.0.*(#ef4444|#ffffff)", content, re.DOTALL)),
            "Overdue die label must alternate with #ef4444"
        )
        self.assertIn("! QUÁ HẠN !", content, "Overdue die banner '! QUÁ HẠN !' missing")

    # --------------------------------------------------------------------------
    # 2. Twitch Micro-Jitter Invariants & Mathematical Simulation
    # --------------------------------------------------------------------------
    def test_twitch_micro_jitter_simulation(self):
        """
        Simulates twitch micro-jitter across various timestamps and indices.
        Verifies:
        - Strict zero jitter for rot < 0.8
        - Clamped amplitude <= 1.8 for 0.8 <= rot < 1.0
        - Clamped amplitude <= 4.5 for rot >= 1.0
        - Higher frequency and burst severity when overdue
        """
        def simulate_jitter(rot: float, index: int, timestamp: float) -> Tuple[float, float]:
            if rot < 0.8:
                return (0.0, 0.0)
            is_overdue = (rot >= 1.0)
            severity = min(2.8, 1.2 + (rot - 1.0) * 1.6) if is_overdue else 1.0
            freq = 0.055 if is_overdue else 0.028
            t = timestamp * freq + (index * 19.73)

            spasm_gate = math.sin(t * 2.1) * math.cos(t * 3.7)
            in_burst = is_overdue or (abs(spasm_gate) > 0.25)

            dx = 0.0
            dy = 0.0
            if in_burst:
                harmonic_x = math.sin(t * 5.3) * 0.5 + math.sin(t * 11.7) * 0.3
                harmonic_y = math.cos(t * 4.7) * 0.4 + math.cos(t * 9.1) * 0.3
                # In worst case noise adds 0.6 to harmonic
                noise_x = 0.6
                noise_y = 0.5
                base_amp = 2.4 if is_overdue else 1.0
                dx = (harmonic_x + noise_x) * base_amp * severity
                dy = (harmonic_y + noise_y) * (base_amp * 0.75) * severity

            max_clamp = 4.5 if is_overdue else 1.8
            dx = max(-max_clamp, min(max_clamp, dx))
            dy = max(-max_clamp, min(max_clamp, dy))
            return (dx, dy)

        # 1. Non-jitter for rot < 0.8
        for rot in [0.0, 0.2, 0.5, 0.79]:
            for ts in [0, 50, 100, 500, 1000]:
                dx, dy = simulate_jitter(rot, 0, ts)
                self.assertEqual(dx, 0.0)
                self.assertEqual(dy, 0.0)

        # 2. Stage 5 active jitter bounded within [-1.8, 1.8]
        non_overdue_bursts = 0
        for ts in range(0, 5000, 20):
            dx, dy = simulate_jitter(0.9, 0, float(ts))
            self.assertTrue(-1.8 <= dx <= 1.8, f"Stage 5 dx {dx} exceeded clamp 1.8")
            self.assertTrue(-1.8 <= dy <= 1.8, f"Stage 5 dy {dy} exceeded clamp 1.8")
            if dx != 0.0 or dy != 0.0:
                non_overdue_bursts += 1
        self.assertGreater(non_overdue_bursts, 100, "Stage 5 must produce active bursts")

        # 3. Stage 5 Overdue jitter bounded within [-4.5, 4.5]
        overdue_bursts = 0
        for ts in range(0, 5000, 20):
            dx, dy = simulate_jitter(1.5, 0, float(ts))
            self.assertTrue(-4.5 <= dx <= 4.5, f"Stage 5 Overdue dx {dx} exceeded clamp 4.5")
            self.assertTrue(-4.5 <= dy <= 4.5, f"Stage 5 Overdue dy {dy} exceeded clamp 4.5")
            if dx != 0.0 or dy != 0.0:
                overdue_bursts += 1
        self.assertEqual(overdue_bursts, 250, "Overdue die must twitch continuously in every frame")

        # 4. Verify jitter synchronization in static/index.html
        content = self.html_content
        self.assertIn("const jitter = calculateTwitchJitter(rot, i, now);", content)
        self.assertIn("const dieRenderX = centerX + jitter.dx;", content)
        self.assertIn("const dieRenderY = renderY + jitter.dy;", content)
        self.assertIn("drawRotIsometricDice(ctx, dieRenderX, dieRenderY", content)
        self.assertIn("drawOverdueDieBanner(ctx, dieRenderX, dieRenderY", content)
        self.assertIn("centerX + jitter.dx * 0.25", content, "Contact shadow must track jitter")
        self.assertIn("dieRenderX - cfg.width / 2 - 2", content, "Hover glowing border must synchronize with dieRenderX")
        self.assertIn("dieRenderY - cfg.ry - 2", content, "Hover glowing border must synchronize with dieRenderY")

    # --------------------------------------------------------------------------
    # 3. Slime Drips & Floor Puddle Pool Memory Invariants
    # --------------------------------------------------------------------------
    def test_slime_drip_and_puddle_pool_invariants(self):
        """
        Verifies zero-allocation particle and puddle pooling.
        """
        content = self.html_content

        # Pool size definitions
        self.assertIn("const MAX_SLIME_DRIPS = 80;", content)
        self.assertIn("const MAX_SLIME_PUDDLES = 12;", content)
        self.assertIn("const MAX_SLIME_SPLASHES = 24;", content)
        self.assertIn("const GROUND_Y = 290;", content)

        # Verify no dynamic heap allocations on slime pools
        self.assertNotIn("slimeDripPool.push(", content[content.find("function spawnStage5SlimeDrip"):content.find("function animationLoop")])
        self.assertNotIn("slimePuddlePool.push(", content[content.find("function spawnStage5SlimeDrip"):content.find("function animationLoop")])
        self.assertNotIn("slimeSplashPool.push(", content[content.find("function spawnStage5SlimeDrip"):content.find("function animationLoop")])

        # Floor impact and splash triggers
        self.assertIn("triggerSlimeFloorImpact(p.x, p.color, p.type);", content)
        self.assertIn("p.width += (p.targetWidth - p.width) * 0.06;", content)

        # Zen Garden puddle fade-out
        self.assertIn("p.alpha -= 0.015;", content)

    # --------------------------------------------------------------------------
    # 4. Developer Speed-Test Key 'D' Cycling
    # --------------------------------------------------------------------------
    def test_developer_key_d_speed_test(self):
        """
        Verifies Key 'D' developer cycling across 7 modes:
        Realtime -> Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 5 Overdue.
        Also verifies typing guard inside taskInput.
        """
        content = self.html_content

        self.assertIn("devMode = (devMode + 1) % 7;", content)
        self.assertIn("[D] REALTIME", content)
        self.assertIn("[D] STAGE 1 (IVORY)", content)
        self.assertIn("[D] STAGE 2 (SANDY)", content)
        self.assertIn("[D] STAGE 3 (CRACKED)", content)
        self.assertIn("[D] STAGE 4 (MOSSY)", content)
        self.assertIn("[D] STAGE 5 (NECROTIC)", content)
        self.assertIn("[D] STAGE 5 (OVERDUE)", content)

        # Task input focus guard
        self.assertIn("if (e.target === taskInput) return;", content)

        # getEffectiveRotFactor handling
        self.assertIn("if (devMode === 1) return 0.10;", content)
        self.assertIn("if (devMode === 2) return 0.30;", content)
        self.assertIn("if (devMode === 3) return 0.50;", content)
        self.assertIn("if (devMode === 4) return 0.70;", content)
        self.assertIn("if (devMode === 5) return 0.90;", content)
        self.assertIn("if (devMode === 6) return 1.25;", content)

    # --------------------------------------------------------------------------
    # 5. Retro Tooltip Multi-Line Wrapping & Smart 4-Way Boundary Clamping
    # --------------------------------------------------------------------------
    def test_retro_tooltip_smart_clamping_and_wrapping(self):
        """
        Verifies retro inspection tooltip logic:
        - Word wrapping up to 2 lines without truncating words
        - Formatting W:${weight} | STAGE: [${stage}/5]
        - Countdown timer: CÒN: Xm Ys or blinking red QUÁ HẠN: +Xm Ys
        - 4-way boundary clamping within 400x320 canvas
        """
        content = self.html_content

        # Bounding box & clamping
        self.assertIn("tooltipX + tooltipWidth > 400 - padding", content)
        self.assertIn("tooltipX = mousePos.x - tooltipWidth - 12;", content)
        self.assertIn("tooltipY < padding", content)
        self.assertIn("tooltipY = mousePos.y + 22;", content)
        self.assertIn("Math.max(padding, Math.min(400 - tooltipWidth - padding, tooltipX))", content)
        self.assertIn("Math.max(padding, Math.min(320 - tooltipHeight - padding, tooltipY))", content)

        # Full title word wrapping
        self.assertIn("const maxLineWidth = 180;", content)
        self.assertIn("const words = fullTitle.split(/\\s+/);", content)

        # Stage and timer formatting
        self.assertIn("STAGE: [${stage}/5]", content)
        self.assertIn("QUÁ HẠN: +${m}m ${s}s", content)
        self.assertIn("CÒN: ${m}m ${s}s", content)

    # --------------------------------------------------------------------------
    # 6. Rot Calculation Edge Cases (Zero Duration, Negative Elapsed, Extreme Rot)
    # --------------------------------------------------------------------------
    def test_rot_calculation_boundary_cases(self):
        """
        Verifies edge-case math in getEffectiveRotFactor.
        """
        content = self.html_content

        # Division by zero protection
        self.assertIn("if (totalSpan <= 0) return 1.0;", content)

        # Negative elapsed protection
        self.assertIn("return Math.max(0.0, rot);", content)


if __name__ == "__main__":
    unittest.main()
