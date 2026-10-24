const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', '..', '..', 'static', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const targetChunk = `      // 1. Full Title multi-line wrapping (up to 2 lines)
      const fullTitle = (die.title || 'UNTITLED').trim();
      const maxLineWidth = 180;
      const words = fullTitle.split(/\\s+/);
      let lines = [];
      let currentLine = '';

      for (let w = 0; w < words.length; w++) {
        const testLine = currentLine ? \`\${currentLine} \${words[w]}\` : words[w];
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
      if (lines.length > 2) lines = lines.slice(0, 2);`;

const replacementChunk = `      // 1. Full Title multi-line wrapping (up to 2 lines)
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

        const testLine = currentLine ? \`\${currentLine} \${word}\` : word;
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
      if (lines.length > 2) lines = lines.slice(0, 2);
      for (let i = 0; i < lines.length; i++) {
        while (lines[i].length > 0 && measure(lines[i]) > maxLineWidth) {
          lines[i] = lines[i].slice(0, -1);
        }
      }`;

const modifiedHtml = htmlContent.replace(targetChunk, replacementChunk);

// Test 1: test_adversarial_m3_tooltip.js
console.log("=== Testing with test_adversarial_m3_tooltip.js ===");
const testJsPath = path.join(__dirname, '..', '..', '..', 'tests', 'test_adversarial_m3_tooltip.js');
let testJsCode = fs.readFileSync(testJsPath, 'utf8');
testJsCode = testJsCode.replace(
  "const htmlContent = fs.readFileSync(htmlPath, 'utf8');",
  "const htmlContent = " + JSON.stringify(modifiedHtml) + ";"
);

let sandbox = {
  require,
  __dirname: path.join(__dirname, '..', '..', '..', 'tests'),
  console,
  process: {
    exit: (code) => {
      console.log(`[test_adversarial_m3_tooltip.js] Exited with code: ${code}`);
      if (code !== 0) throw new Error(`Test failed with code ${code}`);
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(testJsCode, sandbox);

// Test 2: verify_js_m3.js
console.log("\n=== Testing with verify_js_m3.js ===");
const verifyJsPath = path.join(__dirname, '..', '..', '..', 'tests', 'verify_js_m3.js');
let verifyJsCode = fs.readFileSync(verifyJsPath, 'utf8');
verifyJsCode = verifyJsCode.replace(
  "const htmlContent = fs.readFileSync(htmlPath, 'utf8');",
  "const htmlContent = " + JSON.stringify(modifiedHtml) + ";"
);

sandbox = {
  require,
  __dirname: path.join(__dirname, '..', '..', '..', 'tests'),
  console,
  process: {
    exit: (code) => {
      console.log(`[verify_js_m3.js] Exited with code: ${code}`);
      if (code !== 0) throw new Error(`Test failed with code ${code}`);
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(verifyJsCode, sandbox);

console.log("\nALL VERIFICATIONS PASSED WITH HARDENED PROPOSED REPLACEMENT CHUNK!");
