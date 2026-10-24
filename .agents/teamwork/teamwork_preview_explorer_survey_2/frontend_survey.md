# Frontend Architecture & Visual Engine Survey: TaskbarDice Overhaul

**Survey Agent**: `teamwork_preview_explorer_survey_2`  
**Date**: 2026-10-24  
**Project Root**: `c:\Users\haquo\Documents\antigravity\amazing-turing`  
**Target Specifications**: `ORIGINAL_REQUEST.md` (R1 - R5)

---

## 1. Executive Summary

TaskbarDice is a desktop productivity widget hosted in Python via `pywebview` (`app.py`), presenting a retro 2.5D pixel-art interface (`static/index.html`) rendered on an HTML5 `<canvas>`.
The authoritative request requires an overhaul into a **400x420 zero-overflow flexbox layout**, with a **2-row NES input panel**, **10 escalating Lovecraftian abyss backgrounds**, a **5-stage isometric die rot engine**, and a **retro hover inspection tooltip**.

Our inspection reveals that while `static/index.html` has an existing Canvas 2D engine with isometric dice drawing, gravity collapse, basic rot colors, particles, and a Day/Night Zen Garden, significant architectural gaps exist across all 5 core requirements. This survey provides a complete, line-by-line gap audit and concrete implementation blueprints.

---

## 2. File Inventory & Workspace Analysis

| File Path | Lines | Role & Status in Architecture |
|---|---|---|
| `static/index.html` | 1309 | **ACTIVE PRIMARY FRONTEND**. Implements embedded CSS, 2D Canvas rendering loop, isometric dice, falling physics, particles, anti-slacking modal, and pywebview API communication. |
| `app.py` | 90 | **DESKTOP HOST**. Configures `pywebview.create_window` (currently 400x300, margin_y=56), anchors to bottom-right taskbar, and exposes `TaskbarDiceAPI`. |
| `dice_logic.py` | 212 | **CORE LOGIC & STORAGE**. Task parsing heuristic, weight calculation (1-5), ISO timestamp generation, atomic JSON persistence in `tasks.json`. |
| `static/taskbar_dice.html` | 123 | *Legacy/Prototype*. Simple 280px DOM-based dice widget. Not used by `app.py`. |
| `static/index.cannon.html` | 211 | *Legacy/Prototype*. Three.js + Cannon.js 3D physics prototype ("Deadline Heavyweight"). |
| `static/js/*` & `static/css/custom.css` | Multiple | *Legacy*. Supporting files for Three.js/Cannon 3D visualizer; separate from 2D isometric TaskbarDice. |

---

## 3. Requirement Gap Matrix

