# Handoff Report: Milestone 1 Flexbox Layout Budget & Control Panel Exploration

## 1. Observation

### Current Architecture & Code Observations
1. **Window Size and Anchor Configuration (`app.py`)**:
   - `app.py:46`: `def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):`
   - `app.py:67`: `win_w, win_h = 400, 300`
   - `app.py:73-83`: `webview.create_window(title="TaskbarDice", url=html_path, width=win_w, height=win_h, x=x, y=y, frameless=True, on_top=True, js_api=api)`
   - Currently, window height is configured at `300px` with taskbar margin `margin_y: 56`, whereas Requirement R1 mandates `height = 420px`, `margin_y = 64`, `margin_x = 16`.

2. **Current Layout & Absolute Positioning (`static/index.html`)**:
   - `static/index.html:23-33`:
     ```css
     body {
       width: 400px;
       height: 300px;
       overflow: hidden;
       background-color: #121417;
       color: #ffffff;
       font-family: 'Press Start 2P', monospace;
       user-select: none;
       border: 3px solid #000000;
       position: relative;
     }
     ```
   - `static/index.html:36-49`: `.drag-header` uses `position: absolute; top: 0; left: 0; width: 100%; height: 28px;`
   - `static/index.html:85-93`: `#diceCanvas` uses `display: block; width: 400px; height: 236px;` and HTML `<canvas id="diceCanvas" width="400" height="236"></canvas>` at line 253.
   - `static/index.html:96-109`: `.bottom-bar` uses `position: absolute; bottom: 0; left: 0; width: 100%; height: 64px;`
   - **Crucial Layout Flaw in Current Code**: `body` has `border: 3px solid #000000;`. With `box-sizing: border-box`, 3px top + 3px bottom reduces available inner vertical height by 6px (420 - 6 = 414px). When children heights equal `26 + 320 + 74 = 420px`, the 6px deficit would result in vertical overflow or clipped content unless the body border is removed/replaced with `border: 0` or an inner `outline`.

3. **Current Control Panel Structure (`static/index.html:256-268`)**:
   - Only 1 row exists currently:
     ```html
     <div class="bottom-bar">
       <form class="task-form" id="taskForm">
         <input type="text" id="taskInput" class="nes-input is-dark task-input" placeholder="Type task & press Enter..." autocomplete="off" required />
         <button type="submit" class="nes-btn is-primary btn-submit">ADD</button>
       </form>
     </div>
     ```
   - Lacks Row 2 for Weight buttons (W: 1-5) and Time presets (T: 15m, 25m, 1h, 4h, ..m).
   - ADD button is currently blue (`is-primary`) instead of green NES (`is-success`).

4. **Canvas Resolution & Physics Constants (`static/index.html`)**:
   - `static/index.html:311`: `const GROUND_Y = 210;`
   - `static/index.html:453`: `d.targetY = GROUND_Y - cfg.ry - cfg.height;`
   - `static/index.html:446`: `const compressedStep = count > 5 ? Math.max(11, Math.floor(108 / (count - 1))) : null;`
   - `static/index.html:550`: `if (p.life <= 0 || p.y > 240)` (hardcoded explosion boundary based on 236px height)
   - `static/index.html:570-578`: Corruption roots baseline `sy: 236` and target `ty: 215`
   - `static/index.html:636`: Dripping slime floor contact `if (p.y >= GROUND_Y + 4)`
   - `static/index.html:831, 857`: Zen Garden gradients `c.createLinearGradient(0, 0, 0, 236);`
   - `static/index.html:885`: `c.fillRect(0, GROUND_Y, canvas.width, 26);`

5. **Backend API Signatures (`app.py:18-26` & `dice_logic.py:18-36`)**:
   - `app.py:18`: `def add_task(self, text: str):` only accepts a single string argument.
   - `dice_logic.py:207`: `def add_task(self, raw_text: str):` only passes `raw_text` to `parse_task_input(raw_text)`.
   - `dice_logic.py:18`: `def parse_task_input(raw_text: str):` calculates weight and deadline purely by regex heuristics, without accepting explicit overrides.

---

## 2. Logic Chain

### Step 1: Pixel-Perfect Flexbox Layout Budget (Total: 420px, 0px Overflow)
From **Observation 2**, the total height budget of the window is strictly 420px:
$$\text{Header (26px)} + \text{Canvas (320px)} + \text{Control Panel (74px)} = 420\text{px}$$

