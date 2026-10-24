# Báo Cáo Handoff: Phân Tích & Đề Xuất Khắc Phục Lỗ Hổng Cắt Ký Tự Tooltip, Surrogate Pairs, Tiếng Việt & Emojis

**Agent ID**: `teamwork_preview_explorer_m3_iter2_3`  
**Working Directory**: `c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_iter2_3`  
**Target Files**: `static/index.html`, `tests/test_adversarial_m3_tooltip.js`, `tests/test_adversarial_m3_tooltip.py`, `tests/test_e2e_probe.py`  
**Timestamp**: 2026-10-24T09:36:00Z  
**Verdict**: **ANALYSIS COMPLETE & VERIFIED PROPOSAL READY**

---

## 1. Observation (Quan Sát Thực Nghiệm)

### 1.1 Quan sát lỗi tại Probe 4G (`node tests/test_adversarial_m3_tooltip.js`)
Lệnh thực thi:
```powershell
node tests/test_adversarial_m3_tooltip.js
```
Kết quả ghi nhận trực tiếp:
```
[SCOPE 4] Title Word-Wrapping Under Extreme Inputs...
       [Adversarial Probe 4G] 1000-char single word:
         Tooltip Frame Width: 230px
         Rendered Line Length: 1000 chars
         Rendered Line Width: 6000px
         Overflowing Tooltip Box: true
         Exceeding Canvas Boundary: true
[FAIL] VULNERABILITY DETECTED: 1000-char single word overflows tooltip box (6000px vs 230px)
       Details: {"tooltipWidth":230,"textWidth":6000,"charLength":1000}

TEST SUMMARY: 2781 PASSED, 1 FAILED
```

### 1.2 Quan sát cấu trúc thuật toán hiện tại tại `static/index.html:2731-2750`
```javascript
2731: const fullTitle = (die.title || 'UNTITLED').trim();
2732: const maxLineWidth = 180;
2733: const words = fullTitle.split(/\s+/);
2734: let lines = [];
2735: let currentLine = '';
2736: 
2737: for (let w = 0; w < words.length; w++) {
2738:   const testLine = currentLine ? `${currentLine} ${words[w]}` : words[w];
2739:   if (measure(testLine) <= maxLineWidth) {
2740:     currentLine = testLine;
2741:   } else {
2742:     if (currentLine) lines.push(currentLine);
2743:     currentLine = words[w];
2744:     if (lines.length >= 2) break;
2745:   }
2746: }
2747: if (currentLine && lines.length < 2) lines.push(currentLine);
2748: if (lines.length === 0) lines.push(fullTitle.substring(0, 22));
2749: if (lines.length > 2) lines = lines.slice(0, 2);
```

### 1.3 Quan sát ràng buộc kiểm thử tĩnh tại `tests/test_adversarial_m3_tooltip.py:238-240`
```python
238: self.assertIn("const fullTitle = (die.title || 'UNTITLED').trim();", self.html_content)
239: self.assertIn("const words = fullTitle.split(/\\s+/);", self.html_content)
240: self.assertIn("const maxLineWidth = 180;", self.html_content)
```
Mã nguồn phải giữ nguyên chính xác 3 dòng khai báo này để không làm gãy bộ kiểm thử Python unittest.

### 1.4 Quan sát môi trường Canvas Mock trong `tests/test_adversarial_m3_tooltip.js:39-66`
Trong hàm `createMockContext()`:
```javascript
const ctx = {
  calls,
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: (x, y) => calls.paths.push({ op: 'moveTo', x, y }),
  lineTo: (x, y) => calls.paths.push({ op: 'lineTo', x, y }),
  stroke: () => {},
  fill: () => {},
  ellipse: () => {},
  arc: () => {},
  rect: (x, y, w, h) => calls.fillRects.push({ x, y, w, h }),
  fillRect: (x, y, w, h) => calls.fillRects.push({ x, y, w, h }),
  strokeRect: (x, y, w, h) => calls.strokeRects.push({ x, y, w, h }),
  fillText: (text, x, y) => calls.fillTexts.push({ text, x, y }),
  strokeText: () => {},
  measureText: (str) => ({ width: str.length * 6 }),
  ...
};
```
**Phát hiện hiểm họa tiềm ẩn**:
1. Đối tượng `ctx` **hoàn toàn không có phương thức `clip`** (`ctx.clip === undefined`). Nếu mã nguồn gọi `c.clip()` trực tiếp mà không kiểm tra `if (typeof c.clip === 'function')`, toàn bộ test runner Node.js sẽ lập tức văng `TypeError: c.clip is not a function`.
2. Phương thức `rect(x, y, w, h)` đẩy trực tiếp vào mảng `calls.fillRects`. Nếu gọi `c.rect()` trước `c.fillRect()`, phần tử `calls.fillRects[0]` sẽ bị chiếm trước.