| Requirement | Target Specification (`ORIGINAL_REQUEST.md`) | Current Implementation (`static/index.html`) | Gap Severity | Key Action Required |
|---|---|---|---|---|
| **R1. Window & Layout** | 400x420 window; bottom-right anchor `margin_x: 16`, `margin_y: 64`. Flexbox column: Header 26px + Canvas 320px + Control Panel 74px (0px overflow). | `app.py` sets 400x300, margin_y=56. `index.html` uses `position: relative`, header=28px (absolute), canvas=236px, bottom-bar=64px (absolute). | **HIGH** | Update `app.py` dimensions & margins. Refactor `index.html` body to flexbox column (`26px + 320px + 74px = 420px`). |
| **R1. 2-Row Control Panel** | Row 1: Text input (78%) + Green NES ADD button (22%).<br>Row 2: Weight selection (`W: [1][2][3][4][5]`) + Time presets (`T: [15m][25m][1h][4h][..m]`). | Single row only: text input + ADD button in 64px bar. No weight or time selection buttons. | **HIGH** | Redesign 74px panel with 2 rows. Row 1: input + button. Row 2: Weight radio/pills + Time preset buttons. Pass selections to API. |
| **R2. Lovecraftian Backgrounds** | Tier 0 (0 tasks): Empty Void (`#121417`) with `'TYPE TASK & ROLL TO BEGIN'`.<br>Tiers 1-10: Void -> Cold Dust -> Frost Cracks -> Sprouting Thorns -> Creeping Vines -> Toxic Spores -> Blood Veins -> Demon Eyes -> Abyssal Eclipse -> Pandemonium Overload.<br>Hue shift with rot factor. Clear all -> Zen Garden. | 0 tasks immediately renders Zen Garden on cold start. Only basic corruption roots bezier curves if `rot >= 0.05`. No 10 distinct tiers. No hue shift. | **HIGH** | Implement Tier 0 startup screen. Create procedural rendering for all 10 Lovecraftian tiers keyed to `diceStack.length`. Apply dynamic HSL/RGB hue shifting based on `overallRot`. Trigger Zen Garden only on task completion clear. |
| **R3. 5-Stage Rot Engine** | 5 Stages based on `(now - created) / (deadline - created)`:<br>Stage 1 (0-20%): Ivory + shine.<br>Stage 2 (20-40%): Sandy yellow + scratches.<br>Stage 3 (40-60%): Stone + 3-4 jagged fissures.<br>Stage 4 (60-80%): Mossy decay + fungus dots + roots.<br>Stage 5 (80-100%+): Necrotic purple/green + twitch vibration + continuous slime puddles on floor + blinking red label when overdue. | Only 3 rough tiers (`rot < 0.4`, `< 0.75`, `>= 0.75`). Rot factor clamped to `1.0` (swallowing overdue state). No die twitch vibration. Slime despawns at floor (no puddles). No blinking red label for overdue tasks. | **HIGH** | Implement exact 5-stage rot evaluation without 1.0 clamp. Add procedural fissure drawing, fungus dots, die twitch vibration in Stage 5, persistent floor slime puddle pool, and blinking red label. |
| **R4. Hover Inspection Tooltip** | Canvas `mousemove` hit detection on resting dice. Glowing pixel border around hovered die. Floating retro tooltip: Full Title, Weight, Stage X/5, Countdown ('CÒN: Xm Ys' or blinking red 'QUÁ HẠN: +Xm Ys'). | Only `dblclick` exists for modal completion. No `mousemove` listener, no glowing border, no floating countdown tooltip. | **HIGH** | Add `mousemove` / `mouseleave` hit testing on resting dice. Draw glowing pixel outline in render loop. Render floating retro NES tooltip with real-time countdown / overdue calculation. |
| **R5. Overdue Penalty & Streak** | Completing overdue Stage 5 task resets `sessionStreak = 0`. Completing on-time increments `sessionStreak` (+1 STREAK combo if >= 2). Clearing all tasks triggers Zen Garden. | `sessionStreak++` unconditionally on any complete. Overdue tasks are not penalized. | **MEDIUM** | In task completion handler, inspect `rot >= 1.0` (or `now > deadline_at`). If overdue, reset streak to 0; otherwise increment and trigger combo float text. |

---

## 4. Subsystem Deep Dive & Technical Analysis

### 4.1. Layout & Box Model Architecture

#### Dimensions & Coordinate Budget
- **Total Height**: `420px` (Strictly zero overflow).
- **Total Width**: `400px`.
- **Vertical Breakdown**:
  ```
  +-------------------------------------------------------+  ^
  | Header: 26px (Draggable region, badge, close button)  |  | 26px
  +-------------------------------------------------------+  v
  |                                                       |  ^
  | Canvas: 320px (Isometric dice, background, particles) |  | 320px
  |                                                       |  v
  +-------------------------------------------------------+  ^
  | Control Panel: 74px (2 rows of NES styled controls)   |  | 74px
  +-------------------------------------------------------+  v
  Total: 26 + 320 + 74 = 420px
  ```