To guarantee **0px overflow** across modern WebKit/Blink webviews:
- `html, body` must have `margin: 0; padding: 0; width: 400px; height: 420px; overflow: hidden; box-sizing: border-box;`.
- `body` must NOT have `border: 3px solid #000000;`. Instead, use `border: 0;` (frameless window edges are already bounded by PyWebView/OS frame, or if an accent outline is desired, use `outline: 1px solid #212529; outline-offset: -1px;`).
- `body` must be configured as a Flexbox column:
  ```css
  body {
    display: flex;
    flex-direction: column;
    width: 400px;
    height: 420px;
    overflow: hidden;
    box-sizing: border-box;
    background-color: #121417;
  }
  ```
- **Child 1: Header (`.drag-header`)**:
  - `height: 26px; min-height: 26px; max-height: 26px; flex-shrink: 0;`
  - `box-sizing: border-box;`
  - `border-bottom: 2px solid #000000;` (leaving 24px inner height).
  - Children: Title (`font-size: 8px`), Rot status badge (`font-size: 7px`), Close button (`height: 18px`, `font-size: 8px`).
- **Child 2: Canvas (`#diceCanvas`)**:
  - `height: 320px; min-height: 320px; max-height: 320px; width: 400px; flex-shrink: 0;`
  - `box-sizing: border-box; display: block;`
  - HTML buffer attributes: `<canvas id="diceCanvas" width="400" height="320"></canvas>`.
  - 1:1 pixel buffer ensures sharp, non-distorted pixel art.
- **Child 3: Control Panel (`.control-panel`)**:
  - `height: 74px; min-height: 74px; max-height: 74px; flex-shrink: 0;`
  - `box-sizing: border-box;`
  - `border-top: 2px solid #000000;`
  - Internal budget calculation:
    - Total outer height: 74px
    - Top border: 2px
    - Padding top & bottom: 4px each = 8px
    - Available content height: $74 - 2 - 8 = 64\text{px}$
    - Row 1 height: 32px
    - Row 2 height: 28px
    - Gap between rows: 4px
    - $32 + 4 + 28 = 64\text{px}$ (Exact match!)

### Step 2: 2-Row Control Panel Layout & Interaction
From **Observation 3** and Requirement R1:
- **Row 1 (32px)**:
  - Width: 400px - (padding 6px * 2) = 388px.
  - Text input: `flex: 0 0 calc(78% - 4px); height: 30px; font-size: 8px;` (`class="nes-input is-dark task-input"`).
  - ADD button: `flex: 0 0 calc(22% - 4px); height: 30px; font-size: 8px;` with green NES class: `class="nes-btn is-success btn-submit"`.
- **Row 2 (28px)**:
  - Flex row with `display: flex; align-items: center; justify-content: space-between; width: 100%;`.
  - **Left Section: Weight selection (`W: [1][2][3][4][5]`)**:
    - Label `W:` (`font-size: 7px; color: #92cc41; font-weight: bold;`).
    - 5 compact NES pill buttons `[1]`, `[2]`, `[3]`, `[4]`, `[5]`.
    - Default state: none selected (auto-heuristic) or `[3]` active. Clicking toggles active class `is-active`.
  - **Right Section: Time presets (`T: [15m][25m][1h][4h][..m]`)**:
    - Label `T:` (`font-size: 7px; color: #f7d51d; font-weight: bold;`).
    - 5 preset buttons `[15m]`, `[25m]`, `[1h]`, `[4h]`, `[..m]`.
    - Clicking selects duration in minutes (`15`, `25`, `60`, `240`, `null`).

### Step 3: Canvas Resolution & Physics Bounds Update
From **Observation 4**, scaling canvas height from 236px to 320px (+84px) shifts the physics coordinate system:
1. **Ground Plane (`GROUND_Y`)**:
   - In old canvas (236px): `GROUND_Y = 210` (distance from bottom = $236 - 210 = 26\text{px}$).
   - In new canvas (320px): `GROUND_Y = 290` (distance from bottom = $320 - 290 = 30\text{px}$).
   - Soil ground bed: `fillRect(0, 290, 400, 30)`.
   - Grass & flowers: anchored at `GROUND_Y` ($290$).
2. **Stack Compaction & 10-Dice Headroom**:
   - Base die sits at `d.targetY = GROUND_Y - cfg.ry - cfg.height`.
     For Weight 5 ($ry=16, height=36$): `290 - 16 - 36 = 238px`.
   - Top banner is at $y=32$ to $50\text{px}$. Top die peak must not exceed $y=54\text{px}$.
   - Available vertical span for 10 dice: $238 - 54 = 184\text{px}$.
   - Dynamic step compaction formula:
     ```javascript
     const compressedStep = count > 5 ? Math.max(16, Math.floor(180 / (count - 1))) : null;
     ```
     For 10 dice: $\lfloor 180 / 9 \rfloor = 20\text{px}$ step (vs. cramped 12px in old version).
     Top die sits at $238 - 9 \times 20 = 58\text{px}$, peak at $58 - 8 = 50\text{px}$.
     All 10 dice stack cleanly with no clipping and visible labels!
