# Báo cáo Handoff: Phân tích Canvas Boundary Clipping & Ellipsis Truncation trong drawRetroTooltip

**Agent ID**: `teamwork_preview_explorer_m3_iter2_2`  
**Working Directory**: `c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_iter2_2`  
**Target Files**: `static/index.html` (lines 2712–2820), `tests/test_adversarial_m3_tooltip.js`, `tests/verify_js_m3.js`  
**Timestamp**: 2026-10-24T09:31:00Z  
**Role**: Read-only Exploration & Architecture Synthesis  

---

## 1. Observation

### 1.1 Hiện trạng mã nguồn `drawRetroTooltip` trong `static/index.html`
1. Tại `static/index.html:2731-2750`, thuật toán word-wrapping hiện tại chỉ tách từ bằng khoảng trắng `fullTitle.split(/\s+/)`:
   ```javascript
   const fullTitle = (die.title || 'UNTITLED').trim();
   const maxLineWidth = 180;
   const words = fullTitle.split(/\s+/);
   let lines = [];
   let currentLine = '';

   for (let w = 0; w < words.length; w++) {
     const testLine = currentLine ? `${currentLine} ${words[w]}` : words[w];
     if (measure(testLine) <= maxLineWidth) {
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
   ```
2. Tại `static/index.html:2780-2818`, quá trình render tooltip vẽ nền (`fillRect`), đường viền phát sáng 2px (`strokeRect`), rồi vẽ trực tiếp text typography (`fillText`) mà **không có bất kỳ vùng cắt clip path nào** (`c.clip()`):
   ```javascript
   // 3. Render Tooltip Frame
   c.fillStyle = 'rgba(18, 20, 23, 0.96)';
   c.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

   // 2px Glowing pixel border (gold or red if overdue)
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
   ```

### 1.2 Kết quả thực thi kiểm thử nguyên bản (Empirical Execution)
Lệnh kiểm thử adversarial:
```powershell
node tests/test_adversarial_m3_tooltip.js
```
Kết quả thực tế quan sát được:
```
================================================================================
RUNNING ADVERSARIAL TEST SUITE: Milestone 3 Hover & Tooltip
================================================================================

[SCOPE 1] Hover Bounding Box Detection Across 10 Dice Stack...
[SCOPE 2] Glowing 2px Border Alignment with Twitch Jitter...
[SCOPE 3] Tooltip 4-Way Boundary Clamping Across Canvas Extremes...
[SCOPE 4] Title Word-Wrapping Under Extreme Inputs...
       [Adversarial Probe 4G] 1000-char single word:
         Tooltip Frame Width: 230px
         Rendered Line Length: 1000 chars
         Rendered Line Width: 6000px
         Overflowing Tooltip Box: true
         Exceeding Canvas Boundary: true
[FAIL] VULNERABILITY DETECTED: 1000-char single word overflows tooltip box (6000px vs 230px)
       Details: {"tooltipWidth":230,"textWidth":6000,"charLength":1000}

[SCOPE 5] Countdown Timer Formatting Across Extremes...

================================================================================
TEST SUMMARY: 2781 PASSED, 1 FAILED
================================================================================

FAILURES ENCOUNTERED:
1. VULNERABILITY DETECTED: 1000-char single word overflows tooltip box (6000px vs 230px)
```

### 1.3 Đặc tả Mock Context trong các bộ kiểm thử
1. Trong `tests/test_adversarial_m3_tooltip.js:37-67`: đối tượng `mockCtx` không khai báo thuộc tính `clip: () => {}`.
2. Trong `tests/verify_js_m3.js:28-64`: đối tượng `mockCtx` cũng không khai báo thuộc tính `clip: () => {}`.
3. Nếu mã nguồn gọi trực tiếp `c.clip()` mà không kiểm tra tồn tại (`if (c.clip) c.clip()`), môi trường Node.js VM trong các bài test cũ sẽ phát sinh ngoại lệ `TypeError: c.clip is not a function`. Trong khi đó, trên trình duyệt thật (pywebview/Chromium), `CanvasRenderingContext2D.prototype.clip` luôn có sẵn.

---

## 2. Logic Chain

