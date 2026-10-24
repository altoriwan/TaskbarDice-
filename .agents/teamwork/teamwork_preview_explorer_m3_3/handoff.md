# BÁO CÁO NGHIÊN CỨU & THIẾT KẾ: TÍCH HỢP ROT ENGINE VỚI TOOLTIP & OVERDUE FEEDBACK (M3 & M4 SYNERGY)

**Agent ID**: `teamwork_preview_explorer_m3_3`  
**Ngày báo cáo**: 2026-10-24  
**Phạm vi mục tiêu**: `static/index.html` (Isometric Rot Engine, Resting Die Hit-Testing, Glowing Border, Floating Retro Tooltip, Overdue Visual Cues)  
**Tài liệu tham chiếu**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `tests/test_e2e_probe.py`

---

## 1. Observation (Quan sát trực tiếp)

Dựa trên việc kiểm tra trực tiếp mã nguồn `static/index.html` và bộ kiểm thử `tests/test_e2e_probe.py`, các quan sát thực nghiệm được ghi nhận như sau:

### 1.1. Thực trạng Overdue Visual Cues trên Die Stage 5
- **Đường dẫn**: `static/index.html`, hàm `drawRotIsometricDice` (dòng 885–1002) và `drawDiceLabel` (dòng 1037–1059) [VERIFIED].
- **Quan sát mã nguồn**:
  ```javascript
  // Dòng 907-921
  } else {
    topColor = '#4d7c0f';
    leftColor = '#365314';
    rightColor = '#3b0764';
    pipColor = '#140428';
    ...
  }
  // Dòng 1055
  c.fillStyle = (rot >= 0.75) ? '#a3e635' : (rot >= 0.4 ? '#2b291d' : '#000000');
  c.fillText(clean, cx, cy + (height * 0.65));
  ```
- **Hiện trạng**: Khi task chuyển sang quá hạn (`rot >= 1.0`), không có bất kỳ nhãn (label) hoặc biểu ngữ (banner) nhấp nháy đỏ nào được vẽ phía trên khối xúc xắc [VERIFIED]. Chỉ có màu chữ trên mặt die giữ nguyên màu xanh nhạt `#a3e635` của Stage 4/5. Yêu cầu của R3 ("Blinking red label when overdue") và task dispatch ("pulsing red text or banner above die") hoàn toàn chưa được hiện thực hóa trên xúc xắc.

### 1.2. Thực trạng Hover Inspection & Hit Testing trên Canvas
- **Đường dẫn**: `static/index.html`, dòng 2176–2202 [VERIFIED].
- **Quan sát mã nguồn**:
  ```javascript
  // Dòng 2176-2197
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
    hoveredDie = null;

    const centerX = 200;
    for (let i = diceStack.length - 1; i >= 0; i--) {
      const d = diceStack[i];
      // Resting die check (|currentY - targetY| <= 2.0)
      if (Math.abs(d.currentY - d.targetY) <= 2.0 && Math.abs(d.velocityY) <= 0.5) {
        const cfg = DICE_CONFIG[d.weight_score] || DICE_CONFIG[3];
        const rx = cfg.width / 2;
        const topY = d.currentY - cfg.ry;
        const botY = d.currentY + cfg.ry + cfg.height;
        if (mousePos.x >= centerX - rx && mousePos.x <= centerX + rx && mousePos.y >= topY && mousePos.y <= botY) {
          hoveredDie = d;
          break;
        }
      }
    }
  });
  ```
- **Hiện trạng**:
  - Đã có sự kiện `mousemove` và kiểm tra trạng thái tĩnh (`Math.abs(d.currentY - d.targetY) <= 2.0 && Math.abs(d.velocityY) <= 0.5`) [VERIFIED].
  - Bounding box đang dùng là hộp bao chữ nhật 2D (AABB) của xúc xắc isometric: `X: [centerX - rx, centerX + rx]`, `Y: [currentY - ry, currentY + ry + height]` [VERIFIED].
  - Tọa độ `mousePos` chưa tính đến tỷ lệ co giãn canvas `canvas.width / rect.width` nếu màn hình có CSS zoom hoặc high-DPI scaling [INFERRED].