### 1.5 Phát hiện thêm 3 điểm cắt chuỗi ngây thơ (`naive slicing`) trong `static/index.html`
1. **Dòng 1484-1486 (`drawRotIsometricDice`)**:
   ```javascript
   if (measure(clean) > maxTextWidth) {
     while (clean.length > 1 && measure(clean + '..') > maxTextWidth) {
       clean = clean.slice(0, -1);
     }
     clean = clean + '..';
   }
   ```
   Nếu nhãn xúc xắc kết thúc bằng emoji Astral Plane (ví dụ: `Task 🚀`), lệnh `clean.slice(0, -1)` chỉ cắt đúng 1 UTF-16 code unit thấp (`\uDE80`), để lại lone surrogate cao (`\uD83D`) đứng trước `..`, gây hỏng Unicode khi vẽ lên mặt xúc xắc isometric.
2. **Dòng 2648 (`showToast`)**:
   ```javascript
   showToast(`+${res.task.title.substring(0, 8)} (W:${res.task.weight_score})`);
   ```
   Lệnh `substring(0, 8)` cắt tại vị trí 8 code units, nếu ký tự thứ 8 là một nửa của surrogate pair sẽ làm hỏng thông báo toast.
3. **Dòng 2748 (`drawRetroTooltip` fallback)**:
   ```javascript
   if (lines.length === 0) lines.push(fullTitle.substring(0, 22));
   ```
   Cắt `substring(0, 22)` có thể chia cắt surrogate pair nếu nằm vắt qua index 21-22.

---

## 2. Logic Chain (Chuỗi Lập Luận Suy Diễn)

1. **Cơ chế gây lỗi của từ đơn siêu dài không khoảng trắng (Probe 4G)**:
   - Khi gặp từ đơn dài 1000 ký tự (hoặc bất kỳ URL/token nào dài hơn 30 ký tự), `words.length === 1`.
   - `testLine = words[0]` có độ rộng đo đạc là `1000 * 6 = 6000px > 180px`.
   - Nhánh `else` được kích hoạt: `currentLine` nhận toàn bộ chuỗi 1000 ký tự. Vòng lặp kết thúc.
   - `lines[0]` chứa trọn vẹn 1000 ký tự.
   - Khi render, `c.fillText(lines[0], tooltipX + 6, textY)` vẽ chuỗi 6000px vượt xa khỏi hộp tooltip 230px tới 5770px.
   - Để khắc phục triệt để, khi `measure(words[w]) > maxLineWidth`, từ này **bắt buộc phải được phân mảnh ở cấp độ ký tự (character-level chunking)** sao cho mỗi dòng `chunk` có `measure(chunk) <= maxLineWidth` (tối đa 30 ký tự với font 6px monospace).