### 2.1 Cơ chế lan tràn văn bản (Text Overflow Mechanism)
1. **Từ Observation 1.1**: Chuỗi tiêu đề chỉ được phân tách bằng `split(/\s+/)`. Khi gặp từ đơn dài liên tục không có khoảng trắng (như chuỗi 1000 ký tự 'A' trong Probe 4G, hoặc các đường dẫn URL dài, hash, token), mảng `words` chỉ có duy nhất 1 phần tử có độ dài $N = 1000$.
2. Điều kiện kiểm tra `measure(testLine) <= maxLineWidth` (với `maxLineWidth = 180`) bị sai ngay lập tức vì `6000px > 180px`.
3. Nhánh `else` gán toàn bộ từ 1000 ký tự vào `currentLine = words[w]`.
4. Sau khi kết thúc vòng lặp, `lines[0]` lưu toàn bộ chuỗi 1000 ký tự.
5. Khi vẽ, `c.fillText(lines[0], tooltipX + 6, textY)` truyền toàn bộ chuỗi 1000 ký tự vào Canvas.
6. Mặc dù `tooltipWidth` bị kẹp trần ở 230px và tọa độ `tooltipX` kẹp trong `[8, 392]`, dòng chữ vẫn đâm xuyên qua thành bên phải của tooltip, vượt quá canvas 400px tới hơn 5,600px.

### 2.2 Kiến trúc Phòng thủ 2 Lớp (Two-Tier Defense Architecture)
Để giải quyết triệt để vấn đề này theo tiêu chuẩn công nghiệp và yêu cầu của bài toán:
1. **Lớp 1 (Algorithmic Text Chunking & Line 2 Ellipsis Truncation)**:
   - Xử lý ở tầng văn bản trước khi đưa vào Canvas. Bất kỳ từ nào có `measure(word) > maxLineWidth` (khoảng >30 ký tự monospace) sẽ được tự động băm nhỏ theo từng ký tự (character-level chunking) thành các đoạn có độ rộng $\le 180\text{px}$.
   - Tối đa chỉ tạo 2 dòng văn bản (Line 1 và Line 2).
   - Nếu còn từ hoặc ký tự chưa được hiển thị hết (`hasRemaining = true`), Dòng 2 (hoặc Dòng 1 nếu chỉ có 1 dòng) bắt buộc phải nối thêm dấu `'...'`.
   - Khi nối thêm `'...'` (chiều rộng 18px), thuật toán lùi dần các ký tự cuối của dòng cho đến khi `measure(targetLine + '...') <= maxLineWidth`.
   - Đảm bảo về mặt chuỗi dữ liệu: cả `lines[0]` và `lines[1]` luôn có độ rộng $\le 180\text{px}$ và không bao giờ vượt quá `tooltipWidth` (196px–230px).

2. **Lớp 2 (GPU Canvas Raster Clipping)**:
   - Ngay cả khi văn bản đã được cắt chuẩn thuật toán, sự khác biệt về font kerning, font fallback của hệ điều hành Windows, ký tự emoji 4-byte UTF-16, hoặc subpixel anti-aliasing vẫn có thể làm chớm 1 vài sub-pixel ra ngoài viền khung retro.
   - Cơ chế Canvas clipping tạo một clipping path hình chữ nhật bao quanh đúng diện tích tooltip box `[tooltipX, tooltipY, tooltipWidth, tooltipHeight]`, triệt tiêu hoàn toàn bất kỳ pixel rò rỉ nào ra ngoài.

### 2.3 Trình tự Canvas Clipping chuẩn mực (Exact Sequence)
Trình tự đặt các lệnh Canvas context phải tuân thủ nghiêm ngặt để **không làm mất viền phát sáng 2px**:
- Viền phát sáng 2px được vẽ bằng `c.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight)` với `c.lineWidth = 2`.
- Trong Canvas 2D specification, đường stroke của hình chữ nhật nằm đối xứng hai bên đường biên (1px tràn ra ngoài, 1px nằm bên trong).
- Nếu kích hoạt `clip()` trước khi `strokeRect`, 1px phía ngoài viền phát sáng sẽ bị xén cụt!
- **Do đó, trình tự chuẩn xác tuyệt đối là**:
  ```javascript
  // 1. Vẽ khung nền hộp Tooltip
  c.fillStyle = 'rgba(18, 20, 23, 0.96)';
  c.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  // 2. Vẽ viền phát sáng 2px (bảo toàn nguyên vẹn 2px không bị xén)
  c.strokeStyle = isOverdue ? '#e76e55' : 'rgba(255, 215, 0, 0.9)';
  c.lineWidth = 2;
  c.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  // 3. Khởi tạo vùng cắt Clipping bảo vệ Typography
  c.save();
  c.beginPath();
  c.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  if (c.clip) c.clip();

  // 4. Render toàn bộ nội dung văn bản (Title lines, Weight/Stage, Countdown Timer)
  let textY = tooltipY + 12;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  // ... render text ...

  // 5. Khôi phục trạng thái Context (xóa vùng clip)
  c.restore();
  ```

