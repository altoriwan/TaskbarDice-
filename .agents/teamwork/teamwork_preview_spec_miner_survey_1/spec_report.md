# TaskbarDice 2.5D Retro Desktop Widget: Comprehensive Specification Report

**Date**: 2026-10-24  
**Author**: Specification Mining Specialist (`teamwork_preview_spec_miner_survey_1`)  
**Status**: APPROVED & COMPLETE  
**Integrity Mode**: Development / Production-grade Overhaul  
**Authoritative Source**: `.agents/teamwork/ORIGINAL_REQUEST.md` (and existing codebase in `app.py`, `dice_logic.py`, `static/index.html`)

---

## 1. Executive Summary & Authoritative Spec Sources

The authoritative user request mandates a full overhaul of **TaskbarDice** into a production-grade retro 2.5D desktop widget. The widget simulates desktop task management as physical dice stacked in an isometric tower anchored above the Windows 11 Taskbar. The system introduces:
- A strictly constrained **400x420 zero-overflow flexbox layout** with a 2-row NES control panel.
- A **10-tier escalating Lovecraftian abyss background** responsive to dice count and corruption.
- A **5-stage time-scaled isometric die rot engine** with necrotic twitching and persistent slime floor puddles.
- A **pixel-art hover inspection tooltip** with real-time countdown / overdue warnings.
- **Streak combo logic with overdue penalties** and a dynamic **Zen Garden victory state** (Day/Night lighting).

