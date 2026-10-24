# Detailed Analysis: Milestone 1 2-Row NES Control Panel UI & Events

**Author**: `teamwork_preview_explorer_m1_3`  
**Timestamp**: 2026-10-24T07:12:00Z  
**Project**: TaskbarDice Retro 2.5D Desktop Widget Overhaul  
**Target Milestone**: Milestone 1 (2-Row NES Control Panel UI & Events)  

---

## 1. Executive Summary

Cuộc điều tra kỹ thuật đã hoàn thành phân tích toàn diện hiện trạng frontend của `static/index.html` và thiết lập phương án triển khai chuẩn xác cho **2-Row NES Control Panel (74px)** theo yêu cầu **R1** và Tiêu chí chấp nhận **AC2**:
1. **Layout & Chi phí Pixel (74px Budget)**: Thay thế hoàn toàn `.bottom-bar` (64px, định vị tuyệt đối `position: absolute`) bằng `.control-panel` (74px, Flexbox container `flex: 0 0 74px`), chia làm 2 hàng chuẩn pixel:
   - **Row 1 (34px)**: Input văn bản chiếm đúng **78%** + Nút ADD xanh lá NES (`.nes-btn.is-success`) chiếm **22%**.
   - **Row 2 (26px)**: Nhóm chọn trọng số `W: [1][2][3][4][5]` (mặc định là `1`) + Nhóm preset thời gian `T: [15m][25m][1h][4h][..m]` (mặc định là `25m`, nút `..m` mở prompt tùy chỉnh phút).
2. **Event Handling & Data Flow**:
   - Bắt sự kiện click trên các nút chip trọng số và thời gian theo mô hình radio-toggle (chuyển class `is-active`, cập nhật biến trạng thái `selectedWeight` và `selectedDurationMinutes`).
   - Bắt sự kiện click `..m`: hiển thị prompt nhập số phút (1-1440), hiển thị nhãn cập nhật trên nút và gán active.
   - Form submission thu thập `text`, `selectedWeight`, `selectedDurationMinutes` và truyền vào cầu nối `window.pywebview.api.add_task(text, selectedWeight, selectedDurationMinutes)`.
   - Bảo toàn cơ chế từ chối khi đầy 10 dice và hiệu ứng rung cảnh báo NES (`shake-anim`) trên control panel.

---

## 2. Phân tích hiện trạng Codebase (`static/index.html`)

### 2.1. Cấu trúc DOM hiện tại (Dòng 256–268)
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
- **Hạn chế 1**: Chỉ có 1 hàng duy nhất gồm `input` và `button`. Nút ADD đang mang màu xanh dương (`is-primary`) thay vì màu xanh lá cây NES (`is-success`) theo yêu cầu R1.
- **Hạn chế 2**: Thiếu hoàn toàn hàng thứ 2 (Row 2) để người dùng chọn trọng số die ($W=1..5$) và khoảng thời gian deadline ($T=15m, 25m, 1h, 4h, ..m$).
- **Hạn chế 3**: Không có các data-attributes (`data-weight`, `data-time`) để kịch bản headless E2E probe kiểm tra tự động.

### 2.2. CSS hiện tại (Dòng 96–136)
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
- **Hạn chế 1**: Sử dụng `position: absolute` và chiều cao 64px trong layout cũ 400x300, gây đè lên canvas hoặc vỡ layout khi chuyển sang Flexbox 400x420.
- **Hạn chế 2**: Chiều cao input và submit button là 42px chiếm trọn thanh bar, không thể xếp 2 hàng nếu không tái cấu trúc kích thước.

### 2.3. Logic JavaScript hiện tại (Dòng 1134–1189)
```javascript
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  // ... check overload ...
  if (window.pywebview && window.pywebview.api && window.pywebview.api.add_task) {
    window.pywebview.api.add_task(text).then((res) => { ... });
  } else {
    // fallback hardcoded heuristics
    const fallbackTask = {
      id: Math.random().toString(36).substring(2, 6),
      title: text,
      weight_score: text.includes('gap') ? 5 : (text.includes('15p') ? 1 : 3),
      deadline_str: 'Today',
      created_at: new Date().toISOString(),
      deadline_at: new Date(Date.now() + 4 * 3600000).toISOString()
    };
    addDieToStack(fallbackTask, false);
  }
});
```
- **Hạn chế**: Chỉ gửi 1 tham số duy nhất `text` qua `add_task(text)`. Fallback local chỉ suy luận thô sơ qua chuỗi con 'gap' / '15p'.

