# Handoff Report: Specification Mining Survey

**Agent**: `teamwork_preview_spec_miner_survey_1`  
**Milestone**: Survey & Specification Mining  
**Integrity Mode**: Hard Handoff (Task Complete)  
**Date**: 2026-10-24T07:10:00Z  

---

## 1. Observation

1. **Authoritative Specification (`.agents/teamwork/ORIGINAL_REQUEST.md:12-49`)**:
   - R1: "Window size 400x420 anchored above Windows 11 Taskbar (margin_y: 64, margin_x: 16)."
   - R1: "Flexbox column layout: Header 26px + Canvas 320px + Control Panel 74px (0px overflow)."
   - R1: "Row 1: Text input (78%) + Green NES ADD button (22%)."
   - R1: "Row 2: Weight selection (W: [1][2][3][4][5]) + Time presets (T: [15m][25m][1h][4h][..m])."
   - R2: "Tier 0: Pitch black Empty Void (#121417) with 'TYPE TASK & ROLL TO BEGIN' for fresh startup with 0 tasks."
   - R2: "Tier 1 to 10: Scaling with dice stack count (1 to 10): Void -> Cold Dust -> Frost Cracks -> Sprouting Thorns -> Creeping Vines -> Toxic Spores -> Blood Veins -> Demon Eyes -> Abyssal Eclipse -> Pandemonium Overload."
   - R2: "Background hue dynamically shifts with overall rot factor."
   - R2: "Completing tasks de-escalates background tiers smoothly; clearing all tasks transitions to Zen Garden."
   - R3: "Rot factor: (now - created_at) / (deadline_at - created_at)."
   - R3: "Stage 1 (0-20%): Pristine ivory + shine highlight."
   - R3: "Stage 2 (20-40%): Fading sandy yellow + corner scratches."
   - R3: "Stage 3 (40-60%): Cracked stone + 3-4 dark jagged fissures."
   - R3: "Stage 4 (60-80%): Mossy decay + purple/green fungus dots + creeping roots."
   - R3: "Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green + twitch vibration + continuous slime drips creating floor puddles. Blinking red label when overdue."
   - R4: "Mousemove on canvas detects resting die bounding box and renders glowing pixel border."
   - R4: "Floating retro tooltip displays: Full Title, Weight, Stage X/5, Countdown Timer ('CÒN: Xm Ys' or blinking red 'QUÁ HẠN: +Xm Ys')."
   - R5: "Completing overdue Stage 5 task resets sessionStreak = 0. Completing on-time task increments sessionStreak (+1 STREAK combo if >= 2)."
   - R5: "Clearing all dice triggers Zen Garden (Day/Night dynamic lighting)."

2. **Existing Implementation Codebase**:
   - `app.py:46, 67`: Currently sets `calculate_anchor_position(width=400, height=300, margin_x=16, margin_y=56)` and `win_w, win_h = 400, 300`. This deviates from required 400x420 and `margin_y: 64`.
   - `static/index.html:24, 41, 88, 101`: Window is 400x300 (`body { width: 400px; height: 300px; }`), Header is 28px, Canvas is 236px, and bottom input bar is 64px. This deviates from Header 26px + Canvas 320px + Control Panel 74px.
   - `static/index.html:1242`: `sessionStreak++` is executed unconditionally on task completion without checking if the task was overdue.
   - `static/index.html:1197`: Double-click listener exists for completion modal, but canvas `mousemove` hover inspection and glowing pixel border do not exist.
   - `dice_logic.py:18, 206`: `add_task(raw_text: str)` parses strings with NLP heuristics, but does not take explicit `weight` or `time_preset` parameters from the UI buttons.

3. **Verification Command Results**:
   - Test suite execution: `.\.venv\Scripts\python.exe -m unittest discover tests` executed cleanly with:
     ```
     Ran 21 tests in 0.065s
     OK
     ```
   - AgentShield security scan: `.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .` completed with:
     ```
     [PASS] No secret leaks, destructive commands, or invariant violations detected.
     ```

---

## 2. Logic Chain