#### CSS Refactoring Plan
```css
html, body {
  width: 400px;
  height: 420px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
  background-color: #121417;
  font-family: 'Press Start 2P', monospace;
  display: flex;
  flex-direction: column;
}

.drag-header {
  height: 26px;
  min-height: 26px;
  max-height: 26px;
  flex: 0 0 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: #1a1d20;
  border-bottom: 2px solid #000000;
  box-sizing: border-box;
}

#diceCanvas {
  width: 400px;
  height: 320px;
  flex: 0 0 320px;
  display: block;
  background-color: #121417;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  cursor: pointer;
  box-sizing: border-box;
}

.control-panel {
  height: 74px;
  min-height: 74px;
  max-height: 74px;
  flex: 0 0 74px;
  background: #181a1d;
  border-top: 2px solid #000000;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  gap: 3px;
}
```

#### 2-Row Control Panel Layout
```html
<div class="control-panel">
  <!-- Row 1: Text input (78%) + Green NES ADD button (22%) -->
  <div class="control-row row-1" style="display: flex; height: 32px; gap: 4px; align-items: center;">
    <input 
      type="text" 
      id="taskInput" 
      class="nes-input is-dark" 
      style="width: 78%; height: 32px; font-size: 7px; padding: 2px 6px;"
      placeholder="Type task & press Enter..." 
      autocomplete="off"
      required
    />
    <button 
      type="button" 
      id="addBtn" 
      class="nes-btn is-success" 
      style="width: 22%; height: 32px; font-size: 7px; padding: 0; display: flex; align-items: center; justify-content: center;"
    >ADD</button>
  </div>

  <!-- Row 2: Weight selection (W: [1][2][3][4][5]) + Time presets (T: [15m][25m][1h][4h][..m]) -->
  <div class="control-row row-2" style="display: flex; height: 28px; gap: 4px; align-items: center; justify-content: space-between; font-size: 6px;">
    <div class="selector-group weight-group" style="display: flex; align-items: center; gap: 2px;">
      <span style="color: #ffd700; margin-right: 2px;">W:</span>
      <button type="button" class="nes-btn btn-opt btn-w" data-w="1">1</button>
      <button type="button" class="nes-btn btn-opt btn-w" data-w="2">2</button>
      <button type="button" class="nes-btn btn-opt btn-w is-primary" data-w="3">3</button>
      <button type="button" class="nes-btn btn-opt btn-w" data-w="4">4</button>
      <button type="button" class="nes-btn btn-opt btn-w" data-w="5">5</button>
    </div>
    <div class="selector-group time-group" style="display: flex; align-items: center; gap: 2px;">
      <span style="color: #38bdf8; margin-right: 2px;">T:</span>
      <button type="button" class="nes-btn btn-opt btn-t" data-t="15m">15m</button>
      <button type="button" class="nes-btn btn-opt btn-t" data-t="25m">25m</button>
      <button type="button" class="nes-btn btn-opt btn-t" data-t="1h">1h</button>
      <button type="button" class="nes-btn btn-opt btn-t is-primary" data-t="4h">4h</button>
      <button type="button" class="nes-btn btn-opt btn-t" data-t="custom">..m</button>
    </div>
  </div>
</div>
```

---

### 4.2. 5-Stage Isometric Die Rot Engine & Physics

#### Rot Factor Formula
$$\text{rot\_factor} = \frac{\text{now} - \text{created\_at}}{\text{deadline\_at} - \text{created\_at}}$$
- Clamping must **NOT** cap at 1.0:
  ```javascript
  function getRawRotFactor(die) {
    if (devMode > 0) {
      if (devMode === 1) return 0.10; // Stage 1
      if (devMode === 2) return 0.30; // Stage 2
      if (devMode === 3) return 0.50; // Stage 3
      if (devMode === 4) return 0.70; // Stage 4
      if (devMode === 5) return 1.15; // Stage 5 (Overdue)
    }
    if (!die.created_at || !die.deadline_at) return 0.2;
    const createdTime = new Date(die.created_at).getTime();
    const deadlineTime = new Date(die.deadline_at).getTime();
    const now = Date.now();
    const totalSpan = deadlineTime - createdTime;
    if (totalSpan <= 0) return 1.0;
    return (now - createdTime) / totalSpan;
  }

  function getRotStage(rot) {
    if (rot < 0.20) return 1;
    if (rot < 0.40) return 2;
    if (rot < 0.60) return 3;
    if (rot < 0.80) return 4;
    return 5; // 80% to 100%+ or overdue
  }
  ```