---

## 3. Kiến trúc thiết kế chi tiết: 2-Row Control Panel (74px)

### 3.1. Ngân sách kích thước và Pixel Math
Tổng chiều cao cố định của Control Panel là **74px** (nằm trong tổng thể 420px: Header 26px + Canvas 320px + Control Panel 74px = 420px, 0px overflow).

```
+--------------------------------------------------------------+  0px
| Border Top: 2px solid #000000                                 |  2px
+--------------------------------------------------------------+
| Padding Top: 5px                                             |  7px
+--------------------------------------------------------------+
| ROW 1 (34px):                                                |
| [ Task Input (78% ~ 298px) ]   [ Green NES ADD (22% ~ 84px)] |  41px
+--------------------------------------------------------------+
| Gap giữa 2 hàng: 4px                                         |  45px
+--------------------------------------------------------------+
| ROW 2 (24px):                                                |
| W: [1][2][3][4][5]   |   T: [15m][25m][1h][4h][..m]          |  69px
+--------------------------------------------------------------+
| Padding Bottom: 5px                                          |  74px
+--------------------------------------------------------------+
```

Kiểm tra cộng dồn:
$$2\text{px (border)} + 5\text{px (pad top)} + 34\text{px (row 1)} + 4\text{px (gap)} + 24\text{px (row 2)} + 5\text{px (pad bot)} = 74\text{px (Khớp chính xác 100%)}$$

### 3.2. Tỷ lệ Chiều rộng Row 1 (78% / 22%)
Chiều rộng khả dụng trong panel (chiều ngang 400px - 2 * padding 6px = 388px):
- Khoảng cách giữa input và button: `gap: 6px`.
- Chiều rộng dành cho 2 phần tử: $388\text{px} - 6\text{px} = 382\text{px}$.
- Khi dùng công thức CSS Flexbox:
  - Input: `flex: 0 0 calc(78% - 5px); width: calc(78% - 5px);` $\rightarrow 388 \times 0.78 - 4.68 \approx 298\text{px}$.
  - Nút ADD: `flex: 0 0 calc(22% - 1px); width: calc(22% - 1px);` $\rightarrow 388 \times 0.22 - 1.32 \approx 84\text{px}$.
  - Tổng chiều rộng: $298\text{px} + 6\text{px} + 84\text{px} = 388\text{px}$.
  - Tỷ lệ thực tế: $298 / 382 \approx 78.01\%$ và $84 / 382 \approx 21.99\%$.

### 3.3. Bố cục Chi tiết Row 2 (W: 1-5 và T: 15m..4h..m)
Chiều rộng khả dụng: 388px.
- **Khối W (Weight)**:
  - Nhãn `W:`: 12px (màu xanh lá NES `#92cc41`).
  - 5 nút chip (`[1]`, `[2]`, `[3]`, `[4]`, `[5]`): Mỗi nút rộng 20px, cao 22px, cách nhau 2px $\rightarrow 5 \times 20 + 4 \times 2 = 108\text{px}$.
  - Tổng khối W: $\approx 125\text{px}$.
- **Vách ngăn (Divider)**: Rộng 1px, cao 16px, viền xám mờ `#333942`.
- **Khối T (Time Presets)**:
  - Nhãn `T:`: 12px (màu xanh dương NES `#209cee`).
  - 5 nút preset:
    - `[15m]`: rộng 28px
    - `[25m]`: rộng 28px
    - `[1h]`: rộng 22px
    - `[4h]`: rộng 22px
    - `[..m]`: rộng 24px
    - Gaps: $4 \times 2 = 8\text{px}$.
    - Tổng nút T: $28 + 28 + 22 + 22 + 24 + 8 = 132\text{px}$.
  - Tổng khối T: $\approx 150\text{px}$.
