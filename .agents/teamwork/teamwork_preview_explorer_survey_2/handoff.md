# Handoff Report: Frontend Survey & Architectural Analysis

**Agent**: `teamwork_preview_explorer_survey_2`  
**Handoff Type**: Hard (Task Complete)  
**Deliverable Document**: `.agents/teamwork/teamwork_preview_explorer_survey_2/frontend_survey.md`

---

## 1. Observation

### Obs 1: Window Dimensions and Anchor Positioning
- In `app.py`:
  - Lines 46-47: `def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):`
  - Line 67: `win_w, win_h = 400, 300`
  - Line 71: `html_path = os.path.join(base_dir, "static", "index.html")`
- In `static/index.html`:
  - Lines 24-26: `body { width: 400px; height: 300px; overflow: hidden; ... position: relative; }`
  - Lines 40-41: `.drag-header { ... height: 28px; ... position: absolute; top: 0; left: 0; }`
  - Lines 87-88: `#diceCanvas { ... width: 400px; height: 236px; ... }`
  - Line 253: `<canvas id="diceCanvas" width="400" height="236"></canvas>`
  - Lines 100-101: `.bottom-bar { ... height: 64px; ... position: absolute; bottom: 0; left: 0; }`

### Obs 2: Control Panel Input Rows
- In `static/index.html`:
  - Lines 256-268:
    ```html
    <div class="bottom-bar">
      <form class="task-form" id="taskForm">
        <input 
          type="text" 
          id="taskInput" 
          class="nes-input is-dark task-input" 
          placeholder="Type task & press Enter..." 
          autocomplete="off"
          required
        />
        <button type="submit" class="nes-btn is-primary btn-submit">ADD</button>
      </form>
    </div>
    ```
  - Missing any second row for Weight selector (`W: [1][2][3][4][5]`) or Time presets (`T: [15m][25m][1h][4h][..m]`).

### Obs 3: Die Rot Engine & Clamping
- In `static/index.html`:
  - Lines 435-436: `const rot = elapsed / totalSpan; return Math.max(0.0, Math.min(1.0, rot));` (clamped to 1.0; overdue `rot > 1.0` is discarded).
  - Lines 656-681:
    `if (rot < 0.4) { ... } else if (rot < 0.75) { ... } else { ... }` (only 3 visual brackets, instead of 5 discrete stages).
  - Lines 636-638: `if (p.y >= GROUND_Y + 4) { slimeParticles.splice(i, 1); }` (slime particles are deleted on ground contact, no floor puddles created).
  - Lines 797-819: `drawDiceLabel` sets color based on `rot >= 0.75 ? '#a3e635' : ...` (no blinking red label when overdue).
  - Die rendering in `drawRotIsometricDice` has no micro-jitter/twitch vibration when `rot >= 0.80`.

### Obs 4: Background Tiers & Initial State
- In `static/index.html`:
  - Lines 1000-1006:
    ```javascript
    if (diceStack.length === 0 && explosionParticles.length === 0) {
      renderZenGarden(ctx);
      updateAndDrawFloatingTexts(ctx);
      ctx.restore();
      requestAnimationFrame(animationLoop);
      return;
    }
    ```
  - When `diceStack.length === 0` on initial launch, it immediately renders the Zen Garden instead of Tier 0 Empty Void with `'TYPE TASK & ROLL TO BEGIN'`.
  - Lines 559-619: `drawCorruptionRoots(c, overallRot)` only draws basic bezier curves if `overallRot >= 0.05`. No Tier 1-10 escalating backgrounds exist.

### Obs 5: Hover Inspection Tooltip
- In `static/index.html`:
  - Lines 1197-1229: Only `canvas.addEventListener('dblclick', ...)` exists.
  - Search for `mousemove` or `tooltip` in `static/index.html` yields 0 matches.
  - No bounding box hit detection on resting dice during mouse move, no glowing pixel border, no floating countdown or overdue timer.

### Obs 6: Overdue Penalty on Task Completion
- In `static/index.html`:
  - Lines 1242-1246:
    ```javascript
    sessionStreak++;
    if (sessionStreak >= 2) {
      spawnFloatingText(200, 100, `+1 STREAK! KEEP ROLLING`, '#f7d51d');
    }
    ```
  - It increments `sessionStreak++` unconditionally without checking whether the task was overdue.

---

## 2. Logic Chain

1. **Layout & Box Model**:
   - `ORIGINAL_REQUEST.md` (R1) explicitly mandates: `400x420` window, `margin_y: 64, margin_x: 16`, flexbox column with Header 26px + Canvas 320px + Control Panel 74px (0px overflow).
   - From **Obs 1**, the current codebase runs at `400x300` with absolute positioning (`28px + 236px + 64px = 328px`, clipped by `height: 300px`).
   - Therefore, moving to a flexbox column (`display: flex; flex-direction: column; width: 400px; height: 420px; overflow: hidden`) with children `26px`, `320px`, and `74px` solves all overflow issues and provides exact spatial budget for the 2-row control panel and 10-dice vertical stack.

