# Detailed Analysis: Milestone 1 Backend & API Architecture

**Author**: teamwork_preview_explorer_m1_1  
**Timestamp**: 2026-10-24T07:10:00Z  
**Project**: TaskbarDice Retro Overhaul  
**Target Milestone**: Milestone 1 (Backend & API)  

---

## 1. Executive Summary

Điều tra kỹ thuật đã hoàn thành để xác định chiến lược triển khai cho Milestone 1:
1. **`app.py`**:
   - Cập nhật kích thước cửa sổ PyWebView thành `400x420` (trước đó là `400x300`).
   - Cập nhật hàm tính toán neo cửa sổ `calculate_anchor_position` thành `margin_y: 64, margin_x: 16` (trước đó là `margin_y: 56, margin_x: 16`), neo chính xác phía trên Windows 11 Taskbar.
   - Cập nhật API method `add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None)` để nhận tham số trọng số và thời gian rõ ràng từ frontend.
2. **`dice_logic.py`**:
   - Mở rộng `parse_task_input` và `TaskStorage.add_task` để nhận `weight: Optional[int] = None` và `duration_minutes: Optional[int] = None`.
   - Giữ nguyên fallback suy luận theo heuristic tiếng Việt khi tham số là `None`.
   - Đảm bảo `created_at` và `deadline_at` luôn lưu dưới dạng chuỗi chuẩn ISO 8601 (`datetime.isoformat()`).
   - Bổ sung helper `calculate_rot_factor(created_at, deadline_at, current_time=None)` hỗ trợ tính tỷ lệ rot unclamped cho overdue (> 1.0) theo R3 / Feature 10.
3. **Unit Tests**:
   - Mở rộng `tests/test_dice_logic.py` kiểm thử các kịch bản explicit weight, explicit duration presets (15m, 25m, 1h, 4h), clamping boundary, fallback heuristic, và rot factor.
   - Tạo mới `tests/test_app.py` kiểm thử hàm `calculate_anchor_position` (với mock screen), API `add_task` explicit/heuristic, kiểm tra giới hạn 10 task overload, và luồng `complete_task`.

---

## 2. File Investigation & Codebase Findings

### 2.1. Environment Discovery
- **VERIFIED**: Python global không có `pywebview`. Tuy nhiên môi trường ảo workspace tại `c:\Users\haquo\Documents\antigravity\amazing-turing\venv` đã cài đặt đầy đủ `fastapi>=0.110.0`, `uvicorn>=0.28.0`, `pydantic>=2.6.0`, `pywebview>=6.2.1`.
- **VERIFIED**: Lệnh chạy test là `.\venv\Scripts\python -m unittest discover tests`. Hiện tại có 21 tests đang pass 100%.
- **VERIFIED**: `webview.screens` trên máy Windows hiện tại trả về `[1920x1080 at 0,0]`.

### 2.2. Current `app.py` Inspection
- **File**: `app.py` (90 dòng)
- **Vấn đề quan sát được**:
  1. Dòng 46: `def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):`
     - Chiều cao `height` mặc định là 300 (cần đổi thành 420).
     - Lề dưới `margin_y` mặc định là 56 (cần đổi thành 64 theo spec Windows 11 Taskbar).
  2. Dòng 67: `win_w, win_h = 400, 300` trong hàm `main()`
     - Cần đổi thành `win_w, win_h = 400, 420`.
  3. Dòng 18: `def add_task(self, text: str):`
     - Chưa chấp nhận `weight` và `duration_minutes`.
     - Cần cập nhật thành: `def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):`
     - Gọi `self.storage.add_task(text, weight=weight, duration_minutes=duration_minutes)`.