### 1.3. Thực trạng Glowing Border xung quanh Hovered Die
- **Đường dẫn**: `static/index.html`, dòng 1988–1994 [VERIFIED].
- **Quan sát mã nguồn**:
  ```javascript
  // 2px Glowing pixel border for hovered resting die
  if (d === hoveredDie) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)'; // glow border
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - cfg.width / 2 - 2, renderY - cfg.ry - 2, cfg.width + 4, cfg.height + cfg.ry * 2 + 4);
    ctx.restore();
  }
  ```
- **Hiện trạng**:
  - Đã có `ctx.strokeRect` và `ctx.lineWidth = 2`, tuy nhiên đây là đường viền vàng tĩnh, chưa có hiệu ứng phát sáng nhấp nháy (pulsing glow/neon glow) và không thay đổi cảnh báo khi die bị quá hạn (overdue) [VERIFIED].

### 1.4. Thực trạng Tooltip & Layout Clamping trong Canvas 400x320
- **Đường dẫn**: `static/index.html`, hàm `drawRetroTooltip` (dòng 2204–2236) [VERIFIED].
- **Quan sát mã nguồn**:
  ```javascript
  function drawRetroTooltip(c, die) {
    if (!die) return;
    const rot = getEffectiveRotFactor(die);
    const stage = Math.min(5, Math.floor(rot * 5) + 1);
    const isOverdue = (rot >= 1.0);
    ...
    const timeStr = isOverdue ? `QUÁ HẠN: +${m}m ${s}s` : `CÒN: ${m}m ${s}s`;

    c.save();
    const tooltipX = Math.max(10, Math.min(250, mousePos.x + 10));
    const tooltipY = Math.max(10, Math.min(260, mousePos.y - 45));
    c.fillStyle = 'rgba(18, 20, 23, 0.95)';
    c.fillRect(tooltipX, tooltipY, 140, 44);
    c.strokeStyle = isOverdue ? '#e76e55' : 'rgba(255, 215, 0, 0.9)'; // 2px glowing pixel border
    c.lineWidth = 2;
    c.strokeRect(tooltipX, tooltipY, 140, 44);

    c.font = '6px "Press Start 2P"';
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.fillText(die.title.substring(0, 16), tooltipX + 4, tooltipY + 12);
    c.fillStyle = '#92cc41';
    c.fillText(`W:${die.weight_score} | STAGE: [${stage}/5]`, tooltipX + 4, tooltipY + 24);
    c.fillStyle = isOverdue ? '#e76e55' : '#f7d51d';
    c.fillText(timeStr, tooltipX + 4, tooltipY + 36);
    c.restore();
  }
  ```
- **Các khuyết tật quan sát được**:
  1. **Cắt cụt tiêu đề (Title Truncation)**: Dòng 2230 dùng `die.title.substring(0, 16)`. Với các task có tiêu đề dài, việc cắt ngắn còn 16 ký tự làm mất thông tin tiêu đề đầy đủ ("Full Title"), không đáp ứng tiêu chuẩn retro inspection tooltip [VERIFIED].
  2. **Đồng hồ đếm ngược không nhấp nháy đỏ khi quá hạn**: Dòng 2233 tô màu `#e76e55` tĩnh, không có chu kỳ nhấp nháy (blinking red) như yêu cầu của R4 ("blinking red 'QUÁ HẠN: +Xm Ys'") [VERIFIED].
  3. **Khống chế tọa độ (Clamping) bị tràn khi Tooltip mở rộng**:
     - Clamping hiện tại cố định `Math.min(250, mousePos.x + 10)` và chiều rộng cố định 140px (`250 + 140 = 390px <= 400px`).
     - Khi tiêu đề dài cần tooltip rộng hơn (180–220px), công thức `Math.min(250, ...)` sẽ khiến tooltip có biên phải lên tới `250 + 220 = 470px`, văng hoàn toàn ra ngoài canvas 400px [VERIFIED].
     - Tương tự, nếu con trỏ ở góc trên cùng (`mousePos.y < 45`), `mousePos.y - 45` bị âm và gán cứng về 10, khiến tooltip đè lên chính con trỏ chuột hoặc che khuất die đang hover [VERIFIED].

