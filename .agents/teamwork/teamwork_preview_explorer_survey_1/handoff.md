# Handoff Report: Backend & Desktop Architecture Survey

**Agent**: `teamwork_preview_explorer_survey_1`  
**Working Directory**: `c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_survey_1`  
**Target Milestone**: `backend_survey`  
**Date**: 2026-10-24T07:04:00Z  

---

## 1. Observation

### O1. Dual Architecture Paradigm
- `main.py:136-141` defines a FastAPI app:
  ```python
  app = FastAPI(
      title="Deadline Heavyweight",
      description="Physical 3D Workload & Stress Visualizer with Rapier 3D WASM",
      version="2.0.0",
      lifespan=lifespan
  )
  ```
- `app.py:7-14` and `app.py:73-85` define the desktop widget using `pywebview`:
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
- `static/index.html:1112-1113` demonstrates direct JS-to-Python bridge calls:
  ```javascript
  if (window.pywebview && window.pywebview.api && window.pywebview.api.get_tasks) {
    window.pywebview.api.get_tasks().then((tasks) => {
  ```
  No HTTP requests are made from the desktop widget to FastAPI (`main.py`).

### O2. Desktop Window Creation & Sizing
- `app.py:67`: `win_w, win_h = 400, 300`
- `app.py:46`: `def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):`
- `static/index.html:24-25`:
  ```css
  body {
    width: 400px;
    height: 300px;
    overflow: hidden;
  ```
- `ORIGINAL_REQUEST.md:12-16` specifies:
  - Window size 400x420 anchored above Windows 11 Taskbar (`margin_y: 64, margin_x: 16`).
  - Flexbox column layout: Header 26px + Canvas 320px + Control Panel 74px (0px overflow).

### O3. Data Model & Storage Schema (`tasks.json` & `dice_logic.py`)
- `tasks.json:1-11` records active/completed tasks:
  ```json
  [
    {
      "id": "51dc3e83",
      "title": "gg",
      "deadline_str": "Hôm nay",
      "deadline_at": "2026-10-24T17:25:42.391516",
      "weight_score": 2,
      "created_at": "2026-10-24T13:25:42.391516",
      "status": "completed",
      "completed_at": "2026-10-24T13:25:45.219201"
    }
  ]
  ```
- `dice_logic.py:166-173` uses thread lock and atomic file replacement:
  ```python
  def _atomic_write_locked(self) -> bool:
      temp_path = f"{self.filepath}.tmp"
      with open(temp_path, "w", encoding="utf-8") as f:
          json.dump(self.tasks, f, ensure_ascii=False, indent=2)
      os.replace(temp_path, self.filepath)
  ```
- `dice_logic.py:18` defines `parse_task_input(raw_text: str) -> Dict[str, Any]` which calculates `weight_score` (1 to 5) and `deadline_at` solely by heuristic regex from `raw_text`. It currently accepts no explicit weight or duration arguments.

### O4. Session Streak Tracking & Overdue Penalty
- `static/index.html:323`: `let sessionStreak = 0;`
- `static/index.html:1242`:
  ```javascript
  sessionStreak++;
  if (sessionStreak >= 2) {
    spawnFloatingText(200, 100, `+1 STREAK! KEEP ROLLING`, '#f7d51d');
  }
  ```
  `sessionStreak` is incremented on every completed task without checking if the task was overdue.
- `ORIGINAL_REQUEST.md:38`: "Completing overdue Stage 5 task resets sessionStreak = 0."

### O5. Test Suite Execution & Probes
- Command `python -m unittest discover -s tests` using global Python exited with code 1:
  `ModuleNotFoundError: No module named 'fastapi'`
- Command `.\.venv\Scripts\python.exe -m unittest discover -s tests` exited with code 0:
  `Ran 21 tests in 0.062s - OK`
- Command `.\.venv\Scripts\python.exe .agents/skills/self-evolver/scripts/benchmark_probe.py` exited with code 0:
  `ALL PROBES PASSED`
- Command `.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .` exited with code 0:
  `[PASS] No secret leaks, destructive commands, or invariant violations detected.`

