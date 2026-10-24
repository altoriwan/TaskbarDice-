# Test Suite Ready: TaskbarDice Overhaul E2E Verification Harness

**Status**: READY FOR MILESTONE TDD VERIFICATION  
**Author**: `teamwork_preview_test_writer_e2e_1`  
**Timestamp**: 2026-10-24T07:15:00Z  
**Project Root**: `c:\Users\haquo\Documents\antigravity\amazing-turing`  
**Target Specifications**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`  

---

## 1. Overview & Test Architecture

The End-to-End (E2E) Test Probe and Verification Suite (`tests/test_e2e_probe.py`) provides an authoritative, deterministic, opaque-box test harness that audits all 7 Acceptance Criteria (AC1 through AC7) and 5 Core Requirements (R1 through R5).

The suite operates in two complementary modes:
1. **Unittest Test Suite**: Discoverable and executable via Python's standard `unittest` framework for CI/CD regression pipelines.
2. **Interactive / Diagnostic CLI Probe**: Direct executable script printing a formatted, high-visibility visual scorecard with diagnostic error messages per acceptance criterion.

---

## 2. Execution Commands

Target Environment: Windows PowerShell 5.1

### Standard Unittest Execution
```powershell
.\.venv\Scripts\python.exe -m unittest tests/test_e2e_probe.py
```

### Full Test Suite Discovery
```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

### Standalone E2E Diagnostic Probe (Audit Mode)
```powershell
# Diagnostic audit mode (exit code 0 for inspection scorecard)
.\.venv\Scripts\python.exe tests/test_e2e_probe.py --audit

# Strict CI mode (exits with code 1 if any AC fails)
.\.venv\Scripts\python.exe tests/test_e2e_probe.py
```

### AgentShield Static Security Scan
```powershell
.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
```

---

## 3. Acceptance Criteria Verification Matrix

| # | Acceptance Criterion | Source Spec | Probe Method | Pre-Implementation Status | Target Milestone |
|---|---|---|---|:---:|:---:|
| **AC1** | 400x420 window rendered with no bottom bar clipping or overflow (inspecting DOM layout elements or flexbox budget). | R1 | `test_ac1_window_and_flexbox_layout` | ❌ FAIL (300px vs 420px) | M1 |
| **AC2** | Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps. | R1, AC2 | `test_ac2_add_task_weight_and_time_iso` | ❌ FAIL (missing explicit args) | M1 |
| **AC3** | Stacking 10 dice escalates background from Tier 1 to Tier 10 without canvas clipping. | R2, AC3 | `test_ac3_ten_dice_stacking_and_background_tiers` | ❌ FAIL (themes missing) | M2 |
| **AC4** | Hovering resting die renders highlight and countdown tooltip. | R4, AC4 | `test_ac4_hover_inspection_and_countdown_tooltip` | ❌ FAIL (no mousemove/tooltip) | M4 |
| **AC5** | Overdue task completion resets streak to 0. | R5, AC5 | `test_ac5_overdue_penalty_and_streak_reset` | ❌ FAIL (streak unconditional) | M5 |
| **AC6** | Zero task clear triggers Zen Garden. | R2, R5, AC6 | `test_ac6_zero_task_clear_triggers_zen_garden` | ✅ PASS (Zen Garden exists) | M2, M5 |
| **AC7** | Automated pass verification of E2E probe and AgentShield scan. | Rules, AC7 | `test_ac7_automated_probe_and_agentshield_scan` | ✅ PASS (0 security leaks) | M5 |

---

## 4. Current Baseline Probe Scorecard

Executed against the pre-overhaul repository state:

