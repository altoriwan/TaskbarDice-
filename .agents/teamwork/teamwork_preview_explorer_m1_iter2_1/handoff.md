# Báo cáo Nghiên cứu Kỹ thuật (Handoff Report): Chiến lược Khắc phục Defect #1 (TOCTOU Race Condition)

**Agent**: `teamwork_preview_explorer_m1_iter2_1`  
**Timestamp**: 2026-10-24T07:58:00Z  
**Type**: Hard Handoff  
**Workspace Path**: `c:\Users\haquo\Documents\antigravity\amazing-turing`  
**Target Defect**: Defect #1 từ Milestone 1 Gate Failure (`test_api_concurrent_overload_race_condition` in `tests/test_adversarial_m1.py`)  

---

## 1. Observation (Quan sát thực nghiệm)

### 1.1 Tái hiện lỗi TOCTOU Race Condition
- **Lệnh thực thi** [VERIFIED]:
  ```powershell
  .\.venv\Scripts\python.exe -m unittest tests/test_adversarial_m1.py -k test_api_concurrent_overload_race_condition
  ```
- **Kết quả lỗi thực tế** [VERIFIED]:
  ```
  FAIL: test_api_concurrent_overload_race_condition (tests.test_adversarial_m1.TestMilestone1Adversarial.test_api_concurrent_overload_race_condition)
  AssertionError: RACE CONDITION VULNERABILITY DETECTED: API accepted 20 active tasks under concurrency, exceeding the 10-task maximum!
  ```

### 1.2 Phân tích hiện trạng mã nguồn
1. **`app.py` (dòng 20–28)** [VERIFIED]:
   ```python
   def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):
       active_tasks = self.storage.get_tasks()
       if len(active_tasks) >= 10:
           print("[TaskbarDice] Rejecting task: Tower overload (10/10 active tasks limit reached)")
           return {"status": "error", "error": "overload", "message": "Tower overload (10/10)"}

       task = self.storage.add_task(text, weight=weight, duration_minutes=duration_minutes)
       print(f"[TaskbarDice] Task added: '{task['title']}' (weight: {task['weight_score']}, id: {task['id']})")
       return {"status": "ok", "task": task}
   ```
   - Điểm kiểm tra `len(active_tasks) >= 10` nằm hoàn toàn bên ngoài khóa đồng bộ (`self._lock`). Khi 20 luồng đồng thời gọi `api.add_task`, tất cả 20 luồng đều đọc `len(active_tasks) == 0 < 10` trước khi bất kỳ tác vụ nào được ghi, dẫn đến việc chấp nhận toàn bộ 20 tác vụ.

2. **`dice_logic.py` (dòng 201–207 & 267–279)** [VERIFIED]:
   ```python
   class TaskStorage:
       MAX_ACTIVE_TASKS = 10
       ...
       def add_task(
           self,
           raw_text: str,
           weight: Optional[int] = None,
           duration_minutes: Optional[int] = None
       ) -> Dict[str, Any]:
           task_record = parse_task_input(raw_text, weight=weight, duration_minutes=duration_minutes)
           with self._lock:
               self.tasks.append(task_record)
               self._atomic_write_locked()
           return task_record
   ```
   - `MAX_ACTIVE_TASKS = 10` đã được khai báo sẵn tại `TaskStorage`, nhưng hàm `add_task` bên trong khối `with self._lock:` chỉ đơn thuần thêm mới và ghi file mà không hề kiểm tra giới hạn `MAX_ACTIVE_TASKS`.

3. **Ngữ nghĩa trạng thái tác vụ (`status`)** [VERIFIED]:
   - Trong `dice_logic.py:194`, `parse_task_input` gán `"status": "pending"`.
   - Trong `dice_logic.py:262`, `complete_task` cập nhật `t["status"] = "completed"`.
   - Trong `dice_logic.py:255`, `get_tasks` định nghĩa tác vụ đang hoạt động (active) là:
     `[dict(t) for t in self.tasks if t.get("status") != "completed"]`.
   - Không có tác vụ nào mang giá trị `"status": "active"`. Do đó, nếu kiểm tra `len([t for t in self.tasks if t.get("status") == "active"])`, biểu thức sẽ luôn trả về `0`, làm vô hiệu hóa bộ đếm quá tải. Biểu thức đúng phải là `t.get("status") != "completed"` (hoặc `t.get("status") in ("pending", "active")`).

4. **Phát hiện cạm bẫy hồi quy (Regression Hazard Discovery)** [VERIFIED]:
   - Trong `tests/test_adversarial_m1.py` (dòng 244–275, `test_rapid_concurrent_storage_integrity`): 50 luồng đồng thời gọi trực tiếp `storage.add_task(...)` và kiểm tra `len(tasks_mem) == 50` cũng như `len(disk_data) == 50`.
   - Trong `tests/test_challenger_stress.py` (dòng 276–297, `test_multithreaded_atomic_storage`): 8 luồng x 5 tác vụ = 40 tác vụ ghi đồng thời vào `self.storage.add_task(...)` và kiểm tra `len(loaded) == 40`.
   - **Thực nghiệm chứng minh**: Nếu `TaskStorage.add_task` chặn cứng tại `MAX_ACTIVE_TASKS = 10` mà không có cơ chế tùy biến giới hạn, cả hai bài kiểm thử 40 luồng và 50 luồng trên sẽ gãy ngay lập tức với lỗi `AssertionError: 10 != 50` và `AssertionError: 10 != 40` (VERIFIED).