- **Tổng bề ngang Row 2**: $125\text{px} + 6\text{px} + 150\text{px} = 281\text{px} \le 388\text{px}$.
- Hoàn toàn dư thừa 107px để hiển thị thoáng đãng, tuyệt đối không bị wrap dòng hay co cụm.

---

## 4. Đặc tả HTML đề xuất

```html
<!-- Bottom 74px Control Panel (2-Row NES Interface) -->
<form class="control-panel" id="taskForm">
  <!-- Row 1: Text Input (78%) + Green NES ADD Button (22%) -->
  <div class="panel-row panel-row-1">
    <input 
      type="text" 
      id="taskInput" 
      class="nes-input is-dark task-input" 
      placeholder="Type task & press Enter..." 
      autocomplete="off"
      required
    />
    <button type="submit" id="addTaskBtn" class="nes-btn is-success btn-add">ADD</button>
  </div>

  <!-- Row 2: Weight Selection (W: 1-5) + Time Presets (T: 15m, 25m, 1h, 4h, ..m) -->
  <div class="panel-row panel-row-2">
    <!-- Weight Selector -->
    <div class="selector-group weight-group">
      <span class="group-label label-weight">W:</span>
      <div class="chip-container" id="weightChips">
        <button type="button" class="btn-chip weight-btn is-active" data-weight="1" title="Weight 1 (Light)">1</button>
        <button type="button" class="btn-chip weight-btn" data-weight="2" title="Weight 2 (Standard)">2</button>
        <button type="button" class="btn-chip weight-btn" data-weight="3" title="Weight 3 (Medium)">3</button>
        <button type="button" class="btn-chip weight-btn" data-weight="4" title="Weight 4 (Heavy)">4</button>
        <button type="button" class="btn-chip weight-btn" data-weight="5" title="Weight 5 (Massive)">5</button>
      </div>
    </div>

    <!-- Divider -->
    <div class="selector-divider"></div>

    <!-- Time Presets -->
    <div class="selector-group time-group">
      <span class="group-label label-time">T:</span>
      <div class="chip-container" id="timeChips">
        <button type="button" class="btn-chip time-btn" data-time="15" title="15 minutes">15m</button>
        <button type="button" class="btn-chip time-btn is-active" data-time="25" title="25 minutes (Default Pomodoro)">25m</button>
        <button type="button" class="btn-chip time-btn" data-time="60" title="1 hour">1h</button>
        <button type="button" class="btn-chip time-btn" data-time="240" title="4 hours">4h</button>
        <button type="button" class="btn-chip time-btn custom-time-btn" id="customTimeBtn" data-time="custom" title="Custom duration">..m</button>
      </div>
    </div>
  </div>
</form>
```

> **Ghi chú an toàn tối quan trọng**: Tất cả 10 nút chip trọng số và thời gian đều phải có thuộc tính `type="button"`. Nếu thiếu `type="button"`, theo chuẩn HTML form, trình duyệt sẽ coi mặc định là `type="submit"`, dẫn tới việc click chọn trọng số sẽ vô tình submit task!

---

## 5. Đặc tả CSS đề xuất