### Authoritative Specification Hierarchy
1. **Primary Authority**: `ORIGINAL_REQUEST.md` (Invariants: R1 to R5, Acceptance Criteria).
2. **Implementation Blueprint**: `app.py` (Desktop windowing & PyWebView bridge), `dice_logic.py` (Task schema, NLP parsing, atomic persistence), `static/index.html` (Canvas 2D rendering loop & UI).
3. **Quality & Security Gates**: Existing test harness in `tests/`, AgentShield static security auditor (`security_scanner.py`).

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| **F01** | Window & Layout | Zero-Overflow 400x420 Frame | Borderless desktop window anchored above Windows 11 taskbar with zero clipping | Screen geometry (`screen_w`, `screen_h`), `margin_x: 16`, `margin_y: 64` | Frameless, on-top window at `(x, y)` sized 400x420 | Falls back to default resolution (1920x1080) if screen query fails | ORIGINAL_REQUEST.md §R1, `app.py:46-85` |
| **F02** | Window & Layout | 3-Part Column Flexbox | Exact vertical height distribution: Header (26px) + Canvas (320px) + Control Panel (74px) = 420px | DOM container layout | Rendered UI with 0px overflow and no scrollbars | Clamped via CSS `box-sizing: border-box`, `overflow: hidden` | ORIGINAL_REQUEST.md §R1 |
| **F03** | Control Panel | Row 1: Text Input & NES Add | Text field for task title taking 78% width, paired with a green NES ADD button taking 22% width | User keystrokes, button click, Enter key | Task creation trigger | Shakes container with `shake-anim` and rejects input if stack is at 10/10 capacity | ORIGINAL_REQUEST.md §R1 |
| **F04** | Control Panel | Row 2: Weight Selection | Radio-style button group `W: [1][2][3][4][5]` for explicit dice weight/size assignment | User click on `[1]`, `[2]`, `[3]`, `[4]`, or `[5]` | Active weight selection state (highlights active button) | Defaults to heuristic weight or W:2 if unselected | ORIGINAL_REQUEST.md §R1, Acceptance Criteria |
| **F05** | Control Panel | Row 2: Time Presets | Preset buttons `T: [15m][25m][1h][4h][..m]` determining deadline duration | User click on preset button or custom prompt for `..m` | Selected deadline interval (computed from `now`) | Custom prompt falls back to 4h if invalid entry or cancelled | ORIGINAL_REQUEST.md §R1 |
| **F06** | Abyss Engine | Tier 0 Empty Void | Startup background for fresh session with 0 tasks; pitch black `#121417` with guidance prompt | Active task count == 0 on initial boot | Renders `'TYPE TASK & ROLL TO BEGIN'` centered in `#121417` void | Distinct from Zen Garden (which triggers after completing tasks) | ORIGINAL_REQUEST.md §R2 |
| **F07** | Abyss Engine | Tiers 1-10 Escalating Abyss | Background visual escalates progressively from 1 to 10 stacked dice | Active dice count ($N \in [1, 10]$) | Procedural visual layers: Void (1), Cold Dust (2), Frost Cracks (3), Sprouting Thorns (4), Creeping Vines (5), Toxic Spores (6), Blood Veins (7), Demon Eyes (8), Abyssal Eclipse (9), Pandemonium Overload (10) | Clamped at Tier 10; overload warning triggered if user attempts 11th task | ORIGINAL_REQUEST.md §R2 |
| **F08** | Abyss Engine | Dynamic Rot Hue Shift | Canvas background tint smoothly shifts based on average rot factor across all active dice | `overallRot = sum(rot_factor) / count` | Color gradient shifts: Cold Slate `#121417` $\rightarrow$ Sickly Moss `#1a2418` $\rightarrow$ Cosmic Purple `#240f2e` $\rightarrow$ Abyssal Crimson `#380a1e` | Clamped between 0.0 and 1.0+ | ORIGINAL_REQUEST.md §R2 |
| **F09** | Rot Engine | 5-Stage Time Degradation | Die visual appearance evolves through 5 distinct corruption stages based on time elapsed | `rot = (now - created_at) / (deadline_at - created_at)` | Visual states: Stage 1 (0-20%), Stage 2 (20-40%), Stage 3 (40-60%), Stage 4 (60-80%), Stage 5 (80-100%+) | Overdue tasks clamped at Stage 5 with blinking red indicators | ORIGINAL_REQUEST.md §R3 |
| **F10** | Rot Engine | Necrotic Slime Floor Puddles | Stage 5 dice drip toxic slime droplets that hit the ground plane and accumulate into pooling puddles | Slime droplet collision at `y >= GROUND_Y` | Expanding pixel slime puddle entities on the floor plane | Memory pool capped at max 80 slime particles to prevent frame drops | ORIGINAL_REQUEST.md §R3, `static/index.html:624` |
| **F11** | Rot Engine | Twitch Vibration & Overdue Blink | Stage 5 dice tremble with high-frequency micro-jitter; overdue dice flash red label | High-frequency timer, `rot >= 0.8` or `now > deadline_at` | Rapid oscillating transform offset ($\pm 1-2\text{px}$), red label blinking at 500ms intervals | Jitter only applied to die rendering transform; physics target unaffected | ORIGINAL_REQUEST.md §R3 |
| **F12** | Inspection | Resting Die Hit Detection | Mouse movement over canvas identifies resting die under cursor | Cursor $(mx, my)$, resting dice coordinates $(cx, currentY)$ | Identified die object | Ignores moving/falling dice ($|currentY - targetY| > 2.0$) to avoid hovering glitch | ORIGINAL_REQUEST.md §R4, `static/index.html:1207` |
| **F13** | Inspection | Glowing Pixel Border Highlight | Hovered resting die is surrounded by an illuminated pixel outline | Hovered die bounding polygon | 2px glowing pixel boundary (gold `#ffd700` or cyan `#00ffff`) | Cleared immediately when mouse exits bounding box | ORIGINAL_REQUEST.md §R4 |
| **F14** | Inspection | Floating Countdown Tooltip | Floating retro HUD box displaying detailed task telemetry | Hovered die metadata, cursor position | Rendered box showing: Full Title, Weight, Stage X/5, and Countdown (`CÒN: Xm Ys` or blinking red `QUÁ HẠN: +Xm Ys`) | Box position clamped within canvas boundaries ($[4, 396] \times [4, 316]$) | ORIGINAL_REQUEST.md §R4 |
| **F15** | Game Loop | Streak Combo Increment | Completing a task before deadline increments the session streak | Task completion event, $\text{now} \le \text{deadline\_at}$ | `sessionStreak += 1`; floating text `+1 STREAK combo` when `sessionStreak >= 2` | None | ORIGINAL_REQUEST.md §R5 |
| **F16** | Game Loop | Overdue Penalty Reset | Completing an overdue Stage 5 task resets streak to zero | Task completion event, $\text{now} > \text{deadline\_at}$ | `sessionStreak = 0`; penalty warning toast/text | Resets combo multiplier instantly | ORIGINAL_REQUEST.md §R5 |
| **F17** | Victory State | Zen Garden Dynamic Lighting | Clearing all dice triggers a peaceful Zen Garden with dynamic Day/Night lighting based on local time | Active stack count transitions to 0, current local hour | Day (06:00-17:59): Radiant azure sky, sun, drifting clouds, butterflies, blooming flowers. Night (18:00-05:59): Twilight gradient, moon, stars | Maintained indefinitely until a new task is added | ORIGINAL_REQUEST.md §R2, §R5 |
| **F18** | Persistence | Thread-Safe Atomic Storage | Backend persists active and completed tasks to `tasks.json` using atomic replacement | Task dictionary records | `tasks.json` on disk, UTF-8 encoded | Uses `.tmp` file and `os.replace`; fallback to empty list on corrupted JSON | `dice_logic.py:136-211` |