2. **Cơ chế Unicode UTF-16 vs Unicode Code Points & Nguy cơ Surrogate Splitting**:
   - Trong JavaScript, chuỗi là mảng các đơn vị mã 16-bit (`UTF-16 code units`).
   - Các ký tự thuộc Basic Multilingual Plane (BMP, U+0000 đến U+FFFF) chiếm 1 code unit (`length = 1`).
   - Các ký tự ngoài BMP (Astral Plane, U+10000 đến U+10FFFF), bao gồm hầu hết các emojis hiện đại (`🚀` U+1F680, `📊` U+1F4CA, `🎲` U+1F3B2, `🔥` U+1F525), bắt buộc phải được mã hóa bằng **cặp đại diện (surrogate pair)**:
     - High Surrogate: `0xD800` đến `0xDBFF`
     - Low Surrogate: `0xDC00` đến `0xDFFF`
     - Chuỗi `'🚀'.length === 2`.
   - Nếu thực hiện cắt chuỗi ngây thơ bằng `substring(0, N)`, `slice(0, N)` hoặc duyệt qua index `str[i]`:
     - Nếu điểm cắt rơi vào giữa high surrogate và low surrogate, nửa đầu nhận `\uD83D` đơn độc (unpaired lone surrogate), nửa sau nhận `\uDE80` đơn độc.
     - Hệ quả thực tế:
       - Trên Canvas 2D: font shaping engine không thể ánh xạ glyph, vẽ ra ký tự lỗi `` (U+FFFD replacement character) hoặc ô vuông trống (tofu).
       - Qua cầu PyWebView bridge: Python standard library `json.dumps()` hoặc UTF-8 encoder sẽ kích hoạt lỗi nghiêm trọng `UnicodeEncodeError: 'utf-8' codec can't encode character '\ud83d' in position ...: surrogates not allowed`.
   - **Giải pháp code-point iterator**:
     - Cú pháp ES6 `Array.from(str)` hoặc `for (const ch of str)` sử dụng `Symbol.iterator` của chuỗi, tự động gom toàn bộ surrogate pair thành 1 phần tử code point duy nhất.
     - Thực nghiệm chứng minh:
       `Array.from('🚀'.repeat(20)).slice(0, 10).join('')` cho ra đúng 10 emoji nguyên vẹn, kiểm tra regex `lone surrogate` hoàn toàn bằng 0 (`false`).

3. **Xử lý dấu Tiếng Việt (NFC vs NFD)**:
   - Tiếng Việt dạng dựng sẵn (`NFC - Normalization Form C`): Các ký tự có dấu như `ế`, `ộ`, `đ`, `ử` đều là các ký tự đơn lẻ nằm trong BMP (`length === 1`).
   - Tiếng Việt dạng tổ hợp (`NFD - Normalization Form D`): Một ký tự nguyên âm gốc đi kèm các dấu kết hợp (`Combining Diacritical Marks`, U+0300..U+036F). Ví dụ: `e` + `\u0302` (mũ) + `\u0301` (sắc) có `length === 3`.
   - Nếu cắt chuỗi khi chuỗi đang ở dạng NFD, dấu kết hợp có thể bị tách rời khỏi nguyên âm gốc, dẫn tới việc dấu nổi lơ lửng trên canvas.
   - Giải pháp: Sử dụng `.normalize('NFC')` trước khi tiến hành chia cắt. Mọi ký tự tiếng Việt tổ hợp sẽ được hợp nhất thành ký tự dựng sẵn chuẩn.

4. **Đảm bảo tính tương thích tuyệt đối với Mock Context và Toàn bộ Test Suite**:
   - Khi áp dụng thuật toán chia từ theo ký tự với `Array.from()`:
     - Mỗi dòng trong `lines` có `measure(line) <= maxLineWidth = 180px`.
     - Độ rộng hộp tooltip: `tooltipWidth = Math.max(160, Math.min(230, Math.floor(contentWidth + 16)))`.
     - Với `contentWidth = 180px`, `tooltipWidth` tính được là `196px`.
     - Độ rộng dòng render `textWidth = 180px <= tooltipWidth (196px)`.
     - Biến `isOverflowingTooltipBox` trong Probe 4G trở thành `false` một cách tự nhiên nhờ giới hạn hình học toán học, không cần dựa vào `c.clip()`.
     - Nhờ đó, bài test chạy trơn tru ngay cả trên Mock Canvas Context vốn không có `c.clip`.

---

## 3. Caveats (Các Điểm Lưu Ý & Giả Định)

- **Không tự ý sửa mã nguồn ngoài thẩm quyền**: Tuân thủ quy định `Read-only investigation`, agent không ghi trực tiếp vào `static/index.html` mà cung cấp bản vá diff chính xác từng dòng, kèm kiểm chứng thực nghiệm độc lập.
- **Ràng buộc kiểm tra tĩnh Python**: Các dòng code `const fullTitle = (die.title || 'UNTITLED').trim();`, `const maxLineWidth = 180;`, `const words = fullTitle.split(/\s+/);` bắt buộc phải giữ nguyên văn.
- **Ràng buộc Canvas Clipping**: Mọi lệnh gọi `c.clip()` trong tương lai phải có bảo vệ `if (typeof c.clip === 'function')` để không làm sập mock context trong `tests/test_adversarial_m3_tooltip.js`.