### 1.5. Hợp đồng kiểm thử trong `tests/test_e2e_probe.py`
- Kiểm tra hàm `get_hover_and_tooltip_features()` tại dòng 224–248 [VERIFIED]:
  - `has_mousemove_listener`: `re.search(r'addEventListener\(["\']mousemove["\']', self.content)`
  - `has_resting_die_check`: `re.search(r'currentY\s*-\s*d\.targetY|Math\.abs\(.*targetY\)', self.content)`
  - `has_glowing_pixel_border`: `re.search(r'glow|strokeRect|strokeStyle.*255,\s*215,\s*0|glowing', self.content, re.IGNORECASE)`
  - `has_tooltip_container_or_render`: `re.search(r'tooltip|drawTooltip|retroTooltip', self.content, re.IGNORECASE)`
  - `has_tooltip_stage_format`: `re.search(r'STAGE:\s*\[?|STAGE', self.content, re.IGNORECASE)`
  - `has_tooltip_countdown_format`: `re.search(r'CÒN:|CON:', self.content, re.IGNORECASE)`
  - `has_tooltip_overdue_format`: `re.search(r'QUÁ HẠN:|QUA HAN:', self.content, re.IGNORECASE)`
- Chạy lệnh `python -m unittest tests/test_e2e_probe.py`: 7/7 tests passed [VERIFIED]. Bất kỳ thay đổi thiết kế nào đều phải duy trì khớp 100% các biểu thức chính quy này.

---

## 2. Logic Chain (Chuỗi suy luận thiết kế)

Từ các quan sát trên, quy trình suy luận dẫn tới giải pháp tích hợp tối ưu gồm 4 mắt xích chặt chẽ:

```
[Observation 1.1] Xúc xắc rot >= 1.0 không có nhãn/biểu ngữ cảnh báo trên die
       │
       ▼
(Bước 1: Thiết kế Pulsing Red Overdue Banner trên xúc xắc)
       │ - Tính toán tọa độ ngay trên đỉnh xúc xắc: topY = cy - ry - 14px
       │ - Chu kỳ nhấp nháy 220ms: `const blink = Math.floor(now / 220) % 2 === 0`
       │ - Render biểu ngữ nền đen viền đỏ + chữ nhấp nháy '! QUÁ HẠN !'
       │ - Đồng bộ nhấp nháy đỏ trên mặt die trong `drawDiceLabel`
       │
[Observation 1.2 & 1.3] Bounding box 2D và viền vàng tĩnh chưa có xung nhịp neon
       │
       ▼
(Bước 2: Chuẩn hóa Hit Testing & Pulsing Glowing Border)
       │ - Tọa độ chuột chuẩn hóa theo tỷ lệ canvas: `(e.clientX - rect.left) * (canvas.width / rect.width)`
       │ - Bảo toàn điều kiện die nghỉ: `Math.abs(d.currentY - d.targetY) <= 2.0 && Math.abs(d.velocityY) <= 0.5`
       │ - Biên viền 2px phát sáng nhịp sin: `alpha = 0.7 + 0.3 * Math.sin(now * 0.008)`
       │ - Màu sắc phân kỳ: Vàng neon `rgba(255, 215, 0, alpha)` khi còn hạn, đỏ neon `rgba(231, 110, 85, alpha)` khi quá hạn
       │
[Observation 1.4] Tiêu đề bị cắt 16 ký tự, timer không nhấp nháy, clamping cố định dễ tràn
       │
       ▼
(Bước 3: Tái thiết kế Floating Retro Tooltip & Dynamic Clamping)
       │ - Thuật toán chia dòng tự động (word-wrap) tối đa 2 dòng cho tiêu đề dài
       │ - Chiều rộng động `tooltipW` (160–220px), chiều cao động `tooltipH` (48px hoặc 58px)
       │ - Countdown Timer nhấp nháy đỏ khi quá hạn: `blink ? '#ff2222' : '#881111'`
       │ - Smart Clamping 4 chiều trong giới hạn 400x320:
       │     * Nếu gần biên phải (> 400 - padding), tự động đảo vị trí sang bên trái trỏ chuột
       │     * Nếu gần biên trên (< padding), tự động đảo vị trí xuống dưới trỏ chuột
       │     * Giới hạn an toàn tuyệt đối `[8px, 400 - tooltipW - 8px]` và `[8px, 320 - tooltipH - 8px]`
       │
[Observation 1.5] Khớp định dạng hợp đồng E2E probe
       │
       ▼
(Bước 4: Kiểm chứng tính tương thích ngược & Hiệu năng 60fps)
       │ - Giữ nguyên các định dạng `STAGE: [X/5]`, `CÒN: ...`, `QUÁ HẠN: ...`
       │ - Không cấp phát rác (zero-allocation) trong vòng lặp vẽ, đảm bảo 60fps
```