3. **Explosion & Slime Particle Boundaries**:
   - Explosion particles: update removal condition from `p.y > 240` to `p.y > 324`.
   - Slime floor puddle threshold: `p.y >= GROUND_Y + 4` ($294\text{px}$).
4. **Procedural Corruption Roots**:
   - Update baseline start `sy: 320` (was 236).
   - Target convergence `ty: 295` (was 215).
   - Bezier control points adjusted proportionally to canvas height.
5. **Zen Garden Gradients**:
   - Sky gradient: `c.createLinearGradient(0, 0, 0, 320)`.

### Step 4: Backend API & Anchor Alignment
From **Observation 1 & 5**:
1. `app.py`:
   - `calculate_anchor_position(width: int = 400, height: int = 420, margin_x: int = 16, margin_y: int = 64)`
   - `win_w, win_h = 400, 420`
   - `add_task(self, text: str, weight: int = None, duration_minutes: int = None)`
2. `dice_logic.py`:
   - `parse_task_input(raw_text: str, weight: int = None, duration_minutes: int = None)`
   - If `weight` provided (1-5): override heuristic `weight_score = weight`.
   - If `duration_minutes` provided: calculate explicit `deadline_at = (now + timedelta(minutes=duration_minutes)).isoformat()`.
   - `TaskStorage.add_task(self, raw_text: str, weight: int = None, duration_minutes: int = None)`

---

## 3. Caveats

1. **System DPI Scaling in Win32 WebView**: On high-DPI displays (e.g. 125% or 150%), `pywebview` window size is in virtual pixels or DIPs. The Flexbox 400x420 ensures internal CSS pixels match the window viewport 1:1, preventing horizontal or vertical scrollbars.
2. **Backward Compatibility**: Calling `add_task(text)` without explicit `weight` or `duration_minutes` will transparently fall back to NLP heuristic parsing as tested in `tests/test_dice_logic.py`.
3. **No Caveats for Layout Budget**: The pixel math ($26 + 320 + 74 = 420$) is mathematically exact and eliminates the 6px overflow issue discovered in the old codebase.

---

## 4. Conclusion

Milestone 1 is ready for implementation with the following concrete, actionable specifications:
1. **Layout Transition**: Replace 400x300 absolute positioning with a strict Flexbox column:
   - Body: 400px x 420px, `display: flex; flex-direction: column; overflow: hidden; margin: 0; padding: 0; border: 0;`.
   - Header: 26px height, `border-bottom: 2px solid #000`.
   - Canvas: 320px height, 400px width (both DOM attributes and CSS).
   - Control Panel: 74px height, `border-top: 2px solid #000; padding: 4px 6px;` containing 2 rows (Row 1: 32px with 78% input + 22% green NES ADD; Row 2: 28px with W: 1-5 and T: 15m/25m/1h/4h/..m).
2. **Physics Bounds Updates**:
   - `GROUND_Y = 290`.
   - Compaction formula: `count > 5 ? Math.max(16, Math.floor(180 / (count - 1))) : null`.
   - Particle ceiling/floor boundaries updated to 320px.
   - Procedural corruption roots updated to `sy: 320, ty: 295`.
3. **API & Anchor Updates**:
   - `app.py`: `calculate_anchor_position(400, 420, 16, 64)`, window dimensions 400x420.
   - `dice_logic.py` and `app.py`: `add_task` accepts optional `weight` and `duration_minutes`.

---

## 5. Verification Method

### Automated Unit Test Commands
1. Run existing unit tests to confirm backward compatibility:
   ```powershell
   .venv\Scripts\python -m unittest tests/test_dice_logic.py
   ```
2. Verify explicit parameter parsing in `dice_logic.py`:
   ```powershell
   .venv\Scripts\python -c "from dice_logic import parse_task_input; t = parse_task_input('test', weight=4, duration_minutes=15); assert t['weight_score'] == 4; print('Parsed OK:', t['weight_score'], t['deadline_str'])"
   ```
3. Verify anchor coordinates calculation:
   ```powershell
   .venv\Scripts\python -c "from app import calculate_anchor_position; x, y = calculate_anchor_position(); print('Anchor:', x, y); assert y >= 0"
   ```

### DOM & Layout Verification
1. Open `static/index.html` in headless or browser inspection.
2. Verify computed styles:
   - `document.body.offsetHeight === 420`
   - `document.querySelector('.drag-header').offsetHeight === 26`
   - `document.getElementById('diceCanvas').offsetHeight === 320`
   - `document.querySelector('.control-panel').offsetHeight === 74`
   - `document.body.scrollHeight === 420` (0px overflow, no scrollbars).
