# Project: TaskbarDice Overhaul

## Architecture
- **Desktop Host**: `pywebview` window (Win32 edge/chromium webview), sized 400x420, anchored directly above the Windows 11 Taskbar with `margin_y: 64, margin_x: 16`.
- **Backend API & Logic**: `app.py` exposes JS bridge `TaskbarDiceAPI` (with endpoints `get_tasks`, `add_task`, `complete_task`, `delete_task`, `get_state`). Core business logic and persistence resides in `dice_logic.py` and `tasks.json`.
- **Frontend Architecture**: Single-page application in `static/index.html` with:
  - Flexbox column container (400px width x 420px height):
    - Header: 26px
    - Canvas: 320px
    - Control Panel: 74px (Row 1: Text input 78% + ADD button 22%; Row 2: Weight selector W: [1][2][3][4][5] + Time presets T: [15m][25m][1h][4h][..m])
    - Total: 420px (0px overflow).
  - Canvas 2.5D Isometric Rendering Engine:
    - Background Engine: Tier 0 (Empty Void `#121417` with 'TYPE TASK & ROLL TO BEGIN') to Tiers 1-10 (Cold Dust -> Frost Cracks -> Sprouting Thorns -> Creeping Vines -> Toxic Spores -> Blood Veins -> Demon Eyes -> Abyssal Eclipse -> Pandemonium Overload). Dynamic hue shift based on average rot factor. Zen Garden mode upon clearing all dice.
    - Die Rot Engine: 5 distinct visual stages based on `rot = (now - created_at) / (deadline_at - created_at)`. Specular highlights, fissures, moss, fungus dots, twitch jitter, continuous slime drips forming floor puddles, and blinking red overdue label.
    - Hover Inspection: `mousemove` bounding box hit test on resting dice, rendering a 2px glowing pixel border and retro floating countdown tooltip.
    - Streak Combos: Overdue task completion resets `sessionStreak = 0`; on-time completion increments `sessionStreak` (+1 STREAK combo if >= 2).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Window Dimensions & Anchor | 400x420 window anchored above taskbar (`margin_y: 64, margin_x: 16`) | M1 | R1 |
| 2 | Flexbox Column Budget | Header 26px + Canvas 320px + Control Panel 74px (0px overflow) | M1 | R1 |
| 3 | Control Panel Row 1 | Text input (78%) + Green NES ADD button (22%) | M1 | R1 |
| 4 | Control Panel Row 2 | Weight buttons (W: 1,2,3,4,5) + Time presets (T: 15m, 25m, 1h, 4h, ..m) | M1 | R1 |
| 5 | Explicit Weight & Time API | `add_task` accepts explicit `weight` (1-5) and duration parameters | M1 | R1, AC2 |
| 6 | Tier 0 Empty Void | Startup background `#121417` with 'TYPE TASK & ROLL TO BEGIN' | M2 | R2 |
| 7 | Tiers 1-10 Abyss Progression | 10 escalating Lovecraftian background themes scaling with dice count | M2 | R2 |
| 8 | Dynamic Rot Hue Shift | Canvas background shifts hue dynamically with average rot factor | M2 | R2 |
| 9 | Zen Garden Day/Night Lighting | Clearing all dice smoothly transitions to Zen Garden with dynamic day/night light | M2 | R2, R5 |
| 10 | Rot Factor Calculation | `rot = (now - created_at) / (deadline_at - created_at)` with unclamped overdue | M3 | R3 |
| 11 | Rot Stages 1 to 4 Visuals | Stage 1 (Ivory/shine), Stage 2 (Sandy/scratches), Stage 3 (Fissures), Stage 4 (Moss/fungus/roots) | M3 | R3 |
| 12 | Stage 5 Necrotic & Twitch | Necrotic purple/green, twitch jitter offsets, blinking red label when overdue | M3 | R3 |
| 13 | Slime Drips & Floor Puddles | Continuous slime drips from Stage 5 dice pooling persistently on floor plane | M3 | R3 |
| 14 | Resting Die Hit Detection | `mousemove` detects resting die isometric bounding box on canvas | M4 | R4 |
| 15 | Glowing Pixel Border | 2px glowing border rendered around hovered resting die | M4 | R4 |
| 16 | Retro Floating Tooltip | Tooltip displaying Title, Weight, Stage X/5, Countdown Timer (`CÒN` or blinking `QUÁ HẠN`) | M4 | R4 |
| 17 | Overdue Streak Penalty | Completing overdue task resets `sessionStreak = 0` | M5 | R5, AC5 |
| 18 | On-Time Streak Combo | Completing on-time task increments streak (+1 STREAK combo if >= 2) | M5 | R5 |
| 19 | E2E Probe & Security Verification | Comprehensive test harness, E2E probe script, and AgentShield security scan pass 100% | M5 | AC7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 400x420 Flexbox Layout & 2-Row Control Panel & Explicit Backend API | `app.py`, `dice_logic.py`, `static/index.html` (layout, header 26px, canvas 320px, panel 74px, W 1-5, T presets, anchor 64/16) | none | DONE |
| M2 | 10 Escalating Lovecraftian Abyss Backgrounds & Zen Garden | `static/index.html` (Tier 0 void, Tiers 1-10 themes, rot hue shift, Zen Garden day/night) | M1 | DONE |
| M3 | 5-Stage Isometric Die Rot Engine & Physics/Puddles | `static/index.html` (5 rot stages, fissures, moss, necrotic twitch, slime drips & floor puddles, blinking overdue label) | M1 | IN_PROGRESS |
| M4 | Retro Hover Inspection Tooltip | `static/index.html` (bounding box detection, glowing pixel border, floating clamped countdown/overdue tooltip) | M1, M3 | PLANNED |
| M5 | Overdue Penalty, Session Streak & E2E Integration & Verification | `static/index.html`, `tests/test_e2e_probe.py`, `tests/` (streak penalty/combo, 100% E2E probe, AgentShield scan) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Frontend (`static/index.html`) ↔ Backend (`app.py`, `dice_logic.py`)
- `window.pywebview.api.add_task(text, weight, duration_minutes)`
  - `text`: string (required)
  - `weight`: integer between 1 and 5 (optional, defaults to heuristic parsing or 1)
  - `duration_minutes`: integer (optional, defaults to preset or heuristic parsing, e.g. 15, 25, 60, 240)
  - Returns: `{ "status": "ok", "task": { "id": str, "title": str, "weight_score": int, "created_at": ISO_str, "deadline_at": ISO_str, "deadline_str": str } }`
- `window.pywebview.api.complete_task(task_id)`
  - `task_id`: string (required)
  - Returns: `{ "status": "ok", "completed_task": dict, "was_overdue": bool }`
- `window.pywebview.api.get_tasks()`
  - Returns: `{ "tasks": [ ... ], "session_streak": int }`

## Code Layout
- `app.py`: Window initialization, anchor positioning calculation, PyWebView bridge API.
- `dice_logic.py`: Task management, NLP heuristic parsing with explicit parameter overrides, atomic JSON storage, rot calculation helpers.
- `static/index.html`: Complete UI presentation, CSS Flexbox styling, Canvas 2.5D isometric renderer, physics simulation, particles/puddles, tooltip overlay.
- `tests/`:
  - `tests/test_dice_logic.py`: Unit tests for task parsing, rot calculation, weight and duration handling.
  - `tests/test_app.py`: Unit tests for API endpoints and anchor calculation.
  - `tests/test_e2e_probe.py`: Automated end-to-end headless probe verifying layout dimensions, API contracts, background tiers, rot stages, hover inspection, and streak penalties.