---

## 2. Logic Chain (Chuỗi lập luận kỹ thuật)

1. **Nguyên nhân gốc rễ (Root Cause)**:
   - Hiện tượng TOCTOU (Time-of-Check to Time-of-Use) xảy ra do hành vi kiểm tra số lượng tác vụ và hành vi chèn tác vụ không nằm trong cùng một vùng găng (critical section) nguyên tử.
   - Khi chạy đa luồng trong Python, `self._lock` của `TaskStorage` là khóa chuẩn `threading.Lock()` (không phải re-entrant `RLock`). Việc thực hiện kiểm tra giới hạn phải được thực hiện trực tiếp bên trong `TaskStorage.add_task` dưới quyền kiểm soát của `with self._lock:` để đảm bảo tính nguyên tử tuyệt đối.

2. **Xử lý bài toán tương thích ngược giữa UI Tower Limit (10 dice) và Storage Concurrency Stress (40-50 tasks)**:
   - Giới hạn 10 tác vụ là quy tắc nghiệp vụ đặc thù của giao diện tháp xúc xắc (`TaskbarDice` - 10 Lovecraftian tiers trên khung canvas 320px).
   - Trong khi đó, `TaskStorage` là tầng lưu trữ JSON đa luồng tổng quát, được kiểm thử độ chịu tải ghi đĩa với 40–50 tác vụ đồng thời.
   - **Giải pháp thiết kế tối ưu**: Thêm tham số tùy chọn `max_active: Optional[int] = None` vào `TaskStorage.add_task` (hoặc cấu hình tại `self.max_active` của `TaskStorage`):
     - Khi `max_active` được truyền (hoặc cấu hình): `add_task` kiểm tra `active_count = len([t for t in self.tasks if t.get("status") != "completed"])`. Nếu `active_count >= effective_limit`, hàm lập tức trả về `None` (hoặc từ chối thêm) trong phạm vi khóa nguyên tử `with self._lock:`.
     - Khi gọi từ `app.py`, `TaskbarDiceAPI.add_task` truyền tường minh `max_active=getattr(self.storage, "MAX_ACTIVE_TASKS", 10)`. Nếu `task is None`, API trả về ngay phản hồi từ chối: `{"status": "error", "error": "overload", "message": "Tower overload (10/10)"}`.
     - Khi các bài kiểm thử hiệu năng lưu trữ thô (`test_rapid_concurrent_storage_integrity` và `test_multithreaded_atomic_storage`) gọi trực tiếp `storage.add_task(...)` mà không truyền `max_active`, hệ thống cho phép ghi toàn bộ 40–50 tác vụ, duy trì 100% tính toàn vẹn của tệp JSON và đạt chuẩn mọi bài kiểm thử.

3. **Bảo đảm không xảy ra Deadlock**:
   - Chỉ sử dụng duy nhất một khóa `self._lock` bên trong `TaskStorage.add_task`.
   - `app.py` không cần lồng thêm khóa ngoài, tránh nguy cơ deadlock khi gọi vào phương thức sở hữu khóa không re-entrant.

---

## 3. Caveats (Lưu ý & Ranh giới điều tra)

1. **Khóa không Re-entrant**: Khóa `self._lock` trong `TaskStorage` là `threading.Lock()`. Không được bao bọc lệnh gọi `self.storage.add_task` bằng khối `with self.storage._lock:` trong `app.py` vì sẽ gây deadlock đóng băng ứng dụng.
2. **Phạm vi Defect #1**: Báo cáo này tập trung chuyên biệt vào việc giải quyết triệt để Defect #1 (TOCTOU race condition). Các lỗi Defect #2, #3, #4, #5 thuộc về hàm phân tích cú pháp `parse_task_input` và `sanitize_input` trong `dice_logic.py`, độc lập với logic đồng bộ đa luồng này.
3. **Môi trường Headless**: Mọi kiểm thử đa luồng và API bridge được xác thực headless thông qua mock của `webview`.

---

## 4. Conclusion & Proposed Code Patch (Đề xuất giải pháp cụ thể)

Đề xuất giải pháp tối giản, chuẩn mực và an toàn tuyệt đối cho Worker (`teamwork_preview_worker_m1_1`):

### Thay đổi 1: Cập nhật `TaskStorage` trong `dice_logic.py`
Tại `dice_logic.py`, cập nhật `TaskStorage.__init__` và `TaskStorage.add_task`:

```python
<<<< BEFORE (dice_logic.py, lines 203-207)
    def __init__(self, filepath: str = "tasks.json"):
        self.filepath = filepath
        self._lock = threading.Lock()
        self.tasks: List[Dict[str, Any]] = []
        self.load_tasks()
==== AFTER
    def __init__(self, filepath: str = "tasks.json", max_active: Optional[int] = None):
        self.filepath = filepath
        self._lock = threading.Lock()
        self.tasks: List[Dict[str, Any]] = []
        self.max_active = max_active
        self.load_tasks()
>>>>
```

```python
<<<< BEFORE (dice_logic.py, lines 267-279)
    def add_task(
        self,
        raw_text: str,
        weight: Optional[int] = None,
        duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """Parses raw text, appends the task record, and saves to disk atomically."""
        task_record = parse_task_input(raw_text, weight=weight, duration_minutes=duration_minutes)
        with self._lock:
            self.tasks.append(task_record)
            self._atomic_write_locked()
        return task_record
==== AFTER
    def add_task(
        self,
        raw_text: str,
        weight: Optional[int] = None,
        duration_minutes: Optional[int] = None,
        max_active: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Parses raw text, appends the task record, and saves to disk atomically."""
        task_record = parse_task_input(raw_text, weight=weight, duration_minutes=duration_minutes)
        effective_limit = max_active if max_active is not None else getattr(self, "max_active", None)
        with self._lock:
            if effective_limit is not None:
                active_tasks = [t for t in self.tasks if t.get("status") != "completed"]
                if len(active_tasks) >= effective_limit:
                    return None
            self.tasks.append(task_record)
            self._atomic_write_locked()
        return task_record
>>>>
```

### Thay đổi 2: Cập nhật `TaskbarDiceAPI.add_task` trong `app.py`
Tại `app.py`, loại bỏ khâu kiểm tra không an toàn trước đó và chuyển giao quyền kiểm soát cho `TaskStorage.add_task`:

```python
<<<< BEFORE (app.py, lines 20-28)
    def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):
        active_tasks = self.storage.get_tasks()
        if len(active_tasks) >= 10:
            print("[TaskbarDice] Rejecting task: Tower overload (10/10 active tasks limit reached)")
            return {"status": "error", "error": "overload", "message": "Tower overload (10/10)"}

        task = self.storage.add_task(text, weight=weight, duration_minutes=duration_minutes)
        print(f"[TaskbarDice] Task added: '{task['title']}' (weight: {task['weight_score']}, id: {task['id']})")
        return {"status": "ok", "task": task}
==== AFTER
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
            return {"status": "error", "error": "overload", "message": "Tower overload (10/10)"}

        print(f"[TaskbarDice] Task added: '{task['title']}' (weight: {task['weight_score']}, id: {task['id']})")
        return {"status": "ok", "task": task}
>>>>
```

---

## 5. Verification Method (Phương pháp kiểm chứng độc lập)

Đã xây dựng kịch bản kiểm chứng thực nghiệm tại `.agents/teamwork/teamwork_preview_explorer_m1_iter2_1/verify_fix.py`.  
Kết quả chạy thực tế trên môi trường ảo [VERIFIED]:

```powershell
.\.venv\Scripts\python.exe .agents\teamwork\teamwork_preview_explorer_m1_iter2_1\verify_fix.py
```
**Output thu được**:
- `test_challenger_stress`: 0 failures, 0 errors, wasSuccessful=True (Bao gồm `test_multithreaded_atomic_storage` 40 tasks và `test_tower_overload_rejection_at_ten_tasks`).
- `test_app`: 0 failures, 0 errors, wasSuccessful=True (Bao gồm `test_api_add_task_overload_rejection`).
- `test_adversarial (race + integrity)`: 0 failures, 0 errors, wasSuccessful=True (Bao gồm `test_api_concurrent_overload_race_condition` 20 threads và `test_rapid_concurrent_storage_integrity` 50 threads).

### Các lệnh kiểm chứng sau khi Worker áp dụng code patch:
```powershell
# 1. Kiểm tra trực tiếp race condition 20 luồng đồng thời
.\.venv\Scripts\python.exe -m unittest tests/test_adversarial_m1.py -k test_api_concurrent_overload_race_condition

# 2. Kiểm tra độ toàn vẹn ghi đĩa đa luồng 50 luồng
.\.venv\Scripts\python.exe -m unittest tests/test_adversarial_m1.py -k test_rapid_concurrent_storage_integrity

# 3. Kiểm tra ngưỡng từ chối tác vụ thứ 11 trong app.py
.\.venv\Scripts\python.exe -m unittest tests/test_app.py -k test_api_add_task_overload_rejection

# 4. Kiểm tra toàn bộ test suite của app và challenger
.\.venv\Scripts\python.exe -m unittest tests/test_challenger_stress.py
```

**Điều kiện nghiệm thu (Passing Criteria)**:
Tất cả các lệnh trên phải trả về exit code `0` với `OK`. Không xuất hiện ngoại lệ `AssertionError: RACE CONDITION VULNERABILITY DETECTED` và không gây hồi quy trên các bài test đa luồng khác.