---

## 3. Edge Cases & Boundary Conditions

| # | Feature | Input / Condition | Observed & Specified Behavior |
|---|---------|-------------------|-------------------------------|
| **E01** | Window Anchoring | Multi-monitor or secondary screen with custom scaling (125%/150%) | Query `webview.screens[0]` with graceful fallback to `(1920, 1080)`. Coordinates computed as `x = max(0, screen_w - 400 - 16)`, `y = max(0, screen_h - 420 - 64)`. Frameless window anchors cleanly above taskbar without disappearing off-screen. |
| **E02** | Flexbox Layout | Long task title or button text overflowing control panel | CSS `box-sizing: border-box`, `overflow: hidden`, exact heights: Header 26px, Canvas 320px, Control Panel 74px. Zero scrollbars or viewport overflow. Control panel inputs use fixed heights and `nowrap`. |
| **E03** | Tower Capacity | Attempting to add an 11th task when 10 dice are already stacked | Adding is rejected on frontend and backend (`{"status": "error", "error": "overload"}`). Input field is disabled with placeholder `"TOWER OVERLOAD (10/10) - CLEAR!"`. Control panel triggers NES warning shake animation. Canvas renders pulsing overload banner: `TOWER OVERLOAD (10/10)! CLEAR TASKS TO RESUME`. |
| **E04** | Stack Compaction | Stacking 10 maximum-weight (Weight 5) dice | Normal stacking step would exceed 320px canvas height. Compaction algorithm compresses vertical die spacing when stack $> 5$: `step = Math.max(11, Math.floor(180 / (count - 1)))`. The topmost die rests safely with peak $Y \ge 34\text{px}$, leaving clearance below 26px header. |
| **E05** | Rot Calculation | System clock altered or `deadline_at <= created_at` | Formula protects against zero/negative denominator: if `deadline_at - created_at <= 0`, rot factor evaluates to 1.0 (overdue Stage 5). If `now < created_at`, rot factor is clamped to 0.0 (Stage 1). |
| **E06** | Overdue Tooltip | Task overdue by 3 days, 4 hours, 12 minutes | Countdown displays blinking red string: `QUÁ HẠN: +76h 12m` (or `+Xm Ys` for intervals under 1 hour). Blinks at 2Hz (250ms on / 250ms off) to command urgency. |
| **E07** | Tooltip Boundary | Hovering the topmost die near $(x=10, y=36)$ or rightmost $(x=390, y=280)$ | Tooltip box dimensions ($\approx 160\text{px} \times 54\text{px}$) are dynamically clamped: if $y - \text{tooltipHeight} < 4$, render below die; if $x + \text{tooltipWidth} > 396$, shift left to $396 - \text{tooltipWidth}$. |
| **E08** | Hover on Moving Die | User hovers cursor over a die while it is falling or bouncing | Hover hit test checks velocity and displacement: if $|currentY - targetY| > 2.0$ or $|velocityY| > 0.5$, die is treated as non-resting; tooltip and glowing border are suppressed until die settles. |
| **E09** | Empty Startup vs. Clear | Cold start with empty `tasks.json` vs. completing last active task | Cold start displays **Tier 0 Empty Void** (`#121417` with text `'TYPE TASK & ROLL TO BEGIN'`). Completing tasks from $>0$ to $0$ triggers **Zen Garden Victory** with daytime/nighttime lighting and flower animations. Adding a task resets Zen Garden back to Tier 1 Void. |
| **E10** | Custom Preset `..m` | User clicks `..m` button and cancels prompt or inputs non-numeric string | Prompts for custom minutes. If input is empty, null, or non-numeric (`<= 0`), falls back safely to default 4-hour deadline without throwing exceptions. |
| **E11** | Text Input with Vietnamese Diacritics | Inputting Unicode strings (e.g., `Sửa lỗi thanh toán gấp chiều nay`, `Đọc sách 15p`) | UTF-8 sanitization strips ASCII control codes ($[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]$) while preserving full Vietnamese Unicode spectrum. Canvas renders text using fallback font chain and dynamic font metric truncation (`...`). |

