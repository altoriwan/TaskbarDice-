# Handoff Report: Milestone 1 Backend & API Architecture

**Agent**: teamwork_preview_explorer_m1_1  
**Timestamp**: 2026-10-24T07:12:00Z  
**Type**: Hard Handoff  
**Workspace Path**: `c:\Users\haquo\Documents\antigravity\amazing-turing`  

---

## 1. Observation

1. **`app.py` Lines 46-63 and 65-86**:
   ```python
   def calculate_anchor_position(width: int = 400, height: int = 300, margin_x: int = 16, margin_y: int = 56):
   ...
   def main():
       api = TaskbarDiceAPI()
       win_w, win_h = 400, 300
       x, y = calculate_anchor_position(win_w, win_h)
   ```
   - *VERIFIED*: Kích thước cửa sổ hiện đang là `400x300` thay vì `400x420`.
   - *VERIFIED*: Giá trị neo `margin_y` hiện tại là `56` thay vì `64` (chuẩn chiều cao Windows 11 Taskbar + lề).

2. **`app.py` Lines 18-26**:
   ```python
   def add_task(self, text: str):
       ...
       task = self.storage.add_task(text)
       return {"status": "ok", "task": task}
   ```
   - *VERIFIED*: API bridge chưa chấp nhận tham số `weight` và `duration_minutes`.

3. **`dice_logic.py` Lines 18-35 & 205-212**:
   ```python
   def parse_task_input(raw_text: str) -> Dict[str, Any]:
   ...
   def add_task(self, raw_text: str) -> Dict[str, Any]:
       task_record = parse_task_input(raw_text)
   ```
   - *VERIFIED*: Hàm phân tích chỉ nhận `raw_text` và suy luận bằng regex heuristic tiếng Việt (`has_urgent`, `minute_match`, `hour_match`, v.v.). Chưa hỗ trợ explicit override từ UI buttons.
   - *VERIFIED*: `created_at` và `deadline_at` đã được lưu dưới dạng chuỗi ISO 8601 thông qua `.isoformat()` (ví dụ `dice_logic.py:31, 33, 117, 131`).

4. **Virtual Environment & Test Harness**:
   - *VERIFIED*: Chạy `.\venv\Scripts\python -m unittest discover tests` thực thi 21 unit tests hiện có và đạt exit code 0 trong 0.062s.
   - *VERIFIED*: File `tests/test_app.py` chưa tồn tại trong repo.
   - *VERIFIED*: `webview.screens` trong môi trường `venv` trả về danh sách màn hình khả dụng `[1920x1080 at 0,0]`.

5. **`ORIGINAL_REQUEST.md` & `PROJECT.md` Requirements**:
   - *VERIFIED*: R1 quy định cửa sổ 400x420, `margin_y: 64, margin_x: 16`.
   - *VERIFIED*: Row 2 Control Panel có Weight `[1][2][3][4][5]` và Time presets `[15m][25m][1h][4h][..m]`.
   - *VERIFIED*: Interface contract: `window.pywebview.api.add_task(text, weight, duration_minutes)`.

---

## 2. Logic Chain

1. **Từ Observation 1 và 5**:
   - Yêu cầu R1 và AC1 xác định cửa sổ phải có kích thước chính xác 400x420 với neo `margin_y: 64, margin_x: 16`.
   - Hiện tại `app.py` đang dùng default `height=300, margin_y=56`.
   - *Suy luận (INFERRED)*: Cần thay đổi tham số mặc định của `calculate_anchor_position` thành `width=400, height=420, margin_x=16, margin_y=64` và cập nhật `win_w, win_h = 400, 420` trong `main()`. Trên màn hình 1920x1080, tọa độ neo sẽ chuyển từ `(1504, 724)` thành `(1504, 596)`.

2. **Từ Observation 2, 3 và 5**:
   - Người dùng có thể nhập task và bấm nút chọn Weight (1-5) hoặc Time (15m, 25m, 1h, 4h) trên thanh công cụ.
   - Để hỗ trợ cả 2 chế độ (chọn nút explicit hoặc gõ tự do rồi parse heuristic), `TaskbarDiceAPI.add_task`, `TaskStorage.add_task`, và `parse_task_input` phải nhận `weight: Optional[int] = None` và `duration_minutes: Optional[int] = None`.
   - *Suy luận (INFERRED)*: Khi `weight is not None`, ép kiểu int và kẹp trong `[1, 5]`, ghi đè điểm heuristic. Khi `duration_minutes is not None` và > 0, tính `deadline_dt = now + timedelta(minutes=dur_mins)` và định dạng nhãn `deadline_str` tương ứng (`15 phút`, `25 phút`, `1 giờ`, `4 giờ`), ghi đè heuristic deadline.
   - Khi cả hai là `None`, toàn bộ logic phân tích heuristic cũ vẫn hoạt động 100% không suy suyển.

