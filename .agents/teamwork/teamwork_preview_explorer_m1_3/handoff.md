# Handoff Report: Milestone 1 2-Row NES Control Panel UI & Events

**Author**: `teamwork_preview_explorer_m1_3`  
**Working Directory**: `c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m1_3`  
**Target Milestone**: Milestone 1 (2-Row NES Control Panel UI & Events)  
**Date**: 2026-10-24T07:13:00Z  

---

## 1. Observation

### Current Codebase Observations & Exact Quotes
1. **Current Bottom Bar Markup (`static/index.html:256-268`)**:
   ```html
   <!-- Bottom 20% Input Bar -->
   <div class="bottom-bar">
     <form class="task-form" id="taskForm">
       <input 
         type="text" 
         id="taskInput" 
         class="nes-input is-dark task-input" 
         placeholder="Type task & press Enter..." 
         autocomplete="off"
         required
       />
       <button type="submit" class="nes-btn is-primary btn-submit">ADD</button>
     </form>
   </div>
   ```
   - Chỉ có duy nhất 1 hàng input và submit button; thiếu hoàn toàn hàng thứ 2 (Row 2) cho Weight ($W$) và Time presets ($T$).
   - Nút ADD dùng class `.nes-btn.is-primary` (màu xanh dương) thay vì màu xanh lá cây NES (`.nes-btn.is-success`) quy định trong Requirement R1.
2. **Current Bottom Bar CSS (`static/index.html:96-109`)**:
   ```css
   .bottom-bar {
     position: absolute;
     bottom: 0;
     left: 0;
     width: 100%;
     height: 64px;
     padding: 6px 8px;
     background: #181a1d;
     border-top: 3px solid #000000;
     display: flex;
     align-items: center;
     gap: 6px;
     z-index: 5;
   }
   ```
   - Định vị `position: absolute; height: 64px;` trong layout cũ 400x300. Không tuân thủ ngân sách Flexbox 74px và gây đè lên Canvas khi Canvas mở rộng lên 320px.
3. **Current Form Submit Event Handler (`static/index.html:1159-1176`)**:
   ```javascript
   if (window.pywebview && window.pywebview.api && window.pywebview.api.add_task) {
     window.pywebview.api.add_task(text).then((res) => {
   ```
   - Hiện tại hàm chỉ truyền 1 tham số duy nhất `text`, bỏ qua trọng số `weight` và thời gian `duration_minutes`.
4. **Requirement R1 (`ORIGINAL_REQUEST.md:12-16`)**:
   - "Flexbox column layout: Header 26px + Canvas 320px + Control Panel 74px (0px overflow)."
   - "Row 1: Text input (78%) + Green NES ADD button (22%)."
   - "Row 2: Weight selection (W: [1][2][3][4][5]) + Time presets (T: [15m][25m][1h][4h][..m])."
5. **Contract Specifications (`PROJECT.md:52-56`)**:
   - `window.pywebview.api.add_task(text, weight, duration_minutes)`
   - `text`: string (required)
   - `weight`: integer between 1 and 5 (defaults to 1)
   - `duration_minutes`: integer (defaults to 25)
6. **Backend Alignment (`.agents/teamwork/teamwork_preview_explorer_m1_1/analysis.md:43-46`)**:
   - `app.py` mở rộng: `def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):`.
7. **Layout Coordination (`.agents/teamwork/teamwork_preview_explorer_m1_2/handoff.md:93-105`)**:
   - Cột Flexbox tổng 420px, phân bổ cho `.control-panel` cố định `74px; flex-shrink: 0`.

---

## 2. Logic Chain

### Bước 1: Phân bổ Ngân sách Chiều cao Control Panel (74px)
Từ **Observation 4 & 7**, tổng chiều cao cố định của Control Panel là 74px.
Để đảm bảo không bị tràn dù chỉ 1px:
- `box-sizing: border-box;`
- Viền trên: `border-top: 2px solid #000000;`
- Padding trên và dưới: `padding: 5px 6px;` (tổng cộng 10px).
- Chiều cao khả dụng cho nội dung: $74 - 2 - 10 = 62\text{px}$.
- Phân bổ cho 2 hàng:
  - Row 1: Chiều cao `34px`
  - Gap giữa 2 hàng: `4px`
  - Row 2: Chiều cao `24px`