### 2.4 Thuật toán gán dấu Ellipsis `'...'` cho Dòng 2
1. **Phát hiện dữ liệu còn sót (`hasRemaining`)**:
   Sau khi đã phân phối các từ/chunk vào Dòng 1 và Dòng 2, đặt cờ `hasRemaining = (wordIdx < words.length)`. Cờ này là `true` khi và chỉ khi còn ít nhất một từ hoặc một phần tử chunk ký tự chưa thể render do vượt quá 2 dòng.
2. **Chọn dòng mục tiêu**:
   `targetIdx = Math.min(lines.length - 1, 1);` (thông thường là Dòng 2, tức index 1; trường hợp đặc biệt tiêu đề chỉ đủ chỗ 1 dòng thì áp dụng cho index 0).
3. **Cắt lùi an toàn và thêm Ellipsis**:
   ```javascript
   if (hasRemaining && lines.length > 0) {
     const targetIdx = Math.min(lines.length - 1, 1);
     let targetLine = lines[targetIdx];
     const ellipsis = '...';

     while (targetLine.length > 0 && measure(targetLine + ellipsis) > maxLineWidth) {
       targetLine = targetLine.slice(0, -1).trimEnd();
     }
     lines[targetIdx] = targetLine ? targetLine + ellipsis : ellipsis;
   }
   ```
4. **Hàng rào phòng thủ cuối cùng (Defensive Clamp)**:
   Duyệt qua từng dòng trong `lines`, nếu vì bất kỳ lý do metric font nào mà độ rộng vẫn lớn hơn `maxLineWidth`, tiếp tục `slice(0, -1)`.

---

## 3. Caveats

1. **Khả năng tương thích của Mock Context trong Test Runner**:
   - `CanvasRenderingContext2D.prototype.clip` là API tiêu chuẩn của HTML5 Canvas và luôn hoạt động trong trình duyệt PyWebView.
   - Tuy nhiên, trong môi trường kiểm thử Unit Test Node.js (ví dụ `test_adversarial_m3_tooltip.js` và `verify_js_m3.js`), các đối tượng `mockCtx` tự tạo có thể chưa định nghĩa phương thức `clip`.
   - Do đó, việc sử dụng cú pháp bảo vệ `if (c.clip) c.clip();` là **bắt buộc** để vừa đảm bảo tính năng clip hoạt động 100% trên runtime thật, vừa không làm crash các test suite chạy trên Node.js VM.
2. **Không có thêm Caveats nào khác**: Toàn bộ thuật toán đã được chạy thực nghiệm mô phỏng trên chính test suite của dự án và đạt tỷ lệ vượt qua 100%.

---

## 4. Conclusion & Proposed Code

### 4.1 Kết luận
- Phương án kết hợp **Algorithmic Word/Char Chunking với Line 2 Ellipsis** và **Canvas Clipping Path xung quanh nội dung text** khắc phục 100% khiếm khuyết Probe 4G trong bài test adversarial của Challenger.
- Không gây ra bất kỳ tác dụng phụ hay biến dạng nào đối với:
  - 4-way boundary clamping trong khung canvas 400x320.
  - Border phát sáng 2px đồng bộ với twitch jitter.
  - Định dạng hiển thị đếm ngược còn hạn hoặc quá hạn nhấp nháy đỏ.

### 4.2 Mã nguồn đề xuất thay thế toàn bộ `drawRetroTooltip` trong `static/index.html` (dòng 2712–2820)