### 2.3. Current `dice_logic.py` Inspection
- **File**: `dice_logic.py` (212 dòng)
- **Vấn đề quan sát được**:
  1. Dòng 18: `def parse_task_input(raw_text: str) -> Dict[str, Any]:`
     - Chỉ nhận `raw_text`. Khi người dùng chọn W: [1..5] hoặc T: [15m..4h] từ UI Control Panel Row 2, hệ thống cần ưu tiên tham số explicit này.
  2. Dòng 205: `def add_task(self, raw_text: str) -> Dict[str, Any]:` trong `TaskStorage`:
     - Cần nhận `(self, raw_text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None)`.
  3. Định dạng thời gian:
     - Dòng 31 & 33, 117 & 131: Đã dùng `.isoformat()` (`deadline_at` và `created_at`). Cần tiếp tục bảo toàn định dạng ISO 8601 này khi áp dụng explicit duration.
  4. Helper tính rot factor:
     - Chưa có trong `dice_logic.py`. Cần thêm hàm `calculate_rot_factor` để phục vụ M1/M3 và TDD unit test.

---

## 3. Concrete Code Change Proposals

### 3.1. Proposed Changes for `app.py`

```python
# Before (app.py:1-4):
import os
import sys
import webview
from dice_logic import TaskStorage

# After:
import os
import sys
from typing import Optional, Dict, Any, List
import webview
from dice_logic import TaskStorage
```

```python
# Before (app.py:18-26):
    def add_task(self, text: str):
        active_tasks = self.storage.get_tasks()
        if len(active_tasks) >= 10:
            print("[TaskbarDice] Rejecting task: Tower overload (10/10 active tasks limit reached)")
            return {"status": "error", "error": "overload", "message": "Tower overload (10/10)"}

        task = self.storage.add_task(text)
        print(f"[TaskbarDice] Task added: '{task['title']}' (weight: {task['weight_score']}, id: {task['id']})")
        return {"status": "ok", "task": task}

# After:
    def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):
        active_tasks = self.storage.get_tasks()
        if len(active_tasks) >= 10:
            print("[TaskbarDice] Rejecting task: Tower overload (10/10 active tasks limit reached)")
            return {"status": "error", "error": "overload", "message": "Tower overload (10/10)"}

        task = self.storage.add_task(text, weight=weight, duration_minutes=duration_minutes)
        print(f"[TaskbarDice] Task added: '{task['title']}' (weight: {task['weight_score']}, id: {task['id']})")
        return {"status": "ok", "task": task}
```

```python
# Before (app.py:46-63):
def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):
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
    win_w, win_h = 400, 300
    x, y = calculate_anchor_position(win_w, win_h)
...

# After:
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
...
```

---

### 3.2. Proposed Changes for `dice_logic.py`

1. **Thêm Helper Functions**:
```python
def format_duration_label(minutes: int) -> str:
    """Formats duration minutes into human-readable Vietnamese deadline string."""
    if minutes < 60:
        return f"{minutes} phút"
    elif minutes % 60 == 0:
        return f"{minutes // 60} giờ"
    else:
        return f"{minutes / 60:.1f} giờ"


def calculate_rot_factor(created_at: str, deadline_at: str, current_time: Optional[datetime] = None) -> float:
    """
    Calculates rot factor: (now - created_at) / (deadline_at - created_at).
    Unclamped: returns > 1.0 when overdue, and >= 0.0 under normal conditions.
    """
    now = current_time or datetime.now()
    try:
        dt_created = datetime.fromisoformat(created_at)
        dt_deadline = datetime.fromisoformat(deadline_at)
    except Exception:
        return 0.0

    total_span = (dt_deadline - dt_created).total_seconds()
    if total_span <= 0:
        return 1.0 if now >= dt_deadline else 0.0

    elapsed = (now - dt_created).total_seconds()
    return max(0.0, elapsed / total_span)
```

