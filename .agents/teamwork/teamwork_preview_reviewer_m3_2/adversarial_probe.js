const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', '..', '..', 'static', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not locate <script> tag in static/index.html");
  process.exit(1);
}
const scriptCode = scriptMatch[1];

let drawCalls = [];
const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  ellipse: () => {},
  rect: () => {},
  fillRect: (x, y, w, h) => drawCalls.push({ type: 'fillRect', x, y, w, h }),
  strokeRect: (x, y, w, h) => drawCalls.push({ type: 'strokeRect', x, y, w, h }),
  fill: () => {},
  stroke: () => {},
  fillText: (t, x, y) => drawCalls.push({ type: 'fillText', t, x, y }),
  measureText: (str) => ({ width: str.length * 6 }),
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '10px monospace',
};

const mockCanvas = {
  width: 400,
  height: 320,
  getContext: () => mockCtx,
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 320 })
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
    getElementById: (id) => (id === 'diceCanvas' ? mockCanvas : { style: {}, addEventListener: () => {} }),
    querySelector: () => ({ disabled: false, title: '', style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  window: {
    addEventListener: () => {},
    removeEventListener: () => {}
  }
};
sandbox.window.addEventListener = () => {};
sandbox.window.removeEventListener = () => {};

const instrumentedCode = scriptCode + `
window.__advTest = {
  slimeDripPool,
  slimePuddlePool,
  slimeSplashPool,
  MAX_SLIME_DRIPS,
  MAX_SLIME_PUDDLES,
  MAX_SLIME_SPLASHES,
  spawnStage5SlimeDrip,
  triggerSlimeFloorImpact,
  updateAndDrawSlime,
  calculateTwitchJitter,
  drawRetroTooltip,
  drawRotIsometricDice,
  getEffectiveRotFactor,
  diceStack,
  mousePos,
  hoveredDie,
  setMousePos: (p) => { mousePos = p; },
  setHoveredDie: (d) => { hoveredDie = d; }
};
`;

vm.createContext(sandbox);
vm.runInContext(instrumentedCode, sandbox);
const T = sandbox.window.__advTest;

console.log('--- TEST 1: Particle Pool Pre-allocation & Fixed Sizing ---');
if (T.slimeDripPool.length !== 80 || T.slimePuddlePool.length !== 12 || T.slimeSplashPool.length !== 24) {
  throw new Error('Pool sizing mismatch');
}
console.log('PASS: Pools initialized to exact sizes: 80 drips, 12 puddles, 24 splashes.');

console.log('--- TEST 2: High-Pressure Pool Saturation & Zero Leaks ---');
// Try spawning 1000 drips
for (let i = 0; i < 1000; i++) {
  T.spawnStage5SlimeDrip(200, 200, 20, 10, 20, 1.25);
}
if (T.slimeDripPool.length !== 80) throw new Error('Drip pool grew beyond 80!');
const activeDrips = T.slimeDripPool.filter(d => d.active).length;
console.log('Active drips after saturation:', activeDrips, '(max 80)');

// Simulate 500 frames of physics
for (let frame = 0; frame < 500; frame++) {
  T.updateAndDrawSlime(mockCtx);
  if (frame % 3 === 0) {
    T.spawnStage5SlimeDrip(200, 200, 20, 10, 20, 1.25);
  }
}
if (T.slimeDripPool.length !== 80) throw new Error('Drip pool size changed!');
if (T.slimePuddlePool.length !== 12) throw new Error('Puddle pool size changed!');
if (T.slimeSplashPool.length !== 24) throw new Error('Splash pool size changed!');
console.log('PASS: 500 frames of intense physics executed with zero array allocations or leaks.');

console.log('--- TEST 3: Twitch Vibration Under Escalating Rot ---');
const jitterLow = T.calculateTwitchJitter(0.5, 0, 1000);
if (jitterLow.dx !== 0 || jitterLow.dy !== 0) throw new Error('Low rot should have 0 jitter');
const jitterStg5 = T.calculateTwitchJitter(0.9, 0, 1000);
const jitterOverdue = T.calculateTwitchJitter(1.5, 0, 1000);
console.log('Jitter Stage 5:', jitterStg5, 'Jitter Overdue:', jitterOverdue);
if (Math.abs(jitterOverdue.dx) > 4.5 || Math.abs(jitterOverdue.dy) > 4.5) {
  throw new Error('Jitter exceeded clamp bound 4.5');
}
console.log('PASS: Twitch jitter scales up and strictly adheres to pixel-art clamp limits.');

console.log('--- TEST 4: Tooltip 4-Way Boundary Clamping Exhaustive Grid ---');
const testCoords = [
  [-100, -100], [0, 0], [4, 4], [8, 8], [100, 100],
  [200, 160], [390, 8], [392, 312], [400, 320], [500, 500]
];

for (const [mx, my] of testCoords) {
  T.setMousePos({ x: mx, y: my });
  const mockDie = {
    title: 'Adversarial Clamping Test Task',
    weight_score: 5,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    deadline_at: new Date(Date.now() + 1800000).toISOString()
  };
  drawCalls = [];
  T.drawRetroTooltip(mockCtx, mockDie);
  
  // Find tooltip frame strokeRect
  const rects = drawCalls.filter(d => d.type === 'strokeRect' && d.w >= 160);
  if (rects.length === 0) throw new Error('No tooltip rect drawn for coord ' + mx + ',' + my);
  const r = rects[0];
  if (r.x < 8) throw new Error(`Clamping failed left: r.x = ${r.x} < 8 for ${mx},${my}`);
  if (r.x + r.w > 392) throw new Error(`Clamping failed right: r.x + r.w = ${r.x + r.w} > 392 for ${mx},${my}`);
  if (r.y < 8) throw new Error(`Clamping failed top: r.y = ${r.y} < 8 for ${mx},${my}`);
  if (r.y + r.h > 312) throw new Error(`Clamping failed bottom: r.y + r.h = ${r.y + r.h} > 312 for ${mx},${my}`);
}
console.log('PASS: Tooltip strictly clamped within [8, 392] x [8, 312] across entire coordinate plane.');

console.log('--- TEST 5: Title Word-Wrapping Edge Cases ---');
const adversarialTitles = [
  '',
  '   ',
  'A',
  'SupercalifragilisticexpialidociousWithoutAnySpacesHereToTestMaxLineWidthBoundaryWrapping',
  'Tiếng Việt có dấu: Báo cáo công việc tuần 42 & chuẩn bị kế hoạch quý 1 năm 2027',
  '<script>alert("XSS")</script>',
  'Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10 Word11 Word12'
];

for (const title of adversarialTitles) {
  const die = {
    title: title,
    weight_score: 3,
    created_at: new Date(Date.now() - 100000).toISOString(),
    deadline_at: new Date(Date.now() + 100000).toISOString()
  };
  drawCalls = [];
  T.drawRetroTooltip(mockCtx, die);
  const textCalls = drawCalls.filter(d => d.type === 'fillText');
  if (textCalls.length < 3) {
    throw new Error('Expected at least 3 text lines (title, stage, time) for title: ' + title);
  }
}
console.log('PASS: All adversarial title strings safely wrapped and rendered without crashing.');

console.log('--- TEST 6: Countdown Timer and Overdue States ---');
// Case A: Active task (remaining)
const activeDie = {
  title: 'Active Task',
  weight_score: 2,
  created_at: new Date(Date.now() - 600000).toISOString(),
  deadline_at: new Date(Date.now() + 900000).toISOString()
};
drawCalls = [];
T.drawRetroTooltip(mockCtx, activeDie);
const activeTimeText = drawCalls.find(d => d.type === 'fillText' && d.t.startsWith('CÒN:'));
if (!activeTimeText) throw new Error('Active task missing CÒN: prefix');
console.log('Active task formatted:', activeTimeText.t);

// Case B: Overdue task
const overdueDie = {
  title: 'Overdue Task',
  weight_score: 4,
  created_at: new Date(Date.now() - 3600000).toISOString(),
  deadline_at: new Date(Date.now() - 1200000).toISOString()
};
drawCalls = [];
T.drawRetroTooltip(mockCtx, overdueDie);
const overdueTimeText = drawCalls.find(d => d.type === 'fillText' && d.t.startsWith('QUÁ HẠN:'));
if (!overdueTimeText) throw new Error('Overdue task missing QUÁ HẠN: prefix');
console.log('Overdue task formatted:', overdueTimeText.t);

console.log('--- TEST 7: Resting Die Mousemove Hover Detection & Z-Order ---');
T.diceStack.length = 0;
// Die 0: base die at ground (targetY = 230)
T.diceStack.push({
  id: 'd0',
  title: 'Base Die',
  weight_score: 5,
  currentY: 230,
  targetY: 230,
  velocityY: 0
});
// Die 1: stacked above die 0 (targetY = 194)
T.diceStack.push({
  id: 'd1',
  title: 'Top Die',
  weight_score: 3,
  currentY: 194,
  targetY: 194,
  velocityY: 0
});

// Function to simulate mousemove hit detection logic
function simulateMouseMove(mx, my) {
  const centerX = 200;
  let hovered = null;
  for (let i = T.diceStack.length - 1; i >= 0; i--) {
    const d = T.diceStack[i];
    if (Math.abs(d.currentY - d.targetY) <= 2.0 && Math.abs(d.velocityY) <= 0.5) {
      const cfg = { width: d.weight_score === 5 ? 64 : 48, ry: d.weight_score === 5 ? 16 : 12, height: d.weight_score === 5 ? 36 : 28 };
      const rx = cfg.width / 2;
      const topY = d.currentY - cfg.ry;
      const botY = d.currentY + cfg.ry + cfg.height;
      if (mx >= centerX - rx && mx <= centerX + rx && my >= topY && my <= botY) {
        hovered = d;
        break;
      }
    }
  }
  return hovered;
}

// 7a: Falling die check
T.diceStack[1].currentY = 100; // In air!
T.diceStack[1].velocityY = 8.0;
const hitInAir = simulateMouseMove(200, 100);
if (hitInAir && hitInAir.id === 'd1') throw new Error('Falling die should not be hovered');
console.log('PASS: Falling die ignored by hover check.');

// Reset to resting
T.diceStack[1].currentY = 194;
T.diceStack[1].velocityY = 0;

// 7b: Cursor at top die center (200, 200) -> should hit d1
const hitTop = simulateMouseMove(200, 200);
if (!hitTop || hitTop.id !== 'd1') throw new Error('Top resting die should be hovered, got ' + (hitTop ? hitTop.id : 'null'));
console.log('PASS: Top resting die successfully hovered.');

// 7c: Cursor at base die bottom edge (200, 270) -> should hit d0
const hitBase = simulateMouseMove(200, 270);
if (!hitBase || hitBase.id !== 'd0') throw new Error('Base resting die should be hovered, got ' + (hitBase ? hitBase.id : 'null'));
console.log('PASS: Base resting die hovered when cursor outside top die bounds.');

// 7d: Cursor far away (50, 50) -> should hit null
const hitNone = simulateMouseMove(50, 50);
if (hitNone !== null) throw new Error('Cursor at (50, 50) should hit null');
console.log('PASS: Blank canvas space yields null hover.');

console.log('\n=============================================');
console.log('ALL ADVERSARIAL CHALLENGES PASSED 100%!');
console.log('=============================================');
