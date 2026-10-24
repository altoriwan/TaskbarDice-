# Comprehensive Backend & Architecture Survey: TaskbarDice

## 1. Executive Summary & Architectural Overview

The repository currently contains two distinct architectural paradigms:

1. **Desktop Widget Paradigm (`app.py`, `dice_logic.py`, `tasks.json`, `static/index.html`)**:
   - The primary target for the **TaskbarDice** desktop widget specified in `ORIGINAL_REQUEST.md`.
   - Uses **`pywebview`** (version `>=6.2.1`) to render a frameless, topmost desktop window directly anchored above the Windows taskbar.
   - Operates **without HTTP networking**: `pywebview` creates an in-process Python-JavaScript bridge via `js_api=TaskbarDiceAPI()`. The frontend calls `window.pywebview.api.add_task()`, `window.pywebview.api.get_tasks()`, and `window.pywebview.api.complete_task()`.
   - Storage is handled locally by `TaskStorage` in `dice_logic.py`, persisting records to `tasks.json`.

2. **Web Service Paradigm (`main.py`, `app/`, `run.bat`)**:
   - A standalone FastAPI server named "Deadline Heavyweight" running on `http://127.0.0.1:8000`.
   - Hosts Rapier 3D WASM physics endpoints (`/api/analyze-deadline`) and SQLite batch storage (`app/storage.py`).
   - Launched via `run.bat` using browser app-mode flags (`msedge.exe --app=http://127.0.0.1:8000`).
   - Completely independent from the desktop widget in `app.py`.

---

## 2. Desktop Window Creation & Taskbar Sizing Analysis

### Current Implementation (`app.py`)
- **Dimensions**: Hardcoded to `win_w, win_h = 400, 300` (`app.py:67`).
- **Margins**: Hardcoded to `margin_x: 16, margin_y: 56` (`app.py:46`).
- **Positioning Calculation**:
  ```python
  def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):
      screens = webview.screens
      if screens and len(screens) > 0:
          screen = screens[0]
          screen_w, screen_h = screen.width, screen.height
      else:
          screen_w, screen_h = 1920, 1080

      x = max(0, screen_w - width - margin_x)
      y = max(0, screen_h - height - margin_y)
      return x, y
  ```
- **Window Initialization**:
  ```python
  window = webview.create_window(
      title="TaskbarDice",
      url=html_path,
      width=win_w,
      height=win_h,
      x=x,
      y=y,
      frameless=True,
      on_top=True,
      js_api=api
  )
  ```

### Requirements Delta & Necessary Adjustments (`ORIGINAL_REQUEST.md` R1)
1. **Window Height**: Must be changed from **`300px`** to **`420px`**.
2. **Taskbar Margin Y**: Must be changed from **`56px`** to **`64px`** (exact height of the Windows 11 taskbar plus clearance). Margin X remains **`16px`**.
3. **Internal Zero-Overflow Budget (400x420)**:
   - Header: **26px** (currently 28px in `static/index.html`).
   - Canvas: **320px** (currently 236px in `static/index.html`).
   - Control Panel: **74px** (currently 64px in `static/index.html`).
   - Sum: `26 + 320 + 74 = 420px` (0px overflow).
   - In `static/index.html`, the layout must transition from absolute positioning with hardcoded `height: 300px` to a flexbox column container (`display: flex; flex-direction: column; height: 420px; overflow: hidden;`).

---

## 3. Data Model & Storage Schema (`tasks.json` & `dice_logic.py`)

### Schema Specification
A task record persisted in `tasks.json` exhibits the following JSON structure:

