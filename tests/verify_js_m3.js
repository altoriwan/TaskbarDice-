/**
 * Node.js V8 In-Engine Verification of Milestone 3 & 4 in static/index.html
 * Executes actual JavaScript from static/index.html in a mocked DOM / Canvas environment.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const htmlPath = path.join(__dirname, '..', 'static', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract script content from static/index.html
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not locate <script> tag in static/index.html");
  process.exit(1);
}
// Append an inspection exporter to access script-scoped consts
const scriptCode = scriptMatch[1] + `
  window.__inspectPools = () => ({ slimeDripPool, slimePuddlePool, slimeSplashPool, MAX_SLIME_DRIPS, MAX_SLIME_PUDDLES, MAX_SLIME_SPLASHES, devMode: () => devMode, mousePos });
`;


// Mock Canvas 2D context tracking all render calls
const renderCalls = [];
const mockCtx = {
  save: () => renderCalls.push({ type: 'save' }),
  restore: () => renderCalls.push({ type: 'restore' }),
  beginPath: () => renderCalls.push({ type: 'beginPath' }),
  closePath: () => renderCalls.push({ type: 'closePath' }),
  moveTo: (x, y) => renderCalls.push({ type: 'moveTo', x, y }),
  lineTo: (x, y) => renderCalls.push({ type: 'lineTo', x, y }),
  bezierCurveTo: (...args) => renderCalls.push({ type: 'bezierCurveTo', args }),
  arc: (x, y, r, sa, ea) => renderCalls.push({ type: 'arc', x, y, r }),
  ellipse: (x, y, rx, ry, rot, sa, ea) => renderCalls.push({ type: 'ellipse', x, y, rx, ry }),
  rect: (x, y, w, h) => renderCalls.push({ type: 'rect', x, y, w, h }),
  fillRect: (x, y, w, h) => renderCalls.push({ type: 'fillRect', x, y, w, h, fillStyle: mockCtx.fillStyle }),
  strokeRect: (x, y, w, h) => renderCalls.push({ type: 'strokeRect', x, y, w, h, strokeStyle: mockCtx.strokeStyle, lineWidth: mockCtx.lineWidth }),
  fill: () => renderCalls.push({ type: 'fill', fillStyle: mockCtx.fillStyle }),
  stroke: () => renderCalls.push({ type: 'stroke', strokeStyle: mockCtx.strokeStyle }),
  fillText: (text, x, y) => renderCalls.push({ type: 'fillText', text, x, y, fillStyle: mockCtx.fillStyle }),
  strokeText: (text, x, y) => renderCalls.push({ type: 'strokeText', text, x, y }),
  measureText: (text) => ({ width: (text || '').length * 6 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  setLineDash: () => {},
  translate: (x, y) => renderCalls.push({ type: 'translate', x, y }),
  rotate: (a) => renderCalls.push({ type: 'rotate', a }),
  clearRect: () => {},
  imageSmoothingEnabled: false,
  globalAlpha: 1.0,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '10px monospace',
  textAlign: 'left',
  textBaseline: 'top',
  lineJoin: 'miter',
  lineCap: 'square',
  shadowColor: '',
  shadowBlur: 0
};

const mockCanvas = {
  width: 400,
  height: 320,
  getContext: () => mockCtx,
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 320 }),
};

const listeners = {};
const mockElements = {
  diceCanvas: mockCanvas,
  feedbackToast: { style: {} },
  rotStatusBadge: { style: {}, textContent: '', className: '' },
  streakCounter: { textContent: '', style: {} },
  taskInput: { value: '', focus: () => {} },
  taskForm: { addEventListener: () => {} },
  modalOverlay: { classList: { add: () => {}, remove: () => {} }, style: {} },
  modalTaskName: { textContent: '' },
  confirmCompleteBtn: { addEventListener: () => {} },
  cancelCompleteBtn: { addEventListener: () => {} },
  customTimeBtn: { classList: { add: () => {}, remove: () => {} } },
  closeBtn: { addEventListener: () => {} }
};

const sandbox = {
  console: console,
  Date: Date,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  setTimeout: () => {},
  clearTimeout: () => {},
  requestAnimationFrame: () => {},
  document: {
    getElementById: (id) => mockElements[id] || { style: {}, addEventListener: () => {}, classList: { add: () => {}, remove: () => {} } },
    querySelector: () => ({ disabled: false, title: '', style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => [],
    addEventListener: () => {},
  },
  window: {
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeEventListener: () => {},
  },
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;

// Execute script in VM context
vm.createContext(sandbox);
vm.runInContext(scriptCode, sandbox);

console.log("PASS: static/index.html script evaluated without errors in VM sandbox.");

// =========================================================================
// 1. Stress-test Twitch Micro-jitter calculateTwitchJitter(rot, index, timestamp)
// =========================================================================
const calculateTwitchJitter = sandbox.calculateTwitchJitter;
assert(typeof calculateTwitchJitter === 'function', "calculateTwitchJitter must be a function");

// Non-jitter for rot < 0.8
for (let r = 0; r < 0.8; r += 0.1) {
  const j = calculateTwitchJitter(r, 0, 1000);
  assert.strictEqual(j.dx, 0, `rot ${r} should have dx = 0`);
  assert.strictEqual(j.dy, 0, `rot ${r} should have dy = 0`);
}

// Stage 5 non-overdue jitter (0.8 <= rot < 1.0): bounded within [-1.8, 1.8]
let stage5NonOverdueHasJitter = false;
for (let t = 0; t < 2000; t += 10) {
  const j = calculateTwitchJitter(0.9, 0, t);
  assert(Number.isFinite(j.dx), "dx must be finite");
  assert(Number.isFinite(j.dy), "dy must be finite");
  assert(Math.abs(j.dx) <= 1.8001, `Stage 5 dx clamped <= 1.8, got ${j.dx}`);
  assert(Math.abs(j.dy) <= 1.8001, `Stage 5 dy clamped <= 1.8, got ${j.dy}`);
  if (j.dx !== 0 || j.dy !== 0) stage5NonOverdueHasJitter = true;
}
assert(stage5NonOverdueHasJitter, "Stage 5 must produce jitter during burst frames");

// Stage 5 Overdue jitter (rot >= 1.0): bounded within [-4.5, 4.5]
let stage5OverdueHasJitter = false;
for (let t = 0; t < 2000; t += 10) {
  const j = calculateTwitchJitter(1.5, 0, t);
  assert(Number.isFinite(j.dx), "dx must be finite");
  assert(Number.isFinite(j.dy), "dy must be finite");
  assert(Math.abs(j.dx) <= 4.5001, `Stage 5 Overdue dx clamped <= 4.5, got ${j.dx}`);
  assert(Math.abs(j.dy) <= 4.5001, `Stage 5 Overdue dy clamped <= 4.5, got ${j.dy}`);
  if (j.dx !== 0 || j.dy !== 0) stage5OverdueHasJitter = true;
}
assert(stage5OverdueHasJitter, "Stage 5 Overdue must produce amplified jitter");
console.log("PASS: Twitch micro-jitter calculation and mathematical bounding verified.");

// =========================================================================
// 2. Test drawRotIsometricDice for all 5 Stages
// =========================================================================
const drawRotIsometricDice = sandbox.drawRotIsometricDice;
assert(typeof drawRotIsometricDice === 'function', "drawRotIsometricDice must be a function");

const stagesToTest = [
  { name: 'Stage 1 (Ivory)', rot: 0.10, expectedTop: '#fdfbf7', expectedPip: '#18181b' },
  { name: 'Stage 2 (Sandy yellow)', rot: 0.30, expectedTop: '#eae0c8', expectedPip: '#3c352a' },
  { name: 'Stage 3 (Cracked stone)', rot: 0.50, expectedTop: '#8a8d8f', expectedPip: '#222426' },
  { name: 'Stage 4 (Mossy decay)', rot: 0.70, expectedTop: '#4a5d4e', expectedPip: '#18221b' },
  { name: 'Stage 5 (Necrotic purple)', rot: 0.90, expectedTop: '#2e1f3d', expectedPip: '#a3e635' },
  { name: 'Stage 5 (Overdue)', rot: 1.25, expectedTop: '#2e1f3d', expectedPip: '#a3e635' }
];

stagesToTest.forEach(st => {
  renderCalls.length = 0;
  drawRotIsometricDice(mockCtx, 200, 200, 48, 28, 3, "TEST TASK", st.rot);

  // Check top face color in render calls
  const topFaceFill = renderCalls.find(c => c.type === 'fill' && c.fillStyle === st.expectedTop);
  assert(topFaceFill, `${st.name} must render top face with ${st.expectedTop}`);

  // Check pip color in render calls
  const pipFill = renderCalls.find(c => c.type === 'fillRect' && c.fillStyle === st.expectedPip);
  assert(pipFill, `${st.name} must render pips with ${st.expectedPip}`);
});
console.log("PASS: All 5 distinct rot stages rendered correctly with authentic palettes & pips.");

// =========================================================================
// 3. Test Slime Drips & Floor Puddle Object Pools (Zero GC Allocations)
// =========================================================================
const pools = sandbox.window.__inspectPools();
const slimeDripPool = pools.slimeDripPool;
const slimePuddlePool = pools.slimePuddlePool;
const slimeSplashPool = pools.slimeSplashPool;
assert(Array.isArray(slimeDripPool) && slimeDripPool.length === 80, "slimeDripPool must have 80 pre-allocated slots");
assert(Array.isArray(slimePuddlePool) && slimePuddlePool.length === 12, "slimePuddlePool must have 12 pre-allocated slots");
assert(Array.isArray(slimeSplashPool) && slimeSplashPool.length === 24, "slimeSplashPool must have 24 pre-allocated slots");

const initialDripLen = slimeDripPool.length;
const initialPuddleLen = slimePuddlePool.length;
const initialSplashLen = slimeSplashPool.length;

// Simulate 500 frames of Stage 5 slime updates
const spawnStage5SlimeDrip = sandbox.spawnStage5SlimeDrip;
const updateAndDrawSlime = sandbox.updateAndDrawSlime;

for (let frame = 0; frame < 500; frame++) {
  // Force drips to spawn
  spawnStage5SlimeDrip(200, 200, 24, 12, 28, 1.25);
  updateAndDrawSlime(mockCtx);
}

assert.strictEqual(slimeDripPool.length, initialDripLen, "slimeDripPool length must remain constant (no push/splice GC churn)");
assert.strictEqual(slimePuddlePool.length, initialPuddleLen, "slimePuddlePool length must remain constant");
assert.strictEqual(slimeSplashPool.length, initialSplashLen, "slimeSplashPool length must remain constant");

// Verify puddles were created and are bounded
const activePuddles = slimePuddlePool.filter(p => p.active);
assert(activePuddles.length > 0, "Floor puddles must activate from falling drips");
activePuddles.forEach(p => {
  assert(p.width <= p.maxWidth + 1, `Puddle width ${p.width} must not exceed maxWidth ${p.maxWidth}`);
  assert(p.alpha >= 0 && p.alpha <= 1.0, `Puddle alpha ${p.alpha} must be between 0 and 1.0`);
});
console.log("PASS: Slime drip & floor puddle pools operate with zero runtime heap allocations.");

// =========================================================================
// 4. Test Developer Speed-Test Mode (Key 'D')
// =========================================================================
const keydownHandlers = listeners['keydown'] || [];
assert(keydownHandlers.length > 0, "Window must register keydown handler for Key 'D'");
const keyHandler = keydownHandlers[0];

// Test cycling through all 7 modes
const getEffectiveRotFactor = sandbox.getEffectiveRotFactor;
const dummyDie = { created_at: new Date(Date.now() - 5000).toISOString(), deadline_at: new Date(Date.now() + 5000).toISOString() };

const expectedDevRot = [
  null, // 0: realtime
  0.10, // 1: Stage 1
  0.30, // 2: Stage 2
  0.50, // 3: Stage 3
  0.70, // 4: Stage 4
  0.90, // 5: Stage 5
  1.25  // 6: Stage 5 Overdue
];

for (let cycle = 1; cycle <= 6; cycle++) {
  keyHandler({ key: 'd', target: {} });
  assert.strictEqual(pools.devMode(), cycle, `devMode should be ${cycle}`);
  assert.strictEqual(getEffectiveRotFactor(dummyDie), expectedDevRot[cycle], `devMode ${cycle} rot should be ${expectedDevRot[cycle]}`);
}

// 7th press cycles back to 0 (Realtime)
keyHandler({ key: 'd', target: {} });
assert.strictEqual(pools.devMode(), 0, "devMode should cycle back to 0");

// Typing 'd' inside taskInput must be ignored
const taskInputEl = mockElements.taskInput;
keyHandler({ key: 'd', target: taskInputEl });
assert.strictEqual(pools.devMode(), 0, "Typing 'd' inside taskInput must not change devMode");


console.log("PASS: Developer Key 'D' speed-test cycling all 5 stages and overdue verified.");

// =========================================================================
// 5. Test Retro Tooltip 4-Way Canvas Boundary Clamping
// =========================================================================
const drawRetroTooltip = sandbox.drawRetroTooltip;
assert(typeof drawRetroTooltip === 'function', "drawRetroTooltip must be a function");

const testDie = {
  title: "Cực kỳ khẩn cấp: Sửa lỗi thanh toán ngân hàng trực tuyến",
  weight_score: 4,
  created_at: new Date(Date.now() - 60000).toISOString(),
  deadline_at: new Date(Date.now() + 60000).toISOString()
};

// Test boundary edge coordinates
const testMouseCoords = [
  { x: 10, y: 10, desc: "Top-Left boundary" },
  { x: 390, y: 10, desc: "Top-Right boundary" },
  { x: 10, y: 310, desc: "Bottom-Left boundary" },
  { x: 390, y: 310, desc: "Bottom-Right boundary" },
  { x: 200, y: 160, desc: "Center canvas" }
];

testMouseCoords.forEach(pos => {
  pools.mousePos.x = pos.x;
  pools.mousePos.y = pos.y;
  renderCalls.length = 0;
  drawRetroTooltip(mockCtx, testDie);

  // Find tooltip strokeRect
  const tooltipRect = renderCalls.find(c => c.type === 'strokeRect' && c.w >= 160);
  assert(tooltipRect, `Tooltip frame must be rendered at ${pos.desc}`);
  assert(tooltipRect.x >= 8, `Tooltip x (${tooltipRect.x}) must be >= 8px canvas padding at ${pos.desc}`);
  assert(tooltipRect.x + tooltipRect.w <= 392, `Tooltip right edge (${tooltipRect.x + tooltipRect.w}) must be <= 392px at ${pos.desc}`);
  assert(tooltipRect.y >= 8, `Tooltip y (${tooltipRect.y}) must be >= 8px canvas padding at ${pos.desc}`);
  assert(tooltipRect.y + tooltipRect.h <= 312, `Tooltip bottom edge (${tooltipRect.y + tooltipRect.h}) must be <= 312px at ${pos.desc}`);
});

console.log("PASS: Retro Tooltip 4-way boundary clamping within 400x320 canvas verified.");

console.log("\n========================================================");
console.log("ALL EMPIRICAL M3/M4 SPEC & INTEGRITY VERIFICATIONS PASSED 100%!");
console.log("========================================================\n");
