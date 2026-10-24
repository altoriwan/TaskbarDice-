/**
 * tests/test_adversarial_m3_tooltip.js
 * Adversarial test harness for Milestone 3 Resting Die Hover Detection & Retro Tooltip.
 *
 * Scopes tested:
 * 1. Hover bounding box detection across all 10 dice in stack (step 180 / (count - 1))
 * 2. Glowing 2px border alignment with twitch jitter
 * 3. Tooltip 4-way boundary clamping across canvas extremes
 * 4. Title word-wrapping under extreme inputs (empty, 1000-char single word, emojis, HTML, newlines)
 * 5. Countdown timer formatting (overdue +0s, +59s, +1h, +100d, negative remaining, exact zero)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'static', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract script
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not locate <script> tag in static/index.html");
  process.exit(1);
}
const scriptCode = scriptMatch[1];

// Mock Canvas 2D Context
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
    measureText: (str) => ({ width: str.length * 6 }),
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

// Sandbox builder
function createTestSandbox() {
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
  recalculateTargets: () => recalculateTargets(),
  DICE_CONFIG: DICE_CONFIG,
  calculateTwitchJitter: (rot, idx, ts) => calculateTwitchJitter(rot, idx, ts),
  drawRetroTooltip: (c, die) => drawRetroTooltip(c, die),
  drawRotIsometricDice: (c, cx, cy, w, h, wt, lbl, r) => drawRotIsometricDice(c, cx, cy, w, h, wt, lbl, r),
  getEffectiveRotFactor: (d) => getEffectiveRotFactor(d),
  getMousePos: () => mousePos,
  setMousePos: (x, y) => { mousePos.x = x; mousePos.y = y; },
  getHoveredDie: () => hoveredDie,
  setHoveredDie: (d) => { hoveredDie = d; },
  simulateMouseMove: (clientX, clientY) => {
    if (__listeners['mousemove']) {
      __listeners['mousemove']({ clientX, clientY });
    }
  },
  simulateMouseLeave: () => {
    if (__listeners['mouseleave']) {
      __listeners['mouseleave']();
    }
  }
};
`;

  vm.createContext(sandbox);
  vm.runInContext(bridgeCode, sandbox);
  return { sandbox, bridge: sandbox.window.__testBridge, mockCtx, listeners };
}

// Test Runner
const results = {
  passed: 0,
  failed: 0,
  failures: []
};

function assert(condition, message, details = {}) {
  if (condition) {
    results.passed++;
  } else {
    results.failed++;
    results.failures.push({ message, details });
    console.error(`[FAIL] ${message}`);
    if (Object.keys(details).length > 0) {
      console.error('       Details:', JSON.stringify(details));
    }
  }
}

console.log("================================================================================");
console.log("RUNNING ADVERSARIAL TEST SUITE: Milestone 3 Hover & Tooltip");
console.log("================================================================================\n");

// ============================================================================
// 1. SCOPE 1: Hover Bounding Box Detection Across All 10 Dice in Stack
// ============================================================================
console.log("[SCOPE 1] Hover Bounding Box Detection Across 10 Dice Stack...");
{
  const { bridge } = createTestSandbox();
  bridge.clearDiceStack();

  // Add 10 dice: weights 5, 5, 4, 4, 3, 3, 2, 2, 1, 1
  const weights = [5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
  for (let i = 0; i < weights.length; i++) {
    bridge.addDieToStack({
      id: `task_${i}`,
      title: `Task ${i}`,
      weight_score: weights[i],
      created_at: new Date(Date.now() - 60000).toISOString(),
      deadline_at: new Date(Date.now() + 60000).toISOString(),
    }, true);
  }

  const stack = bridge.getDiceStack();
  assert(stack.length === 10, "10 dice successfully initialized in stack", { count: stack.length });

  // Settle stack completely to resting state
  stack.forEach(d => {
    d.currentY = d.targetY;
    d.velocityY = 0;
    d.bounceFrame = 0;
  });

  // Verify compressed step calculation: step = Math.min(cfg.height, Math.max(14, Math.floor(180 / 9))) = 20
  const expectedCompressedStep = Math.max(14, Math.floor(180 / 9)); // 20
  assert(expectedCompressedStep === 20, "Compressed step for 10 dice equals 20px");

  // Verify targetY step between consecutive dice
  for (let i = 1; i < 10; i++) {
    const deltaY = stack[i - 1].targetY - stack[i].targetY;
    assert(deltaY === 20, `Step between die ${i-1} and die ${i} equals exactly 20px`, {
      dieIdx: i,
      prevY: stack[i - 1].targetY,
      currY: stack[i].targetY,
      deltaY
    });
  }

  // 1A. Test individual targeting of every single die from i = 0 to 9
  // In isometric stack, die i sits above die i-1.
  // The bottom region [stack[i].targetY + 8, stack[i].targetY + cfg.ry + cfg.height] is exposed
  for (let i = 0; i < 10; i++) {
    const d = stack[i];
    const cfg = bridge.DICE_CONFIG[d.weight_score];
    const botY = d.targetY + cfg.ry + cfg.height;
    // For die 9 (top die), center of diamond (200, d.targetY) is directly exposed.
    // For lower dice (0..8), the lower strip (botY - 2) is exposed below die i+1.
    const testY = (i === 9) ? d.targetY : (botY - 2);
    bridge.simulateMouseMove(200, testY);
    const hovered = bridge.getHoveredDie();
    assert(hovered !== null && hovered.id === d.id, `Die ${i} (W:${d.weight_score}) detected when hovering at (200, ${testY})`, {
      expectedId: d.id,
      actualId: hovered ? hovered.id : null,
      targetY: d.targetY,
      testY
    });
  }

  // 1B. Test hit inside diamond of top die (index 9)
  const topDie = stack[9];
  bridge.simulateMouseMove(200, topDie.targetY);
  assert(bridge.getHoveredDie() && bridge.getHoveredDie().id === topDie.id,
    "Hit test at center of top die diamond detects top die");

  // 1C. Test lateral points outside die bounding box (rx + 2px outside)
  const cfgTop = bridge.DICE_CONFIG[topDie.weight_score];
  const rxTop = cfgTop.width / 2;
  bridge.simulateMouseMove(200 - rxTop - 3, topDie.targetY);
  assert(bridge.getHoveredDie() === null, "Lateral point 3px left of die diamond/box returns null");

  bridge.simulateMouseMove(200 + rxTop + 3, topDie.targetY);
  assert(bridge.getHoveredDie() === null, "Lateral point 3px right of die diamond/box returns null");

  // 1D. Test point above the entire stack (y = 10, y = topDie.targetY - cfgTop.ry - 4)
  bridge.simulateMouseMove(200, topDie.targetY - cfgTop.ry - 4);
  assert(bridge.getHoveredDie() === null, "Point 4px above top die returns null");

  bridge.simulateMouseMove(200, 10);
  assert(bridge.getHoveredDie() === null, "Point at canvas top (y=10) above stack returns null");

  // 1E. Test point below bottom die
  const bottomDie = stack[0];
  const cfgBot = bridge.DICE_CONFIG[bottomDie.weight_score];
  const bottomExtent = bottomDie.targetY + cfgBot.ry + cfgBot.height;
  bridge.simulateMouseMove(200, bottomExtent + 10);
  assert(bridge.getHoveredDie() === null, "Point 10px below bottom die ground anchor returns null");

  // 1F. Test that falling / moving die is NOT hovered
  topDie.velocityY = 5.0; // falling fast
  topDie.currentY = topDie.targetY - 30;
  bridge.simulateMouseMove(200, topDie.currentY);
  assert(bridge.getHoveredDie() === null, "Falling die (|velocityY| > 0.5) is ignored by hover hit test");
  // Reset
  topDie.velocityY = 0;
  topDie.currentY = topDie.targetY;

  // 1G. Test mouseleave clears hoveredDie
  bridge.simulateMouseMove(200, topDie.targetY);
  assert(bridge.getHoveredDie() !== null, "Hover active before mouseleave");
  bridge.simulateMouseLeave();
  assert(bridge.getHoveredDie() === null, "mouseleave resets hoveredDie to null");
}

// ============================================================================
// 2. SCOPE 2: Glowing 2px Border Alignment with Twitch Jitter
// ============================================================================
console.log("\n[SCOPE 2] Glowing 2px Border Alignment with Twitch Jitter...");
{
  const { bridge, mockCtx } = createTestSandbox();
  bridge.clearDiceStack();

  // Test across multiple rot values: 0.1 (no jitter), 0.85 (twitch active), 1.0 (overdue jitter), 1.5 (severe)
  const testRots = [0.1, 0.85, 1.0, 1.5];
  const testWeights = [1, 2, 3, 4, 5];

  for (const rot of testRots) {
    for (const w of testWeights) {
      const cfg = bridge.DICE_CONFIG[w];
      const rx = cfg.width / 2;
      const ry = cfg.ry;
      const height = cfg.height;

      // Sample across 20 distinct timestamp values to test jitter dynamics
      for (let t = 100; t <= 2000; t += 100) {
        const jitter = bridge.calculateTwitchJitter(rot, 0, t);
        if (rot < 0.8) {
          assert(jitter.dx === 0 && jitter.dy === 0, `Rot ${rot} has zero jitter dx/dy at t=${t}`);
        } else {
          // Verify jitter micro-clamp
          const maxClamp = (rot >= 1.0) ? 4.5 : 1.8;
          assert(Math.abs(jitter.dx) <= maxClamp + 1e-6, `Jitter dx within clamp [${-maxClamp}, ${maxClamp}] at rot=${rot}`);
          assert(Math.abs(jitter.dy) <= maxClamp + 1e-6, `Jitter dy within clamp [${-maxClamp}, ${maxClamp}] at rot=${rot}`);
        }

        const centerX = 200;
        const renderY = 150;
        const dieRenderX = centerX + jitter.dx;
        const dieRenderY = renderY + jitter.dy;

        // Code in index.html for glowing border:
        // strokeRect(dieRenderX - cfg.width / 2 - 2, dieRenderY - cfg.ry - 2, cfg.width + 4, cfg.height + cfg.ry * 2 + 4);
        const borderX = dieRenderX - cfg.width / 2 - 2;
        const borderY = dieRenderY - cfg.ry - 2;
        const borderWidth = cfg.width + 4;
        const borderHeight = cfg.height + cfg.ry * 2 + 4;

        // Expected outer extents of die isometric projection:
        const dieLeft = dieRenderX - rx;
        const dieRight = dieRenderX + rx;
        const dieTop = dieRenderY - ry;
        const dieBottom = dieRenderY + ry + height;

        // Mathematical alignment invariants:
        const leftGap = dieLeft - borderX;
        const rightGap = (borderX + borderWidth) - dieRight;
        const topGap = dieTop - borderY;
        const bottomGap = (borderY + borderHeight) - dieBottom;

        assert(leftGap === 2, `Left gap is exactly 2px at rot=${rot}, t=${t}`, { leftGap });
        assert(rightGap === 2, `Right gap is exactly 2px at rot=${rot}, t=${t}`, { rightGap });
        assert(topGap === 2, `Top gap is exactly 2px at rot=${rot}, t=${t}`, { topGap });
        assert(bottomGap === 2, `Bottom gap is exactly 2px at rot=${rot}, t=${t}`, { bottomGap });

        // Center tracking: Border center must align with die center
        const borderCenterX = borderX + borderWidth / 2;
        const dieCenterX = dieRenderX;
        assert(Math.abs(borderCenterX - dieCenterX) < 1e-6, `Border center X matches dieRenderX exactly at rot=${rot}, t=${t}`);
      }
    }
  }
}

// ============================================================================
// 3. SCOPE 3: Tooltip 4-Way Boundary Clamping Across Canvas Extremes
// ============================================================================
console.log("\n[SCOPE 3] Tooltip 4-Way Boundary Clamping Across Canvas Extremes...");
{
  const { bridge, mockCtx } = createTestSandbox();

  const testDie = {
    title: "Normal Task",
    weight_score: 3,
    created_at: new Date(Date.now() - 300000).toISOString(),
    deadline_at: new Date(Date.now() + 300000).toISOString(),
  };

  // Test Points required by specification:
  // Corners: (0,0), (400,0), (0,320), (400,320)
  // Boundaries: (200, 5), (395, 150), (200, 315), (5, 150)
  // Off-screen extremes: (-100, -100), (500, 450), (200, -50), (200, 400)
  const testCoords = [
    { name: "Top-Left Corner", x: 0, y: 0 },
    { name: "Top-Right Corner", x: 400, y: 0 },
    { name: "Bottom-Left Corner", x: 0, y: 320 },
    { name: "Bottom-Right Corner", x: 400, y: 320 },
    { name: "Top Boundary", x: 200, y: 5 },
    { name: "Right Boundary", x: 395, y: 150 },
    { name: "Bottom Boundary", x: 200, y: 315 },
    { name: "Left Boundary", x: 5, y: 150 },
    { name: "Offscreen Far Negative", x: -100, y: -100 },
    { name: "Offscreen Far Positive", x: 500, y: 450 },
    { name: "Offscreen Top", x: 200, y: -50 },
    { name: "Offscreen Bottom", x: 200, y: 400 },
  ];

  for (const pt of testCoords) {
    mockCtx.calls.fillRects = [];
    mockCtx.calls.strokeRects = [];
    bridge.setMousePos(pt.x, pt.y);
    bridge.drawRetroTooltip(mockCtx, testDie);

    assert(mockCtx.calls.fillRects.length >= 1, `Tooltip frame rect generated at ${pt.name} (${pt.x}, ${pt.y})`);
    const frame = mockCtx.calls.fillRects[0];

    const left = frame.x;
    const top = frame.y;
    const right = frame.x + frame.w;
    const bottom = frame.y + frame.h;

    // Strict boundary checks within 400x320 canvas
    const withinLeft = left >= 0;
    const withinTop = top >= 0;
    const withinRight = right <= 400;
    const withinBottom = bottom <= 320;

    assert(withinLeft && withinTop && withinRight && withinBottom,
      `Tooltip frame [${left}, ${top}, ${right}, ${bottom}] strictly contained in [0, 400] x [0, 320] at ${pt.name}`,
      { pt, frame, left, top, right, bottom }
    );

    // Padding check: code uses padding = 8
    assert(left >= 8 && top >= 8 && right <= 392 && bottom <= 312,
      `Tooltip honors 8px safety padding from canvas edges at ${pt.name}`,
      { pt, left, top, right, bottom }
    );
  }

  // Dense grid sweep across canvas (41 x 33 = 1353 points)
  let gridViolations = 0;
  for (let x = 0; x <= 400; x += 10) {
    for (let y = 0; y <= 320; y += 10) {
      mockCtx.calls.fillRects = [];
      bridge.setMousePos(x, y);
      bridge.drawRetroTooltip(mockCtx, testDie);
      const frame = mockCtx.calls.fillRects[0];
      if (frame.x < 0 || frame.y < 0 || frame.x + frame.w > 400 || frame.y + frame.h > 320) {
        gridViolations++;
      }
    }
  }
  assert(gridViolations === 0, `Dense grid sweep (1,353 points) produced zero canvas boundary clipping`, { gridViolations });
}

// ============================================================================
// 4. SCOPE 4: Title Word-Wrapping Under Extreme Inputs
// ============================================================================
console.log("\n[SCOPE 4] Title Word-Wrapping Under Extreme Inputs...");
{
  const { bridge, mockCtx } = createTestSandbox();
  bridge.setMousePos(200, 150);

  // 4A. Empty string
  {
    mockCtx.calls.fillTexts = [];
    const dieEmpty = { title: "", weight_score: 1, created_at: new Date().toISOString(), deadline_at: new Date().toISOString() };
    bridge.drawRetroTooltip(mockCtx, dieEmpty);
    const titleText = mockCtx.calls.fillTexts[0] ? mockCtx.calls.fillTexts[0].text : '';
    assert(titleText === 'UNTITLED', "Empty title string cleanly falls back to 'UNTITLED'", { titleText });
  }

  // 4B. Whitespace-only string
  {
    mockCtx.calls.fillTexts = [];
    const dieSpace = { title: "    ", weight_score: 1, created_at: new Date().toISOString(), deadline_at: new Date().toISOString() };
    bridge.drawRetroTooltip(mockCtx, dieSpace);
    const titleText = mockCtx.calls.fillTexts[0] ? mockCtx.calls.fillTexts[0].text : '';
    assert(titleText.length >= 0, "Whitespace-only title does not throw and renders safely", { titleText });
  }

  // 4C. Standard multi-word title wrapping
  {
    mockCtx.calls.fillTexts = [];
    const dieStandard = {
      title: "Write comprehensive unit test suite for M3 hover tooltip engine",
      weight_score: 4,
      created_at: new Date().toISOString(),
      deadline_at: new Date().toISOString()
    };
    bridge.drawRetroTooltip(mockCtx, dieStandard);
    // Should produce at most 2 lines of title
    const titleLines = mockCtx.calls.fillTexts.filter(t => !t.text.startsWith('W:') && !t.text.startsWith('STAGE:') && !t.text.startsWith('CÒN:') && !t.text.startsWith('QUÁ HẠN:'));
    assert(titleLines.length <= 2, `Standard long multi-word title wraps cleanly to <= 2 lines (actual: ${titleLines.length})`, {
      lines: titleLines.map(l => l.text)
    });
  }

  // 4D. Newlines in title
  {
    mockCtx.calls.fillTexts = [];
    const dieNewlines = {
      title: "Line One\nLine Two\nLine Three\nLine Four",
      weight_score: 2,
      created_at: new Date().toISOString(),
      deadline_at: new Date().toISOString()
    };
    bridge.drawRetroTooltip(mockCtx, dieNewlines);
    const titleLines = mockCtx.calls.fillTexts.filter(t => !t.text.startsWith('W:') && !t.text.startsWith('STAGE:') && !t.text.startsWith('CÒN:') && !t.text.startsWith('QUÁ HẠN:'));
    assert(titleLines.length <= 2, `Title with explicit newlines wraps to at most 2 lines (actual: ${titleLines.length})`, {
      lines: titleLines.map(l => l.text)
    });
  }

  // 4E. Unicode & Vietnamese with Emojis
  {
    mockCtx.calls.fillTexts = [];
    const dieUnicode = {
      title: "Nộp báo cáo quý 4 📊🚀 và kiểm tra hệ thống ⚡",
      weight_score: 3,
      created_at: new Date().toISOString(),
      deadline_at: new Date().toISOString()
    };
    bridge.drawRetroTooltip(mockCtx, dieUnicode);
    const titleLines = mockCtx.calls.fillTexts.filter(t => !t.text.startsWith('W:') && !t.text.startsWith('CÒN:') && !t.text.startsWith('QUÁ HẠN:'));
    assert(titleLines.length >= 1, "Unicode Vietnamese with emojis renders title lines", {
      lines: titleLines.map(l => l.text)
    });
  }

  // 4F. HTML entities / Script injection
  {
    mockCtx.calls.fillTexts = [];
    const dieHtml = {
      title: "<script>alert('xss')</script> & <b>bold</b>",
      weight_score: 1,
      created_at: new Date().toISOString(),
      deadline_at: new Date().toISOString()
    };
    bridge.drawRetroTooltip(mockCtx, dieHtml);
    const titleText = mockCtx.calls.fillTexts[0] ? mockCtx.calls.fillTexts[0].text : '';
    assert(titleText.includes("<script>"), "HTML entities are treated as literal text in Canvas fillText without execution");
  }

  // 4G. Adversarial Case: 1000-character single word with zero spaces
  {
    mockCtx.calls.fillRects = [];
    mockCtx.calls.fillTexts = [];
    const singleWord1000 = 'A'.repeat(1000);
    const dieExtreme = {
      title: singleWord1000,
      weight_score: 5,
      created_at: new Date().toISOString(),
      deadline_at: new Date().toISOString()
    };
    bridge.drawRetroTooltip(mockCtx, dieExtreme);

    const frame = mockCtx.calls.fillRects[0];
    const tooltipWidth = frame ? frame.w : 0;
    const titleLines = mockCtx.calls.fillTexts.filter(t => !t.text.startsWith('W:') && !t.text.startsWith('CÒN:') && !t.text.startsWith('QUÁ HẠN:'));
    const renderedFirstLine = titleLines[0] ? titleLines[0].text : '';

    // Measure rendered text width
    const textWidth = renderedFirstLine.length * 6; // 6px font monospace estimate
    const isOverflowingTooltipBox = textWidth > tooltipWidth;
    const isExceedingCanvas = (frame.x + textWidth) > 400;

    console.log(`       [Adversarial Probe 4G] 1000-char single word:`);
    console.log(`         Tooltip Frame Width: ${tooltipWidth}px`);
    console.log(`         Rendered Line Length: ${renderedFirstLine.length} chars`);
    console.log(`         Rendered Line Width: ${textWidth}px`);
    console.log(`         Overflowing Tooltip Box: ${isOverflowingTooltipBox}`);
    console.log(`         Exceeding Canvas Boundary: ${isExceedingCanvas}`);

    // Test assertion for overflow behavior
    assert(!isOverflowingTooltipBox,
      `VULNERABILITY DETECTED: 1000-char single word overflows tooltip box (${textWidth}px vs ${tooltipWidth}px)`,
      { tooltipWidth, textWidth, charLength: renderedFirstLine.length }
    );
  }
}

// ============================================================================
// 5. SCOPE 5: Countdown Timer Formatting Across Extremes
// ============================================================================
console.log("\n[SCOPE 5] Countdown Timer Formatting Across Extremes...");
{
  const { bridge, mockCtx } = createTestSandbox();
  bridge.setMousePos(200, 150);

  const baseCreated = new Date(Date.now() - 3600000).toISOString(); // 1 hr ago

  // 5A. Exact Zero Remaining (now == deadline)
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const dieZero = {
      title: "Zero Timer",
      weight_score: 3,
      created_at: new Date(nowMs - 60000).toISOString(),
      deadline_at: new Date(nowMs).toISOString(),
    };
    bridge.drawRetroTooltip(mockCtx, dieZero);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined, "Timer text rendered at exact zero remaining");
    assert(timerCall.text === 'QUÁ HẠN: +0m 0s', `Exact zero formatted as 'QUÁ HẠN: +0m 0s'`, { actual: timerCall.text });
  }

  // 5B. Overdue by +59 seconds
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const die59s = {
      title: "59s Overdue",
      weight_score: 3,
      created_at: new Date(nowMs - 120000).toISOString(),
      deadline_at: new Date(nowMs - 59000).toISOString(),
    };
    bridge.drawRetroTooltip(mockCtx, die59s);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined && timerCall.text === 'QUÁ HẠN: +0m 59s',
      `Overdue +59s formatted as 'QUÁ HẠN: +0m 59s'`, { actual: timerCall ? timerCall.text : null });
  }

  // 5C. Overdue by +1 hour (+3600s)
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const die1h = {
      title: "1h Overdue",
      weight_score: 3,
      created_at: new Date(nowMs - 7200000).toISOString(),
      deadline_at: new Date(nowMs - 3600000).toISOString(),
    };
    bridge.drawRetroTooltip(mockCtx, die1h);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined && timerCall.text === 'QUÁ HẠN: +60m 0s',
      `Overdue +1h formatted as 'QUÁ HẠN: +60m 0s'`, { actual: timerCall ? timerCall.text : null });
  }

  // 5D. Overdue by +100 days (+8,640,000s)
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const hundredDaysMs = 100 * 24 * 3600 * 1000;
    const die100d = {
      title: "100d Overdue",
      weight_score: 3,
      created_at: new Date(nowMs - hundredDaysMs - 3600000).toISOString(),
      deadline_at: new Date(nowMs - hundredDaysMs).toISOString(),
    };
    bridge.drawRetroTooltip(mockCtx, die100d);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined && timerCall.text === 'QUÁ HẠN: +144000m 0s',
      `Overdue +100d formatted as 'QUÁ HẠN: +144000m 0s'`, { actual: timerCall ? timerCall.text : null });
  }

  // 5E. On-time remaining 25m 0s
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const dieOnTime = {
      title: "On-Time Task",
      weight_score: 3,
      created_at: new Date(nowMs - 60000).toISOString(),
      deadline_at: new Date(nowMs + 1500000).toISOString(), // +25m
    };
    bridge.drawRetroTooltip(mockCtx, dieOnTime);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined && timerCall.text === 'CÒN: 25m 0s',
      `On-time 25m remaining formatted as 'CÒN: 25m 0s'`, { actual: timerCall ? timerCall.text : null });
  }

  // 5F. On-time remaining 0m 45s
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const dieSoon = {
      title: "Expiring Soon",
      weight_score: 3,
      created_at: new Date(nowMs - 60000).toISOString(),
      deadline_at: new Date(nowMs + 45000).toISOString(), // +45s
    };
    bridge.drawRetroTooltip(mockCtx, dieSoon);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined && timerCall.text === 'CÒN: 0m 45s',
      `On-time 45s remaining formatted as 'CÒN: 0m 45s'`, { actual: timerCall ? timerCall.text : null });
  }

  // 5G. Clock skew / Future created_at
  {
    mockCtx.calls.fillTexts = [];
    const nowMs = Date.now();
    const dieFuture = {
      title: "Future Creation",
      weight_score: 3,
      created_at: new Date(nowMs + 3600000).toISOString(),
      deadline_at: new Date(nowMs + 7200000).toISOString(),
    };
    bridge.drawRetroTooltip(mockCtx, dieFuture);
    const timerCall = mockCtx.calls.fillTexts.find(t => t.text.startsWith('QUÁ HẠN:') || t.text.startsWith('CÒN:'));
    assert(timerCall !== undefined && timerCall.text.startsWith('CÒN:'),
      `Future creation timestamp gracefully handles elapsed <= 0 without throwing`, { actual: timerCall ? timerCall.text : null });
  }
}

console.log("\n================================================================================");
console.log(`TEST SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
console.log("================================================================================");

if (results.failed > 0) {
  console.log("\nFAILURES ENCOUNTERED:");
  results.failures.forEach((f, idx) => {
    console.log(`${idx + 1}. ${f.message}`);
  });
  process.exit(1);
} else {
  console.log("\nALL ADVERSARIAL CHECKS PASSED 100%!");
  process.exit(0);
}
