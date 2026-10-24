## 2026-10-24T07:13:42Z
You are teamwork_preview_worker_m1_1.
Your working directory is: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_worker_m1_1
The authoritative user request is: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_orchestrator_1\PROJECT.md
Project Root: c:\Users\haquo\Documents\antigravity\amazing-turing

You own the following files exclusively for Milestone 1:
- `app.py`
- `dice_logic.py`
- `static/index.html`
- `tests/test_dice_logic.py`
- `tests/test_app.py`

Read the 3 Explorer handoffs before implementing:
- Backend: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m1_1\handoff.md
- Layout: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m1_2\handoff.md
- Control Panel: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m1_3\handoff.md

TASK:
Implement Milestone 1 (400x420 Flexbox Layout, 2-Row NES Control Panel & Explicit Backend API):
1. In `app.py`:
   - Set window size to 400x420 (`win_w, win_h = 400, 420`).
   - Anchor calculation: update `margin_y` default to 64, `margin_x` to 16.
   - Update `add_task` endpoint to take optional `weight=None` and `duration_minutes=None` and pass them to `dice_logic.add_task`.
2. In `dice_logic.py`:
   - Update `parse_task_input` and `TaskStorage.add_task` to accept `weight: Optional[int] = None` and `duration_minutes: Optional[int] = None`.
   - If explicit weight is provided (1-5), use it; otherwise fallback to heuristic score.
   - If explicit duration_minutes is provided (e.g. 15, 25, 60, 240, or custom), calculate `deadline_at` from `created_at + timedelta(minutes=duration_minutes)`; otherwise fallback to heuristic deadline.
   - Ensure `created_at` and `deadline_at` are formatted in ISO-8601.
   - Add helper `calculate_rot_factor(task, now=None)`.
3. In `static/index.html`:
   - Convert outer layout to strict Flexbox column: 400px width, 420px height, box-sizing: border-box, overflow: hidden.
   - Header: exactly 26px (`height: 26px; box-sizing: border-box;`).
   - Canvas: exactly 320px (`height: 320px; width: 400px; display: block;`).
   - Control Panel: exactly 74px (`height: 74px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 6px;`).
   - Control Panel Row 1: Text input (78% width) + Green NES ADD button (22% width, `.nes-btn.is-success`).
   - Control Panel Row 2: Weight selection `W: [1][2][3][4][5]` (default active=1) + Time presets `T: [15m][25m][1h][4h][..m]` (default active=25m, `..m` triggers interactive custom prompt). All buttons `type="button"`.
   - Physics & canvas bounds: adjust `GROUND_Y` to 290px, step compression for 10 dice (`180 / (count - 1)`), particle cleanup `p.y > 324`.
   - Wire form submit to call `window.pywebview.api.add_task(text, selectedWeight, selectedDurationMinutes)`.
4. Unit Tests:
   - Add comprehensive tests in `tests/test_dice_logic.py` and `tests/test_app.py` verifying explicit weight/duration, ISO timestamp formatting, anchor positioning, and endpoint contracts.
   - Run the tests via PowerShell: `.\.venv\Scripts\python.exe -m unittest discover -s tests`.
   - Ensure all unit tests pass with exit code 0.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

5. Update progress.md with "Last visited" timestamps.
6. Write detailed handoff.md in your working directory and notify caller via send_message.