---

## 4. Architectural & Technical Specifications

### 4.1 Window Geometry & Zero-Overflow Flexbox Layout (R1)
- **Outer Window Dimensions**: Exactly **400px (width) $\times$ 420px (height)**.
- **Screen Anchor Position**:
  - `margin_x = 16px`
  - `margin_y = 64px` (Windows 11 standard Taskbar clearance)
  - Anchor calculation:
    $$\begin{aligned}
    x &= \max(0, \text{screen\_width} - 400 - 16) \\
    y &= \max(0, \text{screen\_height} - 420 - 64)
    \end{aligned}$$
- **Flexbox Column Breakdown (Total = 420px, 0px Overflow)**:
  1. **Header Region**: `height: 26px`, `flex: 0 0 26px`.
     - Draggable window handle (`pywebview-drag-region`).
     - Title: `TASKBAR DICE :: RETRO 2.5D`.
     - Streak indicator or rot badge.
     - Retro close button `[X]`.
  2. **Canvas 2D Region**: `height: 320px`, `flex: 0 0 320px`, `width: 400px`.
     - Crisp pixelated rendering (`image-rendering: pixelated; image-rendering: crisp-edges;`).
     - Ground plane line at $Y = 286\text{px}$.
  3. **Control Panel Region**: `height: 74px`, `flex: 0 0 74px`, `width: 400px`.
     - Container style: NES dark panel (`background: #181a1d`, `border-top: 3px solid #000000`, `padding: 4px 6px`).
     - **Row 1 (`height: 32px`, `margin-bottom: 4px`)**:
       - Task Text Input (`width: 78%`, `height: 30px`): `placeholder="TYPE TASK & ROLL TO BEGIN"`, NES dark styling (`#212529`).
       - Green NES ADD Button (`width: 22%`, `height: 30px`): NES green button (`#92cc41`, hover `#76c442`, text `#000000`).
     - **Row 2 (`height: 28px`, `display: flex`, `gap: 6px`)**:
       - Weight Selector: Label `W:` + 5 buttons `[1][2][3][4][5]` (each $\approx 22\text{px}$ wide). Selected button styled with high-contrast NES yellow border (`#f7d51d`).
       - Time Preset Selector: Label `T:` + 5 buttons `[15m][25m][1h][4h][..m]` (each $\approx 32\text{px}$ wide). Selected button highlighted.

---

### 4.2 The 10 Escalating Lovecraftian Abyss Backgrounds (R2)