#### Stage-by-Stage Visual Specification
1. **Stage 1 (0 - 20%): Pristine Ivory**
   - Palette: Top `#ffffff`, Left `#f1f5f9`, Right `#e2e8f0`, Pips `#0f172a`.
   - Feature: Crisp diagonal white shine highlight stripe across top face (`moveTo(cx - rx + 4, cy - 2); lineTo(cx - 2, cy - ry + 2);`).
2. **Stage 2 (20 - 40%): Fading Sandy Yellow**
   - Palette: Top `#fef08a`, Left `#eab308`, Right `#ca8a04`, Pips `#422006`.
   - Feature: Corner scratch accents (2-3 pixel ticks along top-left and top-right bevels).
3. **Stage 3 (40 - 60%): Cracked Weathered Stone**
   - Palette: Top `#d6d3d1`, Left `#a8a29e`, Right `#78716c`, Pips `#1c1917`.
   - Feature: 3-4 dark jagged fissures penetrating cube faces (broken multi-segment paths `#292524`).
4. **Stage 4 (60 - 80%): Mossy Decay & Roots**
   - Palette: Top `#84cc16`, Left `#65a30d`, Right `#4d7c0f`, Pips `#14532d`.
   - Feature: Purple/green fungus dots (`#a855f7`, `#22c55e`, 2x2 px patches) + creeping root tendrils wrapping around die corners.
5. **Stage 5 (80% - 100%+ / Overdue): Toxic Necrotic Corruption**
   - Palette: Top `#581c87`, Left `#3b0764`, Right `#1e1b4b`, Pips `#84cc16`.
   - **Twitch Vibration**: When rendering die at Stage 5, apply a micro-jitter offset:
     ```javascript
     const twitchX = (Math.sin(now * 0.05 + d.id.charCodeAt(0)) > 0.6) ? (Math.random() - 0.5) * 3 : 0;
     const twitchY = (Math.cos(now * 0.05 + d.id.charCodeAt(0)) > 0.6) ? (Math.random() - 0.5) * 2 : 0;
     ```
   - **Continuous Slime Drips**: Spawn drip particles (`#84cc16` and `#c084fc`) at a high rate from the bottom edge of Stage 5 dice.
   - **Floor Slime Puddles**: When slime particles land at `GROUND_Y`, instead of vanishing, they contribute to a persistent `slimePuddles` array. Floor puddles are drawn as expanding, slowly decaying horizontal green/purple ellipses or pixel spans on the ground platform (`ellipse(px, GROUND_Y + 2, radiusX, 3, 0, 0, Math.PI * 2)`).
   - **Blinking Red Label**: When `rot >= 1.0` (or `now > deadline_at`), the die text blinks red (`Math.floor(now / 250) % 2 === 0 ? '#ef4444' : '#ffffff'`).

---

### 4.3. Lovecraftian Abyss Background Visual Engine

#### Tier Progression Logic
The background tier directly tracks the active stack count `diceStack.length`:
- **Tier 0 (Stack = 0, Fresh Startup)**:
  - Deep pitch-black void `#121417`.
  - Centered retro blinking prompt: `'TYPE TASK & ROLL TO BEGIN'` (Gold `#ffd700` / Cyan `#38bdf8`).