```json
{
  "id": "51dc3e83",
  "title": "Fix payment crash",
  "deadline_str": "15m",
  "deadline_at": "2026-10-24T17:25:42.391516",
  "weight_score": 4,
  "created_at": "2026-10-24T13:25:42.391516",
  "status": "pending",
  "completed_at": null
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `str` | 8-character unique hexadecimal string (`uuid.uuid4().hex[:8]`) |
| `title` | `str` | Sanitized task title (surrounding whitespace stripped, control characters removed) |
| `deadline_str` | `str` | Display text representation (e.g., `"15m"`, `"1h"`, `"Hôm nay"`) |
| `deadline_at` | `str` | Exact ISO-8601 deadline timestamp |
| `weight_score` | `int` | Integer from 1 to 5 governing die size, mass, and stack foundation |
| `created_at` | `str` | Exact ISO-8601 creation timestamp |
| `status` | `str` | `"pending"` or `"completed"` |
| `completed_at` | `str` \| `null` | ISO-8601 completion timestamp (added upon completion) |

### Persistence & Concurrency Engine (`TaskStorage`)
- **Thread Safety**: Protected with `threading.Lock()` across all disk read and write operations.
- **Atomic File Writes**:
  ```python
  def _atomic_write_locked(self) -> bool:
      temp_path = f"{self.filepath}.tmp"
      with open(temp_path, "w", encoding="utf-8") as f:
          json.dump(self.tasks, f, ensure_ascii=False, indent=2)
      os.replace(temp_path, self.filepath)
  ```
  Guarantees zero corruption during sudden shutdowns or crashes.
- **Empty File Decoder Quirk**: In `load_tasks()`, if `tasks.json` exists but has 0 bytes (e.g. from `tempfile.NamedTemporaryFile`), `json.load()` throws a `JSONDecodeError` which is caught and printed as an error log. Adding a check for `os.path.getsize(self.filepath) == 0` cleanly prevents noisy error output during tests.

### Extension Required for Row 2 Input (Weight & Time Presets)
- Currently, `TaskStorage.add_task(raw_text)` and `parse_task_input(raw_text)` only parse heuristics from raw text string.
- To satisfy Acceptance Criterion 2 (*"Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps"*):
  `parse_task_input` and `add_task` should accept optional explicit parameters:
  ```python
  def parse_task_input(
      raw_text: str,
      weight: Optional[int] = None,
      duration_minutes: Optional[int] = None
  ) -> Dict[str, Any]:
  ```
  If `weight` is passed (1-5), it overrides heuristic score.
  If `duration_minutes` is passed (e.g. 15, 25, 60, 240), `deadline_at` is set to `now + timedelta(minutes=duration_minutes)` and `deadline_str` to `${duration_minutes}m`.
  `TaskbarDiceAPI.add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None)` can directly expose this to the JS bridge.

---

## 4. Endpoints & API Bridge Surface

The `TaskbarDiceAPI` exposed to `pywebview` currently implements:

1. **`add_task(text: str)`**:
   - Checks active tasks count (`len(active_tasks) >= 10`). Rejects with `{"status": "error", "error": "overload"}` if limit reached.
   - Needs parameter update to accept `(text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None)`.
2. **`get_tasks()`**:
   - Returns all active tasks (`status != "completed"`).
3. **`complete_task(task_id: str)`**:
   - Sets `status = "completed"` and writes `completed_at = datetime.now().isoformat()`.
   - Returns `{"status": "ok", "task_id": task_id}`.
   - Can easily return `is_overdue: bool` by comparing `completed_at > deadline_at`.
4. **`delete_task(task_id: str)` (Proposed)**:
   - Can be added to `TaskStorage` and `TaskbarDiceAPI` for administrative task removal if needed.
5. **`close_app()`**:
   - Destroys the pywebview window or invokes `sys.exit(0)`.

---

## 5. Session Streak & Overdue Penalty (R5) Analysis

- **Current State**:
  In `static/index.html:323`, `let sessionStreak = 0;` is declared.
  In `confirmCompleteBtn` handler (`index.html:1242`), `sessionStreak++` is executed unconditionally.
  If `sessionStreak >= 2`, floating text `+1 STREAK! KEEP ROLLING` is displayed.
- **Bug / Non-Compliance**:
  Completing an overdue task (rot factor >= 1.0 or `now > deadline_at`) currently **increments** streak instead of **resetting** it to 0.
- **Required Implementation**:
  ```javascript
  const isOverdue = Date.now() > new Date(selectedTask.deadline_at).getTime();
  if (isOverdue) {
    sessionStreak = 0;
    spawnFloatingText(centerX, 100, 'OVERDUE! STREAK RESET', '#ef4444');
  } else {
    sessionStreak++;
    if (sessionStreak >= 2) {
      spawnFloatingText(centerX, 100, `+1 STREAK! (${sessionStreak})`, '#f7d51d');
    }
  }
  ```

---

## 6. Rot Factor Calculation & The 5-Stage Isometric Engine (R3)

- **Formula**:
  $$\text{rot} = \frac{\text{now} - \text{created\_at}}{\text{deadline\_at} - \text{created\_at}}$$
- **Current State in `static/index.html`**:
  `getEffectiveRotFactor(die)` clamps `rot` to `[0.0, 1.0]` and only 3 visual tiers are drawn (`< 0.4`, `< 0.75`, `>= 0.75`).
- **Required 5 Stages**:
  1. **Stage 1 (0% - 20%)**: Pristine ivory (`#f8f9fa`, `#d6d8db`, `#b0b5be`) + shine highlight.
  2. **Stage 2 (20% - 40%)**: Fading sandy yellow (`#dedbb8`, `#bfbca0`, `#9e9b81`) + corner scratches.
  3. **Stage 3 (40% - 60%)**: Cracked stone (`#a8a29e`, `#78716c`, `#57534e`) + 3-4 dark jagged fissures.
  4. **Stage 4 (60% - 80%)**: Mossy decay (`#4d7c0f`, `#365314`, `#1e3a1e`) + purple/green fungus dots + creeping roots.
  5. **Stage 5 (80% - 100%+ / Overdue)**: Toxic necrotic purple/green (`#581c87`, `#3b0764`, `#022c22`) + twitch vibration + continuous slime drips. Blinking red label when overdue (`rot >= 1.0`).