```css
/* Docked Bottom Control Panel (74px Budget) */
.control-panel {
  width: 400px;
  height: 74px;
  min-height: 74px;
  max-height: 74px;
  flex: 0 0 74px;
  box-sizing: border-box;
  padding: 5px 6px;
  background-color: #181a1d;
  border-top: 2px solid #000000;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  z-index: 20;
}

/* Row 1: Input (78%) + Green NES ADD (22%) */
.panel-row-1 {
  display: flex;
  width: 100%;
  height: 34px;
  gap: 6px;
  align-items: center;
  box-sizing: border-box;
}

.panel-row-1 .task-input {
  flex: 0 0 calc(78% - 5px);
  width: calc(78% - 5px);
  height: 34px !important;
  font-size: 8px !important;
  padding: 2px 8px !important;
  background-color: #212529 !important;
  color: #ffffff !important;
  border: 2px solid #000000 !important;
  border-radius: 0 !important;
  box-sizing: border-box !important;
}

.panel-row-1 .btn-add {
  flex: 0 0 calc(22% - 1px);
  width: calc(22% - 1px);
  height: 34px !important;
  font-size: 8px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  box-sizing: border-box !important;
}

/* Row 2: Weight & Time Selectors */
.panel-row-2 {
  display: flex;
  width: 100%;
  height: 24px;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  box-sizing: border-box;
}

.selector-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.group-label {
  font-size: 7px;
  font-family: 'Press Start 2P', monospace;
  user-select: none;
  letter-spacing: 0.5px;
}

.label-weight {
  color: #92cc41;
}

.label-time {
  color: #209cee;
}

.chip-container {
  display: flex;
  align-items: center;
  gap: 2px;
}

.selector-divider {
  width: 1px;
  height: 16px;
  background-color: #333942;
  margin: 0 2px;
}

/* NES Chip Buttons */
.btn-chip {
  height: 22px !important;
  line-height: 18px !important;
  padding: 0 4px !important;
  font-size: 7px !important;
  font-family: 'Press Start 2P', monospace !important;
  min-width: 19px;
  background-color: #212529 !important;
  color: #8c8c8c !important;
  border: 1px solid #44474d !important;
  box-shadow: none !important;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.1s ease;
  border-radius: 0 !important;
}

.btn-chip:hover {
  background-color: #2f343a !important;
  color: #ffffff !important;
  border-color: #92cc41 !important;
}

/* Active Weight State */
.weight-btn.is-active {
  background-color: #92cc41 !important;
  color: #000000 !important;
  border-color: #ffffff !important;
  font-weight: bold;
}

/* Active Time State */
.time-btn.is-active {
  background-color: #209cee !important;
  color: #ffffff !important;
  border-color: #ffffff !important;
  font-weight: bold;
}

/* Shake Animation when Tower is Overloaded */
@keyframes nes-shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
  100% { transform: translateX(0); }
}

.shake-anim {
  animation: nes-shake 0.35s ease-in-out;
}
```

---

## 6. Đặc tả JavaScript Event Handling & PyWebView Bridge