---

## 3. Caveats (Các điểm cần lưu ý & Giới hạn phạm vi)

1. **Phạm vi quyền hạn (Read-only)**: Là subagent explorer, báo cáo này đưa ra bản thiết kế chi tiết và các đoạn mã đề xuất (code diff/snippets). Không trực tiếp can thiệp ghi đè vào file nguồn `static/index.html`.
2. **Xung đột lớp phủ giữa các xúc xắc xếp chồng (Stack Occlusion)**:
   - Trong một tháp 10 tầng, các xúc xắc tầng dưới có xúc xắc tầng trên đè lên mặt trên (`top face`).
   - Biểu ngữ `! QUÁ HẠN !` nằm ở `cy - ry - 14px` của die tầng dưới sẽ bị xúc xắc tầng trên che khuất một phần nếu chỉ vẽ trên từng die. Do đó, thiết kế đề xuất kết hợp:
     (a) Vẽ biểu ngữ đầy đủ nổi trên die cao nhất nếu die đó quá hạn;
     (b) Trên mặt trước (front face) của *tất cả* các die quá hạn, chữ tiêu đề hoặc icon `[!]` đều nhấp nháy đỏ rực rỡ để người dùng luôn nhận biết ngay lập tức dù die nằm ở đáy tháp.
3. **Phối hợp với M3_2 (Twitch Vibration & Slime Drips)**:
   - M3_2 đang thiết kế độ rung giật vi mô (`dx, dy`) cho die Stage 5. Hit testing cần dựa trên tọa độ nghỉ logic (`d.currentY == d.targetY`), không dựa trên độ lệch rung tức thời để tránh hiện tượng tooltip bị rung giật (jittery tooltip) hoặc nhấp nháy mất tiêu điểm chuột.

---

## 4. Conclusion & Proposed Implementation (Kết luận & Thiết kế chi tiết)

### 4.1. Thiết kế 1: Pulsing Red Overdue Banner trên die Stage 5 (`rot >= 1.0`)

Thêm hàm phụ trợ `drawOverdueDieBanner(c, cx, cy, width, ry, isTopDie)` hoặc nhúng trực tiếp vào `drawRotIsometricDice` và vòng lặp `animationLoop`:

```javascript
/**
 * Draws a pulsing retro overdue alert banner above an overdue die
 */
function drawOverdueDieBanner(c, cx, cy, width, ry, isTopDie) {
  const now = Date.now();
  const blink = Math.floor(now / 220) % 2 === 0;
  const pulse = 0.6 + 0.4 * Math.sin(now * 0.01);
  const bannerW = Math.max(72, width + 8);
  const bannerH = 12;
  const bannerX = cx - bannerW / 2;
  const bannerY = cy - ry - 14;

  c.save();
  // Semi-transparent dark crimson plate
  c.fillStyle = 'rgba(20, 5, 8, 0.92)';
  c.fillRect(bannerX, bannerY, bannerW, bannerH);

  // Pulsing retro red/crimson border
  c.strokeStyle = blink ? 'rgba(255, 34, 34, 0.95)' : 'rgba(168, 20, 20, 0.7)';
  c.lineWidth = 1;
  c.strokeRect(bannerX, bannerY, bannerW, bannerH);

  // Blinking text '! QUÁ HẠN !'
  c.font = '6px "Press Start 2P"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = blink ? '#ff2222' : '#ff9999';
  c.fillText('! QUÁ HẠN !', cx, bannerY + bannerH / 2 + 1);

  c.restore();
}
```

Đồng thời, cập nhật trong `drawDiceLabel` (dòng 1055):
```javascript
// Trước:
c.fillStyle = (rot >= 0.75) ? '#a3e635' : (rot >= 0.4 ? '#2b291d' : '#000000');

// Đề xuất thay thế:
if (rot >= 1.0) {
  const blink = Math.floor(Date.now() / 250) % 2 === 0;
  c.fillStyle = blink ? '#ff2222' : '#881111'; // Blinking warning label on overdue die face
} else if (rot >= 0.75) {
  c.fillStyle = '#a3e635';
} else if (rot >= 0.4) {
  c.fillStyle = '#2b291d';
} else {
  c.fillStyle = '#000000';
}
```