| Tier | Stack Count | Name | Primary Hue & Palette | Visual Elements & Procedural Cues |
|------|-------------|------|-----------------------|-----------------------------------|
| **Tier 0** | 0 (Fresh) | Empty Void | `#121417` (Pitch Black) | Static pitch black canvas; glowing pulsating instruction `'TYPE TASK & ROLL TO BEGIN'` centered at $(200, 160)$. |
| **Tier 1** | 1 Die | Cold Void | `#0e1117` to `#161b22` | Deep silent abyssal vacuum, faint subtle static grain. |
| **Tier 2** | 2 Dice | Cold Dust | `#13171f`, ash `#475569` | Floating ambient cosmic dust / ash particles drifting slowly upward ($vy \in [-0.2, -0.6]$). |
| **Tier 3** | 3 Dice | Frost Cracks | `#0f1d2e`, ice cyan `#38bdf8` | Fine crystalline jagged fissures fracturing reality at canvas borders. |
| **Tier 4** | 4 Dice | Sprouting Thorns | `#1a162b`, thorn `#312e81` | Sharp thorned brambles emerging from bottom corners reaching toward dice stack. |
| **Tier 5** | 5 Dice | Creeping Vines | `#1b122c`, vine `#581c87` | Thick undulating eldritch vines crawling along floor and side margins. |
| **Tier 6** | 6 Dice | Toxic Spores | `#141f14`, spore `#84cc16` | Luminescent bioluminescent toxic spores drifting and pulsating in size (2-4px). |
| **Tier 7** | 7 Dice | Blood Veins | `#260b14`, vein `#991b1b` | Pulsing crimson vascular network branching across the abyss walls with heartbeat rhythm. |
| **Tier 8** | 8 Dice | Demon Eyes | `#1f0514`, eye red `#ef4444` | Pairs of eerie glowing eldritch eyes opening, blinking, and staring from the shadows. |
| **Tier 9** | 9 Dice | Abyssal Eclipse | `#18041e`, corona `#a855f7` | Dark cosmic eclipse in canvas upper background with shimmering corrupt corona. |
| **Tier 10** | 10 Dice | Pandemonium Overload | `#2e0515`, chaos `#dc2626` | Reality tear, maximum abyss density, chaotic particle vortex, flashing red warning perimeter. |

#### Dynamic Hue Shift Formula
$$\text{Hue}_{\text{background}} = \text{lerp}\left(\text{Color}_{\text{Tier}}, \text{NecroticTone}(\text{overallRot}), \text{overallRot}^{1.5}\right)$$
As `overallRot` rises toward 1.0, the base tier colors become stained with sickly bile green (`#14532d`) and necrotic purple (`#3b0764`).

---

### 4.3 5-Stage Isometric Die Rot Engine (R3)

#### Rot Factor Formula
$$\text{rot\_factor} = \frac{\text{now} - \text{created\_at}}{\text{deadline\_at} - \text{created\_at}}$$
Clamped to $[0.0, \infty)$. $\text{rot} \ge 1.0$ designates **Overdue**.

| Stage | Range | Name | Palette (Top / Left / Right) | Physical & Visual Degradation |
|-------|-------|------|-------------------------------|--------------------------------|
| **1** | $0.00 \le \text{rot} < 0.20$ | Pristine Ivory | Top: `#f8f9fa`, Left: `#d6d8db`, Right: `#b0b5be` | Pure ivory finish, crisp dark pips (`#111111`), specular glint line on top edge, clean borders. |
| **2** | $0.20 \le \text{rot} < 0.40$ | Fading Yellow | Top: `#dedbb8`, Left: `#bfbca0`, Right: `#9e9b81` | Aging parchment yellowing, corner micro-scratches, dulled specular highlight. |
| **3** | $0.40 \le \text{rot} < 0.60$ | Cracked Stone | Top: `#a8a29e`, Left: `#78716c`, Right: `#57534e` | Weathered stone texture, 3-4 dark jagged fissures slicing across faces, chipped edges. |
| **4** | $0.60 \le \text{rot} < 0.80$ | Mossy Decay | Top: `#4d7c0f`, Left: `#365314`, Right: `#14532d` | Sickly moss patches, clustered green/purple fungal spores (`#84cc16`, `#a855f7`), creeping rootlets. |
| **5** | $\text{rot} \ge 0.80$ (Overdue if $\ge 1.0$) | Toxic Necrotic | Top: `#3b0764`, Left: `#2e1065`, Right: `#140428` | Necrotic purple/green slime, continuous dripping slime droplets, persistent floor puddles, high-frequency twitch jitter ($\pm 1.5\text{px}$). **Blinking red task label** if overdue. |