---

## 2. Logic Chain

1. From **O1**, the actual application requested for TaskbarDice is driven by `app.py`, which loads `static/index.html` via `pywebview` and exposes `TaskbarDiceAPI` directly. Any modifications to support the desktop widget must target `app.py`, `dice_logic.py`, and `static/index.html`.
2. From **O2**, `app.py` currently configures a 400x300 window with `margin_y: 56`. To satisfy Requirement R1 and avoid taskbar overlap, `app.py` must be configured with `width=400, height=420, margin_x=16, margin_y=64`.
3. Furthermore from **O2**, in `static/index.html`, the current layout uses absolute positioning with a 28px header, 236px canvas, and 64px bottom bar. To prevent bottom bar clipping and achieve 0px overflow, it must be rewritten as a flex column: Header 26px + Canvas 320px + Control Panel 74px = 420px.
4. From **O3**, the persistence layer in `dice_logic.py` already supports storing `id`, `title`, `deadline_str`, `deadline_at`, `weight_score`, `created_at`, `status`, and `completed_at` atomically. However, `parse_task_input` and `add_task` only accept a single `raw_text` string. To satisfy Acceptance Criterion 2 (*"Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps"*), `add_task` and `parse_task_input` must accept optional explicit `weight` and `duration_minutes` arguments.
5. From **O4**, the current streak logic unconditionally increments `sessionStreak`. To satisfy Requirement R5, the completion handler must evaluate `Date.now() > new Date(selectedTask.deadline_at).getTime()` (or `rot >= 1.0`). If overdue, it must reset `sessionStreak = 0`; otherwise, increment it.
6. From **O5**, developers and CI must always use the virtual environment interpreter (`.\.venv\Scripts\python.exe`) rather than global `python` to run tests and verification probes.

---

## 3. Caveats

- `main.py` is an independent FastAPI application that is not used by the desktop widget in `app.py`. Changes made to `app.py` and `dice_logic.py` will not affect `main.py`'s API endpoints.
- Multi-monitor positioning on Windows with differing DPI scalings depends on `webview.screens[0]`. Testing on primary monitor (1920x1080 default fallback) works reliably, but secondary screens may require explicit screen index selection if requested.
- No caveats regarding backend storage format: `tasks.json` schema is backward-compatible with the new requirements.

---

## 4. Conclusion

The backend architecture is clean and robust, utilizing `pywebview` in-process API bridging and atomic JSON file persistence. 

To fully meet the requirements in `ORIGINAL_REQUEST.md`:
1. **Window Setup (`app.py`)**: Update default window dimensions to `400x420` and taskbar anchor to `margin_x: 16, margin_y: 64`.
2. **API & Storage (`dice_logic.py`, `app.py`)**: Extend `parse_task_input` and `add_task` to accept explicit `weight: Optional[int] = None` and `duration_minutes: Optional[int] = None`.
3. **Session Streak & Overdue Check (`index.html`)**: Reset `sessionStreak = 0` when completing a task whose `now > deadline_at`.
4. **UI Budget (`index.html`)**: Restructure layout into flex column matching Header (26px) + Canvas (320px) + Control Panel (74px) = 420px.
5. **Execution Environment**: All test execution commands must target `.\.venv\Scripts\python.exe`.

---

## 5. Verification Method

### Step 1: Unit Test Suite
Execute the existing 21-test regression suite:
```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```
*Expected*: 21 tests ran, 0 errors, 0 failures (`OK`).

### Step 2: Benchmark Probes
Execute self-evolver safety probes:
```powershell
.\.venv\Scripts\python.exe .agents/skills/self-evolver/scripts/benchmark_probe.py
```
*Expected*: All 3 probes PASS.

### Step 3: Static Security Scan
Execute pre-execution security auditor:
```powershell
.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
```
*Expected*: PASS (zero secret leaks or invariant violations).

### Step 4: Inspect Survey Report
Inspect detailed analysis:
```powershell
Get-Content -Path ".agents\teamwork\teamwork_preview_explorer_survey_1\backend_survey.md" -Raw
```