---

### 4.2. Thiết kế 2: Chuẩn hóa Canvas Mousemove Hit Testing & 2px Glowing Pixel Border

Cập nhật sự kiện `mousemove` và khối vẽ viền trong `animationLoop`:

```javascript
// Chuẩn hóa sự kiện mousemove
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mousePos.x = (e.clientX - rect.left) * scaleX;
  mousePos.y = (e.clientY - rect.top) * scaleY;
  hoveredDie = null;

  const centerX = 200;
  for (let i = diceStack.length - 1; i >= 0; i--) {
    const d = diceStack[i];
    // Chỉ hover trên resting die
    if (Math.abs(d.currentY - d.targetY) <= 2.0 && Math.abs(d.velocityY) <= 0.5) {
      const cfg = DICE_CONFIG[d.weight_score] || DICE_CONFIG[3];
      const rx = cfg.width / 2;
      const topY = d.currentY - cfg.ry;
      const botY = d.currentY + cfg.ry + cfg.height;
      if (mousePos.x >= centerX - rx && mousePos.x <= centerX + rx && mousePos.y >= topY && mousePos.y <= botY) {
        hoveredDie = d;
        break;
      }
    }
  }
});
```

Cập nhật khối vẽ viền vi mô phát sáng (dòng 1988–1994):
```javascript
// 2px Glowing pixel border for hovered resting die
if (d === hoveredDie) {
  ctx.save();
  const glowAlpha = 0.65 + 0.35 * Math.sin(now * 0.008);
  const isOverdue = (rot >= 1.0);
  
  // Neon pulsing glow
  ctx.shadowColor = isOverdue ? '#e76e55' : '#ffd700';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = isOverdue ? `rgba(231, 110, 85, ${glowAlpha})` : `rgba(255, 215, 0, ${glowAlpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - cfg.width / 2 - 2, renderY - cfg.ry - 2, cfg.width + 4, cfg.height + cfg.ry * 2 + 4);
  ctx.restore();
}
```

---

### 4.3. Thiết kế 3: Tái cấu trúc hoàn chỉnh hàm `drawRetroTooltip` với Multi-line Title, Blinking Overdue Countdown & Smart Clamping

Thay thế toàn bộ hàm `drawRetroTooltip` (dòng 2204–2236) bằng triển khai tân tiến:

```javascript
/**
 * Draws floating retro inspection tooltip with multi-line title,
 * color-coded stage, pulsating overdue countdown, and zero-overflow clamping.
 */