- **Tier 1 (Stack = 1)**: *Void* — Sparse floating cosmic dust motes (5-8 faint grey particles).
- **Tier 2 (Stack = 2)**: *Cold Dust* — Drifting cold blue-grey fog motes with gentle horizontal parallax.
- **Tier 3 (Stack = 3)**: *Frost Cracks* — Subtle cyan/ice jagged lines creeping 20px in from canvas corners.
- **Tier 4 (Stack = 4)**: *Sprouting Thorns* — Sharp black/crimson thorns sprouting up along the bottom floor line.
- **Tier 5 (Stack = 5)**: *Creeping Vines* — Organic tendrils climbing up left and right canvas margins.
- **Tier 6 (Stack = 6)**: *Toxic Spores* — Drifting bioluminescent green spore particles rising upwards.
- **Tier 7 (Stack = 7)**: *Blood Veins* — Pulsing red/crimson vein network across the background canvas.
- **Tier 8 (Stack = 8)**: *Demon Eyes* — 2-4 pairs of glowing slit-pupil red/yellow eyes blinking in the background shadow.
- **Tier 9 (Stack = 9)**: *Abyssal Eclipse* — Pulsating dark purple/black circular void halo centered behind the stack.
- **Tier 10 (Stack = 10)**: *Pandemonium Overload* — Full eldritch overload: screen shake, pulsating red/purple vignette, twitching tendrils, and flashing overload warning banner.

#### Dynamic Hue Shifting with Rot Factor
Compute composite rot factor `totalRot = sum(rot) / count`.
Shift the background gradient base color based on `totalRot`:
- Low rot (0.0 - 0.3): Cold celestial indigo / dark slate (`hsl(220, 25%, 8%)`).
- Moderate rot (0.3 - 0.7): Diseased moss / murky olive (`hsl(100, 30%, 7%)`).
- High rot (0.7 - 1.0+): Abyssal necrotic purple / toxic crimson (`hsl(285, 45%, 6%)` to `hsl(350, 50%, 8%)`).

#### Zen Garden Victory Transition
- When the user completes tasks and reaches `diceStack.length === 0` (and `hasAddedTaskAtLeastOnce === true`), transition gracefully into the **Zen Garden** with dynamic Day/Night lighting (preserved from existing `renderZenGarden(c)`).

---

### 4.4. Retro Hover Inspection Tooltip Engine

#### Bounding Box Hit Detection on Resting Dice
Canvas dimensions: `400 x 320`.
Isometric cube dimensions:
- Center X: `centerX = 200`.
- Half width: `rx = cfg.width / 2`.
- Half height: `ry = cfg.width / 4`.
- Bounding Box:
  - $X \in [\text{centerX} - rx - 2, \text{centerX} + rx + 2]$
  - $Y \in [\text{currentY} - ry - 2, \text{currentY} + ry + \text{cfg.height} + 2]$
- Rest Check:
  $$\left|\text{currentY} - \text{targetY}\right| \le 2.0 \quad\text{and}\quad \left|\text{velocityY}\right| \le 0.5$$