3. **Từ Observation 3**:
   - Cả `created_at` và `deadline_at` đều sử dụng `.isoformat()` sinh ra chuỗi ISO 8601 (ví dụ `2026-10-24T14:05:27.123456`). Khi tính explicit duration, tiếp tục gọi `deadline_dt.isoformat()` đảm bảo tính tương thích và đồng nhất tuyệt đối cho JS engine tính rot factor.

4. **Từ Observation 4**:
   - Việc bổ sung helper `calculate_rot_factor` vào `dice_logic.py` hỗ trợ tính toán rot factor: `(now - created_at) / (deadline_at - created_at)` với chế độ unclamped overdue (> 1.0) theo R3 và chuẩn bị sẵn cho Milestone 3.
   - Các unit tests mới trong `test_dice_logic.py` và file mới `test_app.py` đảm bảo quy trình TDD và bảo vệ hệ thống khỏi regression.

---

## 3. Caveats

1. **PyWebView GUI Rendering**: Quá trình kiểm tra headless bằng unit test mock `webview.screens` không khởi động Win32 window thật trên màn hình. Window thật sẽ được xác nhận khi chạy trực tiếp hoặc qua E2E probe ở Milestone 5.
2. **Frontend Coordination**: `app.py` và `dice_logic.py` ở Milestone 1 là phía backend/API. Giao diện frontend HTML/CSS/JS (`static/index.html`) cần được điều chỉnh đồng bộ để truyền `weight` và `duration_minutes` khi gọi `add_task`. Nhờ cơ chế tham số tùy chọn (`Optional[int] = None`), backend hoàn toàn backward-compatible với frontend hiện tại nếu chưa kịp cập nhật.
3. Không có caveat nào khác.

---

## 4. Conclusion

Chiến lược triển khai cho Milestone 1 Backend & API đã hoàn thiện, rõ ràng, đã được kiểm chứng logic qua sandbox run và sẵn sàng để lập trình viên (implementer) áp dụng:
1. `app.py`: Đổi kích thước thành 400x420, neo `margin_y=64, margin_x=16`, mở rộng `TaskbarDiceAPI.add_task(text, weight, duration_minutes)`.
2. `dice_logic.py`: Mở rộng `parse_task_input` và `TaskStorage.add_task` nhận explicit `weight` (clamped 1-5) và `duration_minutes` (presets 15m, 25m, 1h, 4h), format `deadline_str`, lưu `deadline_at` & `created_at` dưới dạng ISO timestamps, bổ sung helper `calculate_rot_factor`.
3. `tests/test_dice_logic.py`: Bổ sung 5 unit tests cho explicit weight, explicit duration presets, combined overrides, persistence, và rot calculation.
4. `tests/test_app.py`: Tạo file test mới với 5 unit test kiểm thử neo cửa sổ (standard, custom, fallback, clamping) và API bridge.

---

## 5. Verification Method

Triển khai có thể được kiểm chứng độc lập hoàn toàn bằng các lệnh sau:
1. Chạy toàn bộ test suite với venv:
   ```powershell
   .\venv\Scripts\python -m unittest discover tests
   ```
   *Điều kiện hợp lệ*: Toàn bộ các test (bao gồm 21 test cũ và các test mới) đều pass 100% với exit code 0.
2. Chạy riêng test của app và dice_logic:
   ```powershell
   .\venv\Scripts\python -m unittest tests/test_dice_logic.py
   .\venv\Scripts\python -m unittest tests/test_app.py
   ```
3. Kiểm tra tính toán neo trên màn hình 1920x1080:
   ```powershell
   .\venv\Scripts\python -c "from app import calculate_anchor_position; print(calculate_anchor_position())"
   ```
   *Kết quả mong đợi*: `(1504, 596)`.
4. Điều kiện hủy bỏ (Invalidation Condition): Nếu kích thước cửa sổ vẫn là 300px, hoặc neo `y != 596` trên màn hình 1080p, hoặc `add_task` từ chối nhận 3 tham số, hoặc `deadline_at` không thể parse bằng `datetime.fromisoformat`.