function drawRetroTooltip(c, die) {
  if (!die) return;
  const rot = getEffectiveRotFactor(die);
  const stage = Math.max(1, Math.min(5, Math.floor(rot * 5) + 1));
  const isOverdue = (rot >= 1.0);

  const createdTime = new Date(die.created_at).getTime();
  const deadlineTime = new Date(die.deadline_at).getTime();
  const now = Date.now();
  const diffSec = Math.floor(Math.abs(deadlineTime - now) / 1000);
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  const timeStr = isOverdue ? `QUÁ HẠN: +${m}m ${s}s` : `CÒN: ${m}m ${s}s`;

  c.save();
  c.font = '6px "Press Start 2P"';

  // 1. Title formatting & multi-line wrapping
  const fullTitle = (die.title || 'UNTITLED').trim();
  const maxLineWidth = 180;
  const words = fullTitle.split(/\s+/);
  let lines = [];
  let currentLine = '';

  for (let w = 0; w < words.length; w++) {
    const testLine = currentLine ? `${currentLine} ${words[w]}` : words[w];
    if (c.measureText(testLine).width <= maxLineWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = words[w];
      if (lines.length >= 2) break;
    }
  }
  if (currentLine && lines.length < 2) lines.push(currentLine);
  if (lines.length === 0) lines.push(fullTitle.substring(0, 22));
  if (lines.length > 2) lines = lines.slice(0, 2);

  // Dynamic box dimensions
  let maxTitleWidth = 0;
  for (let i = 0; i < lines.length; i++) {
    const lw = c.measureText(lines[i]).width;
    if (lw > maxTitleWidth) maxTitleWidth = lw;
  }
  const timeWidth = c.measureText(timeStr).width;
  const metaWidth = c.measureText(`W:${die.weight_score} | STAGE: [${stage}/5]`).width;
  const contentWidth = Math.max(maxTitleWidth, Math.max(timeWidth, metaWidth));

  const tooltipWidth = Math.max(160, Math.min(230, Math.floor(contentWidth + 16)));
  const tooltipHeight = (lines.length > 1) ? 58 : 46;
  const padding = 8;

  // 2. Smart Clamping: 400x320 Canvas Boundary Guard
  let tooltipX = mousePos.x + 12;
  // If overflowing right edge, flip to left of cursor
  if (tooltipX + tooltipWidth > 400 - padding) {
    tooltipX = mousePos.x - tooltipWidth - 12;
  }
  tooltipX = Math.max(padding, Math.min(400 - tooltipWidth - padding, tooltipX));

  let tooltipY = mousePos.y - tooltipHeight - 8;
  // If overflowing top edge, flip below cursor
  if (tooltipY < padding) {
    tooltipY = mousePos.y + 22;
  }
  tooltipY = Math.max(padding, Math.min(320 - tooltipHeight - padding, tooltipY));

  // 3. Render Tooltip Body (NES double pixel frame)
  c.fillStyle = 'rgba(18, 20, 23, 0.96)';
  c.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  // Outer border
  c.strokeStyle = isOverdue ? '#e76e55' : 'rgba(255, 215, 0, 0.9)'; // 2px glowing pixel border
  c.lineWidth = 2;
  c.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  // 4. Content Typography
  let textY = tooltipY + 12;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  // Title lines
  c.fillStyle = '#ffffff';
  for (let l = 0; l < lines.length; l++) {
    c.fillText(lines[l], tooltipX + 6, textY);
    textY += 10;
  }

  // Weight & Stage line with color accent
  const stageColors = ['#fdfbf7', '#fdfbf7', '#f7d51d', '#e69138', '#a855f7', '#e76e55'];
  c.fillStyle = '#92cc41';
  c.fillText(`W:${die.weight_score} | `, tooltipX + 6, textY);
  const wWidth = c.measureText(`W:${die.weight_score} | `).width;
  c.fillStyle = stageColors[stage] || '#ffd700';
  c.fillText(`STAGE: [${stage}/5]`, tooltipX + 6 + wWidth, textY);
  textY += 11;

  // Countdown timer line (Blinking red if overdue, NES Yellow if active)
  const blink = Math.floor(now / 220) % 2 === 0;
  if (isOverdue) {
    c.fillStyle = blink ? '#ff2222' : '#881111'; // Urgent retro red blink
  } else {
    c.fillStyle = '#f7d51d';
  }
  c.fillText(timeStr, tooltipX + 6, textY);

  c.restore();
}
```

---

## 5. Verification Method (Phương pháp kiểm chứng độc lập)

Để kiểm chứng thiết kế và đảm bảo không gây hồi quy (zero regression):

### 5.1. Bộ lệnh kiểm thử tự động
1. **Kiểm thử E2E Probe**:
   ```powershell
   python -m unittest tests/test_e2e_probe.py
   ```
   *Điều kiện hợp lệ*: Cả 7 test cases (bao gồm `test_ac4_hover_inspection_and_countdown_tooltip`) đều đạt `OK`.

2. **Kiểm thử V8 Node In-Engine**:
   ```powershell
   node tests/verify_js_m2.js
   ```
   *Điều kiện hợp lệ*: Toàn bộ cú pháp và logic DOM mock chạy thành công với mã thoát 0.

3. **Kiểm thử Bảo mật AgentShield**:
   ```powershell
   python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
   ```
   *Điều kiện hợp lệ*: 0 leak, 0 command injection.

### 5.2. File & Tọa độ cần thẩm tra trực tiếp
1. Kiểm tra việc hiển thị biểu ngữ `! QUÁ HẠN !` tại `(centerX, cy - ry - 14)` trên canvas.
2. Kiểm tra hover tại các tọa độ biên `(8, 8)`, `(392, 312)`: Tooltip không được vượt quá `[0, 400]` theo chiều X và `[0, 320]` theo chiều Y.
3. Kiểm tra nhấp nháy đỏ của chuỗi thời gian khi `rot >= 1.0` với chu kỳ ~220ms.

---
*Báo cáo được khởi tạo và tự thẩm tra bởi `teamwork_preview_explorer_m3_3` tuân thủ nguyên tắc Read-Only Investigation và 5-Component Handoff Protocol.*