2. **Cập nhật `parse_task_input`**:
```python
def parse_task_input(
    raw_text: str,
    weight: Optional[int] = None,
    duration_minutes: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Parses raw user input into a TaskbarDice task record.
    Extracts title, deadline string heuristic, and calculates weight_score (1 to 5).
    Accepts explicit weight and duration_minutes overrides with heuristic fallback.
    """
    cleaned = sanitize_input(raw_text)
    now = datetime.now()

    explicit_weight: Optional[int] = None
    if weight is not None:
        try:
            explicit_weight = max(1, min(5, int(weight)))
        except (ValueError, TypeError):
            explicit_weight = None

    explicit_deadline_dt: Optional[datetime] = None
    explicit_deadline_str: Optional[str] = None
    if duration_minutes is not None:
        try:
            dur_mins = int(duration_minutes)
            if dur_mins > 0:
                explicit_deadline_dt = now + timedelta(minutes=dur_mins)
                explicit_deadline_str = format_duration_label(dur_mins)
        except (ValueError, TypeError):
            pass

    if not cleaned:
        deadline_dt = explicit_deadline_dt or (now + timedelta(hours=4))
        deadline_str = explicit_deadline_str or "Hôm nay"
        weight_score = explicit_weight if explicit_weight is not None else 2
        return {
            "id": str(uuid.uuid4())[:8],
            "title": "Untitled Task",
            "deadline_str": deadline_str,
            "deadline_at": deadline_dt.isoformat(),
            "weight_score": weight_score,
            "created_at": now.isoformat(),
            "status": "pending",
        }

    lower = cleaned.lower()

    # Detect urgency markers
    has_urgent = bool(re.search(r"\b(gấp|gap|khẩn|khan|asap|urgent|critical|cháy deadline|ngay và luôn|ngay)\b", lower))
    has_today = bool(re.search(r"\b(hôm nay|hom nay|chiều nay|chieu nay|tối nay|toi nay|sáng nay|sang nay|trưa nay|today|tonight)\b", lower))
    has_tomorrow = bool(re.search(r"\b(ngày mai|ngay mai|mai|tomorrow|sáng mai|sang mai|chiều mai|chieu mai|tối mai|toi mai)\b", lower))

    # Detect duration / scope markers
    minute_match = re.search(r"(\d+)\s*(?:p|phút|phut|min|mins|m)\b", lower)
    hour_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:h|tiếng|tieng|giờ|gio|hrs?|hours?)\b", lower)
    has_week_or_report = bool(re.search(r"\b(tuần|tuan|week|tháng|thang|month|báo cáo|bao cao|report)\b", lower))
    has_system_bug = bool(re.search(r"\b(bug|fix bug|hệ thống|he thong|database|deploy|server|refactor)\b", lower))
    has_casual_activity = bool(re.search(r"\b(đọc sách|doc sach|sách|sach|uống nước|di dao|chay bo|nghi ngoi)\b", lower))

    # Deadline label
    if explicit_deadline_str:
        deadline_str = explicit_deadline_str
    elif minute_match:
        deadline_str = f"{minute_match.group(1)} phút"
    elif hour_match:
        deadline_str = f"{hour_match.group(1)} giờ"
    elif has_tomorrow:
        deadline_str = "Ngày mai"
    elif has_today:
        deadline_str = "Hôm nay"
    elif has_week_or_report:
        deadline_str = "Trong tuần"
    else:
        deadline_str = "Hôm nay"

    # Weight score calculation
    if explicit_weight is not None:
        weight_score = explicit_weight
    else:
        score = 2
        if has_urgent:
            score += 2
        if has_today and not has_tomorrow:
            score += 1
        if has_system_bug:
            score += 1
        if has_week_or_report:
            score += 1
        if minute_match:
            mins = int(minute_match.group(1))
            if mins <= 30 and not has_urgent and not has_system_bug:
                score -= 1
        if has_tomorrow and has_casual_activity and not has_urgent:
            score = 1
        if has_casual_activity and (has_tomorrow or (minute_match and int(minute_match.group(1)) <= 30)) and not has_urgent:
            score = 1
        if has_system_bug and has_urgent:
            score = 5
        if has_week_or_report and not has_urgent and not has_system_bug:
            score = 3
        weight_score = max(1, min(5, score))

    # Deadline timestamp (ISO)
    if explicit_deadline_dt is not None:
        deadline_dt = explicit_deadline_dt
    elif minute_match:
        deadline_dt = now + timedelta(minutes=int(minute_match.group(1)))
    elif hour_match:
        deadline_dt = now + timedelta(hours=float(hour_match.group(1)))
    elif has_tomorrow:
        deadline_dt = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
    elif has_today:
        deadline_dt = now.replace(hour=23, minute=59, second=59)
    elif has_week_or_report:
        deadline_dt = now + timedelta(days=7)
    else:
        deadline_dt = now + timedelta(hours=4)

    deadline_at = deadline_dt.isoformat()

    title = cleaned
    if len(title) > 40:
        title = title[:37] + "..."

    return {
        "id": str(uuid.uuid4())[:8],
        "title": title,
        "deadline_str": deadline_str,
        "deadline_at": deadline_at,
        "weight_score": weight_score,
        "created_at": now.isoformat(),
        "status": "pending",
    }
```