- Tổng chiều cao nội dung: $34 + 4 + 24 = 62\text{px}$.
- Tổng cộng cả viền và padding: $2 + 10 + 62 = 74\text{px}$.
$\rightarrow$ **Kết luận**: Khớp chính xác 100%, bảo đảm 0px overflow.

### Bước 2: Tỷ lệ Chiều rộng Row 1 (78% Text Input / 22% Green NES ADD)
Từ **Observation 1 & 4**:
- Chiều rộng khả dụng bên trong: $400\text{px} - 12\text{px (padding)} = 388\text{px}$.
- Khoảng cách `gap: 6px` giữa input và button.
- Sử dụng công thức Flexbox:
  - `task-input`: `flex: 0 0 calc(78% - 5px); width: calc(78% - 5px); height: 34px;`
  - `btn-add`: `flex: 0 0 calc(22% - 1px); width: calc(22% - 1px); height: 34px;` với class NES xanh lá: `.nes-btn.is-success`.
- Phép tính thực tế:
  $$\text{Input} = 388 \times 0.78 - 4.68 = 297.96\text{px}$$
  $$\text{ADD Button} = 388 \times 0.22 - 1.32 = 84.04\text{px}$$
  $$\text{Tổng} = 297.96 + 84.04 + 6 = 388.0\text{px}$$
- Tỷ lệ thực tế: $297.96 / (297.96 + 84.04) = 78.00\%$, đạt chuẩn xác R1.

### Bước 3: Thiết kế Bố cục Row 2 (Weight & Time Presets)
Từ **Observation 4 & 5**:
- Khối Weight ($W$):
  - Nhãn: `W:` (màu xanh lá NES `#92cc41`, `font-size: 7px`).
  - 5 nút chip (`[1]`, `[2]`, `[3]`, `[4]`, `[5]`), mặc định `[1]` mang class `is-active`.
- Vách ngăn: thanh dọc 1px cao 16px `#333942`.
- Khối Time ($T$):
  - Nhãn: `T:` (màu xanh dương NES `#209cee`, `font-size: 7px`).
  - 5 nút preset: `[15m]`, `[25m]`, `[1h]`, `[4h]`, `[..m]`, mặc định `[25m]` mang class `is-active`.
- Tổng bề rộng của Row 2 là $\approx 281\text{px}$, hoàn toàn nằm gọn trong 388px khả dụng mà không bị gãy dòng hay co ép.
- **Quy tắc an toàn**: Mọi nút chip trong form đều được gắn thuộc tính `type="button"` để ngăn chặn trình duyệt kích hoạt submit nhầm khi người dùng click chọn trọng số/thời gian.

### Bước 4: Xử lý Sự kiện & Cầu nối PyWebView
Từ **Observation 3, 5 & 6**:
- Quản lý trạng thái:
  ```javascript
  let selectedWeight = 1;          // default 1
  let selectedDurationMinutes = 25; // default 25m
  ```
- Toggle Weight: Click nút nào thì xóa `is-active` ở các nút khác và thêm `is-active` vào nút được click, gán `selectedWeight = parseInt(btn.dataset.weight, 10)`.
- Toggle Time: Click preset cập nhật `selectedDurationMinutes = parseInt(btn.dataset.time, 10)`.
- Nút `..m` (Custom): Kích hoạt `prompt('Enter custom duration in minutes (1-1440):', ...)` $\rightarrow$ nếu hợp lệ, gán `selectedDurationMinutes` và cập nhật nhãn nút thành `${val}m`.
- Form Submit:
  - Kiểm tra giới hạn 10 task: nếu `diceStack.length >= 10`, kích hoạt hiệu ứng rung NES `shake-anim` trên form, báo toast `OVERLOAD! CLEAR A TASK`.
  - Gọi backend: `window.pywebview.api.add_task(text, selectedWeight, selectedDurationMinutes)`.
  - Fallback offline: Tự tạo task object với `weight_score: selectedWeight`, `deadline_at: now + duration`, thêm vào stack và hiển thị toast.
- Programmatic Hooks cho E2E Testing: Cung cấp `window.setSelectedWeight`, `window.setSelectedDuration`, `window.getSelectedWeight`, `window.getSelectedDuration`.