#### Glowing Pixel Border
When a resting die is hovered:
- Draw an isometric pixel border 2px outward with a pulsing golden / cyan neon glow:
  ```javascript
  const glowAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha})`;
  ctx.lineWidth = 2;
  // Trace outer isometric perimeter
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry - 2);
  ctx.lineTo(cx + rx + 2, cy);
  ctx.lineTo(cx + rx + 2, cy + height);
  ctx.lineTo(cx, cy + ry + height + 2);
  ctx.lineTo(cx - rx - 2, cy + height);
  ctx.lineTo(cx - rx - 2, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  ```

#### Floating Retro Tooltip Specs
- Renders either directly above the die or near cursor (clamped within canvas bounds `[4, 396] x [4, 316]`).
- Visual style: Dark NES dialog box (`rgba(10, 12, 16, 0.95)` with 2px solid `#ffd700` border and 1px drop shadow).
- Text rows:
  1. Full Task Title (wrapped to max 32 chars per line, `#ffffff`).
  2. Weight & Stage: `W: [X] | STAGE: [S/5]` (`#92cc41`).
  3. Countdown Timer:
     - On-time: `CÒN: [X]m [Y]s` (or `[X]h [Y]m`) in `#38bdf8`.
     - Overdue: Blinking red `QUÁ HẠN: +[X]m [Y]s` in `#ef4444`.

---

### 4.5. Stacking, Gravity & Compaction Physics

- Target Canvas height is `320px` (vs current `236px`).
- Ground platform `GROUND_Y`:
  - Adjusted from `210px` to `285px`.
  - Leaves `35px` floor zone for shadows, slime puddles, and bottom boundary.
  - Leaves `285px` vertical headroom for 10 stacked dice.
- Compaction for 10 Dice:
  - Maximum stack height: 10 dice.
  - Base step is `cfg.height` (16px to 36px).
  - When `count > 5`, dynamic vertical step compression:
    $$\text{step} = \max\left(14, \left\lfloor \frac{220}{\text{count} - 1} \right\rfloor\right)$$
  - This guarantees the topmost die stays safely below the header line ($Y \ge 35\text{px}$).

---

### 4.6. Overdue Penalty & Streak Combo Engine

- In task completion handler:
  ```javascript
  const rot = getRawRotFactor(selectedTask);
  const isOverdue = (rot >= 1.0) || (Date.now() > new Date(selectedTask.deadline_at).getTime());

  if (isOverdue) {
    sessionStreak = 0;
    spawnFloatingText(200, 120, 'OVERDUE! STREAK RESET TO 0', '#ef4444');
  } else {
    sessionStreak++;
    if (sessionStreak >= 2) {
      spawnFloatingText(200, 100, `+1 STREAK! (${sessionStreak} COMBO)`, '#f7d51d');
    } else {
      spawnFloatingText(200, 100, 'TASK COMPLETE!', '#92cc41');
    }
  }
  ```

---

## 5. API Bridge Compatibility Plan

### Frontend `add_task` Invocation
Currently, `app.py` has:
```python
def add_task(self, text: str):
```
When user selects `Weight = 4` and `Time = 15m` from the Row 2 buttons:
- If `app.py` accepts optional parameters: `add_task(self, text: str, weight: int = None, minutes: int = None)` or a JSON string.
- Alternatively, frontend can format the input text with explicit markers: e.g. `"${title} (15p, weight 4)"` OR passing a structured payload.
- To guarantee 100% compliance with Acceptance Criteria ("Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps"):
  Updating `add_task` in `app.py` and `TaskStorage.add_task` to accept explicit `weight_score` and `duration_minutes` is the cleanest, most robust architecture.

---

## 6. Implementation Verification Checklist

1. [ ] Check 400x420 window rendering: verify `Header (26px) + Canvas (320px) + Control Panel (74px) = 420px`, 0px overflow.
2. [ ] Check Row 1 (Input 78% + ADD 22%) and Row 2 (W: [1-5] + T: [15m, 25m, 1h, 4h, ..m]) NES controls.
3. [ ] Verify Tier 0 Empty Void screen on fresh startup with 0 tasks displaying `'TYPE TASK & ROLL TO BEGIN'`.
4. [ ] Verify stacking from 1 to 10 dice triggers Tiers 1 through 10 with escalating Lovecraftian background elements without canvas clipping.
5. [ ] Verify dynamic background hue shifting with overall rot factor.
6. [ ] Verify 5 distinct die rot stages with shine (Stage 1), scratches (Stage 2), fissures (Stage 3), fungus/roots (Stage 4), and necrotic twitch/slime puddles/blinking overdue label (Stage 5).
7. [ ] Verify canvas mouse hover hit detection on resting dice: glowing pixel border and retro countdown / overdue tooltip.
8. [ ] Verify completing an overdue Stage 5 task resets `sessionStreak = 0`, whereas completing an on-time task increments streak.
9. [ ] Verify clearing all active tasks transitions to the Zen Garden victory state with dynamic Day/Night lighting.
