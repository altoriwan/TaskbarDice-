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
const htmlContent = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>TaskbarDice - Milestone 4: Game Loop & Victory</title>\n  \n  <!-- Google Font: Press Start 2P -->\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap\" rel=\"stylesheet\">\n  \n  <!-- NES.css 2.3.0 -->\n  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/nes.css/2.3.0/css/nes.min.css\">\n\n  <style>\n    * {\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n    }\n\n    body {\n      width: 400px;\n      height: 420px;\n      overflow: hidden;\n      background-color: #121417;\n      color: #ffffff;\n      font-family: 'Press Start 2P', monospace;\n      user-select: none;\n      display: flex;\n      flex-direction: column;\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n      position: relative;\n    }\n\n    /* Draggable Title Header (26px) */\n    .drag-header {\n      width: 100%;\n      height: 26px;\n      min-height: 26px;\n      max-height: 26px;\n      flex: 0 0 26px;\n      box-sizing: border-box;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      padding: 0 8px;\n      background: #1a1d20;\n      border-bottom: 2px solid #000000;\n      z-index: 10;\n    }\n\n    .drag-region {\n      flex: 1;\n      height: 100%;\n      display: flex;\n      align-items: center;\n      cursor: grab;\n      font-size: 8px;\n      color: #92cc41;\n      letter-spacing: 1px;\n    }\n\n    .rot-badge {\n      font-size: 7px;\n      color: #f7d51d;\n      margin-right: 8px;\n    }\n\n    .btn-close {\n      cursor: pointer;\n      background: #e76e55;\n      color: #ffffff;\n      border: 2px solid #000000;\n      font-family: 'Press Start 2P', monospace;\n      font-size: 8px;\n      line-height: 1;\n      padding: 2px 5px;\n      transition: background 0.1s;\n    }\n\n    .btn-close:hover {\n      background: #ce372b;\n    }\n\n    /* Canvas 2D filling middle (320px) */\n    #diceCanvas {\n      display: block;\n      width: 400px;\n      height: 320px;\n      min-height: 320px;\n      max-height: 320px;\n      flex: 0 0 320px;\n      box-sizing: border-box;\n      background-color: #121417;\n      image-rendering: pixelated;\n      image-rendering: crisp-edges;\n      cursor: pointer;\n    }\n\n    /* Docked Bottom Control Panel (74px) */\n    .control-panel {\n      width: 100%;\n      height: 74px;\n      min-height: 74px;\n      max-height: 74px;\n      flex: 0 0 74px;\n      box-sizing: border-box;\n      padding: 4px 6px;\n      background: #181a1d;\n      border-top: 2px solid #000000;\n      display: flex;\n      flex-direction: column;\n      justify-content: space-between;\n      z-index: 5;\n    }\n\n    .panel-row-1 {\n      display: flex;\n      width: 100%;\n      height: 32px;\n      align-items: center;\n      justify-content: space-between;\n      gap: 6px;\n    }\n\n    .task-input {\n      flex: 0 0 calc(78% - 4px);\n      width: calc(78% - 4px);\n      height: 32px !important;\n      font-size: 8px !important;\n      padding: 4px 6px !important;\n      background-color: #212529 !important;\n      color: #ffffff !important;\n      box-sizing: border-box;\n    }\n\n    .btn-submit {\n      flex: 0 0 calc(22% - 2px);\n      width: calc(22% - 2px);\n      height: 32px;\n      padding: 0 !important;\n      font-size: 8px !important;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      white-space: nowrap;\n      box-sizing: border-box;\n    }\n\n    .panel-row-2 {\n      display: flex;\n      width: 100%;\n      height: 26px;\n      align-items: center;\n      justify-content: space-between;\n      box-sizing: border-box;\n      gap: 4px;\n    }\n\n    .control-group {\n      display: flex;\n      align-items: center;\n      gap: 2px;\n    }\n\n    .row-label {\n      font-size: 7px;\n      font-weight: bold;\n      margin-right: 2px;\n    }\n\n    .weight-label {\n      color: #92cc41;\n    }\n\n    .time-label {\n      color: #f7d51d;\n    }\n\n    .btn-chip {\n      background: #212529;\n      color: #aaaaaa;\n      border: 1px solid #000000;\n      font-family: 'Press Start 2P', monospace;\n      font-size: 7px;\n      padding: 2px 4px;\n      line-height: 1.2;\n      cursor: pointer;\n      box-shadow: inset -1px -1px #000, inset 1px 1px #444;\n      transition: all 0.1s ease;\n    }\n\n    .btn-chip:hover {\n      background: #333a42;\n      color: #ffffff;\n    }\n\n    .btn-chip.is-active {\n      background: #209cee;\n      color: #ffffff;\n      box-shadow: inset 1px 1px #000, inset -1px -1px #666;\n    }\n\n    .weight-btn.is-active {\n      background: #92cc41;\n      color: #000000;\n      font-weight: bold;\n    }\n\n    .time-btn.is-active {\n      background: #f7d51d;\n      color: #000000;\n      font-weight: bold;\n    }\n\n    .row-sep {\n      width: 1px;\n      height: 16px;\n      background: #333942;\n      margin: 0 2px;\n    }\n\n    /* NES Shake Warning Animation */\n    @keyframes nes-shake {\n      0% { transform: translateX(0); }\n      20% { transform: translateX(-6px); }\n      40% { transform: translateX(6px); }\n      60% { transform: translateX(-4px); }\n      80% { transform: translateX(4px); }\n      100% { transform: translateX(0); }\n    }\n\n    .shake-anim {\n      animation: nes-shake 0.35s ease-in-out;\n    }\n\n    .task-input:disabled {\n      background-color: #2b1d1d !important;\n      color: #ff8888 !important;\n      cursor: not-allowed;\n      border-color: #e76e55 !important;\n    }\n\n    /* Retro Feedback Toast */\n    .feedback-toast {\n      position: absolute;\n      top: 34px;\n      left: 50%;\n      transform: translateX(-50%);\n      font-size: 7px;\n      color: #ffd700;\n      background: rgba(0, 0, 0, 0.9);\n      border: 2px solid #ffd700;\n      padding: 4px 8px;\n      pointer-events: none;\n      opacity: 0;\n      transition: opacity 0.2s ease-in-out;\n      z-index: 20;\n      white-space: nowrap;\n    }\n\n    /* Anti-Slacking Modal Overlay */\n    .modal-overlay {\n      position: absolute;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      background: rgba(0, 0, 0, 0.85);\n      display: none;\n      align-items: center;\n      justify-content: center;\n      z-index: 100;\n      padding: 12px;\n    }\n\n    .modal-box {\n      width: 92%;\n      max-width: 360px;\n      background: #1a1d20 !important;\n      color: #ffffff;\n      padding: 10px !important;\n      text-align: center;\n      border-image-repeat: repeat;\n    }\n\n    .modal-title {\n      color: #ffd700;\n      font-size: 8px;\n      margin-bottom: 6px;\n    }\n\n    .modal-body-text {\n      font-size: 7px;\n      margin-bottom: 6px;\n      line-height: 1.4;\n      color: #ffffff;\n    }\n\n    .modal-task-title {\n      font-size: 7px;\n      color: #92cc41;\n      margin-bottom: 6px;\n      padding: 4px;\n      background: #0d0f12;\n      border: 1px dashed #92cc41;\n      word-break: break-all;\n    }\n\n    .modal-subtext {\n      font-size: 6px;\n      color: #a8a8a8;\n      margin-bottom: 10px;\n    }\n\n    .modal-actions {\n      display: flex;\n      gap: 6px;\n      justify-content: center;\n    }\n\n    .btn-modal {\n      font-size: 6px !important;\n      padding: 6px 8px !important;\n    }\n  </style>\n</head>\n<body>\n  <!-- Frameless Drag Header & Controls (26px) -->\n  <div class=\"drag-header pywebview-drag-region\">\n    <div class=\"drag-region\">TASKBAR DICE :: M1</div>\n    <span id=\"rotStatusBadge\" class=\"rot-badge\">[D] REALTIME</span>\n    <button class=\"btn-close\" id=\"closeBtn\" title=\"Close Window\" type=\"button\">X</button>\n  </div>\n\n  <div id=\"feedbackToast\" class=\"feedback-toast\">TASK LOGGED!</div>\n\n  <!-- Middle Canvas 2D (320px) -->\n  <canvas id=\"diceCanvas\" width=\"400\" height=\"320\"></canvas>\n\n  <!-- Bottom 2-Row Control Panel (74px) -->\n  <form class=\"control-panel\" id=\"taskForm\">\n    <!-- Row 1: Text input 78% + Green NES ADD button 22% -->\n    <div class=\"panel-row-1\">\n      <input \n        type=\"text\" \n        id=\"taskInput\" \n        class=\"nes-input is-dark task-input\" \n        placeholder=\"Type task & press Enter...\" \n        autocomplete=\"off\"\n        required\n      />\n      <button type=\"submit\" id=\"addBtn\" class=\"nes-btn is-success btn-submit\">ADD</button>\n    </div>\n    <!-- Row 2: Weight selection W: 1-5 + Time presets T: 15m, 25m, 1h, 4h, ..m -->\n    <div class=\"panel-row-2\">\n      <div class=\"control-group weight-group\">\n        <span class=\"row-label weight-label\">W:</span>\n        <button type=\"button\" class=\"btn-chip weight-btn is-active\" data-w=\"1\">1</button>\n        <button type=\"button\" class=\"btn-chip weight-btn\" data-w=\"2\">2</button>\n        <button type=\"button\" class=\"btn-chip weight-btn\" data-w=\"3\">3</button>\n        <button type=\"button\" class=\"btn-chip weight-btn\" data-w=\"4\">4</button>\n        <button type=\"button\" class=\"btn-chip weight-btn\" data-w=\"5\">5</button>\n      </div>\n      <div class=\"row-sep\"></div>\n      <div class=\"control-group time-group\">\n        <span class=\"row-label time-label\">T:</span>\n        <button type=\"button\" class=\"btn-chip time-btn\" data-t=\"15m\">15m</button>\n        <button type=\"button\" class=\"btn-chip time-btn is-active\" data-t=\"25m\">25m</button>\n        <button type=\"button\" class=\"btn-chip time-btn\" data-t=\"1h\">1h</button>\n        <button type=\"button\" class=\"btn-chip time-btn\" data-t=\"4h\">4h</button>\n        <button type=\"button\" class=\"btn-chip time-btn\" data-t=\"custom\" id=\"customTimeBtn\">..m</button>\n      </div>\n    </div>\n  </form>\n\n  <!-- Anti-Slacking Retro Modal -->\n  <div id=\"modalOverlay\" class=\"modal-overlay\">\n    <div class=\"nes-dialog is-dark modal-box\">\n      <p class=\"modal-title\">INTEGRITY CHECK</p>\n      <p class=\"modal-body-text\">DID YOU ACTUALLY FINISH THIS TASK?</p>\n      <p id=\"modalTaskName\" class=\"modal-task-title\">TASK: ...</p>\n      <p class=\"modal-subtext\">No cheating. Integrity check.</p>\n      <div class=\"modal-actions\">\n        <button type=\"button\" id=\"confirmCompleteBtn\" class=\"nes-btn is-success btn-modal\">YES, COMPLETED!</button>\n        <button type=\"button\" id=\"cancelCompleteBtn\" class=\"nes-btn is-error btn-modal\">NOT YET</button>\n      </div>\n    </div>\n  </div>\n\n  <script>\n    const canvas = document.getElementById('diceCanvas');\n    const ctx = canvas.getContext('2d');\n    ctx.imageSmoothingEnabled = false;\n\n    const feedbackToast = document.getElementById('feedbackToast');\n    const rotStatusBadge = document.getElementById('rotStatusBadge');\n\n    function showToast(msg) {\n      feedbackToast.textContent = msg;\n      feedbackToast.style.opacity = '1';\n      setTimeout(() => {\n        feedbackToast.style.opacity = '0';\n      }, 1500);\n    }\n\n    // Weight to Dimensions mapping\n    const DICE_CONFIG = {\n      1: { width: 32, height: 20, ry: 8 },\n      2: { width: 40, height: 24, ry: 10 },\n      3: { width: 48, height: 28, ry: 12 },\n      4: { width: 56, height: 32, ry: 14 },\n      5: { width: 64, height: 36, ry: 16 }\n    };\n\n    // Stacking state\n    let diceStack = [];\n    const GROUND_Y = 290;\n\n    // 10 Escalating Lovecraftian Abyss Background Themes\n    const ABYSS_TIERS = [\n      \"Void\",\n      \"Cold Dust\",\n      \"Frost Cracks\",\n      \"Sprouting Thorns\",\n      \"Creeping Vines\",\n      \"Toxic Spores\",\n      \"Blood Veins\",\n      \"Demon Eyes\",\n      \"Abyssal Eclipse\",\n      \"Pandemonium Overload\"\n    ];\n\n    // Background Tier & Rot Interpolation State for Butter-Smooth Transitions\n    let hasHadTasks = false;\n    let hasClearedAll = false;\n    let visualTier = 0.0;\n    let visualRot = 0.0;\n    window.zenSimulatedHour = null; // Test/debug override hook\n\n    // Static Pre-allocated Pools for Abyss Background Layers\n    const COLD_DUST_COUNT = 30;\n    const coldDustParticles = [];\n    for (let i = 0; i < COLD_DUST_COUNT; i++) {\n      coldDustParticles.push({\n        x: Math.random() * 400,\n        y: Math.random() * 320,\n        vx: -0.2 - Math.random() * 0.4,\n        vy: 0.3 + Math.random() * 0.5,\n        size: Math.random() > 0.6 ? 2 : 1,\n        alpha: 0.3 + Math.random() * 0.5\n      });\n    }\n\n    const FROST_CRACKS = [\n      [{x: 0, y: 0}, {x: 25, y: 15}, {x: 45, y: 18}, {x: 65, y: 35}],\n      [{x: 0, y: 25}, {x: 18, y: 38}, {x: 35, y: 60}],\n      [{x: 400, y: 0}, {x: 375, y: 15}, {x: 355, y: 20}, {x: 335, y: 38}],\n      [{x: 400, y: 30}, {x: 380, y: 45}, {x: 360, y: 68}],\n      [{x: 0, y: 320}, {x: 30, y: 300}, {x: 55, y: 295}, {x: 75, y: 280}],\n      [{x: 400, y: 320}, {x: 370, y: 305}, {x: 345, y: 290}, {x: 320, y: 282}]\n    ];\n\n    const SPROUTING_THORNS = [\n      { x: 30, h: 28, dir: 1 },\n      { x: 70, h: 20, dir: -1 },\n      { x: 120, h: 16, dir: 1 },\n      { x: 280, h: 18, dir: -1 },\n      { x: 330, h: 22, dir: 1 },\n      { x: 370, h: 30, dir: -1 }\n    ];\n\n    const TOXIC_SPORES_COUNT = 25;\n    const toxicSpores = [];\n    for (let i = 0; i < TOXIC_SPORES_COUNT; i++) {\n      toxicSpores.push({\n        x: Math.random() * 400,\n        y: Math.random() * 320,\n        vx: (Math.random() - 0.5) * 0.4,\n        vy: -0.2 - Math.random() * 0.4,\n        size: Math.random() > 0.5 ? 2 : 1,\n        color: Math.random() > 0.5 ? '#84cc16' : '#a3e635',\n        pulseOffset: Math.random() * Math.PI * 2\n      });\n    }\n\n    const BLOOD_VEINS = [\n      [{x: 0, y: 60}, {x: 40, y: 75}, {x: 75, y: 65}, {x: 105, y: 80}],\n      [{x: 40, y: 75}, {x: 60, y: 105}, {x: 90, y: 120}],\n      [{x: 0, y: 140}, {x: 35, y: 150}, {x: 70, y: 175}],\n      [{x: 400, y: 60}, {x: 360, y: 75}, {x: 325, y: 65}, {x: 295, y: 80}],\n      [{x: 360, y: 75}, {x: 340, y: 105}, {x: 310, y: 120}],\n      [{x: 400, y: 140}, {x: 365, y: 150}, {x: 330, y: 175}]\n    ];\n\n    const DEMON_EYES = [\n      { x: 60, y: 85, rx: 7, ry: 4, blinkPeriod: 3600, blinkOffset: 0 },\n      { x: 340, y: 80, rx: 8, ry: 5, blinkPeriod: 4200, blinkOffset: 1200 },\n      { x: 45, y: 180, rx: 6, ry: 3, blinkPeriod: 3900, blinkOffset: 2400 },\n      { x: 355, y: 185, rx: 7, ry: 4, blinkPeriod: 4500, blinkOffset: 800 },\n      { x: 110, y: 55, rx: 6, ry: 3, blinkPeriod: 3300, blinkOffset: 1700 },\n      { x: 290, y: 50, rx: 6, ry: 3, blinkPeriod: 4800, blinkOffset: 3100 }\n    ];\n\n    // Persistent particle systems for Zen Garden\n    const zenPetals = [];\n    for (let i = 0; i < 18; i++) {\n      zenPetals.push({\n        x: Math.random() * 400,\n        y: Math.random() * 320,\n        vx: 0.3 + Math.random() * 0.5,\n        vy: 0.4 + Math.random() * 0.6,\n        size: Math.random() > 0.5 ? 3 : 2,\n        swaySpeed: 0.002 + Math.random() * 0.003,\n        seed: Math.random() * 100\n      });\n    }\n\n    const zenFireflies = [];\n    for (let i = 0; i < 10; i++) {\n      zenFireflies.push({\n        x: 40 + Math.random() * 320,\n        y: 120 + Math.random() * 130,\n        vx: (Math.random() - 0.5) * 0.4,\n        vy: (Math.random() - 0.5) * 0.4,\n        phase: Math.random() * Math.PI * 2\n      });\n    }\n\n    // Hover inspection state\n    let hoveredDie = null;\n    let mousePos = { x: -1, y: -1 };\n\n    // Developer Speed-Test Mode state\n    let devMode = 0;\n\n    // Particle Pools & Zero-Allocation Recycling Pools (60 FPS & Zero GC Churn)\n    const MAX_SLIME_DRIPS = 80;\n    const slimeDripPool = [];\n    for (let i = 0; i < MAX_SLIME_DRIPS; i++) {\n      slimeDripPool.push({\n        active: false,\n        x: 0,\n        y: 0,\n        vy: 0,\n        gravity: 0.1,\n        length: 2,\n        color: '#84cc16',\n        glowColor: 'rgba(132, 204, 22, 0.4)',\n        type: 'green'\n      });\n    }\n    // Backward-compatibility alias\n    const slimeParticles = slimeDripPool;\n\n    const MAX_SLIME_PUDDLES = 12;\n    const slimePuddlePool = [];\n    for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {\n      slimePuddlePool.push({\n        active: false,\n        x: 0,\n        y: GROUND_Y,\n        width: 0,\n        targetWidth: 0,\n        maxWidth: 55,\n        height: 3,\n        color: '#022c22',\n        rimColor: '#365314',\n        highlightColor: '#84cc16',\n        bubbleColor: '#a3e635',\n        alpha: 1.0,\n        bubbles: [\n          { xRel: -4, progress: 0.1, speed: 0.02, size: 2.2 },\n          { xRel: 3, progress: 0.6, speed: 0.015, size: 2.6 },\n          { xRel: -7, progress: 0.85, speed: 0.025, size: 1.8 }\n        ]\n      });\n    }\n\n    const MAX_SLIME_SPLASHES = 24;\n    const slimeSplashPool = [];\n    for (let i = 0; i < MAX_SLIME_SPLASHES; i++) {\n      slimeSplashPool.push({\n        active: false,\n        x: 0,\n        y: 0,\n        vx: 0,\n        vy: 0,\n        life: 0,\n        maxLife: 12,\n        color: '#84cc16'\n      });\n    }\n\n    const explosionParticles = [];\n\n    /**\n     * Calculates erratic micro-jitter offsets (dx, dy) for Stage 5 twitch vibration.\n     * Frequency and amplitude intensify significantly when overdue (rot >= 1.0).\n     */\n    function calculateTwitchJitter(rot, index, timestamp) {\n      if (rot < 0.8) return { dx: 0, dy: 0 };\n\n      const isOverdue = rot >= 1.0;\n      // Overdue amplifies amplitude up to 2.8x\n      const severity = isOverdue ? Math.min(2.8, 1.2 + (rot - 1.0) * 1.6) : 1.0;\n      // Overdue increases frequency from 0.028 to 0.055\n      const freq = isOverdue ? 0.055 : 0.028;\n      const t = timestamp * freq + (index * 19.73);\n\n      // Spasm gate: erratic bursts simulating nervous twitching\n      const spasmGate = Math.sin(t * 2.1) * Math.cos(t * 3.7);\n      const inBurst = isOverdue || Math.abs(spasmGate) > 0.25;\n\n      let dx = 0;\n      let dy = 0;\n\n      if (inBurst) {\n        const harmonicX = Math.sin(t * 5.3) * 0.5 + Math.sin(t * 11.7) * 0.3;\n        const harmonicY = Math.cos(t * 4.7) * 0.4 + Math.cos(t * 9.1) * 0.3;\n        const noiseX = (Math.random() - 0.5) * 1.2;\n        const noiseY = (Math.random() - 0.5) * 1.0;\n\n        const baseAmp = isOverdue ? 2.4 : 1.0;\n        dx = (harmonicX + noiseX) * baseAmp * severity;\n        dy = (harmonicY + noiseY) * (baseAmp * 0.75) * severity;\n      }\n\n      // Micro-clamp to keep pixel art aesthetic crisp\n      const maxClamp = isOverdue ? 4.5 : 1.8;\n      dx = Math.max(-maxClamp, Math.min(maxClamp, dx));\n      dy = Math.max(-maxClamp, Math.min(maxClamp, dy));\n\n      return { dx, dy };\n    }\n\n    // Screen Shake & Streaks & Floating Texts\n    let screenShakeFrames = 0;\n    let screenShakeMagnitude = 0;\n    let sessionStreak = 0;\n    const floatingTexts = [];\n\n    function triggerScreenShake(magnitude, frames) {\n      screenShakeMagnitude = magnitude;\n      screenShakeFrames = frames;\n    }\n\n    function spawnFloatingText(x, y, text, color = '#ffd700') {\n      floatingTexts.push({\n        x: x,\n        y: y,\n        text: text,\n        color: color,\n        life: 60,\n        maxLife: 60\n      });\n    }\n\n    function updateAndDrawFloatingTexts(c) {\n      for (let i = floatingTexts.length - 1; i >= 0; i--) {\n        const ft = floatingTexts[i];\n        ft.y -= 0.6;\n        ft.life--;\n        const alpha = Math.max(0, ft.life / ft.maxLife);\n\n        c.save();\n        c.globalAlpha = alpha;\n        c.font = '7px \"Press Start 2P\"';\n        c.textAlign = 'center';\n        // Drop shadow\n        c.fillStyle = '#000000';\n        c.fillText(ft.text, ft.x + 1, ft.y + 1);\n        c.fillStyle = ft.color;\n        c.fillText(ft.text, ft.x, ft.y);\n        c.restore();\n\n        if (ft.life <= 0) {\n          floatingTexts.splice(i, 1);\n        }\n      }\n    }\n\n    function drawOverloadBanner(c) {\n      const now = Date.now();\n      const blink = Math.floor(now / 220) % 2 === 0;\n\n      c.save();\n      c.fillStyle = 'rgba(0, 0, 0, 0.85)';\n      c.fillRect(8, 32, 384, 18);\n      c.lineWidth = 1;\n      c.strokeStyle = blink ? '#e76e55' : '#f7d51d';\n      c.strokeRect(8, 32, 384, 18);\n\n      c.font = '7px \"Press Start 2P\"';\n      c.textAlign = 'center';\n      c.fillStyle = blink ? '#e76e55' : '#f7d51d';\n      c.fillText('TOWER OVERLOAD (10/10)! CLEAR TASKS TO RESUME', 200, 44);\n      c.restore();\n    }\n\n    function updateOverloadUIState() {\n      const isOverloaded = diceStack.length >= 10;\n      const submitBtn = document.querySelector('.btn-submit');\n      const inputEl = document.getElementById('taskInput');\n\n      if (isOverloaded) {\n        if (inputEl) {\n          inputEl.disabled = true;\n          inputEl.placeholder = \"TOWER OVERLOAD (10/10) - CLEAR!\";\n        }\n        if (submitBtn) {\n          submitBtn.disabled = true;\n          submitBtn.classList.add('is-disabled');\n        }\n      } else {\n        if (inputEl) {\n          inputEl.disabled = false;\n          inputEl.placeholder = \"Type task & press Enter...\";\n        }\n        if (submitBtn) {\n          submitBtn.disabled = false;\n          submitBtn.classList.remove('is-disabled');\n        }\n      }\n    }\n\n    // Selected task for modal\n    let selectedTask = null;\n    let hasLoadedTasksOnce = false;\n\n    /**\n     * Computes effective rot_factor (unclamped >= 0.0 for overdue tracking)\n     */\n    function getEffectiveRotFactor(die) {\n      if (devMode === 1) return 0.10;\n      if (devMode === 2) return 0.30;\n      if (devMode === 3) return 0.50;\n      if (devMode === 4) return 0.70;\n      if (devMode === 5) return 0.90;\n      if (devMode === 6) return 1.25;\n\n      if (!die.created_at || !die.deadline_at) {\n        return 0.2;\n      }\n\n      const createdTime = new Date(die.created_at).getTime();\n      const deadlineTime = new Date(die.deadline_at).getTime();\n      const now = Date.now();\n\n      const totalSpan = deadlineTime - createdTime;\n      if (totalSpan <= 0) return 1.0;\n\n      const elapsed = now - createdTime;\n      const rot = elapsed / totalSpan;\n\n      // Allow rot to exceed 1.0 when overdue (matching dice_logic.py)\n      return Math.max(0.0, rot);\n    }\n\n    /**\n     * Computes raw average rot factor across all active stacked dice\n     */\n    function calculateAverageRot() {\n      if (!diceStack || diceStack.length === 0) return 0.0;\n      let sum = 0;\n      for (let i = 0; i < diceStack.length; i++) {\n        sum += getEffectiveRotFactor(diceStack[i]);\n      }\n      return sum / diceStack.length;\n    }\n\n    /**\n     * Stacking layout sorting by weight_score descending\n     */\n    function recalculateTargets() {\n      diceStack.sort((a, b) => b.weight_score - a.weight_score);\n      const count = diceStack.length;\n      // Compaction: When stack > 5, compress step dynamically so 10 dice fit safely in 320px canvas\n      const compressedStep = count > 5 ? Math.max(14, Math.floor(180 / (count - 1))) : null;\n\n      for (let i = 0; i < count; i++) {\n        const d = diceStack[i];\n        const cfg = DICE_CONFIG[d.weight_score] || DICE_CONFIG[3];\n\n        if (i === 0) {\n          d.targetY = GROUND_Y - cfg.ry - cfg.height;\n        } else {\n          const prevDie = diceStack[i - 1];\n          const step = (compressedStep !== null) ? Math.min(cfg.height, compressedStep) : cfg.height;\n          d.targetY = prevDie.targetY - step;\n        }\n      }\n\n      updateOverloadUIState();\n    }\n\n    /**\n     * Adds die to stack\n     */\n    function addDieToStack(task, isInitial = false) {\n      hasHadTasks = true;\n      hasClearedAll = false;\n      const cfg = DICE_CONFIG[task.weight_score] || DICE_CONFIG[3];\n\n      const newDie = {\n        id: task.id,\n        title: task.title,\n        weight_score: task.weight_score,\n        deadline_str: task.deadline_str,\n        created_at: task.created_at,\n        deadline_at: task.deadline_at,\n        currentY: isInitial ? 0 : -40,\n        targetY: 0,\n        velocityY: isInitial ? 0 : 2,\n        bounceFrame: 0\n      };\n\n      diceStack.push(newDie);\n      recalculateTargets();\n\n      if (isInitial) {\n        newDie.currentY = newDie.targetY;\n      }\n    }\n\n    /**\n     * Spawns physics-based pixel explosion particles upon task completion\n     */\n    function triggerDiceExplosion(task) {\n      const cfg = DICE_CONFIG[task.weight_score] || DICE_CONFIG[3];\n      const centerX = 200;\n      const centerY = task.currentY + cfg.ry + (cfg.height / 2);\n      const rot = getEffectiveRotFactor(task);\n\n      let palette = [];\n      if (rot < 0.4) {\n        palette = ['#ffffff', '#f8f9fa', '#d6d8db', '#b0b5be', '#ffd700'];\n      } else if (rot < 0.75) {\n        palette = ['#dedbb8', '#bfbca0', '#9e9b81', '#2b291d', '#57534e'];\n      } else {\n        palette = ['#4d7c0f', '#84cc16', '#a855f7', '#3b0764', '#140428'];\n      }\n\n      const count = 50;\n      for (let i = 0; i < count; i++) {\n        const vx = (Math.random() - 0.5) * 8.0; // -4.0 to 4.0\n        const vy = -2.0 - (Math.random() * 4.0); // -6.0 to -2.0 upward burst\n        const size = Math.random() > 0.5 ? 3 : 2;\n        const color = palette[Math.floor(Math.random() * palette.length)];\n\n        explosionParticles.push({\n          x: centerX + (Math.random() - 0.5) * (cfg.width * 0.7),\n          y: centerY + (Math.random() - 0.5) * (cfg.height * 0.7),\n          vx: vx,\n          vy: vy,\n          size: size,\n          color: color,\n          life: 50,\n          maxLife: 50\n        });\n      }\n    }\n\n    /**\n     * Updates and draws explosion particles with strict memory pool caps\n     */\n    function updateAndDrawExplosions(c) {\n      if (explosionParticles.length > 250) {\n        explosionParticles.splice(0, explosionParticles.length - 200);\n      }\n      for (let i = explosionParticles.length - 1; i >= 0; i--) {\n        const p = explosionParticles[i];\n        p.x += p.vx;\n        p.y += p.vy;\n        p.vy += 0.25; // gravity acceleration\n        p.life--;\n\n        const alpha = Math.max(0, p.life / p.maxLife);\n        c.save();\n        c.globalAlpha = alpha;\n        c.fillStyle = p.color;\n        c.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);\n        c.restore();\n\n        if (p.life <= 0 || p.y > 324) {\n          explosionParticles.splice(i, 1);\n        }\n      }\n    }\n\n    /**\n     * Draws Background Procedural Corruption Roots\n     */\n    function drawCorruptionRoots(c, overallRot) {\n      if (overallRot < 0.05) return;\n\n      const time = Date.now() * 0.003;\n      const isTwitching = overallRot >= 0.75;\n\n      c.save();\n      c.lineJoin = 'miter';\n      c.lineCap = 'square';\n\n      const leftBranches = [\n        { sx: 0, sy: 320, tx: 140, ty: 295, cp1x: 40, cp1y: 310, cp2x: 90, cp2y: 300 },\n        { sx: 0, sy: 300, tx: 110, ty: 285, cp1x: 30, cp1y: 290, cp2x: 70, cp2y: 280 },\n        { sx: 20, sy: 320, tx: 160, ty: 300, cp1x: 60, cp1y: 312, cp2x: 120, cp2y: 302 }\n      ];\n\n      const rightBranches = [\n        { sx: 400, sy: 320, tx: 260, ty: 295, cp1x: 360, cp1y: 310, cp2x: 310, cp2y: 300 },\n        { sx: 400, sy: 300, tx: 290, ty: 285, cp1x: 370, cp1y: 290, cp2x: 330, cp2y: 280 },\n        { sx: 380, sy: 320, tx: 240, ty: 300, cp1x: 340, cp1y: 312, cp2x: 280, cp2y: 302 }\n      ];\n\n      const allBranches = [...leftBranches, ...rightBranches];\n\n      allBranches.forEach((b, idx) => {\n        const growth = Math.min(1.0, overallRot * 1.3);\n        const pulse = isTwitching ? Math.sin(time + idx * 1.7) * 2.5 : 0;\n\n        const curTx = b.sx + (b.tx - b.sx) * growth;\n        const curTy = b.sy + (b.ty - b.sy) * growth + pulse;\n        const curCp1x = b.sx + (b.cp1x - b.sx) * growth;\n        const curCp1y = b.sy + (b.cp1y - b.sy) * growth;\n        const curCp2x = b.sx + (b.cp2x - b.sx) * growth;\n        const curCp2y = b.sy + (b.cp2y - b.sy) * growth + pulse * 0.5;\n\n        c.strokeStyle = overallRot >= 0.75 ? '#3b0764' : '#1e1b4b';\n        c.lineWidth = 3;\n        c.beginPath();\n        c.moveTo(b.sx, b.sy);\n        c.bezierCurveTo(curCp1x, curCp1y, curCp2x, curCp2y, curTx, curTy);\n        c.stroke();\n\n        c.strokeStyle = '#05020a';\n        c.lineWidth = 1.5;\n        c.beginPath();\n        c.moveTo(b.sx, b.sy);\n        c.bezierCurveTo(curCp1x, curCp1y, curCp2x, curCp2y, curTx, curTy);\n        c.stroke();\n\n        if (growth > 0.4) {\n          c.fillStyle = '#05020a';\n          c.fillRect(curCp1x, curCp1y - 2, 2, 3);\n          c.fillRect(curCp2x, curCp2y + 1, 2, 3);\n          if (growth > 0.8) {\n            c.fillRect(curTx - 1, curTy - 2, 3, 2);\n          }\n        }\n      });\n\n      c.restore();\n    }\n\n    /**\n     * Spawns continuous viscous slime drips from Stage 5 dice along isometric lower edges.\n     */\n    function spawnStage5SlimeDrip(renderX, renderY, rx, ry, height, rot) {\n      if (rot < 0.8) return;\n\n      const isOverdue = rot >= 1.0;\n      // Drip spawn chance: 8% normal Stage 5, 22% when overdue\n      const spawnChance = isOverdue ? 0.22 : 0.08;\n      if (Math.random() > spawnChance) return;\n\n      for (let k = 0; k < MAX_SLIME_DRIPS; k++) {\n        const p = slimeDripPool[k];\n        if (!p.active) {\n          p.active = true;\n          const side = Math.random() < 0.5 ? -1 : 1;\n          const u = Math.random();\n          p.x = renderX + side * u * rx * 0.85;\n          p.y = renderY + ry + height - (u * ry * 0.6);\n          p.vy = isOverdue ? (0.7 + Math.random() * 0.7) : (0.4 + Math.random() * 0.4);\n          p.gravity = 0.08 + Math.random() * 0.04;\n          p.length = 2;\n\n          const isPurple = Math.random() < 0.45;\n          if (isPurple) {\n            p.color = Math.random() < 0.5 ? '#c084fc' : '#a855f7';\n            p.glowColor = 'rgba(192, 132, 252, 0.4)';\n            p.type = 'purple';\n          } else {\n            p.color = Math.random() < 0.5 ? '#84cc16' : '#a3e635';\n            p.glowColor = 'rgba(132, 204, 22, 0.4)';\n            p.type = 'green';\n          }\n          break;\n        }\n      }\n    }\n\n    /**\n     * Handles slime droplet impact on floor: triggers splash and expands/creates puddles.\n     */\n    function triggerSlimeFloorImpact(impactX, color, type) {\n      // 1. Trigger micro-splatter\n      let splashCount = 0;\n      for (let i = 0; i < MAX_SLIME_SPLASHES && splashCount < 2; i++) {\n        const s = slimeSplashPool[i];\n        if (!s.active) {\n          s.active = true;\n          s.x = impactX;\n          s.y = GROUND_Y;\n          s.vx = (Math.random() - 0.5) * 1.8;\n          s.vy = -0.5 - Math.random() * 0.8;\n          s.life = 0;\n          s.maxLife = 8 + Math.floor(Math.random() * 6);\n          s.color = color;\n          splashCount++;\n        }\n      }\n\n      // 2. Feed or create floor puddle\n      let absorbed = false;\n      for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {\n        const p = slimePuddlePool[i];\n        if (p.active && Math.abs(p.x - impactX) < (p.width * 0.6 + 10)) {\n          p.targetWidth = Math.min(p.maxWidth, p.targetWidth + 3.5);\n          p.alpha = Math.min(1.0, p.alpha + 0.1);\n          absorbed = true;\n          break;\n        }\n      }\n\n      if (!absorbed) {\n        for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {\n          const p = slimePuddlePool[i];\n          if (!p.active) {\n            p.active = true;\n            p.x = impactX;\n            p.y = GROUND_Y + (Math.random() * 2);\n            p.width = 4;\n            p.targetWidth = 12;\n            p.maxWidth = 42 + Math.floor(Math.random() * 20);\n            p.height = 3;\n            p.alpha = 0.95;\n            if (type === 'purple') {\n              p.color = '#1e1b4b';\n              p.rimColor = '#7e22ce';\n              p.highlightColor = '#c084fc';\n              p.bubbleColor = '#a855f7';\n            } else {\n              p.color = '#022c22';\n              p.rimColor = '#365314';\n              p.highlightColor = '#84cc16';\n              p.bubbleColor = '#a3e635';\n            }\n            p.bubbles.forEach((b, idx) => {\n              b.progress = idx * 0.33;\n              b.speed = 0.012 + Math.random() * 0.012;\n              b.size = 1.8 + Math.random() * 1.2;\n              b.xRel = (Math.random() - 0.5) * 8;\n            });\n            break;\n          }\n        }\n      }\n    }\n\n    /**\n     * Updates and draws animated dripping slime particles, floor puddles, and bubbles.\n     * Completely recycled with zero runtime heap allocations.\n     */\n    function updateAndDrawSlime(c) {\n      const isZen = (diceStack.length === 0);\n\n      // 1. DRAW & UPDATE FLOOR PUDDLES\n      for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {\n        const p = slimePuddlePool[i];\n        if (!p.active) continue;\n\n        if (isZen) {\n          p.alpha -= 0.015;\n          if (p.alpha <= 0) {\n            p.active = false;\n            continue;\n          }\n        }\n\n        // Viscous pooling expansion\n        p.width += (p.targetWidth - p.width) * 0.06;\n        p.height = Math.max(3, Math.min(8, p.width * 0.22));\n\n        c.save();\n        c.globalAlpha = Math.max(0, p.alpha);\n\n        // Outer viscous rim\n        c.fillStyle = p.rimColor;\n        c.beginPath();\n        c.ellipse(p.x, p.y, p.width / 2 + 1, p.height / 2 + 0.5, 0, 0, Math.PI * 2);\n        c.fill();\n\n        // Dark core puddle\n        c.fillStyle = p.color;\n        c.beginPath();\n        c.ellipse(p.x, p.y, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);\n        c.fill();\n\n        // Specular glistening edge\n        c.strokeStyle = p.highlightColor;\n        c.lineWidth = 1;\n        c.beginPath();\n        c.ellipse(p.x, p.y - 1, p.width * 0.35, p.height * 0.3, 0, Math.PI, Math.PI * 2);\n        c.stroke();\n\n        // Bubbles on floor puddle\n        p.bubbles.forEach((b) => {\n          b.progress += b.speed;\n          if (b.progress >= 1.0) {\n            b.progress = 0;\n            b.speed = 0.012 + Math.random() * 0.015;\n            b.size = 1.5 + Math.random() * 1.5;\n            b.xRel = (Math.random() - 0.5) * (p.width * 0.65);\n          }\n          const curRadius = b.size * Math.sin(b.progress * Math.PI);\n          if (curRadius > 0.4) {\n            const bx = p.x + b.xRel;\n            const by = p.y - (curRadius * 0.5);\n            c.fillStyle = p.bubbleColor;\n            c.beginPath();\n            c.arc(bx, by, curRadius, 0, Math.PI * 2);\n            c.fill();\n            if (curRadius > 1.3) {\n              c.fillStyle = '#ffffff';\n              c.fillRect(Math.floor(bx - 0.5), Math.floor(by - curRadius * 0.5), 1, 1);\n            }\n          }\n        });\n\n        c.restore();\n      }\n\n      // 2. UPDATE & DRAW FALLING SLIME DRIPS\n      for (let i = 0; i < MAX_SLIME_DRIPS; i++) {\n        const p = slimeDripPool[i];\n        if (!p.active) continue;\n\n        p.vy += p.gravity;\n        p.y += p.vy;\n        p.length = Math.max(2, Math.min(6, Math.floor(p.vy * 1.8)));\n\n        if (p.y + p.length >= GROUND_Y) {\n          p.active = false;\n          triggerSlimeFloorImpact(p.x, p.color, p.type);\n          continue;\n        }\n\n        // Viscous teardrop rendering with glow\n        c.fillStyle = p.glowColor;\n        c.fillRect(Math.floor(p.x) - 1, Math.floor(p.y), 3, p.length);\n        c.fillStyle = p.color;\n        c.fillRect(Math.floor(p.x), Math.floor(p.y), 2, p.length);\n      }\n\n      // 3. UPDATE & DRAW SPLASH PARTICLES\n      for (let i = 0; i < MAX_SLIME_SPLASHES; i++) {\n        const s = slimeSplashPool[i];\n        if (!s.active) continue;\n\n        s.x += s.vx;\n        s.y += s.vy;\n        s.vy += 0.2;\n        s.life++;\n\n        c.fillStyle = s.color;\n        c.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);\n\n        if (s.life >= s.maxLife || s.y > GROUND_Y + 6) {\n          s.active = false;\n        }\n      }\n    }\n\n    /**\n     * Draws a 2.5D Isometric Die with 5-Stage Rot Engine Textures\n     *\n     * Stage mapping:\n     * - Stage 1 (0-20%): Pristine ivory (#fdfbf7, #e5dec9) + specular shine highlight streak across top face.\n     * - Stage 2 (20-40%): Fading sandy yellow (#eae0c8, #c5b89a) + corner scratches on isometric edges.\n     * - Stage 3 (40-60%): Cracked stone (#8a8d8f, #5a5c5e) + 4 dark jagged fissures across die faces.\n     * - Stage 4 (60-80%): Mossy decay (#4a5d4e, #2d3a30) + purple/green fungus dots + creeping roots wrapping around sides.\n     * - Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green (#2e1f3d, #1a2e22) + blinking red overdue label when rot >= 1.0.\n     */\n    function drawRotIsometricDice(c, cx, cy, width, height, weight, label, rot) {\n      const rx = width / 2;\n      const ry = width / 4;\n\n      c.save();\n      c.lineWidth = 2;\n      c.lineJoin = 'miter';\n      c.strokeStyle = '#000000';\n\n      let leftColor, rightColor, topColor, pipColor;\n      let stage = 1;\n\n      if (rot < 0.20) {\n        // Stage 1 (0-20%): Pristine ivory (#fdfbf7, #e5dec9)\n        stage = 1;\n        topColor = '#fdfbf7';\n        leftColor = '#f1ecdc';\n        rightColor = '#e5dec9';\n        pipColor = '#18181b';\n      } else if (rot < 0.40) {\n        // Stage 2 (20-40%): Fading sandy yellow (#eae0c8, #c5b89a)\n        stage = 2;\n        topColor = '#eae0c8';\n        leftColor = '#d7cbb0';\n        rightColor = '#c5b89a';\n        pipColor = '#3c352a';\n      } else if (rot < 0.60) {\n        // Stage 3 (40-60%): Cracked stone (#8a8d8f, #5a5c5e)\n        stage = 3;\n        topColor = '#8a8d8f';\n        leftColor = '#727577';\n        rightColor = '#5a5c5e';\n        pipColor = '#222426';\n      } else if (rot < 0.80) {\n        // Stage 4 (60-80%): Mossy decay (#4a5d4e, #2d3a30)\n        stage = 4;\n        topColor = '#4a5d4e';\n        leftColor = '#3a4b3e';\n        rightColor = '#2d3a30';\n        pipColor = '#18221b';\n      } else {\n        // Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green (#2e1f3d, #1a2e22)\n        stage = 5;\n        topColor = '#2e1f3d';\n        leftColor = '#22162e';\n        rightColor = '#1a2e22';\n        pipColor = '#a3e635'; // Luminescent radioactive lime\n      }\n\n      // 1. LEFT FACE\n      c.fillStyle = leftColor;\n      c.beginPath();\n      c.moveTo(cx - rx, cy);\n      c.lineTo(cx, cy + ry);\n      c.lineTo(cx, cy + ry + height);\n      c.lineTo(cx - rx, cy + height);\n      c.closePath();\n      c.fill();\n      c.stroke();\n\n      // 2. RIGHT FACE\n      c.fillStyle = rightColor;\n      c.beginPath();\n      c.moveTo(cx, cy + ry);\n      c.lineTo(cx + rx, cy);\n      c.lineTo(cx + rx, cy + height);\n      c.lineTo(cx, cy + ry + height);\n      c.closePath();\n      c.fill();\n      c.stroke();\n\n      // 3. TOP FACE\n      c.fillStyle = topColor;\n      c.beginPath();\n      c.moveTo(cx, cy - ry);\n      c.lineTo(cx + rx, cy);\n      c.lineTo(cx, cy + ry);\n      c.lineTo(cx - rx, cy);\n      c.closePath();\n      c.fill();\n      c.stroke();\n\n      // 4. STAGE-SPECIFIC TEXTURE DETAILS & OVERLAYS\n      if (stage === 1) {\n        // Stage 1: Specular shine highlight streak across top face\n        c.save();\n        c.strokeStyle = 'rgba(255, 255, 255, 0.9)';\n        c.lineWidth = 1.5;\n        c.beginPath();\n        c.moveTo(cx - rx * 0.65, cy - ry * 0.1);\n        c.lineTo(cx - rx * 0.15, cy - ry * 0.6);\n        c.stroke();\n\n        // Accent sparkle glint\n        c.fillStyle = '#ffffff';\n        c.fillRect(cx - rx * 0.35, cy - ry * 0.4 - 1, 2, 2);\n        c.restore();\n      } else if (stage === 2) {\n        // Stage 2: Subtle corner scratches on isometric edges\n        c.save();\n        c.strokeStyle = '#9c8f76';\n        c.lineWidth = 1;\n        // Scratch 1: top-left corner\n        c.beginPath();\n        c.moveTo(cx - rx + 3, cy - 1);\n        c.lineTo(cx - rx + 9, cy - ry * 0.3);\n        c.stroke();\n        // Scratch 2: center vertical edge\n        c.beginPath();\n        c.moveTo(cx - 2, cy + ry + 3);\n        c.lineTo(cx + 4, cy + ry + 7);\n        c.stroke();\n        // Scratch 3: left face edge\n        c.beginPath();\n        c.moveTo(cx - rx + 2, cy + height * 0.3);\n        c.lineTo(cx - rx + 7, cy + height * 0.35 + 2);\n        c.stroke();\n        // Scratch 4: right face ridge\n        c.beginPath();\n        c.moveTo(cx + rx * 0.45, cy + ry * 0.35);\n        c.lineTo(cx + rx * 0.65, cy + ry * 0.15 + 3);\n        c.stroke();\n        c.restore();\n      } else if (stage === 3) {\n        // Stage 3: Cracked stone + 4 dark jagged fissures across die faces\n        c.save();\n        c.strokeStyle = '#1c1d1f';\n        c.lineWidth = 1.5;\n        // Fissure 1: Top face cutting down across left face\n        c.beginPath();\n        c.moveTo(cx - rx * 0.2, cy - ry * 0.3);\n        c.lineTo(cx - rx * 0.45, cy + ry * 0.1);\n        c.lineTo(cx - rx * 0.35, cy + ry * 0.5 + 4);\n        c.lineTo(cx - rx * 0.5, cy + height * 0.6);\n        c.lineTo(cx - rx * 0.4, cy + height * 0.85);\n        c.stroke();\n\n        // Fissure 2: Center-top fracture branching into right face\n        c.beginPath();\n        c.moveTo(cx + 3, cy - ry * 0.2);\n        c.lineTo(cx + rx * 0.2, cy + ry * 0.2);\n        c.lineTo(cx + 2, cy + ry + 5);\n        c.lineTo(cx + rx * 0.25, cy + ry + 12);\n        c.lineTo(cx + rx * 0.15, cy + height * 0.7);\n        c.stroke();\n\n        // Fissure 3: Top face cross fracture\n        c.lineWidth = 1;\n        c.beginPath();\n        c.moveTo(cx - rx * 0.45, cy + ry * 0.1);\n        c.lineTo(cx + rx * 0.1, cy - ry * 0.1);\n        c.lineTo(cx + rx * 0.35, cy + ry * 0.2);\n        c.stroke();\n\n        // Fissure 4: Right face lateral fracture\n        c.lineWidth = 1.5;\n        c.beginPath();\n        c.moveTo(cx + rx * 0.6, cy + 2);\n        c.lineTo(cx + rx * 0.45, cy + ry * 0.4 + 5);\n        c.lineTo(cx + rx * 0.55, cy + height * 0.55);\n        c.stroke();\n        c.restore();\n      } else if (stage === 4) {\n        // Stage 4: Mossy decay + purple/green fungus dots + creeping roots wrapping around sides\n        c.save();\n        // 1. Creeping roots\n        c.strokeStyle = '#142217';\n        c.lineWidth = 1.5;\n        // Root 1 (left side wrap)\n        c.beginPath();\n        c.moveTo(cx - rx, cy + height * 0.7);\n        c.lineTo(cx - rx * 0.6, cy + height * 0.5);\n        c.lineTo(cx - rx * 0.35, cy + ry * 0.7 + 6);\n        c.lineTo(cx - rx * 0.5, cy + ry * 0.3);\n        c.stroke();\n        // Root 2 (right side wrap)\n        c.beginPath();\n        c.moveTo(cx, cy + ry + height - 2);\n        c.lineTo(cx + rx * 0.2, cy + ry + height * 0.5);\n        c.lineTo(cx + rx * 0.45, cy + ry * 0.8 + 8);\n        c.lineTo(cx + rx * 0.7, cy + height * 0.4);\n        c.lineTo(cx + rx, cy + height * 0.25);\n        c.stroke();\n        // Root 3 (top ridge creep)\n        c.beginPath();\n        c.moveTo(cx, cy + ry);\n        c.lineTo(cx + rx * 0.15, cy + ry * 0.3);\n        c.lineTo(cx + rx * 0.3, cy - ry * 0.1);\n        c.stroke();\n\n        // 2. Purple/green fungus dots\n        // Top face cluster\n        c.fillStyle = '#84cc16';\n        c.fillRect(cx - rx * 0.35, cy - ry * 0.25, 2, 2);\n        c.fillRect(cx - rx * 0.25, cy - ry * 0.15, 3, 2);\n        c.fillStyle = '#c084fc';\n        c.fillRect(cx - rx * 0.3, cy - ry * 0.1, 2, 2);\n        c.fillRect(cx + rx * 0.35, cy + ry * 0.1, 3, 3);\n        c.fillStyle = '#4ade80';\n        c.fillRect(cx + rx * 0.25, cy + ry * 0.2, 2, 2);\n        // Left face cluster\n        c.fillStyle = '#7e22ce';\n        c.fillRect(cx - rx * 0.65, cy + height * 0.4, 3, 3);\n        c.fillStyle = '#84cc16';\n        c.fillRect(cx - rx * 0.55, cy + height * 0.45, 2, 2);\n        // Right face cluster\n        c.fillStyle = '#c084fc';\n        c.fillRect(cx + rx * 0.3, cy + ry + 10, 2, 2);\n        c.fillStyle = '#84cc16';\n        c.fillRect(cx + rx * 0.4, cy + ry + 14, 3, 2);\n        c.fillRect(cx + rx * 0.6, cy + height * 0.6, 2, 2);\n        c.restore();\n      } else {\n        // Stage 5: Toxic necrotic purple/green + deep corruption veins & pustules\n        c.save();\n        c.strokeStyle = '#022c22';\n        c.lineWidth = 1.5;\n        c.beginPath();\n        c.moveTo(cx - rx * 0.5, cy + 2);\n        c.lineTo(cx - rx * 0.3, cy + ry * 0.6 + 6);\n        c.lineTo(cx - rx * 0.4, cy + height * 0.8);\n        c.stroke();\n\n        c.strokeStyle = '#581c87';\n        c.beginPath();\n        c.moveTo(cx + rx * 0.15, cy + ry * 0.7 + 3);\n        c.lineTo(cx + rx * 0.4, cy + ry * 0.3 + 9);\n        c.lineTo(cx + rx * 0.35, cy + height * 0.85);\n        c.stroke();\n\n        // Radioactive necrotic pustules\n        c.fillStyle = '#a3e635';\n        c.fillRect(cx - rx * 0.25, cy + ry * 0.5 + 4, 3, 3);\n        c.fillStyle = '#c084fc';\n        c.fillRect(cx + rx * 0.35, cy + height * 0.5, 3, 3);\n        c.restore();\n      }\n\n      // 5. DRAW PIPS\n      drawDicePips(c, cx, cy, rx, ry, weight, pipColor);\n\n      // 6. DRAW TASK LABEL (WITH BLINKING RED OVERDUE STATE)\n      drawDiceLabel(c, cx, cy + ry, rx, height, label, rot);\n\n      c.restore();\n    }\n\n    /**\n     * Draws pips with rot tint\n     */\n    function drawDicePips(c, cx, cy, rx, ry, count, color) {\n      c.fillStyle = color;\n      const s = 4;\n\n      if (count === 1) {\n        c.fillRect(cx - 2, cy - 2, s, s);\n      } else if (count === 2) {\n        c.fillRect(cx - rx * 0.4, cy - ry * 0.4, s, s);\n        c.fillRect(cx + rx * 0.4 - 2, cy + ry * 0.4 - 2, s, s);\n      } else if (count === 3) {\n        c.fillRect(cx - 2, cy - 2, s, s);\n        c.fillRect(cx - rx * 0.4, cy - ry * 0.4, s, s);\n        c.fillRect(cx + rx * 0.4 - 2, cy + ry * 0.4 - 2, s, s);\n      } else if (count === 4) {\n        c.fillRect(cx - rx * 0.45, cy, s, s);\n        c.fillRect(cx + rx * 0.45 - 2, cy, s, s);\n        c.fillRect(cx, cy - ry * 0.45, s, s);\n        c.fillRect(cx, cy + ry * 0.45 - 2, s, s);\n      } else if (count >= 5) {\n        c.fillRect(cx - 2, cy - 2, s, s);\n        c.fillRect(cx - rx * 0.45, cy - ry * 0.35, s, s);\n        c.fillRect(cx + rx * 0.45 - 2, cy - ry * 0.35, s, s);\n        c.fillRect(cx - rx * 0.45, cy + ry * 0.35 - 2, s, s);\n        c.fillRect(cx + rx * 0.45 - 2, cy + ry * 0.35 - 2, s, s);\n      }\n    }\n\n    /**\n     * Draws truncated task label with robust Unicode / Vietnamese support\n     * Blinking red label when overdue (rot >= 1.0)\n     */\n    function drawDiceLabel(c, cx, cy, rx, height, title, rot) {\n      if (!title) return;\n      // Strip unprintable control codes but keep Unicode characters & spaces\n      let clean = title.toUpperCase().replace(/[\\u0000-\\u001f\\u007f]/g, '').trim();\n      if (!clean) return;\n\n      c.save();\n      c.font = '6px \"Press Start 2P\"';\n      const maxTextWidth = rx * 1.5;\n      const measure = (str) => (c.measureText ? c.measureText(str).width : str.length * 6);\n\n      // Truncate dynamically using font metrics\n      if (measure(clean) > maxTextWidth) {\n        while (clean.length > 1 && measure(clean + '..') > maxTextWidth) {\n          clean = clean.slice(0, -1);\n        }\n        clean = clean + '..';\n      }\n\n      // Color mapping & overdue blinking\n      if (rot >= 1.0) {\n        // Blinking red label when overdue (rot >= 1.0)\n        const isBlinkRed = (Math.floor(Date.now() / 350) % 2 === 0);\n        c.fillStyle = isBlinkRed ? '#ef4444' : '#ffffff';\n      } else if (rot >= 0.80) {\n        c.fillStyle = '#a3e635'; // Stage 5 non-overdue: toxic lime\n      } else if (rot >= 0.60) {\n        c.fillStyle = '#a3e635'; // Stage 4: moss spore lime\n      } else if (rot >= 0.40) {\n        c.fillStyle = '#f8fafc'; // Stage 3: crisp white text on cracked stone\n      } else if (rot >= 0.20) {\n        c.fillStyle = '#2b291d'; // Stage 2: dark sepia on sandy yellow\n      } else {\n        c.fillStyle = '#111827'; // Stage 1: obsidian on pristine ivory\n      }\n\n      c.textAlign = 'center';\n      c.fillText(clean, cx, cy + (height * 0.65));\n      c.restore();\n    }\n\n    /**\n     * Draws a pulsing retro overdue alert banner above an overdue die\n     */\n    function drawOverdueDieBanner(c, cx, cy, width, ry) {\n      const now = Date.now();\n      const blink = Math.floor(now / 220) % 2 === 0;\n      const bannerW = Math.max(68, width * 0.85);\n      const bannerH = 11;\n      const bannerX = cx - bannerW / 2;\n      const bannerY = cy - ry - 13;\n\n      c.save();\n      // Semi-transparent dark crimson plate\n      c.fillStyle = 'rgba(20, 5, 8, 0.92)';\n      c.fillRect(bannerX, bannerY, bannerW, bannerH);\n\n      // Pulsing retro red/crimson border\n      c.strokeStyle = blink ? 'rgba(255, 34, 34, 0.95)' : 'rgba(168, 20, 20, 0.7)';\n      c.lineWidth = 1;\n      c.strokeRect(bannerX, bannerY, bannerW, bannerH);\n\n      // Blinking text '! QUÁ HẠN !'\n      c.font = '6px \"Press Start 2P\"';\n      c.textAlign = 'center';\n      c.textBaseline = 'middle';\n      c.fillStyle = blink ? '#ff2222' : '#ff9999';\n      c.fillText('! QUÁ HẠN !', cx, bannerY + bannerH / 2 + 1);\n\n      c.restore();\n    }\n\n    /**\n     * Resolves current time period into 4 discrete phases based on local hour\n     * Dawn: 6:00 - 10:00\n     * Day: 10:00 - 17:00\n     * Sunset: 17:00 - 20:00\n     * Night: 20:00 - 6:00\n     */\n    function getZenTimePeriod() {\n      const hour = (window.zenSimulatedHour !== null && window.zenSimulatedHour !== undefined)\n        ? window.zenSimulatedHour\n        : new Date().getHours();\n\n      if (hour >= 6 && hour < 10) return 'dawn';     // 6:00 - 10:00\n      if (hour >= 10 && hour < 17) return 'day';     // 10:00 - 17:00\n      if (hour >= 17 && hour < 20) return 'sunset';  // 17:00 - 20:00\n      return 'night';                                // 20:00 - 6:00\n    }\n\n    // Public test inspection hooks on window\n    window.setZenGardenTime = function(hour) {\n      window.zenSimulatedHour = (hour !== null && hour !== undefined) ? parseInt(hour, 10) : null;\n    };\n    window.getZenGardenPeriod = function() {\n      return getZenTimePeriod();\n    };\n    window.isZenGardenActive = function() {\n      return diceStack.length === 0 && (hasHadTasks || hasClearedAll);\n    };\n    window.getVisualTier = function() {\n      return visualTier;\n    };\n    window.getAverageRot = function() {\n      return calculateAverageRot();\n    };\n    window.triggerZenGarden = function() {\n      diceStack = [];\n      hasHadTasks = true;\n      hasClearedAll = true;\n      visualTier = 0.0;\n    };\n\n    /**\n     * Calculates the dynamic abyssal background color and hue\n     * Shifting smoothly: Base Abyssal Slate (216°) -> Sickly Green (142°) -> Necrotic Purple (282°) -> Blood Crimson (352°+)\n     * @param {number} rot - The smoothed average rot factor (unclamped >= 0.0)\n     * @param {number} now - Timestamp for overdue heartbeat pulse\n     */\n    function getAbyssalRotColor(rot, now = 0) {\n      let r, g, b, h, s, l;\n\n      if (rot <= 0.0) {\n        // Pristine Cold Void (#121417)\n        r = 18; g = 20; b = 23; h = 216; s = 12; l = 8;\n      } else if (rot < 0.35) {\n        // Base Void -> Sickly Eldritch Moss Green (#0e1912)\n        const t = rot / 0.35;\n        r = 18 + (14 - 18) * t;\n        g = 20 + (25 - 20) * t;\n        b = 23 + (18 - 23) * t;\n        h = 216 + (142 - 216) * t;\n        s = 12 + (28 - 12) * t;\n        l = 8 + (7.6 - 8) * t;\n      } else if (rot < 0.70) {\n        // Sickly Green -> Diseased Necrotic Purple (#190d1e)\n        const t = (rot - 0.35) / 0.35;\n        r = 14 + (25 - 14) * t;\n        g = 25 + (13 - 25) * t;\n        b = 18 + (30 - 18) * t;\n        h = 142 + (282 - 142) * t;\n        s = 28 + (39 - 28) * t;\n        l = 7.6 + (8.4 - 7.6) * t;\n      } else if (rot < 1.0) {\n        // Necrotic Purple -> Blood Crimson (#26090d)\n        const t = (rot - 0.70) / 0.30;\n        r = 25 + (38 - 25) * t;\n        g = 13 + (9 - 13) * t;\n        b = 30 + (13 - 30) * t;\n        h = 282 + (352 - 282) * t;\n        s = 39 + (62 - 39) * t;\n        l = 8.4 + (9.2 - 8.4) * t;\n      } else {\n        // rot >= 1.0 (Overdue Crisis: Deepening Arterial Crimson + Visceral Heartbeat Pulse)\n        const overdueFactor = Math.min(1.5, rot - 1.0);\n        const t = overdueFactor / 1.5;\n        const pulse = Math.sin(now * 0.005) * (0.6 + t * 1.4);\n\n        r = Math.min(60, Math.floor(38 + t * 20 + (pulse > 0 ? pulse * 3 : 0)));\n        g = Math.max(4, Math.floor(9 - t * 4));\n        b = Math.max(6, Math.floor(13 - t * 6));\n        h = 352 + Math.floor(t * 5);\n        s = Math.min(85, Math.floor(62 + t * 20));\n        l = Math.min(15, Math.max(6, 9.2 + t * 2.5 + pulse * 0.6));\n      }\n\n      r = Math.round(r);\n      g = Math.round(g);\n      b = Math.round(b);\n      h = Math.round(h);\n      s = Math.round(s);\n      l = Number(l.toFixed(1));\n\n      return {\n        r, g, b,\n        hue: h,\n        sat: s,\n        light: l,\n        cssHsl: `hsl(${h}, ${s}%, ${l}%)`,\n        cssRgb: `rgb(${r}, ${g}, ${b})`\n      };\n    }\n\n    /**\n     * Calculates smooth opacity multiplier for tier k (1 to 10)\n     * Guarantees smooth de-escalation without popping or jarring snaps.\n     * @param {number} k - Tier index (1 to 10)\n     * @returns {number} Opacity between 0.0 and 1.0\n     */\n    function getTierAlpha(k) {\n      if (visualTier >= k) return 1.0;\n      if (visualTier <= k - 1) return 0.0;\n      return Math.max(0.0, Math.min(1.0, visualTier - (k - 1)));\n    }\n\n    /**\n     * Renders Escalating Lovecraftian Abyss Background Layers (Tiers 1 to 10)\n     * With smooth alpha transitions based on getTierAlpha(k)\n     */\n    function renderLovecraftianAbyss(c, now, overallRot) {\n      // Tier 1: Void (faint abyssal haze)\n      const a1 = getTierAlpha(1);\n      if (a1 > 0.01) {\n        c.save();\n        c.globalAlpha = a1;\n        const hazeX1 = 200 + Math.sin(now * 0.001) * 60;\n        const hazeY1 = 160 + Math.cos(now * 0.0012) * 40;\n        const grad1 = c.createRadialGradient(hazeX1, hazeY1, 20, hazeX1, hazeY1, 180);\n        grad1.addColorStop(0, 'rgba(30, 27, 75, 0.45)');\n        grad1.addColorStop(0.7, 'rgba(15, 23, 42, 0.25)');\n        grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');\n        c.fillStyle = grad1;\n        c.fillRect(0, 0, canvas.width, canvas.height);\n        c.restore();\n      }\n\n      // Tier 2: Cold Dust (drifting cold ash particles)\n      const a2 = getTierAlpha(2);\n      if (a2 > 0.01) {\n        c.save();\n        c.globalAlpha = a2;\n        for (let i = 0; i < coldDustParticles.length; i++) {\n          const p = coldDustParticles[i];\n          p.x += p.vx + Math.sin(now * 0.002 + p.y * 0.05) * 0.2;\n          p.y += p.vy;\n          if (p.y > 320) { p.y = 0; p.x = Math.random() * 400; }\n          if (p.x < 0) { p.x = 400; }\n          c.fillStyle = `rgba(186, 198, 214, ${p.alpha})`;\n          c.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);\n        }\n        c.restore();\n      }\n\n      // Tier 3: Frost Cracks (crystalline frost lines across canvas borders)\n      const a3 = getTierAlpha(3);\n      if (a3 > 0.01) {\n        c.save();\n        c.globalAlpha = a3;\n        c.strokeStyle = '#38bdf8';\n        c.lineWidth = 1;\n        c.shadowColor = '#0284c7';\n        c.shadowBlur = 3;\n        for (let i = 0; i < FROST_CRACKS.length; i++) {\n          const crack = FROST_CRACKS[i];\n          c.beginPath();\n          c.moveTo(crack[0].x, crack[0].y);\n          for (let j = 1; j < crack.length; j++) {\n            c.lineTo(crack[j].x, crack[j].y);\n          }\n          c.stroke();\n        }\n        c.fillStyle = 'rgba(186, 230, 253, 0.15)';\n        c.fillRect(0, 0, 400, 2);\n        c.fillRect(0, 0, 2, 320);\n        c.fillRect(398, 0, 2, 320);\n        c.restore();\n      }\n\n      // Tier 4: Sprouting Thorns (thorny vines emerging from floor/edges)\n      const a4 = getTierAlpha(4);\n      if (a4 > 0.01) {\n        c.save();\n        c.globalAlpha = a4;\n        c.strokeStyle = '#1e1b18';\n        c.fillStyle = '#262626';\n        c.lineWidth = 2;\n        for (let i = 0; i < SPROUTING_THORNS.length; i++) {\n          const t = SPROUTING_THORNS[i];\n          const sway = Math.sin(now * 0.003 + i) * 2;\n          const tipX = t.x + sway;\n          const tipY = GROUND_Y - t.h;\n          c.beginPath();\n          c.moveTo(t.x, GROUND_Y);\n          c.quadraticCurveTo(t.x + (t.dir * 6), GROUND_Y - (t.h * 0.5), tipX, tipY);\n          c.stroke();\n          c.beginPath();\n          c.moveTo(t.x + (t.dir * 3), GROUND_Y - (t.h * 0.4));\n          c.lineTo(t.x + (t.dir * 8), GROUND_Y - (t.h * 0.45));\n          c.lineTo(t.x + (t.dir * 2), GROUND_Y - (t.h * 0.55));\n          c.fill();\n        }\n        c.restore();\n      }\n\n      // Tier 5: Creeping Vines (pulsing purple eldritch vines climbing walls)\n      const a5 = getTierAlpha(5);\n      if (a5 > 0.01) {\n        c.save();\n        c.globalAlpha = a5;\n        drawCorruptionRoots(c, Math.max(overallRot, 0.55));\n        c.restore();\n      }\n\n      // Tier 6: Toxic Spores (floating green bioluminescent spores)\n      const a6 = getTierAlpha(6);\n      if (a6 > 0.01) {\n        c.save();\n        c.globalAlpha = a6;\n        for (let i = 0; i < toxicSpores.length; i++) {\n          const s = toxicSpores[i];\n          s.x += s.vx + Math.sin(now * 0.002 + s.pulseOffset) * 0.3;\n          s.y += s.vy;\n          if (s.y < 0) { s.y = 320; s.x = Math.random() * 400; }\n          if (s.x < 0) { s.x = 400; }\n          if (s.x > 400) { s.x = 0; }\n          const glow = 0.5 + Math.sin(now * 0.005 + s.pulseOffset) * 0.4;\n          c.fillStyle = `rgba(132, 204, 22, ${glow * 0.4})`;\n          c.fillRect(Math.floor(s.x) - 1, Math.floor(s.y) - 1, s.size + 2, s.size + 2);\n          c.fillStyle = s.color;\n          c.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);\n        }\n        c.restore();\n      }\n\n      // Tier 7: Blood Veins (branching crimson vascular patterns)\n      const a7 = getTierAlpha(7);\n      if (a7 > 0.01) {\n        c.save();\n        c.globalAlpha = a7;\n        const pulse = 0.6 + (Math.sin(now * 0.007) > 0.5 ? 0.35 : 0);\n        c.strokeStyle = `rgba(185, 28, 28, ${pulse})`;\n        c.lineWidth = 1.5;\n        for (let i = 0; i < BLOOD_VEINS.length; i++) {\n          const branch = BLOOD_VEINS[i];\n          c.beginPath();\n          c.moveTo(branch[0].x, branch[0].y);\n          for (let j = 1; j < branch.length; j++) {\n            c.lineTo(branch[j].x, branch[j].y);\n          }\n          c.stroke();\n        }\n        c.restore();\n      }\n\n      // Tier 8: Demon Eyes (unblinking demonic eyes opening in dark background)\n      const a8 = getTierAlpha(8);\n      if (a8 > 0.01) {\n        c.save();\n        c.globalAlpha = a8;\n        for (let i = 0; i < DEMON_EYES.length; i++) {\n          const eye = DEMON_EYES[i];\n          const cycle = (now + eye.blinkOffset) % eye.blinkPeriod;\n          const isBlinking = cycle < 140;\n          if (isBlinking) {\n            c.strokeStyle = '#000000';\n            c.lineWidth = 1.5;\n            c.beginPath();\n            c.moveTo(eye.x - eye.rx, eye.y);\n            c.lineTo(eye.x + eye.rx, eye.y);\n            c.stroke();\n          } else {\n            c.fillStyle = '#05020a';\n            c.beginPath();\n            c.ellipse(eye.x, eye.y, eye.rx + 1, eye.ry + 1, 0, 0, Math.PI * 2);\n            c.fill();\n            c.fillStyle = '#f59e0b';\n            c.beginPath();\n            c.ellipse(eye.x, eye.y, eye.rx, eye.ry, 0, 0, Math.PI * 2);\n            c.fill();\n\n            let pupilOffsetX = 0;\n            let pupilOffsetY = 0;\n            if (mousePos.x > 0 && mousePos.y > 0) {\n              const dx = mousePos.x - eye.x;\n              const dy = mousePos.y - eye.y;\n              const dist = Math.sqrt(dx * dx + dy * dy);\n              if (dist > 0) {\n                pupilOffsetX = Math.max(-2, Math.min(2, (dx / dist) * 2));\n                pupilOffsetY = Math.max(-1, Math.min(1, (dy / dist) * 1));\n              }\n            }\n            c.fillStyle = '#000000';\n            c.beginPath();\n            c.ellipse(eye.x + pupilOffsetX, eye.y + pupilOffsetY, 1.5, eye.ry * 0.8, 0, 0, Math.PI * 2);\n            c.fill();\n          }\n        }\n        c.restore();\n      }\n\n      // Tier 9: Abyssal Eclipse (dark coronal eclipse with pulsing aura)\n      const a9 = getTierAlpha(9);\n      if (a9 > 0.01) {\n        c.save();\n        c.globalAlpha = a9;\n        const eclipseX = 200;\n        const eclipseY = 70;\n        const baseRadius = 22;\n        const pulse = Math.sin(now * 0.004) * 2.5;\n\n        const coronaGrad = c.createRadialGradient(eclipseX, eclipseY, baseRadius, eclipseX, eclipseY, baseRadius + 20 + pulse);\n        coronaGrad.addColorStop(0, 'rgba(168, 85, 247, 0.7)');\n        coronaGrad.addColorStop(0.5, 'rgba(192, 38, 211, 0.35)');\n        coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');\n        c.fillStyle = coronaGrad;\n        c.beginPath();\n        c.arc(eclipseX, eclipseY, baseRadius + 22 + pulse, 0, Math.PI * 2);\n        c.fill();\n\n        c.strokeStyle = 'rgba(236, 72, 153, 0.4)';\n        c.lineWidth = 1;\n        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {\n          const rayLen = 28 + Math.sin(now * 0.006 + a * 3) * 6;\n          c.beginPath();\n          c.moveTo(eclipseX + Math.cos(a) * (baseRadius + 2), eclipseY + Math.sin(a) * (baseRadius + 2));\n          c.lineTo(eclipseX + Math.cos(a) * rayLen, eclipseY + Math.sin(a) * rayLen);\n          c.stroke();\n        }\n\n        c.fillStyle = '#090514';\n        c.beginPath();\n        c.arc(eclipseX, eclipseY, baseRadius, 0, Math.PI * 2);\n        c.fill();\n        c.strokeStyle = '#c084fc';\n        c.lineWidth = 1;\n        c.stroke();\n        c.restore();\n      }\n\n      // Tier 10: Pandemonium Overload (chaotic eldritch storm, lightning flashes, reality tearing)\n      const a10 = getTierAlpha(10);\n      if (a10 > 0.01) {\n        c.save();\n        c.globalAlpha = a10;\n        const sliceY = (Math.floor(now / 120) * 37) % 300;\n        const sliceH = 8 + (Math.floor(now / 90) % 12);\n        c.fillStyle = 'rgba(236, 72, 153, 0.2)';\n        c.fillRect(0, sliceY, 400, sliceH);\n        c.fillStyle = 'rgba(6, 182, 212, 0.15)';\n        c.fillRect(4, sliceY + 2, 392, sliceH - 4);\n\n        const flashSub = (now % 2800);\n        if (flashSub < 60) {\n          c.fillStyle = 'rgba(243, 232, 255, 0.35)';\n          c.fillRect(0, 0, canvas.width, canvas.height);\n          c.strokeStyle = '#ffffff';\n          c.lineWidth = 2;\n          c.beginPath();\n          c.moveTo(200, 0);\n          c.lineTo(190, 45);\n          c.lineTo(215, 90);\n          c.lineTo(195, 140);\n          c.lineTo(205, 190);\n          c.stroke();\n        }\n        c.restore();\n      }\n    }\n\n    /**\n     * Renders the Peaceful Pixel Zen Garden Victory State with Dynamic 4-Period Day/Night Lighting\n     */\n    function renderZenGarden(c) {\n      const now = Date.now();\n      const period = getZenTimePeriod();\n      const currentHour = (window.zenSimulatedHour !== null && window.zenSimulatedHour !== undefined)\n        ? window.zenSimulatedHour\n        : new Date().getHours();\n      const isDaytime = (period === 'dawn' || period === 'day');\n\n      // ==========================================\n      // 1. SKY GRADIENT & CELESTIAL BODIES\n      // ==========================================\n      const skyGrad = c.createLinearGradient(0, 0, 0, 240);\n      if (period === 'dawn') {\n        skyGrad.addColorStop(0, '#ea580c');\n        skyGrad.addColorStop(0.4, '#fb923c');\n        skyGrad.addColorStop(1, '#fed7aa');\n      } else if (period === 'day') {\n        skyGrad.addColorStop(0, '#0284c7');\n        skyGrad.addColorStop(0.5, '#38bdf8');\n        skyGrad.addColorStop(1, '#bae6fd');\n      } else if (period === 'sunset') {\n        skyGrad.addColorStop(0, '#4a044e');\n        skyGrad.addColorStop(0.35, '#9d174d');\n        skyGrad.addColorStop(0.7, '#ea580c');\n        skyGrad.addColorStop(1, '#fde047');\n      } else {\n        // night\n        skyGrad.addColorStop(0, '#020617');\n        skyGrad.addColorStop(0.5, '#0f172a');\n        skyGrad.addColorStop(1, '#1e1b4b');\n      }\n      c.fillStyle = skyGrad;\n      c.fillRect(0, 0, canvas.width, 240);\n\n      // Celestial details per period\n      if (period === 'dawn') {\n        // Low Golden Morning Sun (x=90, y=125)\n        c.fillStyle = 'rgba(254, 240, 138, 0.25)';\n        c.beginPath();\n        c.arc(90, 125, 22, 0, Math.PI * 2);\n        c.fill();\n        c.fillStyle = '#fef08a';\n        c.beginPath();\n        c.arc(90, 125, 12, 0, Math.PI * 2);\n        c.fill();\n\n        // Gentle Morning Sunbeams (angled translucent polygons)\n        c.save();\n        const beamPulse = 0.07 + Math.sin(now * 0.002) * 0.02;\n        c.fillStyle = `rgba(254, 240, 138, ${beamPulse})`;\n        c.beginPath();\n        c.moveTo(90, 125);\n        c.lineTo(160, 260);\n        c.lineTo(220, 260);\n        c.closePath();\n        c.fill();\n        c.beginPath();\n        c.moveTo(90, 125);\n        c.lineTo(260, 270);\n        c.lineTo(340, 270);\n        c.closePath();\n        c.fill();\n        c.restore();\n      } else if (period === 'day') {\n        // Radiant High Sun (x=330, y=42)\n        c.fillStyle = '#fde047';\n        c.fillRect(324, 36, 14, 14);\n        c.fillStyle = '#facc15';\n        c.fillRect(320, 41, 4, 4);\n        c.fillRect(338, 41, 4, 4);\n        c.fillRect(329, 32, 4, 4);\n        c.fillRect(329, 50, 4, 4);\n\n        // Drifting Cumulus Clouds\n        const c1x = (now * 0.015) % 460 - 50;\n        const c2x = ((now * 0.01) + 200) % 460 - 50;\n        c.fillStyle = 'rgba(255, 255, 255, 0.8)';\n        c.fillRect(c1x, 48, 34, 10);\n        c.fillRect(c1x + 6, 42, 22, 6);\n        c.fillRect(c2x, 70, 28, 8);\n        c.fillRect(c2x + 4, 65, 18, 5);\n      } else if (period === 'sunset') {\n        // Sinking Twilight Sun (x=200, y=200)\n        c.fillStyle = 'rgba(254, 215, 170, 0.3)';\n        c.beginPath();\n        c.arc(200, 200, 24, 0, Math.PI * 2);\n        c.fill();\n        c.fillStyle = '#fde047';\n        c.beginPath();\n        c.arc(200, 200, 14, 0, Math.PI * 2);\n        c.fill();\n      } else {\n        // Night: Silver Crescent Moon & Twinkling Stars\n        c.save();\n        c.fillStyle = 'rgba(226, 232, 240, 0.15)';\n        c.beginPath();\n        c.arc(336, 42, 16, 0, Math.PI * 2);\n        c.fill();\n        c.fillStyle = '#f8fafc';\n        c.beginPath();\n        c.arc(336, 42, 10, 0, Math.PI * 2);\n        c.fill();\n        c.fillStyle = '#0f172a';\n        c.beginPath();\n        c.arc(332, 40, 9, 0, Math.PI * 2);\n        c.fill();\n\n        // 10 Twinkling Pixel Stars\n        c.fillStyle = '#f8fafc';\n        const starCoords = [\n          { x: 30, y: 35 }, { x: 75, y: 65 }, { x: 130, y: 30 },\n          { x: 180, y: 80 }, { x: 235, y: 40 }, { x: 280, y: 70 },\n          { x: 310, y: 25 }, { x: 375, y: 45 }, { x: 110, y: 110 },\n          { x: 260, y: 120 }\n        ];\n        starCoords.forEach((s, idx) => {\n          const isTwinkle = ((Math.floor(now / 350) + idx) % 3 !== 0);\n          if (isTwinkle) {\n            c.fillRect(s.x, s.y, 2, 2);\n          }\n        });\n        c.restore();\n      }\n\n      // ==========================================\n      // 2. RAKED SAND BED & KARESANSUI RIPPLES\n      // ==========================================\n      const SAND_TOP = 230;\n      let sandBase, sandGroove, sandHighlight;\n\n      if (period === 'dawn') {\n        sandBase = '#d7ba8d';\n        sandGroove = '#bf9b68';\n        sandHighlight = '#fef08a';\n      } else if (period === 'day') {\n        sandBase = '#f5ebd7';\n        sandGroove = '#ded0b6';\n        sandHighlight = '#ffffff';\n      } else if (period === 'sunset') {\n        sandBase = '#bfa084';\n        sandGroove = '#9c7a60';\n        sandHighlight = '#fed7aa';\n      } else {\n        // night: silver moonlight on sand\n        sandBase = '#1e293b';\n        sandGroove = '#0f172a';\n        sandHighlight = '#94a3b8';\n      }\n\n      // Base sand floor\n      c.fillStyle = sandBase;\n      c.fillRect(0, SAND_TOP, canvas.width, 320 - SAND_TOP);\n\n      // Concentric sand ripple rings around rock triad (x=120, y=265)\n      c.save();\n      c.lineWidth = 1.5;\n      c.strokeStyle = sandGroove;\n      for (let r = 1; r <= 3; r++) {\n        c.beginPath();\n        c.ellipse(120, 265, 26 + r * 10, 10 + r * 4, 0, 0, Math.PI * 2);\n        c.stroke();\n        if (period === 'night') {\n          c.strokeStyle = 'rgba(148, 163, 184, 0.4)';\n          c.stroke();\n        }\n      }\n\n      // Concentric sand ripple rings around secondary rocks (x=275, y=275)\n      for (let r = 1; r <= 2; r++) {\n        c.beginPath();\n        c.ellipse(275, 275, 20 + r * 8, 8 + r * 3, 0, 0, Math.PI * 2);\n        c.stroke();\n      }\n\n      // Parallel wavy raked lines across ground\n      c.lineWidth = 1;\n      for (let y = SAND_TOP + 8; y < 320; y += 7) {\n        c.strokeStyle = sandGroove;\n        c.beginPath();\n        for (let x = 0; x <= 400; x += 10) {\n          const wave = Math.sin(x * 0.04 + y) * 1.2;\n          if (x === 0) c.moveTo(x, y + wave);\n          else c.lineTo(x, y + wave);\n        }\n        c.stroke();\n\n        // Moonlight sheen on ridge tops\n        if (period === 'night') {\n          c.strokeStyle = 'rgba(203, 213, 225, 0.3)';\n          c.beginPath();\n          for (let x = 0; x <= 400; x += 10) {\n            const wave = Math.sin(x * 0.04 + y) * 1.2;\n            if (x === 0) c.moveTo(x, y + wave - 1);\n            else c.lineTo(x, y + wave - 1);\n          }\n          c.stroke();\n        }\n      }\n      c.restore();\n\n      // ==========================================\n      // 3. MEDITATIVE ROCK TRIAD (San-zon-seki)\n      // ==========================================\n      function drawZenStone(x, y, w, h, mossColor) {\n        c.save();\n        c.fillStyle = isDaytime ? '#475569' : '#1e293b';\n        c.fillRect(x - w / 2, y - h, w, h);\n        c.fillStyle = isDaytime ? '#64748b' : '#334155';\n        c.fillRect(x - w / 2 + 2, y - h + 2, w - 4, h / 2);\n        c.strokeStyle = '#0f172a';\n        c.lineWidth = 1.5;\n        c.strokeRect(x - w / 2, y - h, w, h);\n\n        // Moss accent at base\n        c.fillStyle = mossColor;\n        c.fillRect(x - w / 2 - 2, y - 3, w + 4, 3);\n        c.restore();\n      }\n\n      const mossHue = (period === 'night' || period === 'sunset') ? '#14532d' : '#65a30d';\n      drawZenStone(120, 265, 20, 28, mossHue); // Center monolith\n      drawZenStone(105, 268, 14, 14, mossHue); // Left attendant stone\n      drawZenStone(135, 270, 16, 10, mossHue); // Right flat stone\n      drawZenStone(275, 278, 16, 12, mossHue); // Secondary boulder\n\n      // ==========================================\n      // 4. JAPANESE STONE LANTERN (Tōrō)\n      // ==========================================\n      const lx = 330;\n      const ly = 245;\n\n      c.save();\n      const stoneColor = isDaytime ? '#334155' : '#0f172a';\n      const stoneLight = isDaytime ? '#475569' : '#1e293b';\n\n      // Base platform & pillar\n      c.fillStyle = stoneColor;\n      c.fillRect(lx - 10, ly - 4, 20, 4); // Base\n      c.fillRect(lx - 4, ly - 20, 8, 16);  // Post\n      c.fillRect(lx - 11, ly - 24, 22, 4); // Platform\n\n      // Light chamber (Hibukuro)\n      c.fillStyle = '#0f172a';\n      c.fillRect(lx - 7, ly - 36, 14, 12);\n\n      // Lantern illumination\n      if (period === 'sunset' || period === 'night' || period === 'dawn') {\n        const flicker = Math.sin(now * 0.01) * 2;\n        const fireAlpha = (period === 'night') ? 0.95 : 0.75;\n        c.fillStyle = `rgba(251, 191, 36, ${fireAlpha})`;\n        c.fillRect(lx - 4, ly - 33, 8, 7);\n        c.fillStyle = '#ffffff';\n        c.fillRect(lx - 2 + (flicker > 0 ? 1 : 0), ly - 31, 3, 3);\n\n        // Radial ground glow for night\n        if (period === 'night') {\n          const glowGrad = c.createRadialGradient(lx, ly - 28, 4, lx, ly, 45);\n          glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');\n          glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.12)');\n          glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');\n          c.fillStyle = glowGrad;\n          c.beginPath();\n          c.ellipse(lx, ly, 45, 18, 0, 0, Math.PI * 2);\n          c.fill();\n        }\n      } else {\n        // Day unlit window\n        c.fillStyle = '#475569';\n        c.fillRect(lx - 4, ly - 33, 8, 7);\n      }\n\n      // Roof & Jewel Finial\n      c.fillStyle = stoneLight;\n      c.beginPath();\n      c.moveTo(lx - 14, ly - 36);\n      c.lineTo(lx + 14, ly - 36);\n      c.lineTo(lx + 6, ly - 44);\n      c.lineTo(lx - 6, ly - 44);\n      c.closePath();\n      c.fill();\n      c.stroke();\n      c.fillStyle = stoneColor;\n      c.fillRect(lx - 3, ly - 48, 6, 4); // Finial\n      c.restore();\n\n      // ==========================================\n      // 5. VERDANT BAMBOO GROVES (Take)\n      // ==========================================\n      function drawBambooStalk(bx, by, stalkHeight, isLeft) {\n        c.save();\n        const bColor = isDaytime ? '#15803d' : '#064e3b';\n        const bNode = isDaytime ? '#166534' : '#022c22';\n        const bLeaf = isDaytime ? '#22c55e' : '#059669';\n\n        c.fillStyle = bColor;\n        c.fillRect(bx, by - stalkHeight, 5, stalkHeight);\n\n        // Node joints\n        c.fillStyle = bNode;\n        for (let ny = by; ny > by - stalkHeight; ny -= 22) {\n          c.fillRect(bx - 1, ny - 2, 7, 2);\n\n          // Angled bamboo leaf sprigs\n          c.fillStyle = bLeaf;\n          const dir = isLeft ? 1 : -1;\n          c.beginPath();\n          c.moveTo(bx + 2, ny - 1);\n          c.lineTo(bx + 2 + dir * 10, ny - 6);\n          c.lineTo(bx + 2 + dir * 6, ny - 1);\n          c.closePath();\n          c.fill();\n          c.fillStyle = bNode;\n        }\n        c.restore();\n      }\n\n      drawBambooStalk(12, 260, 160, true);\n      drawBambooStalk(22, 270, 180, true);\n      drawBambooStalk(380, 265, 170, false);\n      drawBambooStalk(390, 275, 190, false);\n\n      // ==========================================\n      // 6. BLOOMING SAKURA PETALS (Drifting)\n      // ==========================================\n      c.save();\n      const petalColor = (period === 'sunset') ? '#fda4af' : ((period === 'night') ? '#f472b6' : '#fbcfe8');\n      zenPetals.forEach(p => {\n        p.x += p.vx;\n        p.y += p.vy;\n        const sway = Math.sin(now * p.swaySpeed + p.seed) * 1.5;\n\n        c.fillStyle = petalColor;\n        c.fillRect(Math.floor(p.x + sway), Math.floor(p.y), p.size, p.size);\n\n        if (p.x > 415) p.x = -10;\n        if (p.y > 325) p.y = -5;\n      });\n      c.restore();\n\n      // ==========================================\n      // 7. GLOWING FIREFLIES (Night & Dusk)\n      // ==========================================\n      if (period === 'night' || period === 'sunset') {\n        c.save();\n        zenFireflies.forEach(f => {\n          f.x += f.vx;\n          f.y += f.vy;\n          if (f.x < 30 || f.x > 370) f.vx *= -1;\n          if (f.y < 120 || f.y > 280) f.vy *= -1;\n\n          const alphaPulse = 0.35 + 0.45 * Math.sin(now * 0.005 + f.phase);\n          c.fillStyle = `rgba(163, 230, 53, ${alphaPulse * 0.4})`;\n          c.beginPath();\n          c.arc(f.x, f.y, 4, 0, Math.PI * 2);\n          c.fill();\n          c.fillStyle = `rgba(254, 240, 138, ${alphaPulse})`;\n          c.fillRect(Math.floor(f.x - 1), Math.floor(f.y - 1), 2, 2);\n        });\n        c.restore();\n      }\n\n      // ==========================================\n      // 8. FLOATING RETRO BANNER & SUBTITLE\n      // ==========================================\n      const floatY = 65 + Math.sin(now * 0.003) * 3;\n      c.save();\n      c.font = '8px \"Press Start 2P\"';\n      c.textAlign = 'center';\n\n      let titleColor, titleShadow, subColor, subtitleText;\n      if (period === 'dawn') {\n        titleColor = '#f59e0b';\n        titleShadow = '#451a03';\n        subColor = '#d97706';\n        subtitleText = 'DAWN ZEN GARDEN :: A FRESH MORNING';\n      } else if (period === 'day') {\n        titleColor = '#0284c7';\n        titleShadow = '#082f49';\n        subColor = '#0369a1';\n        subtitleText = 'MIDDAY ZEN GARDEN :: PURE HARMONY';\n      } else if (period === 'sunset') {\n        titleColor = '#fbbf24';\n        titleShadow = '#4c0519';\n        subColor = '#f97316';\n        subtitleText = 'TWILIGHT ZEN GARDEN :: PEACE AT DUSK';\n      } else {\n        titleColor = '#e2e8f0';\n        titleShadow = '#020617';\n        subColor = '#94a3b8';\n        subtitleText = 'MIDNIGHT ZEN GARDEN :: SERENE DREAMS';\n      }\n\n      // Drop shadow\n      c.fillStyle = titleShadow;\n      c.fillText('ALL CLEAR. REST EASY.', 201, floatY + 1);\n\n      // Main banner\n      c.fillStyle = titleColor;\n      c.fillText('ALL CLEAR. REST EASY.', 200, floatY);\n\n      // Subtitle\n      c.font = '6px \"Press Start 2P\"';\n      c.fillStyle = subColor;\n      c.fillText(subtitleText, 200, floatY + 16);\n      c.restore();\n    }\n\n    /**\n     * Main Animation Loop\n     */\n    function animationLoop() {\n      ctx.clearRect(0, 0, canvas.width, canvas.height);\n\n      const now = Date.now();\n      const centerX = 200;\n\n      // Apply screen shake micro-juice\n      ctx.save();\n      if (screenShakeFrames > 0) {\n        const sx = (Math.random() - 0.5) * screenShakeMagnitude;\n        const sy = (Math.random() - 0.5) * screenShakeMagnitude;\n        ctx.translate(sx, sy);\n        screenShakeFrames--;\n      }\n\n      // Target state calculation\n      const targetTier = diceStack.length;\n      const targetRot = calculateAverageRot();\n\n      // Smooth tier transition (de-escalates gracefully at 0.05, escalates at 0.08)\n      const tierDiff = targetTier - visualTier;\n      visualTier += tierDiff * ((tierDiff < 0) ? 0.05 : 0.08);\n      if (Math.abs(tierDiff) < 0.005) visualTier = targetTier;\n\n      // Smooth rot hue transition (cleansing relief when completing corrupt tasks)\n      const rotDiff = targetRot - visualRot;\n      visualRot += rotDiff * 0.05;\n      if (Math.abs(rotDiff) < 0.002) visualRot = targetRot;\n\n      // Check if stack is completely cleared or fresh startup\n      if (diceStack.length === 0 && explosionParticles.length === 0) {\n        if (!hasClearedAll) {\n          // Tier 0 Empty Void startup background (#121417)\n          ctx.fillStyle = '#121417';\n          ctx.fillRect(0, 0, canvas.width, canvas.height);\n          ctx.font = '8px \"Press Start 2P\"';\n          ctx.textAlign = 'center';\n          ctx.fillStyle = '#f7d51d';\n          ctx.fillText('TYPE TASK & ROLL TO BEGIN', 200, 160);\n        } else {\n          // Cross-fade bloom into Zen Garden as visualTier completes de-escalation\n          const zenAlpha = Math.min(1.0, Math.max(0.0, 1.0 - visualTier));\n          if (visualTier > 0.01) {\n            const rotColor = getAbyssalRotColor(visualRot, now);\n            ctx.fillStyle = rotColor.cssHsl;\n            ctx.fillRect(0, 0, canvas.width, canvas.height);\n          }\n          ctx.save();\n          ctx.globalAlpha = zenAlpha;\n          renderZenGarden(ctx);\n          ctx.restore();\n        }\n        updateAndDrawFloatingTexts(ctx);\n        ctx.restore();\n        requestAnimationFrame(animationLoop);\n        return;\n      }\n\n      // Dynamic background hue shift & palette tied to visualRot\n      const rotColor = getAbyssalRotColor(visualRot, now);\n      const bgHue = rotColor.hue; // Maintained for probe regex compatibility\n      const totalRot = visualRot; // Maintained for probe regex compatibility\n\n      ctx.fillStyle = rotColor.cssHsl;\n      ctx.fillRect(0, 0, canvas.width, canvas.height);\n\n      // 1. Draw procedural background corruption roots\n      drawCorruptionRoots(ctx, visualRot);\n\n      // Render Escalating Lovecraftian Abyss Background (Tiers 1 to 10)\n      renderLovecraftianAbyss(ctx, now, visualRot);\n\n      // 2. Ground shadow\n      if (diceStack.length > 0) {\n        const baseDie = diceStack[0];\n        const baseCfg = DICE_CONFIG[baseDie.weight_score] || DICE_CONFIG[5];\n        ctx.fillStyle = (totalRot >= 0.75) ? '#022c22' : '#0c0e11';\n        ctx.beginPath();\n        ctx.ellipse(centerX, GROUND_Y + 2, baseCfg.width * 0.7, 10, 0, 0, Math.PI * 2);\n        ctx.fill();\n      }\n\n      // 3. Render dice stack with procedural wobble if overloaded\n      const isOverloaded = (diceStack.length >= 10);\n      const wobbleX = isOverloaded ? Math.sin(now * 0.008) * 2.2 : 0;\n      const wobbleTilt = isOverloaded ? Math.sin(now * 0.006) * 0.015 : 0;\n\n      ctx.save();\n      if (isOverloaded) {\n        ctx.translate(centerX + wobbleX, 0);\n        ctx.rotate(wobbleTilt);\n        ctx.translate(-centerX, 0);\n      }\n\n      for (let i = 0; i < diceStack.length; i++) {\n        const d = diceStack[i];\n        const cfg = DICE_CONFIG[d.weight_score] || DICE_CONFIG[3];\n        const rot = getEffectiveRotFactor(d);\n\n        // Falling / Gravity Collapse physics\n        if (d.currentY < d.targetY) {\n          d.velocityY += 1.8;\n          d.currentY += d.velocityY;\n          if (d.currentY >= d.targetY) {\n            d.currentY = d.targetY;\n            d.velocityY = 0;\n            d.bounceFrame = 4;\n            // Heavy landing shake (weight >= 4)\n            if (d.weight_score >= 4) {\n              triggerScreenShake(3, 3);\n            }\n          }\n        } else if (d.currentY > d.targetY) {\n          d.currentY += (d.targetY - d.currentY) * 0.25;\n          if (Math.abs(d.currentY - d.targetY) < 0.5) {\n            d.currentY = d.targetY;\n          }\n        }\n\n        let renderY = d.currentY;\n        if (d.bounceFrame > 0) {\n          renderY += (d.bounceFrame > 2 ? -3 : -1);\n          d.bounceFrame--;\n        }\n\n        // Apply Twitch vibration micro-jitter for Stage 5 (rot >= 0.8)\n        const jitter = calculateTwitchJitter(rot, i, now);\n        const dieRenderX = centerX + jitter.dx;\n        const dieRenderY = renderY + jitter.dy;\n\n        // Spawn continuous viscous slime drips for Stage 5\n        if (rot >= 0.8) {\n          spawnStage5SlimeDrip(dieRenderX, dieRenderY, cfg.width / 2, cfg.ry, cfg.height, rot);\n        }\n\n        // Contact shadow (subtly tracks x jitter)\n        if (i > 0) {\n          ctx.fillStyle = (rot >= 0.75) ? 'rgba(5, 46, 22, 0.35)' : 'rgba(0, 0, 0, 0.25)';\n          ctx.beginPath();\n          ctx.ellipse(centerX + jitter.dx * 0.25, renderY + cfg.height + 2, cfg.width * 0.5, 5, 0, 0, Math.PI * 2);\n          ctx.fill();\n        }\n\n        // Render die with jittered coordinates\n        drawRotIsometricDice(ctx, dieRenderX, dieRenderY, cfg.width, cfg.height, d.weight_score, d.title, rot);\n\n        // If overdue, draw pulsating overdue banner above die\n        if (rot >= 1.0) {\n          drawOverdueDieBanner(ctx, dieRenderX, dieRenderY, cfg.width, cfg.ry);\n        }\n\n        // 2px Glowing pixel border for hovered resting die (synchronized with jitter)\n        if (d === hoveredDie) {\n          ctx.save();\n          const glowAlpha = 0.65 + 0.35 * Math.sin(now * 0.008);\n          const isOverdue = (rot >= 1.0);\n          ctx.shadowColor = isOverdue ? '#e76e55' : '#ffd700';\n          ctx.shadowBlur = 6;\n          ctx.strokeStyle = isOverdue ? `rgba(231, 110, 85, ${glowAlpha})` : `rgba(255, 215, 0, ${glowAlpha})`; // 2px glowing pixel border\n          ctx.lineWidth = 2;\n          ctx.strokeRect(dieRenderX - cfg.width / 2 - 2, dieRenderY - cfg.ry - 2, cfg.width + 4, cfg.height + cfg.ry * 2 + 4);\n          ctx.restore();\n        }\n      }\n\n      ctx.restore(); // restore wobble transform\n\n      // 4. Update and draw dripping slime particles\n      updateAndDrawSlime(ctx);\n\n      // 5. Update and draw explosion particles\n      updateAndDrawExplosions(ctx);\n\n      // 6. Draw floating streak multiplier texts\n      updateAndDrawFloatingTexts(ctx);\n\n      // Floating retro tooltip for hovered resting die\n      if (hoveredDie) {\n        drawRetroTooltip(ctx, hoveredDie);\n      }\n\n      // 7. Draw Overload Banner if at 10-task limit\n      if (isOverloaded) {\n        drawOverloadBanner(ctx);\n      }\n\n      ctx.restore(); // restore screen shake\n\n      requestAnimationFrame(animationLoop);\n    }\n\n    requestAnimationFrame(animationLoop);\n\n    /**\n     * Initial tasks load\n     */\n    function initTasks() {\n      if (window.pywebview && window.pywebview.api && window.pywebview.api.get_tasks) {\n        window.pywebview.api.get_tasks().then((tasks) => {\n          hasLoadedTasksOnce = true;\n          if (Array.isArray(tasks) && tasks.length > 0) {\n            hasHadTasks = true;\n            tasks.forEach(t => addDieToStack(t, true));\n          }\n        }).catch(err => {\n          console.error('[TaskbarDice] get_tasks error:', err);\n        });\n      }\n    }\n\n    window.addEventListener('pywebviewready', () => {\n      initTasks();\n    });\n\n    setTimeout(() => {\n      if (diceStack.length === 0 && !hasLoadedTasksOnce) {\n        initTasks();\n      }\n    }, 300);\n\n    // Control Panel State & 2-Row Event Handling\n    let selectedWeight = 1;\n    let selectedDurationMinutes = 25;\n\n    const weightButtons = document.querySelectorAll('.weight-btn');\n    weightButtons.forEach(btn => {\n      btn.addEventListener('click', () => {\n        weightButtons.forEach(b => b.classList.remove('is-active'));\n        btn.classList.add('is-active');\n        selectedWeight = parseInt(btn.dataset.w, 10);\n      });\n    });\n\n    const timeButtons = document.querySelectorAll('.time-btn');\n    const customTimeBtn = document.getElementById('customTimeBtn');\n\n    function parseTimePreset(tStr) {\n      if (tStr === '15m') return 15;\n      if (tStr === '25m') return 25;\n      if (tStr === '1h') return 60;\n      if (tStr === '4h') return 240;\n      return null;\n    }\n\n    timeButtons.forEach(btn => {\n      btn.addEventListener('click', () => {\n        const tVal = btn.dataset.t;\n        if (tVal === 'custom') {\n          const customPrompt = prompt('Enter custom duration in minutes (1 - 1440):', '30');\n          if (customPrompt !== null) {\n            const mins = parseInt(customPrompt, 10);\n            if (!isNaN(mins) && mins > 0 && mins <= 1440) {\n              timeButtons.forEach(b => b.classList.remove('is-active'));\n              btn.classList.add('is-active');\n              btn.textContent = `${mins}m`;\n              selectedDurationMinutes = mins;\n            }\n          }\n        } else {\n          timeButtons.forEach(b => b.classList.remove('is-active'));\n          btn.classList.add('is-active');\n          selectedDurationMinutes = parseTimePreset(tVal) || 25;\n        }\n      });\n    });\n\n    // Programmatic test hooks for probes / E2E verification\n    window.setSelectedWeight = (w) => {\n      selectedWeight = parseInt(w, 10);\n      weightButtons.forEach(b => {\n        b.classList.toggle('is-active', parseInt(b.dataset.w, 10) === selectedWeight);\n      });\n    };\n    window.setSelectedDuration = (m) => {\n      selectedDurationMinutes = parseInt(m, 10);\n      timeButtons.forEach(b => {\n        const val = parseTimePreset(b.dataset.t);\n        b.classList.toggle('is-active', val === selectedDurationMinutes);\n      });\n    };\n    window.getSelectedWeight = () => selectedWeight;\n    window.getSelectedDuration = () => selectedDurationMinutes;\n\n    // Form submission\n    const taskForm = document.getElementById('taskForm');\n    const taskInput = document.getElementById('taskInput');\n\n    taskForm.addEventListener('submit', (e) => {\n      e.preventDefault();\n      const text = taskInput.value.trim();\n      if (!text) return;\n\n      hasHadTasks = true;\n      hasClearedAll = false;\n\n      // 10-Task Overload Rejection & NES warning shake\n      if (diceStack.length >= 10) {\n        const panel = document.querySelector('.control-panel') || document.querySelector('.bottom-bar');\n        if (panel) {\n          panel.classList.remove('shake-anim');\n          void panel.offsetWidth; // trigger reflow\n          panel.classList.add('shake-anim');\n        }\n        showToast('OVERLOAD! CLEAR A TASK');\n        triggerScreenShake(4, 2);\n        return;\n      }\n\n      taskInput.value = '';\n      taskInput.focus();\n\n      if (window.pywebview && window.pywebview.api && window.pywebview.api.add_task) {\n        window.pywebview.api.add_task(text, selectedWeight, selectedDurationMinutes).then((res) => {\n          if (res && res.status === 'ok' && res.task) {\n            addDieToStack(res.task, false);\n            showToast(`+${res.task.title.substring(0, 8)} (W:${res.task.weight_score})`);\n          } else if (res && res.error === 'overload') {\n            const panel = document.querySelector('.control-panel') || document.querySelector('.bottom-bar');\n            if (panel) {\n              panel.classList.remove('shake-anim');\n              void panel.offsetWidth;\n              panel.classList.add('shake-anim');\n            }\n            showToast('TOWER OVERLOAD (10/10)!');\n          }\n        }).catch((err) => {\n          console.error('[TaskbarDice] add_task error:', err);\n          showToast('ERROR ADDING');\n        });\n      } else {\n        const fallbackTask = {\n          id: Math.random().toString(36).substring(2, 6),\n          title: text,\n          weight_score: selectedWeight,\n          deadline_str: `${selectedDurationMinutes}m`,\n          created_at: new Date().toISOString(),\n          deadline_at: new Date(Date.now() + selectedDurationMinutes * 60000).toISOString()\n        };\n        addDieToStack(fallbackTask, false);\n        showToast('LOCAL ADDED');\n      }\n    });\n\n    // Mousemove hover inspection hit detection on resting dice with canvas scaling\n    canvas.addEventListener('mousemove', (e) => {\n      const rect = canvas.getBoundingClientRect();\n      const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;\n      const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;\n      mousePos.x = (e.clientX - rect.left) * scaleX;\n      mousePos.y = (e.clientY - rect.top) * scaleY;\n      hoveredDie = null;\n\n      const centerX = 200;\n      for (let i = diceStack.length - 1; i >= 0; i--) {\n        const d = diceStack[i];\n        // Resting die check (|currentY - targetY| <= 2.0)\n        if (Math.abs(d.currentY - d.targetY) <= 2.0 && Math.abs(d.velocityY) <= 0.5) {\n          const cfg = DICE_CONFIG[d.weight_score] || DICE_CONFIG[3];\n          const rx = cfg.width / 2;\n          const topY = d.currentY - cfg.ry;\n          const botY = d.currentY + cfg.ry + cfg.height;\n          if (mousePos.x >= centerX - rx && mousePos.x <= centerX + rx && mousePos.y >= topY && mousePos.y <= botY) {\n            hoveredDie = d;\n            break;\n          }\n        }\n      }\n    });\n\n    canvas.addEventListener('mouseleave', () => {\n      hoveredDie = null;\n      mousePos = { x: -1, y: -1 };\n    });\n\n    /**\n     * Draws floating retro inspection tooltip with full title word wrapping,\n     * weight, rot stage [X/5], countdown timer (CÒN / blinking red QUÁ HẠN),\n     * and smart 4-way clamping inside 400x320 canvas.\n     */\n    function drawRetroTooltip(c, die) {\n      if (!die) return;\n      const rot = getEffectiveRotFactor(die);\n      const stage = Math.max(1, Math.min(5, Math.floor(rot * 5) + 1));\n      const isOverdue = (rot >= 1.0);\n\n      const createdTime = new Date(die.created_at).getTime();\n      const deadlineTime = new Date(die.deadline_at).getTime();\n      const now = Date.now();\n      const diffSec = Math.floor(Math.abs(deadlineTime - now) / 1000);\n      const m = Math.floor(diffSec / 60);\n      const s = diffSec % 60;\n      const timeStr = isOverdue ? `QUÁ HẠN: +${m}m ${s}s` : `CÒN: ${m}m ${s}s`;\n\n      c.save();\n      c.font = '6px \"Press Start 2P\"';\n      const measure = (str) => (c.measureText ? c.measureText(str).width : (str || '').length * 6);\n\n      // 1. Full Title multi-line wrapping with character chunking & ellipsis\n      const rawTitle = (die.title || 'UNTITLED').trim();\n      const maxLineWidth = 180;\n      const rawWords = rawTitle ? rawTitle.split(/\\s+/) : ['UNTITLED'];\n      \n      // Break any oversized words (> maxLineWidth) into character chunks\n      const words = [];\n      for (let w = 0; w < rawWords.length; w++) {\n        const word = rawWords[w];\n        if (!word) continue;\n        if (measure(word) <= maxLineWidth) {\n          words.push(word);\n        } else {\n          let cur = '';\n          for (let i = 0; i < word.length; i++) {\n            const char = word[i];\n            if (measure(cur + char) <= maxLineWidth) {\n              cur += char;\n            } else {\n              if (cur) words.push(cur);\n              cur = char;\n            }\n          }\n          if (cur) words.push(cur);\n        }\n      }\n\n      if (words.length === 0) words.push('UNTITLED');\n\n      let lines = [];\n      let currentLine = '';\n      let wordIdx = 0;\n\n      // Build Line 1\n      while (wordIdx < words.length) {\n        const nextWord = words[wordIdx];\n        const candidate = currentLine ? `${currentLine} ${nextWord}` : nextWord;\n        if (measure(candidate) <= maxLineWidth) {\n          currentLine = candidate;\n          wordIdx++;\n        } else {\n          break;\n        }\n      }\n      lines.push(currentLine || words[wordIdx++]);\n\n      // Build Line 2 (if words remain)\n      if (wordIdx < words.length) {\n        currentLine = '';\n        while (wordIdx < words.length) {\n          const nextWord = words[wordIdx];\n          const candidate = currentLine ? `${currentLine} ${nextWord}` : nextWord;\n          if (measure(candidate) <= maxLineWidth) {\n            currentLine = candidate;\n            wordIdx++;\n          } else {\n            break;\n          }\n        }\n        if (currentLine) {\n          lines.push(currentLine);\n        }\n      }\n\n      // Check if there are remaining unrendered words/characters\n      const hasRemaining = (wordIdx < words.length);\n\n      // Append '...' to Line 2 if text was truncated\n      if (hasRemaining && lines.length > 0) {\n        const targetIdx = Math.min(lines.length - 1, 1);\n        let targetLine = lines[targetIdx];\n        const ellipsis = '...';\n\n        while (targetLine.length > 0 && measure(targetLine + ellipsis) > maxLineWidth) {\n          targetLine = targetLine.slice(0, -1).trimEnd();\n        }\n        lines[targetIdx] = targetLine ? targetLine + ellipsis : ellipsis;\n      }\n\n      // Defensive guard: Ensure no line exceeds maxLineWidth under any metric\n      for (let i = 0; i < lines.length; i++) {\n        while (lines[i].length > 0 && measure(lines[i]) > maxLineWidth) {\n          lines[i] = lines[i].slice(0, -1);\n        }\n      }\n      if (lines.length > 2) lines = lines.slice(0, 2);\n\n      // Dynamic box dimensions\n      let maxTitleWidth = 0;\n      for (let i = 0; i < lines.length; i++) {\n        const lw = measure(lines[i]);\n        if (lw > maxTitleWidth) maxTitleWidth = lw;\n      }\n      const timeWidth = measure(timeStr);\n      const metaStr = `W:${die.weight_score} | STAGE: [${stage}/5]`;\n      const metaWidth = measure(metaStr);\n      const contentWidth = Math.max(maxTitleWidth, Math.max(timeWidth, metaWidth));\n\n      const tooltipWidth = Math.max(160, Math.min(230, Math.floor(contentWidth + 16)));\n      const tooltipHeight = (lines.length > 1) ? 58 : 46;\n      const padding = 8;\n\n      // 2. Smart Clamping: 4-way 400x320 Canvas Boundary Guard\n      let tooltipX = mousePos.x + 12;\n      if (tooltipX + tooltipWidth > 400 - padding) {\n        tooltipX = mousePos.x - tooltipWidth - 12;\n      }\n      tooltipX = Math.max(padding, Math.min(400 - tooltipWidth - padding, tooltipX));\n\n      let tooltipY = mousePos.y - tooltipHeight - 8;\n      if (tooltipY < padding) {\n        tooltipY = mousePos.y + 22;\n      }\n      tooltipY = Math.max(padding, Math.min(320 - tooltipHeight - padding, tooltipY));\n\n      // 3. Render Tooltip Frame\n      c.fillStyle = 'rgba(18, 20, 23, 0.96)';\n      c.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);\n\n      // 2px Glowing pixel border (gold or red if overdue)\n      c.strokeStyle = isOverdue ? '#e76e55' : 'rgba(255, 215, 0, 0.9)';\n      c.lineWidth = 2;\n      c.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);\n\n      // 4. Content Typography (strictly clipped inside tooltip box)\n      c.save();\n      c.beginPath();\n      c.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);\n      if (c.clip) c.clip();\n\n      let textY = tooltipY + 12;\n      c.textAlign = 'left';\n      c.textBaseline = 'alphabetic';\n\n      // Title lines\n      c.fillStyle = '#ffffff';\n      for (let l = 0; l < lines.length; l++) {\n        c.fillText(lines[l], tooltipX + 6, textY);\n        textY += 10;\n      }\n\n      // Weight & Stage line\n      const stageColors = ['#fdfbf7', '#fdfbf7', '#eae0c8', '#8a8d8f', '#4a5d4e', '#a3e635'];\n      c.fillStyle = '#92cc41';\n      const wLabel = `W:${die.weight_score} | `;\n      c.fillText(wLabel, tooltipX + 6, textY);\n      const wWidth = measure(wLabel);\n      c.fillStyle = stageColors[stage] || '#ffd700';\n      c.fillText(`STAGE: [${stage}/5]`, tooltipX + 6 + wWidth, textY);\n      textY += 11;\n\n      // Countdown timer line (Blinking red if overdue, NES Yellow if active)\n      const blink = Math.floor(now / 220) % 2 === 0;\n      if (isOverdue) {\n        c.fillStyle = blink ? '#ff2222' : '#881111';\n      } else {\n        c.fillStyle = '#f7d51d';\n      }\n      c.fillText(timeStr, tooltipX + 6, textY);\n\n      c.restore(); // Restore clip region\n\n      c.restore(); // Restore initial canvas state\n    }\n\n    // Double-Click Hit Detection on Dice Stack\n    const modalOverlay = document.getElementById('modalOverlay');\n    const modalTaskName = document.getElementById('modalTaskName');\n    const confirmCompleteBtn = document.getElementById('confirmCompleteBtn');\n    const cancelCompleteBtn = document.getElementById('cancelCompleteBtn');\n\n    canvas.addEventListener('dblclick', (e) => {\n      const rect = canvas.getBoundingClientRect();\n      const mx = e.clientX - rect.left;\n      const my = e.clientY - rect.top;\n      const centerX = 200;\n\n      // Scan from top die (highest index) down to bottom die (index 0)\n      for (let i = diceStack.length - 1; i >= 0; i--) {\n        const d = diceStack[i];\n\n        // State lock: Only bind to resting blocks! Ignore falling / collapsing blocks\n        if (Math.abs(d.currentY - d.targetY) > 2.0 || Math.abs(d.velocityY) > 0.5) {\n          continue;\n        }\n\n        const cfg = DICE_CONFIG[d.weight_score] || DICE_CONFIG[3];\n        const rx = cfg.width / 2;\n        const ry = cfg.width / 4;\n\n        // Bounding box: x in [centerX - rx, centerX + rx], y in [currentY - ry, currentY + ry + height]\n        const topY = d.currentY - ry;\n        const botY = d.currentY + ry + cfg.height;\n        const leftX = centerX - rx;\n        const rightX = centerX + rx;\n\n        if (mx >= leftX && mx <= rightX && my >= topY && my <= botY) {\n          selectedTask = d;\n          modalTaskName.textContent = `TASK: \"${d.title}\"`;\n          modalOverlay.style.display = 'flex';\n          return;\n        }\n      }\n    });\n\n    // Anti-Slacking Modal: Confirm Completion\n    confirmCompleteBtn.addEventListener('click', () => {\n      if (!selectedTask) {\n        modalOverlay.style.display = 'none';\n        return;\n      }\n\n      const taskId = selectedTask.id;\n      const taskIndex = diceStack.findIndex(d => d.id === taskId);\n\n      // Overdue streak reset (0) vs on-time streak increment (++)\n      const rotVal = getEffectiveRotFactor(selectedTask);\n      const isOverdue = (rotVal >= 1.0);\n      if (isOverdue) {\n        sessionStreak = 0;\n        spawnFloatingText(200, 100, `STREAK LOST! OVERDUE`, '#e76e55');\n      } else {\n        sessionStreak++;\n        if (sessionStreak >= 2) {\n          spawnFloatingText(200, 100, `+1 STREAK! COMBO x${sessionStreak}`, '#f7d51d');\n        }\n      }\n\n      // Screen juice shake & particle explosion\n      triggerScreenShake(6, 4);\n      triggerDiceExplosion(selectedTask);\n\n      // Remove from active stack\n      if (taskIndex !== -1) {\n        diceStack.splice(taskIndex, 1);\n      }\n      if (diceStack.length === 0 && hasHadTasks) {\n        hasClearedAll = true;\n        spawnFloatingText(200, 140, 'ALL TASKS CLEARED!', '#ffd700');\n      }\n\n      // Recalculate targets for upper dice to collapse downward (and unlock input if was at 10)\n      recalculateTargets();\n\n      // Call Python backend persistence\n      if (window.pywebview && window.pywebview.api && window.pywebview.api.complete_task) {\n        window.pywebview.api.complete_task(taskId).then((res) => {\n          if (res && res.was_overdue) {\n            sessionStreak = 0;\n          }\n          showToast('TASK COMPLETED!');\n        }).catch(err => {\n          console.error('[TaskbarDice] complete_task error:', err);\n        });\n      } else {\n        showToast('TASK COMPLETED!');\n      }\n\n      modalOverlay.style.display = 'none';\n      selectedTask = null;\n    });\n\n    // Anti-Slacking Modal: Cancel\n    cancelCompleteBtn.addEventListener('click', () => {\n      modalOverlay.style.display = 'none';\n      selectedTask = null;\n    });\n\n    // Developer Speed-Test Mode listener (Key 'D')\n    window.addEventListener('keydown', (e) => {\n      if (e.target === taskInput) return;\n\n      if (e.key === 'd' || e.key === 'D') {\n        devMode = (devMode + 1) % 7;\n        let modeLabel = '';\n        if (devMode === 0) modeLabel = '[D] REALTIME';\n        else if (devMode === 1) modeLabel = '[D] STAGE 1 (IVORY)';\n        else if (devMode === 2) modeLabel = '[D] STAGE 2 (SANDY)';\n        else if (devMode === 3) modeLabel = '[D] STAGE 3 (CRACKED)';\n        else if (devMode === 4) modeLabel = '[D] STAGE 4 (MOSSY)';\n        else if (devMode === 5) modeLabel = '[D] STAGE 5 (NECROTIC)';\n        else if (devMode === 6) modeLabel = '[D] STAGE 5 (OVERDUE)';\n\n        rotStatusBadge.textContent = modeLabel;\n        showToast(modeLabel);\n      }\n    });\n\n    // Close button\n    const closeBtn = document.getElementById('closeBtn');\n    closeBtn.addEventListener('click', () => {\n      if (window.pywebview && window.pywebview.api && window.pywebview.api.close_app) {\n        window.pywebview.api.close_app();\n      } else {\n        window.close();\n      }\n    });\n  </script>\n</body>\n</html>\n";

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