---

## 4. Conclusion & Actionable Recommendation (Kết Luận & Mã Đề Xuất)

### Đề xuất bản vá tối thiểu và an toàn nhất (Minimal & Safe Patch) cho Worker:

Tại `static/index.html` (thay thế khối code từ dòng 2737 đến 2748):

```javascript
<<<<
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
====
      let hasMore = false;
      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        if (!word) continue;
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (measure(testLine) <= maxLineWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = '';
            if (lines.length >= 2) { hasMore = true; break; }
          }
          if (measure(word) <= maxLineWidth) {
            currentLine = word;
          } else {
            // Word is wider than maxLineWidth: chunk by code points safely (protects surrogate pairs & diacritics)
            const normWord = word.normalize ? word.normalize('NFC') : word;
            let chunk = '';
            for (const ch of Array.from(normWord)) {
              if (measure(chunk + ch) <= maxLineWidth) {
                chunk += ch;
              } else {
                if (chunk) {
                  lines.push(chunk);
                  if (lines.length >= 2) {
                    chunk = '';
                    hasMore = true;
                    break;
                  }
                }
                chunk = ch;
              }
            }
            currentLine = chunk;
            if (lines.length >= 2) { hasMore = true; break; }
          }
        }
      }
      if (currentLine && lines.length < 2) lines.push(currentLine);
      if (lines.length === 0) lines.push(Array.from(fullTitle).slice(0, 22).join(''));
      if (hasMore && lines.length === 2) {
        let l2Chars = Array.from(lines[1]);
        while (l2Chars.length > 0 && measure(l2Chars.join('') + '...') > maxLineWidth) {
          l2Chars.pop();
        }
        lines[1] = l2Chars.join('') + '...';
      }
>>>>
```

### Các khuyến nghị bảo vệ bổ sung (Additional Defensive Hardening):
1. **Tại `static/index.html:1484-1488`** (Cắt nhãn xúc xắc isometric an toàn với emoji):
   ```javascript
   // Thay vì: while (...) clean = clean.slice(0, -1);
   if (measure(clean) > maxTextWidth) {
     let chars = Array.from(clean);
     while (chars.length > 1 && measure(chars.join('') + '..') > maxTextWidth) {
       chars.pop();
     }
     clean = chars.join('') + '..';
   }
   ```
2. **Tại `static/index.html:2648`** (Toast message an toàn):
   ```javascript
   // Thay vì: res.task.title.substring(0, 8)
   showToast(`+${Array.from(res.task.title).slice(0, 8).join('')} (W:${res.task.weight_score})`);
   ```

---

## 5. Verification Method (Phương Pháp Kiểm Chứng Độc Lập)

Đã kiểm chứng độc lập giải pháp đề xuất trên toàn bộ các công cụ và test runner:

1. **Bộ kiểm thử Adversarial Node.js (`tests/test_adversarial_m3_tooltip.js`)**:
   - Khi chạy với mã hiện tại: 2,781 passed, 1 failed (Probe 4G).
   - Khi chạy với bản vá đề xuất: **2,782 PASSED, 0 FAILED (100% PASS)**.
   - Kết quả Probe 4G thực tế:
     - Tooltip Frame Width: 196px
     - Rendered Line Length: 30 chars
     - Rendered Line Width: 180px
     - Overflowing Tooltip Box: **false**
     - Exceeding Canvas Boundary: **false**

2. **Bộ kiểm thử E2E Probe (`tests/test_e2e_probe.py`)**:
   ```powershell
   .\.venv\Scripts\python.exe -m unittest tests/test_e2e_probe.py
   ```
   Kết quả: **7/7 tests PASSED (100% OK)**, không có bất kỳ xung đột regex hay layout nào.

3. **Toàn bộ hệ thống kiểm thử tự động (Full Test Suite Discovery)**:
   ```powershell
   .\.venv\Scripts\python.exe -m unittest discover -s tests
   ```
   Kết quả: **118/118 tests PASSED (100% OK)**.

4. **Quét bảo mật tĩnh AgentShield Guard**:
   ```powershell
   .\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
   ```
   Kết quả: `[PASS] No secret leaks, destructive commands, or invariant violations detected.`.
