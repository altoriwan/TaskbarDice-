// Test script for drawRetroTooltip word-wrapping and ellipsis logic
const maxLineWidth = 180;
const measure = (str) => (str || '').length * 6; // Mock 6px per char

function wrapTitleWithEllipsis(fullTitle, maxLineWidth, measure) {
  const title = (fullTitle || 'UNTITLED').trim();
  if (!title) return ['UNTITLED'];

  const words = title.split(/\s+/);
  let lines = [];
  let currentLine = '';
  let wordIndex = 0;
  let hasMore = false;

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    if (!word) continue;

    // Check if word itself exceeds maxLineWidth
    if (measure(word) > maxLineWidth) {
      // Chunk the long word character by character
      let remainingChars = word;
      while (remainingChars.length > 0) {
        if (lines.length >= 2) {
          hasMore = true;
          break;
        }

        // How much fits in currentLine?
        let chunk = '';
        for (let i = 0; i < remainingChars.length; i++) {
          const testChunk = currentLine ? `${currentLine}${remainingChars[i]}` : remainingChars[i];
          if (measure(testChunk) <= maxLineWidth) {
            chunk = testChunk;
          } else {
            break;
          }
        }

        if (chunk) {
          // Found what fits
          const addedLen = chunk.length - (currentLine ? currentLine.length : 0);
          currentLine = chunk;
          remainingChars = remainingChars.substring(addedLen);
          if (remainingChars.length > 0) {
            lines.push(currentLine);
            currentLine = '';
            if (lines.length >= 2) {
              hasMore = true;
              break;
            }
          }
        } else {
          // Even a single character didn't fit in currentLine, push currentLine and try new line
          if (currentLine) {
            lines.push(currentLine);
            currentLine = '';
            if (lines.length >= 2) {
              hasMore = true;
              break;
            }
          } else {
            // First char alone exceeds maxLineWidth? Take at least 1 char
            currentLine = remainingChars[0];
            remainingChars = remainingChars.substring(1);
          }
        }
      }

      if (hasMore) break;
      continue;
    }

    // Normal word fitting
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measure(testLine) <= maxLineWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      if (lines.length >= 2) {
        hasMore = true;
        break;
      }
      currentLine = word;
    }
  }

  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  } else if (currentLine && lines.length >= 2) {
    hasMore = true;
  }

  // Check if there were words or characters left unrendered
  if (wordIndex < words.length && lines.length >= 2) {
    // Already checked in loop
  }

  // If there are more lines or text, ensure lines is capped at 2 and line 2 has '...'
  if (lines.length > 2) {
    lines = lines.slice(0, 2);
    hasMore = true;
  }

  if (hasMore && lines.length > 0) {
    const lastIdx = lines.length - 1;
    let lastLine = lines[lastIdx];
    const ellipsis = '...';
    // Trim characters until lastLine + ellipsis <= maxLineWidth
    while (lastLine.length > 0 && measure(lastLine + ellipsis) > maxLineWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    lines[lastIdx] = lastLine ? lastLine + ellipsis : ellipsis;
  }

  return lines;
}

// Test cases
console.log("Test 1: Empty");
console.log(wrapTitleWithEllipsis("", maxLineWidth, measure));

console.log("Test 2: Short title");
console.log(wrapTitleWithEllipsis("Buy groceries", maxLineWidth, measure));

console.log("Test 3: Long title (multiple words)");
console.log(wrapTitleWithEllipsis("This is a rather long title that will surely span multiple lines and require truncation with ellipsis at the end", maxLineWidth, measure));

console.log("Test 4: 1000 char single word");
const res4 = wrapTitleWithEllipsis("A".repeat(1000), maxLineWidth, measure);
console.log("Lines count:", res4.length);
console.log("Line 1 len:", res4[0].length, "width:", measure(res4[0]));
console.log("Line 2 len:", res4[1].length, "width:", measure(res4[1]), "ends with ...?", res4[1].endsWith('...'));