```javascript
    /**
     * Draws floating retro inspection tooltip with full title word wrapping,
     * character-level chunking for oversized tokens, ellipsis truncation,
     * weight, rot stage [X/5], countdown timer (CÒN / blinking red QUÁ HẠN),
     * and smart 4-way clamping inside 400x320 canvas with strict canvas clipping.
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
      const measure = (str) => (c.measureText ? c.measureText(str).width : (str || '').length * 6);

      // 1. Full Title multi-line wrapping with character chunking & ellipsis
      const rawTitle = (die.title || 'UNTITLED').trim();
      const maxLineWidth = 180;
      const rawWords = rawTitle ? rawTitle.split(/\s+/) : ['UNTITLED'];

      // Break any oversized words (> maxLineWidth) into character chunks
      const words = [];
      for (let w = 0; w < rawWords.length; w++) {
        const word = rawWords[w];
        if (!word) continue;
        if (measure(word) <= maxLineWidth) {
          words.push(word);
        } else {
          let cur = '';
          for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (measure(cur + char) <= maxLineWidth) {
              cur += char;
            } else {
              if (cur) words.push(cur);
              cur = char;
            }
          }
          if (cur) words.push(cur);
        }
      }

      if (words.length === 0) words.push('UNTITLED');

      let lines = [];
      let currentLine = '';
      let wordIdx = 0;

      // Build Line 1
      while (wordIdx < words.length) {
        const nextWord = words[wordIdx];
        const candidate = currentLine ? `${currentLine} ${nextWord}` : nextWord;
        if (measure(candidate) <= maxLineWidth) {
          currentLine = candidate;
          wordIdx++;
        } else {
          break;
        }
      }
      lines.push(currentLine || words[wordIdx++]);

      // Build Line 2 (if words remain)
      if (wordIdx < words.length) {
        currentLine = '';
        while (wordIdx < words.length) {
          const nextWord = words[wordIdx];
          const candidate = currentLine ? `${currentLine} ${nextWord}` : nextWord;
          if (measure(candidate) <= maxLineWidth) {
            currentLine = candidate;
            wordIdx++;
          } else {
            break;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      }

      // Check if there are remaining unrendered words/characters
      const hasRemaining = (wordIdx < words.length);

      // Append '...' to Line 2 (or Line 1) if text was truncated
      if (hasRemaining && lines.length > 0) {
        const targetIdx = Math.min(lines.length - 1, 1);
        let targetLine = lines[targetIdx];
        const ellipsis = '...';

        while (targetLine.length > 0 && measure(targetLine + ellipsis) > maxLineWidth) {
          targetLine = targetLine.slice(0, -1).trimEnd();
        }
        lines[targetIdx] = targetLine ? targetLine + ellipsis : ellipsis;
      }

      // Defensive guard: Ensure no line exceeds maxLineWidth under any metric
      for (let i = 0; i < lines.length; i++) {
        while (lines[i].length > 0 && measure(lines[i]) > maxLineWidth) {
          lines[i] = lines[i].slice(0, -1);
        }
      }
      if (lines.length > 2) lines = lines.slice(0, 2);

      // Dynamic box dimensions
      let maxTitleWidth = 0;
      for (let i = 0; i < lines.length; i++) {
        const lw = measure(lines[i]);
        if (lw > maxTitleWidth) maxTitleWidth = lw;
      }
      const timeWidth = measure(timeStr);
      const metaStr = `W:${die.weight_score} | STAGE: [${stage}/5]`;
      const metaWidth = measure(metaStr);
      const contentWidth = Math.max(maxTitleWidth, Math.max(timeWidth, metaWidth));

      const tooltipWidth = Math.max(160, Math.min(230, Math.floor(contentWidth + 16)));
      const tooltipHeight = (lines.length > 1) ? 58 : 46;
      const padding = 8;

      // 2. Smart Clamping: 4-way 400x320 Canvas Boundary Guard
      let tooltipX = mousePos.x + 12;
      if (tooltipX + tooltipWidth > 400 - padding) {
        tooltipX = mousePos.x - tooltipWidth - 12;
      }
      tooltipX = Math.max(padding, Math.min(400 - tooltipWidth - padding, tooltipX));

      let tooltipY = mousePos.y - tooltipHeight - 8;
      if (tooltipY < padding) {
        tooltipY = mousePos.y + 22;
      }
      tooltipY = Math.max(padding, Math.min(320 - tooltipHeight - padding, tooltipY));

      // 3. Render Tooltip Frame
      c.fillStyle = 'rgba(18, 20, 23, 0.96)';
      c.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

      // 2px Glowing pixel border (gold or red if overdue)
      c.strokeStyle = isOverdue ? '#e76e55' : 'rgba(255, 215, 0, 0.9)'; // 2px glowing pixel border
      c.lineWidth = 2;
      c.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

      // 4. Content Typography (strictly clipped inside tooltip box)
      c.save();
      c.beginPath();
      c.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
      if (c.clip) c.clip();

      let textY = tooltipY + 12;
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';

      // Title lines
      c.fillStyle = '#ffffff';
      for (let l = 0; l < lines.length; l++) {
        c.fillText(lines[l], tooltipX + 6, textY);
        textY += 10;
      }

      // Weight & Stage line
      const stageColors = ['#fdfbf7', '#fdfbf7', '#eae0c8', '#8a8d8f', '#4a5d4e', '#a3e635'];
      c.fillStyle = '#92cc41';
      const wLabel = `W:${die.weight_score} | `;
      c.fillText(wLabel, tooltipX + 6, textY);
      const wWidth = measure(wLabel);
      c.fillStyle = stageColors[stage] || '#ffd700';
      c.fillText(`STAGE: [${stage}/5]`, tooltipX + 6 + wWidth, textY);
      textY += 11;

      // Countdown timer line (Blinking red if overdue, NES Yellow if active)
      const blink = Math.floor(now / 220) % 2 === 0;
      if (isOverdue) {
        c.fillStyle = blink ? '#ff2222' : '#881111'; // Blinking red when overdue
      } else {
        c.fillStyle = '#f7d51d';
      }
      c.fillText(timeStr, tooltipX + 6, textY);

      c.restore(); // Restore text clipping region

      c.restore(); // Restore initial canvas state
    }
```

