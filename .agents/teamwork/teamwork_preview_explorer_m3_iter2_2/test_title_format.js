// Comprehensive test for proposed drawRetroTooltip wrapping and ellipsis logic
function formatTooltipTitle(fullTitle, maxLineWidth, measure) {
  const rawTitle = (fullTitle || 'UNTITLED').trim();
  if (!rawTitle) return ['UNTITLED'];

  // Break any oversized words (> maxLineWidth) into character chunks
  const rawWords = rawTitle.split(/\s+/);
  const words = [];
  for (let w = 0; w < rawWords.length; w++) {
    const word = rawWords[w];
    if (!word) continue;
    if (measure(word) <= maxLineWidth) {
      words.push(word);
    } else {
      let cur = '';
      for (const char of word) {
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

  if (words.length === 0) return ['UNTITLED'];

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

  // If there are remaining words or if line 2 exceeded budget, append '...'
  if (hasRemaining && lines.length > 0) {
    const targetIdx = Math.min(lines.length - 1, 1);
    let targetLine = lines[targetIdx];
    const ellipsis = '...';

    while (targetLine.length > 0 && measure(targetLine + ellipsis) > maxLineWidth) {
      targetLine = targetLine.slice(0, -1).trimEnd();
    }
    lines[targetIdx] = targetLine ? targetLine + ellipsis : ellipsis;
  }

  // Ensure strict safety: no line ever exceeds maxLineWidth
  for (let i = 0; i < lines.length; i++) {
    while (lines[i].length > 0 && measure(lines[i]) > maxLineWidth) {
      lines[i] = lines[i].slice(0, -1);
    }
  }

  return lines.slice(0, 2);
}

const measure = (str) => (str || '').length * 6;
const maxLineWidth = 180;

console.log("1. Short title:", formatTooltipTitle("Buy milk", maxLineWidth, measure));
console.log("2. 2-line title:", formatTooltipTitle("Buy milk and bread from the grocery store", maxLineWidth, measure));
console.log("3. 3-line title:", formatTooltipTitle("Buy milk and bread and eggs and butter and cheese and bacon and juice from the local supermarket downtown", maxLineWidth, measure));
console.log("4. 1000-char single word:", formatTooltipTitle("A".repeat(1000), maxLineWidth, measure));
console.log("5. Empty string:", formatTooltipTitle("", maxLineWidth, measure));
console.log("6. Whitespace:", formatTooltipTitle("     ", maxLineWidth, measure));
console.log("7. Long word on second line:", formatTooltipTitle("Task: " + "B".repeat(200), maxLineWidth, measure));