```
========================================================================
 TASKBARDICE E2E ACCEPTANCE CRITERIA AUTOMATED PROBE
 Timestamp: 2026-10-24T14:13:48.745801 | Target: c:\Users\haquo\Documents\antigravity\amazing-turing
========================================================================

PROBE SCORECARD:
------------------------------------------------------------------------
 [FAIL] AC1: 400x420 Window & Flexbox Layout (0px Overflow)
        -> Diagnostic: AssertionError: 300 != 420 : Expected app.py win_h=420, got 300 (R1 spec requirement)
 [FAIL] AC2: Explicit Weight=4 & Time=15m ISO Timestamps
        -> Diagnostic: TypeError: TaskbarDiceAPI.add_task() got an unexpected keyword argument 'weight'
 [FAIL] AC3: 10-Dice Stacking & Lovecraftian Tiers 1-10
        -> Diagnostic: AssertionError: 0 not greater than or equal to 9 : Expected at least 9 Lovecraftian abyss themes, found: []
 [FAIL] AC4: Hover Resting Die Highlight & Countdown Tooltip
        -> Diagnostic: AssertionError: False is not true : Canvas must have 'mousemove' event listener for hover inspection
 [FAIL] AC5: Overdue Task Completion Streak Reset (0)
        -> Diagnostic: AssertionError: False is not true : api.complete_task must detect and report was_overdue=True for overdue task
 [PASS] AC6: Zero Task Clear Zen Garden & Day/Night Light
 [PASS] AC7: E2E Automated Probe & AgentShield Scan Clean
------------------------------------------------------------------------
 SUMMARY: 2/7 Acceptance Criteria Passed.
========================================================================
```

---

## 5. Escalation & Implementation Action Items

The 5 failures above are expected in the TDD cycle prior to milestone implementation. The implementing agents must address the following root causes:

1. **For Milestone 1 Agent (`app.py`, `dice_logic.py`, `static/index.html`)**:
   - Update `app.py`: set `win_w, win_h = 400, 420` and `calculate_anchor_position` defaults to `height=420, margin_y=64, margin_x=16`.
   - Update `TaskbarDiceAPI.add_task(self, text: str, weight: int = 1, duration_minutes: int = 240)` and `TaskStorage.add_task` to accept explicit `weight` and `duration_minutes`. Compute exact `deadline_at = created_at + timedelta(minutes=duration_minutes)` and persist ISO string.
   - Refactor `static/index.html` CSS body to Flexbox column (`width: 400px; height: 420px; overflow: hidden; display: flex; flex-direction: column;`). Set Header: 26px (`flex: 0 0 26px`), Canvas: 320px (`flex: 0 0 320px`), Control Panel: 74px (`flex: 0 0 74px`). Total budget: 420px (0px overflow).
   - Add Row 1 (Input 78% + ADD 22%) and Row 2 (Weight buttons `data-w="1"` to `"5"`, Time presets `data-t="15m"`, `"25m"`, `"1h"`, `"4h"`, `"custom"`).

2. **For Milestone 2 Agent (`static/index.html`)**:
   - Implement Tier 0 startup empty void `#121417` with `'TYPE TASK & ROLL TO BEGIN'`.
   - Implement 10 distinct escalating Lovecraftian background themes (Cold Dust, Frost Cracks, Sprouting Thorns, Creeping Vines, Toxic Spores, Blood Veins, Demon Eyes, Abyssal Eclipse, Pandemonium Overload).
   - Implement dynamic hue shift tied to composite rot factor (`overallRot`).

3. **For Milestone 3 Agent (`static/index.html`)**:
   - Implement 5 distinct rot stages (Pristine Ivory, Sandy Scratches, Cracked Stone fissures, Mossy roots, Necrotic twitch + floor slime puddles + blinking red overdue text).

4. **For Milestone 4 Agent (`static/index.html`)**:
   - Add `mousemove` canvas listener for resting dice bounding box hit detection.
   - Render 2px glowing pixel border around hovered die.
   - Render floating retro countdown tooltip displaying Full Title, Weight, `STAGE: [S/5]`, and countdown (`CÒN: Xm Ys` or `QUÁ HẠN: +Xm Ys`).

5. **For Milestone 5 Agent (`app.py`, `static/index.html`)**:
   - Enforce overdue completion streak reset: completing an overdue task sets `sessionStreak = 0`; completing an on-time task increments `sessionStreak++`.
   - Return `was_overdue: bool` from backend `complete_task`.
