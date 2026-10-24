import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any
import webview
from dice_logic import TaskStorage


class TaskbarDiceAPI:
    """Python API bridge exposed to the webview JavaScript context."""
    def __init__(self, storage=None):
        self._window = None
        base_dir = os.path.dirname(os.path.abspath(__file__))
        tasks_path = os.path.join(base_dir, "tasks.json")
        self.storage = storage or TaskStorage(tasks_path)

    def set_window(self, window):
        self._window = window

    def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):
        max_active = getattr(self.storage, "MAX_ACTIVE_TASKS", 10)
        task = self.storage.add_task(
            text,
            weight=weight,
            duration_minutes=duration_minutes,
            max_active=max_active
        )
        if task is None:
            print("[TaskbarDice] Rejecting task: Tower overload (10/10 active tasks limit reached)")
            return {
                "status": "error",
                "error": "overload",
                "code": "overload",
                "message": "Maximum active tasks reached (10)"
            }

        print(f"[TaskbarDice] Task added: '{task['title']}' (weight: {task['weight_score']}, id: {task['id']})")
        return {"status": "ok", "task": task}

    def get_tasks(self):
        tasks = self.storage.get_tasks()
        print(f"[TaskbarDice] Loaded {len(tasks)} tasks from storage.")
        return tasks

    def complete_task(self, task_id: str):
        task = None
        for t in self.storage.get_tasks(include_completed=True):
            if t.get("id") == task_id:
                task = t
                break
        if not task:
            return {"status": "not_found", "task_id": task_id}

        was_overdue = False
        deadline_at_str = task.get("deadline_at")
        if deadline_at_str:
            try:
                s = str(deadline_at_str).strip()
                if s.endswith("Z") or s.endswith("z"):
                    s = s[:-1] + "+00:00"
                dt_deadline = datetime.fromisoformat(s)
                if dt_deadline.tzinfo is not None:
                    dt_deadline = dt_deadline.astimezone().replace(tzinfo=None)
                if datetime.now() > dt_deadline:
                    was_overdue = True
            except Exception as e:
                print(f"[TaskbarDice] Error parsing deadline: {e}")

        success = self.storage.complete_task(task_id)
        print(f"[TaskbarDice] Task completed: '{task_id}', success: {success}, was_overdue: {was_overdue}")
        if not success:
            return {"status": "not_found", "task_id": task_id}
        return {"status": "ok", "task_id": task_id, "was_overdue": was_overdue}

    def close_app(self):
        print("[TaskbarDice] Closing application...")
        if self._window:
            self._window.destroy()
        else:
            sys.exit(0)


def calculate_anchor_position(width: int = 400, height: int = 420, margin_x: int = 16, margin_y: int = 64):
    """Calculates coordinates to anchor the window to the bottom-right corner of the primary screen."""
    try:
        screens = webview.screens
        if screens and len(screens) > 0:
            screen = screens[0]
            screen_w = screen.width
            screen_h = screen.height
        else:
            screen_w, screen_h = 1920, 1080
    except Exception as e:
        print(f"[TaskbarDice] Screen detection fallback: {e}")
        screen_w, screen_h = 1920, 1080

    x = max(0, screen_w - width - margin_x)
    y = max(0, screen_h - height - margin_y)
    return x, y


def main():
    api = TaskbarDiceAPI()
    win_w, win_h = 400, 420
    x, y = calculate_anchor_position(win_w, win_h)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_dir, "static", "index.html")

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
    api.set_window(window)

    def on_loaded(w):
        try:
            inner = w.evaluate_js('[window.innerWidth, window.innerHeight]')
            if inner and len(inner) == 2:
                diff_w = 400 - inner[0]
                diff_h = 420 - inner[1]
                if diff_w > 0 or diff_h > 0:
                    w.resize(w.width + max(0, diff_w), w.height + max(0, diff_h))
        except Exception as e:
            print(f"[TaskbarDice] Window resize adjust fallback: {e}")

    webview.start(on_loaded, window, debug=False)


if __name__ == "__main__":
    main()