1. **Layout & Window Invariant**:
   From Observation 1 (R1) and Observation 2 (`app.py`, `static/index.html`), the existing window dimensions (400x300, margin_y 56) and layout (Header 28px + Canvas 236px + Bar 64px) cause layout truncation and do not meet the 400x420 specification. The layout must be re-architected into a 3-part flexbox column totaling exactly 420px (Header 26px + Canvas 320px + Control Panel 74px) with `margin_y: 64, margin_x: 16`.

2. **Control Panel Enhancement**:
   From Observation 1 (R1) and Observation 2 (`static/index.html`, `dice_logic.py`), the current single-row input must be divided into Row 1 (78% text input + 22% green NES ADD button) and Row 2 (W: [1-5] weight selector + T: [15m-..m] time preset selector). Furthermore, `dice_logic.py:add_task` and `app.py:add_task` must accept explicit weight and deadline duration parameters to fulfill Acceptance Criteria R2 ("Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps").

3. **Visual Corruption & Background Escalation**:
   From Observation 1 (R2, R3) and Observation 2 (`static/index.html`), the current 3-stage rot rendering and simple corruption roots fall far short of the 10-tier Lovecraftian abyss progression and 5-stage rot engine. The rendering loop must support:
   - Tier 0: Pitch black Empty Void (`#121417`) on fresh startup.
   - Tiers 1-10: Progressive visual layers scaling with dice stack count.
   - Average rot factor background hue shifting.
   - 5 rot stages with distinct color palettes, specular highlights, fissures, fungal decay, and twitch jitter.
   - Persistent slime puddles pooling on the floor plane.

4. **Hover Inspection Tooltip**:
   From Observation 1 (R4) and Observation 2 (`static/index.html`), a canvas `mousemove` handler with isometric bounding box hit testing for resting dice must be added to draw a 2px glowing pixel border and render a floating countdown tooltip (`CÒN: Xm Ys` or blinking red `QUÁ HẠN: +Xm Ys`).

5. **Streak & Game Loop Rules**:
   From Observation 1 (R5) and Observation 2 (`static/index.html:1242`), `sessionStreak` must be gated by the overdue state: overdue completion resets `sessionStreak = 0`, whereas on-time completion increments `sessionStreak` (displaying `+1 STREAK combo` when $\ge 2$). Clearing all tasks transitions the canvas to Zen Garden with dynamic Day/Night lighting.

---

## 3. Caveats

- **PyWebView Headless / Browser Fallback**: When testing on CI or environments without PyWebView display drivers, `run.bat` supports launching browser app mode (`msedge --app=...` or `chrome --app=...`). Automated tests should verify both PyWebView and HTTP/FastAPI endpoints.
- **Screen Resolution Scaling**: On Windows displays with high DPI (125% or 150%), `webview.screens[0]` dimensions may reflect virtualized or physical pixels depending on Windows OS DPI awareness. The anchor logic uses `max(0, ...)` to ensure window bounds remain within screen view.

---

## 4. Conclusion

The specification mining survey is complete. All requirements (R1 to R5), boundary conditions (10 dice limit, overdue thresholds, cold start vs. Zen Garden), formulas ($\text{rot\_factor}$, window anchor), color palettes, and visual cues have been mapped into `spec_report.md`. The gap analysis outlines exact files and lines needing implementation by downstream builder agents.

---

## 5. Verification Method

To independently verify the findings of this survey:
1. **Inspect Documentation**:
   - Review `spec_report.md` in this directory for the complete Feature Inventory and technical parameters.
   - Review `.agents/teamwork/ORIGINAL_REQUEST.md` to confirm 100% requirements coverage.
2. **Execute Existing Test Harness**:
   ```powershell
   .\.venv\Scripts\python.exe -m unittest discover tests
   ```
   *Expected outcome*: 21 tests pass without errors.
3. **Run Security Scanner**:
   ```powershell
   .\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
   ```
   *Expected outcome*: Clean pass (`[PASS] No secret leaks, destructive commands, or invariant violations detected`).