3. **Cập nhật `TaskStorage.add_task`**:
```python
    def add_task(self, raw_text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None) -> Dict[str, Any]:
        """Parses raw text, appends the task record, and saves to disk atomically."""
        task_record = parse_task_input(raw_text, weight=weight, duration_minutes=duration_minutes)
        with self._lock:
            self.tasks.append(task_record)
            self._atomic_write_locked()
        return task_record
```

---

## 4. Test Suite Formulation

### 4.1. Additions to `tests/test_dice_logic.py`
Thêm 5 test methods mới vào class `TestDiceLogic`:

```python
    def test_parse_explicit_weight_override(self):
        from dice_logic import parse_task_input

        # Explicit weight should override heuristic parsing
        task1 = parse_task_input("mai doc sach 15p", weight=4)
        self.assertEqual(task1["weight_score"], 4)

        task2 = parse_task_input("fix bug he thong gap chieu nay", weight=2)
        self.assertEqual(task2["weight_score"], 2)

        # Clamping checks
        task_high = parse_task_input("lam viec", weight=10)
        self.assertEqual(task_high["weight_score"], 5)

        task_low = parse_task_input("lam viec", weight=0)
        self.assertEqual(task_low["weight_score"], 1)

    def test_parse_explicit_duration_presets(self):
        from datetime import datetime
        from dice_logic import parse_task_input

        # Preset: 15m
        t15 = parse_task_input("task 15m", duration_minutes=15)
        self.assertEqual(t15["deadline_str"], "15 phút")
        dt_c15 = datetime.fromisoformat(t15["created_at"])
        dt_d15 = datetime.fromisoformat(t15["deadline_at"])
        self.assertAlmostEqual((dt_d15 - dt_c15).total_seconds() / 60.0, 15.0, delta=0.1)

        # Preset: 25m
        t25 = parse_task_input("task 25m", duration_minutes=25)
        self.assertEqual(t25["deadline_str"], "25 phút")

        # Preset: 1h (60m)
        t60 = parse_task_input("task 1h", duration_minutes=60)
        self.assertEqual(t60["deadline_str"], "1 giờ")

        # Preset: 4h (240m)
        t240 = parse_task_input("task 4h", duration_minutes=240)
        self.assertEqual(t240["deadline_str"], "4 giờ")

    def test_parse_explicit_weight_and_duration_combined(self):
        from datetime import datetime
        from dice_logic import parse_task_input

        task = parse_task_input("custom task", weight=4, duration_minutes=15)
        self.assertEqual(task["weight_score"], 4)
        self.assertEqual(task["deadline_str"], "15 phút")
        # Ensure valid ISO timestamp format
        dt_created = datetime.fromisoformat(task["created_at"])
        dt_deadline = datetime.fromisoformat(task["deadline_at"])
        self.assertGreater(dt_deadline, dt_created)

    def test_task_storage_add_task_explicit(self):
        import tempfile
        from dice_logic import TaskStorage

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            t = storage.add_task("Clean room", weight=4, duration_minutes=25)
            self.assertEqual(t["weight_score"], 4)
            self.assertEqual(t["deadline_str"], "25 phút")

            reloaded = TaskStorage(temp_path)
            tasks = reloaded.get_tasks()
            self.assertEqual(len(tasks), 1)
            self.assertEqual(tasks[0]["weight_score"], 4)
            self.assertEqual(tasks[0]["deadline_str"], "25 phút")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_calculate_rot_factor(self):
        from datetime import datetime, timedelta
        from dice_logic import calculate_rot_factor

        t0 = datetime(2026, 1, 1, 10, 0, 0)
        t_dead = datetime(2026, 1, 1, 11, 0, 0)

        # Freshly created
        rot_start = calculate_rot_factor(t0.isoformat(), t_dead.isoformat(), current_time=t0)
        self.assertAlmostEqual(rot_start, 0.0, places=3)

        # Halfway
        rot_half = calculate_rot_factor(t0.isoformat(), t_dead.isoformat(), current_time=datetime(2026, 1, 1, 10, 30, 0))
        self.assertAlmostEqual(rot_half, 0.5, places=3)

        # Exactly at deadline
        rot_due = calculate_rot_factor(t0.isoformat(), t_dead.isoformat(), current_time=t_dead)
        self.assertAlmostEqual(rot_due, 1.0, places=3)

        # Overdue (15m past 60m total span -> 75/60 = 1.25)
        rot_overdue = calculate_rot_factor(t0.isoformat(), t_dead.isoformat(), current_time=datetime(2026, 1, 1, 11, 15, 0))
        self.assertAlmostEqual(rot_overdue, 1.25, places=3)
```