#### Slime Floor Puddles
- Droplets falling from Stage 5 dice splash at $Y = 286\text{px}$.
- Puddle entities expand horizontally (up to width $24\text{px}$, height $6\text{px}$) with toxic green `#84cc16` and purple `#c084fc` pixel contours.

---

### 4.4 Retro Hover Inspection Tooltip (R4)

#### Hit Testing Geometry
For a die $i$ centered at $cx = 200\text{px}$ with target position $currentY$, width $w$, height $h$, and isometric radius $ry = w / 4$:
- Horizontal bounds: $x \in [cx - w/2, cx + w/2]$
- Vertical bounds: $y \in [currentY - ry, currentY + ry + h]$
- **Resting Guard**: Hit test activates only when $|currentY - targetY| \le 2.0$ and $|velocityY| \le 0.5$.

#### Visual Highlight & Tooltip Content
- **Highlight**: 2px glowing pixel boundary with pulsing aura (`#ffd700` golden glint).
- **Tooltip Layout**: Floating pixel panel (`background: rgba(10, 12, 16, 0.95)`, `border: 2px solid #ffd700`, `font-family: 'Press Start 2P'`).
- **Telemetry Lines**:
  1. `TITLE: "<Full Uncut Title>"` (line-wrapped or sized for readability).
  2. `WEIGHT: <1-5> (MASS: <kg>)`
  3. `STATUS: STAGE <1-5>/5`
  4. **Timer**:
     - On-Time: `CÒN: <X>m <Y>s` (or `<X>h <Y>m` if $> 60\text{m}$).
     - Overdue: Blinking `#ef4444` text `QUÁ HẠN: +<X>m <Y>s` (or `+<X>h <Y>m`).

---

### 4.5 Overdue Penalty & Streak Combo Engine (R5)
- **Streak Tracker**: `sessionStreak` maintained in memory during session.
- **Completion Event Branching**:
  - If $\text{rot\_factor} \ge 1.0$ (Task Overdue):
    - `sessionStreak = 0` (Streak broken!).
    - Floating penalty message: `STREAK LOST! [OVERDUE PENALTY]` in red (`#ef4444`).
    - Screen shake magnitude: 2.
  - If $\text{rot\_factor} < 1.0$ (Task On-Time):
    - `sessionStreak += 1`.
    - If `sessionStreak >= 2`:
      - Floating combo text: `+1 STREAK! KEEP ROLLING` or `STREAK x<N> COMBO!` in bright yellow (`#f7d51d`).
    - Screen shake magnitude: 4, gold particle explosion.

---

### 4.6 Zen Garden Dynamic Day/Night Lighting (R5)
- **Activation**: Active dice stack count reaches exactly 0 after completing tasks.
- **Lighting Conditions**:
  - **Daytime ($06:00 \le \text{hour} < 18:00$)**:
    - Radiant azure sky gradient (`#38bdf8` $\rightarrow$ `#bae6fd`).
    - Golden pixel sun at $(330, 42)$ with pulsing 4-pixel corona rays.
    - Drifting white pixel clouds ($vx \in [0.01, 0.015]$).
    - Lush green meadow floor (`#15803d`, `#4ade80`).
    - 7 blooming pixel flowers (Red, Yellow, Blue, Pink, Purple, Orange, Cyan).
    - 2 fluttering pixel butterflies (golden `#fde047` and cyan `#67e8f9`).
    - Floating banner: `'ALL CLEAR. REST EASY.'` / `'SUNNY ZEN GARDEN'`.
  - **Nighttime / Twilight ($18:00 \le \text{hour} < 06:00$)**:
    - Twilight deep navy gradient sky (`#0f172a` $\rightarrow$ `#0c4a6e`).
    - Crescent golden pixel moon at $(336, 36)$.
    - 6 distant twinkling stars with periodic twinkle phase.
    - Deep emerald night grass (`#14532d`, `#052e16`).
    - Floating banner: `'ALL CLEAR. REST EASY.'` / `'ZEN GARDEN VICTORY'`.