2. **Control Panel & Input Parameters**:
   - From **Obs 2**, the current input bar is a single row with only text input.
   - Requirement R1 requires Row 1 (Text 78% + ADD 22%) and Row 2 (Weight selection `W: 1-5` + Time presets `T: 15m, 25m, 1h, 4h, ..m`).
   - The 74px control panel can fit Row 1 (`32px`), Row 2 (`28px`), and `14px` padding/margins cleanly.
   - For Acceptance Criteria ("Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps"), Row 2 selections must be supplied to the task creation logic.

3. **Rot Engine & Stage Visuals**:
   - From **Obs 3**, the current code only supports 3 brackets and clamps rot factor to 1.0.
   - Removing the 1.0 clamp allows overdue detection (`rot >= 1.0` or `now > deadline_at`).
   - Adding 5 discrete stages (1: Ivory+shine, 2: Sandy yellow+scratches, 3: Stone+3-4 fissures, 4: Mossy decay+fungus dots+roots, 5: Toxic necrotic+twitch vibration+slime drips+floor puddles+blinking red overdue label) completely satisfies R3.

4. **Background Tiers & Void vs Victory State**:
   - From **Obs 4**, the current code renders Zen Garden on cold start with 0 tasks.
   - Introducing `hasAddedTaskAtLeastOnce` flag allows distinguishing:
     - Fresh startup with 0 tasks -> Tier 0 Empty Void (`#121417`) with `'TYPE TASK & ROLL TO BEGIN'`.
     - After tasks are cleared -> Peaceful Zen Garden victory state with Day/Night dynamic lighting.
   - Scaling background from Tier 1 to 10 with `diceStack.length` (Void -> Cold Dust -> Frost Cracks -> Sprouting Thorns -> Creeping Vines -> Toxic Spores -> Blood Veins -> Demon Eyes -> Abyssal Eclipse -> Pandemonium Overload) and dynamic hue shift with `overallRot` satisfies R2.

5. **Hover Inspection Tooltip**:
   - From **Obs 5**, mousemove detection and tooltips do not exist.
   - Adding a `mousemove` listener on canvas that tests resting dice bounding boxes (`currentY - ry` to `currentY + ry + height`), rendering an outer glowing pixel border, and displaying a floating retro tooltip with title, weight, stage, and countdown/overdue timer satisfies R4.

6. **Overdue Penalty**:
   - From **Obs 6**, session streak currently increments blindly.
   - Checking `isOverdue` in the completion handler and resetting `sessionStreak = 0` if overdue, while incrementing streak only for on-time tasks, satisfies R5.

---

## 3. Caveats

- **Pywebview vs Browser Environment**: During headless testing (e.g., in CI or unit test scripts), `window.pywebview` may be absent. The fallback local mock mode in `index.html` (lines 1177-1188) should be maintained so frontend testing can be conducted in standard browser / Playwright / headless environments without errors.
- **Font Availability**: `Press Start 2P` is loaded via Google Fonts CDN. In offline environments, the fallback `'monospace'` font will be used; all text metric calculations in `drawDiceLabel` dynamically measure text with `ctx.measureText` to avoid overflow.
- No caveats regarding specification ambiguities.

---

## 4. Conclusion

1. The frontend overhaul is well-bounded and entirely contained within `static/index.html` (with window dimension updates in `app.py`).
2. Detailed architectural designs, CSS rules, canvas drawing algorithms, and layout blueprints are documented in `frontend_survey.md`.
3. The implementation track can proceed systematically in milestones M1 to M5 without architectural friction.

---

## 5. Verification Method

1. **File Inspection**:
   - Verify `frontend_survey.md` exists and contains detailed blueprints:
     `view_file AbsolutePath="c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_survey_2\frontend_survey.md"`
2. **Current Backend Test Suite**:
   - Run: `python -m unittest tests/test_dice_logic.py` (Must pass with 0 errors).
3. **Frontend Implementation Verification Conditions**:
   - Height sum verification: Header (26px) + Canvas (320px) + Control Panel (74px) == 420px; `document.body.scrollHeight === 420` (0px overflow).
   - Control panel contains `#taskInput`, `#addBtn`, 5 weight buttons (`.btn-w`), and 5 time preset buttons (`.btn-t`).
   - Tier 0 screen shows text `'TYPE TASK & ROLL TO BEGIN'` when `diceStack.length === 0` on startup.
   - Mousemove on resting die triggers bounding box hit test and renders glowing border and tooltip.