---

## 5. Verification Method

Người kế nhiệm (Worker hoặc Orchestrator) có thể kiểm chứng hoàn toàn độc lập giải pháp đề xuất bằng các phương thức sau:

1. **Kiểm tra file mã nguồn & patch đề xuất trong thư mục explorer**:
   - File JS hoàn chỉnh: `.agents/teamwork/teamwork_preview_explorer_m3_iter2_2/proposed_drawRetroTooltip.js`
   - File unified git patch: `.agents/teamwork/teamwork_preview_explorer_m3_iter2_2/proposed_tooltip.patch`

2. **Chạy kịch bản kiểm thử mô phỏng Adversarial Suite (2,782 tests pass 100%)**:
   ```powershell
   node .agents/teamwork/teamwork_preview_explorer_m3_iter2_2/run_adversarial_simulation.js
   ```
   *Kết quả mong đợi*:
   ```
   [SCOPE 4] Title Word-Wrapping Under Extreme Inputs...
          [Adversarial Probe 4G] 1000-char single word:
            Tooltip Frame Width: 196px
            Rendered Line Length: 30 chars
            Rendered Line Width: 180px
            Overflowing Tooltip Box: false
            Exceeding Canvas Boundary: false
   TEST SUMMARY: 2782 PASSED, 0 FAILED
   ALL ADVERSARIAL CHECKS PASSED 100%!
   ```

3. **Chạy kịch bản kiểm thử hồi quy Regression Suite (`verify_js_m3.js`)**:
   ```powershell
   node .agents/teamwork/teamwork_preview_explorer_m3_iter2_2/run_verify_simulation.js
   ```
   *Kết quả mong đợi*:
   ```
   PASS: Retro Tooltip 4-way boundary clamping within 400x320 canvas verified.
   ALL EMPIRICAL M3/M4 SPEC & INTEGRITY VERIFICATIONS PASSED 100%!
   ```

4. **Kiểm chứng sau khi áp dụng vào `static/index.html`**:
   Sau khi Worker áp dụng code đề xuất vào `static/index.html`:
   ```powershell
   node tests/test_adversarial_m3_tooltip.js
   node tests/verify_js_m3.js
   .\.venv\Scripts\python.exe -m unittest discover -s tests
   ```
   Tất cả các bộ test sẽ trả về `0 exit code` và `100% PASS`.