### 4.2. New File `tests/test_app.py`
Toàn bộ nội dung của file `tests/test_app.py`:

```python
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from app import calculate_anchor_position, TaskbarDiceAPI
from dice_logic import TaskStorage


class TestTaskbarDiceApp(unittest.TestCase):
    """Unit tests for TaskbarDice pywebview app anchor calculation and API bridge."""

    def test_calculate_anchor_position_defaults(self):
        # On standard 1920x1080 display with width=400, height=420, margin_x=16, margin_y=64
        mock_screen = MagicMock(width=1920, height=1080)
        with patch("webview.screens", [mock_screen]):
            x, y = calculate_anchor_position()
            # 1920 - 400 - 16 = 1504
            # 1080 - 420 - 64 = 596
            self.assertEqual(x, 1504)
            self.assertEqual(y, 596)

    def test_calculate_anchor_position_custom_dimensions(self):
        mock_screen = MagicMock(width=2560, height=1440)
        with patch("webview.screens", [mock_screen]):
            x, y = calculate_anchor_position(width=300, height=200, margin_x=20, margin_y=50)
            self.assertEqual(x, 2560 - 300 - 20)
            self.assertEqual(y, 1440 - 200 - 50)

    def test_calculate_anchor_position_screen_fallback(self):
        # When webview.screens is empty or raises exception
        with patch("webview.screens", []):
            x, y = calculate_anchor_position()
            self.assertEqual(x, 1504)
            self.assertEqual(y, 596)

    def test_calculate_anchor_position_clamps_to_zero(self):
        mock_screen = MagicMock(width=300, height=300)
        with patch("webview.screens", [mock_screen]):
            x, y = calculate_anchor_position(width=400, height=420, margin_x=16, margin_y=64)
            self.assertEqual(x, 0)
            self.assertEqual(y, 0)

    def test_api_add_task_explicit_params(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            res = api.add_task("Explicit task", weight=4, duration_minutes=15)
            self.assertEqual(res["status"], "ok")
            task = res["task"]
            self.assertEqual(task["title"], "Explicit task")
            self.assertEqual(task["weight_score"], 4)
            self.assertEqual(task["deadline_str"], "15 phút")
            self.assertIn("created_at", task)
            self.assertIn("deadline_at", task)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_api_add_task_heuristic_fallback(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            res = api.add_task("fix bug he thong gap chieu nay")
            self.assertEqual(res["status"], "ok")
            self.assertEqual(res["task"]["weight_score"], 5)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_api_overload_limit(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            for i in range(10):
                res = api.add_task(f"Task {i}")
                self.assertEqual(res["status"], "ok")

            overflow_res = api.add_task("Overflow task")
            self.assertEqual(overflow_res["status"], "error")
            self.assertEqual(overflow_res["error"], "overload")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_api_complete_task_and_get_tasks(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            storage = TaskStorage(temp_path)
            api = TaskbarDiceAPI(storage=storage)

            res = api.add_task("Task to complete")
            task_id = res["task"]["id"]

            tasks = api.get_tasks()
            self.assertEqual(len(tasks), 1)

            complete_res = api.complete_task(task_id)
            self.assertEqual(complete_res["status"], "ok")

            tasks_after = api.get_tasks()
            self.assertEqual(len(tasks_after), 0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == "__main__":
    unittest.main()
```