```javascript
// ==========================================
// CONTROL PANEL STATE & EVENT HANDLERS
// ==========================================
let selectedWeight = 1;          // Default weight: 1 (R1 requirement)
let selectedDurationMinutes = 25; // Default time preset: 25m (R1 requirement)

// 1. Weight Button Toggle Handlers (Single-Select Radio Model)
const weightBtns = document.querySelectorAll('.weight-btn');
weightBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const w = parseInt(btn.dataset.weight, 10);
    if (!isNaN(w) && w >= 1 && w <= 5) {
      selectedWeight = w;
      weightBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    }
  });
});

// 2. Time Preset Toggle Handlers & Custom Prompt
const timeBtns = document.querySelectorAll('.time-btn');
const customTimeBtn = document.getElementById('customTimeBtn');

timeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const timeVal = btn.dataset.time;
    if (timeVal === 'custom') {
      const currentVal = selectedDurationMinutes || 25;
      const promptVal = prompt('Enter custom duration in minutes (1-1440):', currentVal.toString());
      if (promptVal !== null) {
        const parsed = parseInt(promptVal.trim(), 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 1440) {
          selectedDurationMinutes = parsed;
          customTimeBtn.textContent = `${parsed}m`;
          customTimeBtn.title = `Custom: ${parsed}m`;
          timeBtns.forEach(b => b.classList.remove('is-active'));
          customTimeBtn.classList.add('is-active');
        } else if (promptVal.trim() !== '') {
          showToast('INVALID DURATION');
        }
      }
    } else {
      const mins = parseInt(timeVal, 10);
      if (!isNaN(mins) && mins > 0) {
        selectedDurationMinutes = mins;
        if (customTimeBtn.textContent !== '..m') {
          customTimeBtn.textContent = '..m';
          customTimeBtn.title = 'Custom duration';
        }
        timeBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      }
    }
  });
});

// 3. Programmatic Test Hooks for Automated E2E Probes
window.setSelectedWeight = function(w) {
  const target = document.querySelector(`.weight-btn[data-weight="${w}"]`);
  if (target) {
    target.click();
  } else {
    selectedWeight = w;
  }
};

window.setSelectedDuration = function(d) {
  const target = document.querySelector(`.time-btn[data-time="${d}"]`);
  if (target) {
    target.click();
  } else {
    selectedDurationMinutes = d;
    customTimeBtn.textContent = `${d}m`;
    timeBtns.forEach(b => b.classList.remove('is-active'));
    customTimeBtn.classList.add('is-active');
  }
};

window.getSelectedWeight = function() {
  return selectedWeight;
};

window.getSelectedDuration = function() {
  return selectedDurationMinutes;
};

// 4. Form Submission & PyWebView Dispatch
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  // 10-Task Overload Guard & NES Warning Shake
  if (diceStack.length >= 10) {
    taskForm.classList.remove('shake-anim');
    void taskForm.offsetWidth; // Trigger reflow for CSS animation
    taskForm.classList.add('shake-anim');
    showToast('OVERLOAD! CLEAR A TASK');
    triggerScreenShake(4, 2);
    return;
  }

  taskInput.value = '';
  taskInput.focus();

  const currentWeight = selectedWeight;
  const currentDuration = selectedDurationMinutes;

  if (window.pywebview && window.pywebview.api && window.pywebview.api.add_task) {
    // Call Python backend with text, weight, duration_minutes
    window.pywebview.api.add_task(text, currentWeight, currentDuration).then((res) => {
      if (res && res.status === 'ok' && res.task) {
        addDieToStack(res.task, false);
        showToast(`+${res.task.title.substring(0, 8)} (W:${res.task.weight_score})`);
      } else if (res && res.error === 'overload') {
        taskForm.classList.remove('shake-anim');
        void taskForm.offsetWidth;
        taskForm.classList.add('shake-anim');
        showToast('TOWER OVERLOAD (10/10)!');
      }
    }).catch((err) => {
      console.error('[TaskbarDice] add_task error:', err);
      showToast('ERROR ADDING');
    });
  } else {
    // Local fallback for offline/browser dev
    const now = Date.now();
    const fallbackTask = {
      id: Math.random().toString(36).substring(2, 6),
      title: text,
      weight_score: currentWeight,
      deadline_str: currentDuration >= 60 ? `${currentDuration / 60}h` : `${currentDuration}m`,
      created_at: new Date(now).toISOString(),
      deadline_at: new Date(now + currentDuration * 60000).toISOString(),
      status: 'pending'
    };
    addDieToStack(fallbackTask, false);
    showToast(`LOCAL (W:${currentWeight}, ${currentDuration}m)`);
  }
});
```

---

## 7. Phối hợp liên module (Cross-Module Coordination)

1. **Với `teamwork_preview_explorer_m1_1` (Backend API)**:
   - Cầu nối JavaScript gọi `window.pywebview.api.add_task(text, currentWeight, currentDuration)`.
   - Backend `app.py` định nghĩa `def add_task(self, text: str, weight: Optional[int] = None, duration_minutes: Optional[int] = None):`.
   - Vị trí tham số khớp 100%: 1st = `text`, 2nd = `weight`, 3rd = `duration_minutes`.
2. **Với `teamwork_preview_explorer_m1_2` (Flexbox Layout Budget)**:
   - Phù hợp hoàn hảo với ngân sách Flexbox 420px: Header 26px + Canvas 320px + Control Panel 74px.
   - Chiều cao chính xác 74px không tạo scrollbar hay tràn layout.
3. **Với `teamwork_preview_test_writer_e2e_1` (E2E Test Probe)**:
   - Thỏa mãn Acceptance Criteria **AC1** (400x420 không overflow).
   - Thỏa mãn Acceptance Criteria **AC2** (Thêm task với Weight=4 và Time=15m ghi nhận chính xác `weight_score=4` và ISO timestamp `deadline_at`).
   - Cung cấp đầy đủ thuộc tính DOM và programmatic hook (`window.setSelectedWeight`, `window.setSelectedDuration`).