---

## 5. Backend Schema & API Bridge Specifications

### 5.1 Enhanced Task Record Schema (`tasks.json`)
```json
{
  "id": "e315f4f5",
  "title": "Fix critical database index",
  "deadline_str": "15 phút",
  "deadline_at": "2026-10-24T14:15:00.000000",
  "created_at": "2026-10-24T14:00:00.000000",
  "weight_score": 4,
  "status": "pending",
  "completed_at": null
}
```

### 5.2 API Bridge Interface (`app.py` & `dice_logic.py`)
- `add_task(text: str, weight: Optional[int] = None, duration_mins: Optional[int] = None) -> Dict[str, Any]`
  - If `weight` is provided: `weight_score = max(1, min(5, weight))`.
  - If `duration_mins` is provided: `deadline_at = (now + timedelta(minutes=duration_mins)).isoformat()`.
  - If omitted: falls back to NLP regex heuristic in `parse_task_input`.
  - Rejects with `{"status": "error", "error": "overload"}` if active task count $\ge 10$.
- `complete_task(task_id: str) -> Dict[str, Any]`
  - Marks task completed, records `completed_at`, persists atomically.
- `get_tasks() -> List[Dict[str, Any]]`
  - Returns active tasks sorted or unsorted.

---

## 6. Implementation Gaps in Existing Codebase

| Component | Current State | Required State | Action Required |
|-----------|---------------|----------------|-----------------|
| **Window Size** | 400x300 (`app.py:67`, `static/index.html:24`) | **400x420** | Update window creation in `app.py`, CSS body in `static/index.html`. |
| **Window Anchor** | `margin_y: 56` (`app.py:46`) | **`margin_y: 64, margin_x: 16`** | Update `calculate_anchor_position` in `app.py`. |
| **Flexbox Layout** | Header 28px + Canvas 236px + Bottom Bar 64px | **Header 26px + Canvas 320px + Control Panel 74px** (0px overflow) | Re-architect HTML/CSS flex layout to exact heights. |
| **Control Panel** | Single row: Text input + submit button | **Row 1 (78%/22%) + Row 2 (W: [1-5], T: [15m-..m])** | Implement 2-row NES inputs and state handlers. |
| **Abyss Backgrounds**| 3 devMode stages with basic root branches | **10 Escalating Tiers (Void $\rightarrow$ Pandemonium)** + dynamic rot hue shift | Implement all 10 visual tier layers and color shift math. |
| **Rot Engine** | 3 coarse stages ($<0.4$, $<0.75$, $\ge 0.75$) | **5 Detailed Stages** (Ivory, Yellow, Stone, Mossy, Necrotic) | Refactor `drawRotIsometricDice` to 5-stage palette and cues. |
| **Floor Slime** | Slime drops vanish at ground | **Floor slime puddles accumulate & linger** | Add puddle state array and rendering. |
| **Inspection Tooltip** | None (only double-click modal exists) | **Canvas mousemove hover detection + glowing border + floating countdown tooltip** | Implement hover hit-test, glow border, and countdown box. |
| **Streak Penalty** | Increments on every complete (`static/index.html:1242`) | **Overdue resets streak = 0; on-time increments streak** | Add overdue check branch in task completion handler. |

---

## 7. Verification & Quality Gates

1. **Static Security Audit**:
   ```powershell
   .\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
   ```
   *Expectation*: Zero secret leaks, command injections, or path traversal vectors.
2. **Backend Unit & Boundary Tests**:
   ```powershell
   .\.venv\Scripts\python.exe -m unittest discover tests
   ```
   *Expectation*: 100% pass across parser, boundary, deadline, and storage suites.
3. **End-to-End Acceptance Verification**:
   - Verify 400x420 window rendered with no bottom overflow.
   - Verify task creation with explicit Weight=4, Time=15m records exact attributes.
   - Verify 10 dice stack without canvas overflow.
   - Verify hover inspection displays countdown or overdue warning.
   - Verify overdue completion resets streak to 0.
   - Verify clearing all tasks displays Zen Garden.