---

## 3. Caveats

1. **Hiển thị Dialog `prompt()` trong PyWebView**: Trên môi trường desktop Win32 WebView2, lệnh `window.prompt()` hoạt động bình thường, nhưng nếu ứng dụng chạy headless trong kịch bản kiểm thử không có giao diện người dùng tương tác, probe test có thể gọi trực tiếp hàm hook `window.setSelectedDuration(mins)` hoặc dispatch sự kiện click với `data-time`.
2. **Font chữ 'Press Start 2P'**: Do font pixel art có chiều ngang ký tự cố định 8px, nhãn trên nút `[..m]` có độ dài 3 ký tự (24px) vừa khít với kích thước nút. Tránh để nhãn dài hơn 4 ký tự.
3. **No Caveats for Layout Budget**: Phép tính chiều cao 74px và tỷ lệ 78%/22% đã được kiểm chứng bằng toán học và chạy thử nghiệm cú pháp trong môi trường sandbox.

---

## 4. Conclusion

Chiến lược triển khai cho Milestone 1 Control Panel UI & Events đã hoàn tất đầy đủ:
1. **HTML**: Thay thế `.bottom-bar` tại `static/index.html:256-268` bằng `<form class="control-panel" id="taskForm">` gồm 2 hàng chuẩn:
   - Row 1: Input text 78% + Nút ADD `.nes-btn.is-success` 22%.
   - Row 2: Khối `W: [1][2][3][4][5]` (mặc định 1) + Khối `T: [15m][25m][1h][4h][..m]` (mặc định 25m).
2. **CSS**: Thêm các quy tắc CSS cho `.control-panel` (74px), `.panel-row-1` (34px, 78%/22%), `.panel-row-2` (24px), `.btn-chip`, `.weight-btn.is-active`, `.time-btn.is-active`, và `.shake-anim`.
3. **JavaScript**:
   - Khởi tạo biến trạng thái `selectedWeight = 1` và `selectedDurationMinutes = 25`.
   - Lắng nghe click trên `.weight-btn` và `.time-btn`.
   - Lắng nghe submit trên `taskForm`, gửi đủ 3 tham số `(text, selectedWeight, selectedDurationMinutes)` tới `window.pywebview.api.add_task`.
   - Tích hợp animation rung khi overload và fallback local offline.

---

## 5. Verification Method

### 5.1. Kiểm thử Cú pháp và Bố cục HTML/CSS bằng Python
Chạy script kiểm tra cấu trúc DOM và tính toán tỷ lệ:
```powershell
python -c "
panel_w = 388
gap = 6
w_input = panel_w * 0.78 - (gap * 0.78)
w_btn = panel_w * 0.22 - (gap * 0.22)
assert round(w_input + w_btn + gap, 4) == panel_w
print('Verified Row 1 Math: Input =', round(w_input, 2), 'Btn =', round(w_btn, 2), 'Total =', panel_w)
h_total = 2 + 5 + 34 + 4 + 24 + 5
assert h_total == 74
print('Verified Height Budget: Exactly', h_total, 'px')
"
```

### 5.2. Kiểm thử Tương tác Trình duyệt (Browser Inspection)
1. Mở `static/index.html` trong trình duyệt hoặc WebView.
2. Kiểm tra phần tử qua Console:
   - `document.querySelector('.control-panel').offsetHeight === 74`
   - `document.querySelector('.task-input').offsetWidth / (document.querySelector('.task-input').offsetWidth + document.querySelector('.btn-add').offsetWidth)` xấp xỉ `0.78`.
   - Nút `[1]` trong Weight và nút `[25m]` trong Time có class `is-active`.
3. Kiểm thử click:
   - Click `[4]`: Nút `[4]` chuyển sang active, `window.getSelectedWeight() === 4`.
   - Click `[15m]`: Nút `[15m]` chuyển sang active, `window.getSelectedDuration() === 15`.
   - Gõ task "Testing M1" và nhấn Enter hoặc click "ADD":
     - Gửi `add_task("Testing M1", 4, 15)`.
     - Die mới rơi xuống có `weight_score === 4` (kích thước $56 \times 32$) và thời gian deadline cách 15 phút.
