import os
import sys
import unittest
import re

PROJECT_ROOT = r"c:\Users\haquo\Documents\antigravity\amazing-turing"
html_path = os.path.join(PROJECT_ROOT, "static", "index.html")
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

target_chunk = """      // 1. Full Title multi-line wrapping (up to 2 lines)
      const fullTitle = (die.title || 'UNTITLED').trim();
      const maxLineWidth = 180;
      const words = fullTitle.split(/\\s+/);
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
      if (lines.length > 2) lines = lines.slice(0, 2);"""

replacement_chunk = """      // 1. Full Title multi-line wrapping (up to 2 lines)
      const fullTitle = (die.title || 'UNTITLED').trim();
      const maxLineWidth = 180;
      const words = fullTitle.split(/\\s+/);
      let lines = [];
      let currentLine = '';

      for (let w = 0; w < words.length; w++) {
        let word = words[w];
        if (!word) continue;

        // Character-level chunking for unbroken words where measure(word) > maxLineWidth
        if (measure(word) > maxLineWidth) {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = '';
            if (lines.length >= 2) break;
          }
          while (word.length > 0 && lines.length < 2) {
            if (measure(word) <= maxLineWidth) {
              currentLine = word;
              word = '';
              break;
            }
            let chunk = '';
            let ci = 0;
            while (ci < word.length) {
              const next = chunk + word[ci];
              if (measure(next) <= maxLineWidth) {
                chunk = next;
                ci++;
              } else {
                break;
              }
            }
            if (!chunk) {
              chunk = word[0];
              ci = 1;
            }
            word = word.slice(ci);
            if (lines.length < 1 && word.length > 0) {
              lines.push(chunk);
            } else {
              currentLine = chunk;
              break;
            }
          }
          if (lines.length >= 2) break;
          continue;
        }

        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (measure(testLine) <= maxLineWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
          if (lines.length >= 2) break;
        }
      }
      if (currentLine && lines.length < 2) lines.push(currentLine);
      if (lines.length === 0) lines.push(fullTitle.substring(0, 22));
      if (lines.length > 2) lines = lines.slice(0, 2);"""

assert target_chunk in html_content, "target_chunk not in html_content!"
mod_html = html_content.replace(target_chunk, replacement_chunk)

# Check assertions from test_adversarial_m3_tooltip.py
assert "const fullTitle = (die.title || 'UNTITLED').trim();" in mod_html
assert "const words = fullTitle.split(/\\s+/);" in mod_html
assert "const maxLineWidth = 180;" in mod_html

# Check assertions from test_challenger_m3.py
assert "const maxLineWidth = 180;" in mod_html
assert "const words = fullTitle.split(/\\s+/);" in mod_html

print("Python assertions passed with flying colors!")
