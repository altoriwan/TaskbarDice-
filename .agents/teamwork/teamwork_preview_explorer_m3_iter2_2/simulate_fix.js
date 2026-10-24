const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', '..', '..', 'static', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Proposed replacement for drawRetroTooltip
const proposedDrawRetroTooltip = `
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
      const timeStr = isOverdue ? \`QUÁ HẠN: +\${m}m \${s}s\` : \`CÒN: \${m}m \${s}s\`;

      c.save();
      c.font = '6px "Press Start 2P"';
      const measure = (str) => (c.measureText ? c.measureText(str).width : (str || '').length * 6);

      // 1. Full Title multi-line wrapping with character chunking & ellipsis
      const rawTitle = (die.title || 'UNTITLED').trim();
      const maxLineWidth = 180;
      const rawWords = rawTitle ? rawTitle.split(/\\s+/) : ['UNTITLED'];
      
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
        const candidate = currentLine ? \`\${currentLine} \${nextWord}\` : nextWord;
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
          const candidate = currentLine ? \`\${currentLine} \${nextWord}\` : nextWord;
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

      // Append '...' to Line 2 if text was truncated
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
      const metaStr = \`W:\${die.weight_score} | STAGE: [\${stage}/5]\`;
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
      c.strokeStyle = isOverdue ? '#e76e55' : 'rgba(255, 215, 0, 0.9)';
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
      const wLabel = \`W:\${die.weight_score} | \`;
      c.fillText(wLabel, tooltipX + 6, textY);
      const wWidth = measure(wLabel);
      c.fillStyle = stageColors[stage] || '#ffd700';
      c.fillText(\`STAGE: [\${stage}/5]\`, tooltipX + 6 + wWidth, textY);
      textY += 11;

      // Countdown timer line (Blinking red if overdue, NES Yellow if active)
      const blink = Math.floor(now / 220) % 2 === 0;
      if (isOverdue) {
        c.fillStyle = blink ? '#ff2222' : '#881111';
      } else {
        c.fillStyle = '#f7d51d';
      }
      c.fillText(timeStr, tooltipX + 6, textY);

      c.restore(); // Restore clip region

      c.restore(); // Restore initial canvas state
    }
`;

// Replace drawRetroTooltip in htmlContent for simulation test
const regex = /function drawRetroTooltip\(c, die\) \{[\s\S]*?\n    \}/;
const modifiedHtml = htmlContent.replace(regex, proposedDrawRetroTooltip.trim());

// Write temporary test file and run test_adversarial_m3_tooltip against it
const testAdversarialCode = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'tests', 'test_adversarial_m3_tooltip.js'), 'utf8');

// Replace htmlPath reading in testAdversarialCode with modifiedHtml
const modifiedTestCode = testAdversarialCode.replace(
  "const htmlContent = fs.readFileSync(htmlPath, 'utf8');",
  "const htmlContent = " + JSON.stringify(modifiedHtml) + ";"
);

const runnerPath = path.join(__dirname, 'run_adversarial_simulation.js');
fs.writeFileSync(runnerPath, modifiedTestCode, 'utf8');
console.log("Wrote simulation runner to", runnerPath);