- **Dev Speed-Test Key 'D'**:
  Currently cycles 0 to 3. Should cycle through all 5 stages plus Realtime (0: Realtime, 1: Stage 1, 2: Stage 2, 3: Stage 3, 4: Stage 4, 5: Stage 5).

---

## 7. Lovecraftian Abyss Backgrounds (R2) & Hover Inspection (R4)

### Backgrounds (R2)
- **Startup Tier 0**: Empty Void (`#121417`) with `'TYPE TASK & ROLL TO BEGIN'`. Currently, 0 tasks immediately renders Zen Garden.
- **Tiers 1 to 10**: Scaling with stack count (1 to 10):
  1: Void -> 2: Cold Dust -> 3: Frost Cracks -> 4: Sprouting Thorns -> 5: Creeping Vines -> 6: Toxic Spores -> 7: Blood Veins -> 8: Demon Eyes -> 9: Abyssal Eclipse -> 10: Pandemonium Overload.
- **Zen Garden Victory**: Triggered when active tasks count transitions to 0 after completing tasks.

### Hover Inspection Tooltip (R4)
- Currently missing: No `mousemove` handler on `#diceCanvas`.
- Hit testing must check cursor coordinates against resting dice bounding boxes.
- On hover: render glowing pixel border around die + retro tooltip displaying Title, Weight, Stage X/5, and countdown (`'CÒN: Xm Ys'` or blinking red `'QUÁ HẠN: +Xm Ys'`).

---

## 8. Test Harness & Security Scan Findings

### Test Execution Commands & Results
1. **Unit Test Suite**:
   - Command: `.\.venv\Scripts\python.exe -m unittest discover -s tests`
   - Result: **21 tests executed, 0 failures, 0 errors (100% PASS)** in 0.062s.
   - Note: The global python interpreter (`python`) fails with `ModuleNotFoundError: No module named 'fastapi'` because dependencies are installed into workspace `.venv`. All scripts and tests must run via `.\.venv\Scripts\python.exe`.

2. **Benchmark Regression Suite (`self-evolver`)**:
   - Command: `.\.venv\Scripts\python.exe .agents/skills/self-evolver/scripts/benchmark_probe.py`
   - Result:
     - `Probe 1: Vietnamese UTF-8 Encoding Roundtrip`: PASS
     - `Probe 2: Input Directory Safety Guard`: PASS
     - `Probe 3: PowerShell 5.1 Compatibility Invariants`: PASS
     - Summary: **ALL PROBES PASSED**.

3. **AgentShield Static Security Audit (`agent-security-guard`)**:
   - Command: `.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .`
   - Result: **[PASS] No secret leaks, destructive commands, or invariant violations detected**.
