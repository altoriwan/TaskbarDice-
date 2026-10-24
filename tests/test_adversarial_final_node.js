/**
 * tests/test_adversarial_final_node.js
 * Comprehensive Adversarial Node.js test harness for:
 * 1. Tooltip word-wrapping and boundary limits with extreme inputs:
 *    - 1000-char single words
 *    - Empty titles, null, undefined, whitespace
 *    - Unicode surrogate pairs (e.g. 𠮷, 𝕳𝖊𝖑𝖑𝖔, 👨‍👩‍👧‍👦, 💀, 🎲, 🦄)
 *    - Vietnamese diacritics (precomposed NFC vs decomposed NFD, compound tone marks)
 *    - Canvas boundary edges and extreme coordinates
 * 2. 5-stage rot engine across extreme rot values:
 *    - Negative (-100, -1.0, -0.001, -Infinity)
 *    - Zero (0.0)
 *    - Thresholds (0.199, 0.20, 0.399, 0.40, 0.599, 0.60, 0.799, 0.80)
 *    - Overdue (1.0, 1.5, 10.0, 1000.0, Infinity, NaN)
 *    - Inverted timeline, zero span, missing dates
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'static', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not locate <script> tag in static/index.html");
  process.exit(1);
}
const scriptCode = scriptMatch[1];

function createMockContext() {
  const calls = {
    fillRects: [],
    strokeRects: [],
    fillTexts: [],
    paths: [],
  };

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
    clip: () => {},
    measureText: (str) => ({ width: Array.from(str).length * 6 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    setLineDash: () => {},
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'top',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
  };
  return ctx;
}

function createSandbox() {
  const mockCtx = createMockContext();
  const listeners = {};

  const mockCanvas = {
    width: 400,
    height: 320,
    getContext: () => mockCtx,
    addEventListener: (ev, handler) => { listeners[ev] = handler; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 320 }),
  };

  const mockElements = {
    diceCanvas: mockCanvas,
    feedbackToast: { style: {} },
    rotStatusBadge: { style: {}, textContent: '', className: '' },
    streakCounter: { textContent: '', style: {} },
    taskInput: { value: '', focus: () => {} },
    taskForm: { addEventListener: () => {} },
    modalOverlay: { classList: { add: () => {}, remove: () => {} } },
    modalTaskName: { textContent: '' },
    confirmCompleteBtn: { addEventListener: () => {} },
    cancelCompleteBtn: { addEventListener: () => {} },
    customTimeBtn: { classList: { add: () => {}, remove: () => {} } },
  };

  const sandbox = {
    __listeners: listeners,
    console: { log: () => {}, error: () => {}, warn: () => {} },
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    Number: Number,
    Array: Array,
    String: String,
    setTimeout: () => {},
    clearTimeout: () => {},
    requestAnimationFrame: () => {},
    document: {
      getElementById: (id) => mockElements[id] || { style: {}, addEventListener: () => {} },
      querySelector: () => ({ disabled: false, title: '', style: {}, classList: { add: () => {}, remove: () => {} } }),
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  };
  sandbox.window.document = sandbox.document;

  const bridgeCode = scriptCode + `
window.__testBridge = {
  getDiceStack: () => diceStack,
  clearDiceStack: () => { diceStack = []; },
  addDieToStack: (t, init) => addDieToStack(t, init),
  DICE_CONFIG: DICE_CONFIG,
  calculateTwitchJitter: (rot, idx, ts) => calculateTwitchJitter(rot, idx, ts),
  drawRetroTooltip: (c, die) => drawRetroTooltip(c, die),
  drawRotIsometricDice: (c, cx, cy, w, h, wt, lbl, r) => drawRotIsometricDice(c, cx, cy, w, h, wt, lbl, r),
  getEffectiveRotFactor: (d) => getEffectiveRotFactor(d),
  getMousePos: () => mousePos,
  setMousePos: (x, y) => { mousePos.x = x; mousePos.y = y; },
};
`;

  vm.createContext(sandbox);
  vm.runInContext(bridgeCode, sandbox);
  return { sandbox, bridge: sandbox.window.__testBridge, mockCtx };
}

let passCount = 0;
let failCount = 0;
const failures = [];

function check(condition, message, details = {}) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    failures.push({ message, details });
    console.error(`[FAIL] ${message}`, details);
  }
}

console.log("================================================================================");
console.log("FINAL ADVERSARIAL CHALLENGER SUITE (V8 / Node.js)");
console.log("================================================================================\n");

const { bridge, mockCtx } = createSandbox();

// -----------------------------------------------------------------------------
// SECTION 1: Tooltip Word-Wrapping & Boundary Stress Under Extreme Inputs
// -----------------------------------------------------------------------------
console.log("[SECTION 1] Tooltip Word-Wrapping & Canvas Boundaries...");

const extremeTitles = [
  { desc: "1000-char single word ('A'*1000)", title: "A".repeat(1000) },
  { desc: "1000-char single word with Vietnamese ('ế'*1000)", title: "ế".repeat(1000) },
  { desc: "Decomposed Vietnamese NFD ('Thuở xưa nguyễn trãi viết bình ngô đại cáo')",
    title: "Thuở xưa nguyễn trãi viết bình ngô đại cáo".normalize('NFD') },
  { desc: "Surrogate pairs / Astral symbols ('𠮷𠮷𠮷' + '𝕳𝖊𝖑𝖑𝖔' * 50)",
    title: "𠮷".repeat(20) + " " + "𝕳𝖊𝖑𝖑𝖔".repeat(50) },
  { desc: "Complex ZWJ emoji sequences ('👨‍👩‍👧‍👦' * 30)",
    title: "👨‍👩‍👧‍👦".repeat(30) },
  { desc: "Empty string", title: "" },
  { desc: "Whitespace string", title: "   \t\n   " },
  { desc: "Null/Undefined title", title: null },
  { desc: "Extreme mixed Vietnamese + Emojis + symbols",
    title: "💥 Báo cáo khẩn cấp 🚨: Hoàn thiện 100% TaskbarDice! 🎲✨ (Đã kiểm tra kỹ lưỡng)" }
];

for (const tc of extremeTitles) {
  mockCtx.calls.fillRects = [];
  mockCtx.calls.fillTexts = [];
  bridge.setMousePos(200, 150);

  const testDie = {
    title: tc.title,
    weight_score: 4,
    created_at: new Date(Date.now() - 60000).toISOString(),
    deadline_at: new Date(Date.now() + 60000).toISOString()
  };

  try {
    bridge.drawRetroTooltip(mockCtx, testDie);
    check(mockCtx.calls.fillRects.length >= 1, `Tooltip frame created for ${tc.desc}`);
    const frame = mockCtx.calls.fillRects[0];
    const tooltipWidth = frame.w;
    const tooltipHeight = frame.h;

    check(tooltipWidth >= 160 && tooltipWidth <= 230, `Tooltip width [${tooltipWidth}px] clamped in [160, 230] for ${tc.desc}`);
    check(tooltipHeight === 46 || tooltipHeight === 58, `Tooltip height [${tooltipHeight}px] is valid preset for ${tc.desc}`);

    // Verify all rendered text lines do not exceed maxLineWidth (180px)
    const titleLines = mockCtx.calls.fillTexts.filter(t => !t.text.startsWith('W:') && !t.text.startsWith('STAGE:') && !t.text.startsWith('CÒN:') && !t.text.startsWith('QUÁ HẠN:'));
    check(titleLines.length <= 2, `Title wraps to at most 2 lines for ${tc.desc}`, { count: titleLines.length });

    for (let i = 0; i < titleLines.length; i++) {
      const lineLen = Array.from(titleLines[i].text).length;
      const lineWidth = lineLen * 6;
      check(lineWidth <= 180, `Line ${i} width (${lineWidth}px) does not exceed 180px for ${tc.desc}`, { text: titleLines[i].text });
      // Invariant: no orphaned surrogate code units
      check(!/[\uD800-\uDBFF]$/.test(titleLines[i].text), `Line ${i} does not end with high surrogate for ${tc.desc}`);
      check(!/^[\uDC00-\uDFFF]/.test(titleLines[i].text), `Line ${i} does not start with low surrogate for ${tc.desc}`);
    }
  } catch (err) {
    check(false, `drawRetroTooltip threw exception for ${tc.desc}: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// SECTION 2: 4-Way Boundary Clamping Across Extreme Coordinates
// -----------------------------------------------------------------------------
console.log("\n[SECTION 2] Canvas Boundary Clamping Across Extremes...");

const boundaryCoords = [
  [0, 0], [400, 0], [0, 320], [400, 320],
  [200, 0], [200, 320], [0, 160], [400, 160],
  [-100, -100], [-500, 200], [500, 150], [200, 500],
  [10000, 10000], [-10000, -10000]
];

const sampleDie = {
  title: "Boundary Test Task",
  weight_score: 3,
  created_at: new Date(Date.now() - 60000).toISOString(),
  deadline_at: new Date(Date.now() + 60000).toISOString()
};

for (const [mx, my] of boundaryCoords) {
  mockCtx.calls.fillRects = [];
  bridge.setMousePos(mx, my);
  bridge.drawRetroTooltip(mockCtx, sampleDie);

  const frame = mockCtx.calls.fillRects[0];
  check(frame !== undefined, `Frame exists at (${mx}, ${my})`);
  if (frame) {
    const left = frame.x;
    const top = frame.y;
    const right = frame.x + frame.w;
    const bottom = frame.y + frame.h;

    check(left >= 8, `Left edge (${left}) >= 8px at mouse (${mx}, ${my})`);
    check(top >= 8, `Top edge (${top}) >= 8px at mouse (${mx}, ${my})`);
    check(right <= 392, `Right edge (${right}) <= 392px at mouse (${mx}, ${my})`);
    check(bottom <= 312, `Bottom edge (${bottom}) <= 312px at mouse (${mx}, ${my})`);
  }
}

// -----------------------------------------------------------------------------
// SECTION 3: 5-Stage Rot Engine Across Extreme & Boundary Values
// -----------------------------------------------------------------------------
console.log("\n[SECTION 3] 5-Stage Rot Engine Across Extreme Rot Values...");

const extremeRots = [
  -Infinity, -1000.0, -1.0, -0.0001,
  0.0,
  0.1999, 0.20, 0.2001,
  0.3999, 0.40, 0.4001,
  0.5999, 0.60, 0.6001,
  0.7999, 0.80, 0.8001,
  0.9999, 1.0, 1.0001,
  1.5, 10.0, 1000.0, Infinity,
  NaN
];

for (const rot of extremeRots) {
  try {
    // drawRotIsometricDice(c, cx, cy, w, h, wt, lbl, rot)
    mockCtx.calls.fillRects = [];
    bridge.drawRotIsometricDice(mockCtx, 200, 150, 48, 28, 3, "TEST", rot);
    check(true, `drawRotIsometricDice survived rot = ${rot}`);
  } catch (err) {
    check(false, `drawRotIsometricDice crashed on rot = ${rot}: ${err.message}`);
  }

  // calculateTwitchJitter(rot, index, timestamp)
  for (const ts of [0, 500, 1000, 5000]) {
    try {
      const jitter = bridge.calculateTwitchJitter(rot, 0, ts);
      check(typeof jitter.dx === 'number' && typeof jitter.dy === 'number', `Jitter is numeric for rot = ${rot}`);
      if (typeof rot === 'number' && rot < 0.8) {
        check(jitter.dx === 0 && jitter.dy === 0, `Jitter is zero for rot = ${rot} (< 0.8)`);
      } else {
        const limit = (rot >= 1.0) ? 4.5001 : 1.8001;
        check(Math.abs(jitter.dx) <= 4.5001, `Jitter dx (${jitter.dx}) bounded within 4.5px for rot = ${rot}`);
        check(Math.abs(jitter.dy) <= 4.5001, `Jitter dy (${jitter.dy}) bounded within 4.5px for rot = ${rot}`);
      }
    } catch (err) {
      check(false, `calculateTwitchJitter crashed on rot = ${rot}: ${err.message}`);
    }
  }
}

// Check getEffectiveRotFactor under abnormal task dates
const abnormalTasks = [
  { desc: "Zero time span (created == deadline)", created_at: "2026-10-24T10:00:00Z", deadline_at: "2026-10-24T10:00:00Z" },
  { desc: "Inverted time span (deadline < created)", created_at: "2026-10-24T10:00:00Z", deadline_at: "2026-10-24T09:00:00Z" },
  { desc: "Missing created_at", deadline_at: "2026-10-24T12:00:00Z" },
  { desc: "Missing deadline_at", created_at: "2026-10-24T10:00:00Z" },
  { desc: "Far future deadline", created_at: "2026-10-24T10:00:00Z", deadline_at: "2099-01-01T00:00:00Z" },
  { desc: "Ancient deadline (1000 days overdue)", created_at: "2020-01-01T00:00:00Z", deadline_at: "2020-01-02T00:00:00Z" }
];

for (const t of abnormalTasks) {
  try {
    const factor = bridge.getEffectiveRotFactor(t);
    check(typeof factor === 'number' && !isNaN(factor), `getEffectiveRotFactor returned valid number for ${t.desc} (got ${factor})`);
    check(factor >= 0.0, `getEffectiveRotFactor non-negative for ${t.desc}`);
  } catch (err) {
    check(false, `getEffectiveRotFactor crashed for ${t.desc}: ${err.message}`);
  }
}

console.log("\n================================================================================");
console.log(`FINAL NODE RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("================================================================================");

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("ALL NODE ADVERSARIAL STRESS CHECKS PASSED 100%!");
  process.exit(0);
}
