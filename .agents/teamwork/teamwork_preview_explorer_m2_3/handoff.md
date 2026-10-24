# Handoff Report: Zen Garden Mode & Dynamic Day/Night Lighting Implementation Design

## 1. Observation

### 1.1 Existing Architecture & File State
- **File**: `static/index.html` (Total 1602 lines).
- **Current Zen Garden Routine**: Lines 952–1107 (`function renderZenGarden(c)`).
  - Only checks a binary condition: `const isDaytime = (currentHour >= 6 && currentHour < 18);` (line 955).
  - Lacks the four required time phases: Dawn/Morning (6:00–10:00), Day (10:00–17:00), Sunset/Dusk (17:00–20:00), and Night (20:00–6:00).
  - Lacks traditional Zen Garden (Karesansui) elements: raked sand wave ripples, concentric sand rings around rock arrangements (San-zon-seki triad), pagoda stone lantern (Tōrō) with flickering amber fire window, verdant bamboo stalks (Take), drifting sakura petals, floating bioluminescent fireflies, and silver moonlight sheen on sand ridges.
- **Trigger Condition Flaw**:
  - In `initTasks()` (lines 1268–1279):
    ```javascript
    window.pywebview.api.get_tasks().then((tasks) => {
      hasLoadedTasksOnce = true;
      if (Array.isArray(tasks) && tasks.length > 0) {
        tasks.forEach(t => addDieToStack(t, true));
      }
    })
    ```
  - In `animationLoop()` (lines 1128–1144):
    ```javascript
    if (diceStack.length === 0 && explosionParticles.length === 0) {
      if (!hasLoadedTasksOnce) {
        // Tier 0 Empty Void startup background (#121417)
        ...
      } else {
        renderZenGarden(ctx);
      }
    }
    ```
  - **Direct Defect**: On fresh startup with 0 tasks, `get_tasks()` returns `[]`, setting `hasLoadedTasksOnce = true`. Consequently, `animationLoop()` immediately switches to `renderZenGarden()` on startup, completely bypassing Tier 0 Empty Void (`#121417` with "TYPE TASK & ROLL TO BEGIN").
- **Existing Test Coverage**:
  - `tests/test_e2e_probe.py` (lines 266–281 & lines 743–768, `test_ac6_zero_task_clear_triggers_zen_garden`):
    - Asserts presence of `renderZenGarden`, `getHours()`, `'ALL CLEAR. REST EASY.'`, and `diceStack.length === 0`.
    - All existing assertions pass, but the visual fidelity, 4-phase day/night lighting, and trigger state separation require full implementation.

---

## 2. Logic Chain

### 2.1 State Machine Disambiguation (Tier 0 vs. Zen Garden)
1. **Tier 0 Empty Void**:
   - Represents the cold, empty initial startup state before any tasks have been registered.
   - Condition: `diceStack.length === 0 && !hasHadTasks && !hasClearedAll`.
   - Behavior: Render `#121417` void with centered prompt `'TYPE TASK & ROLL TO BEGIN'`.
2. **Active Task Tower (Tiers 1 to 10)**:
   - When a task is added (via initial storage `tasks.length > 0` or user submission via `taskForm`), flag `hasHadTasks = true`, `hasClearedAll = false`, and `zenTransitionAlpha = 0.0`.
   - Stack escalates through Lovecraftian abyss tiers 1–10.
3. **Zen Garden Victory Mode**:
   - When the user clears the last remaining active task (either by completing it via the anti-slacking modal or explicit clear hook):
     - `diceStack.length === 0 && hasHadTasks` occurs.
     - Set `hasClearedAll = true`.
     - Smoothly ramp `zenTransitionAlpha = Math.min(1.0, zenTransitionAlpha + 0.03)` across ~35 frames to cross-fade into Zen Garden mode.

### 2.2 4-Phase Dynamic Day/Night Lighting Model
The local time of day (`new Date().getHours()`, or test hook `window.zenSimulatedHour`) maps into four distinct lighting regimes:

| Period | Time Window | Sky Atmosphere | Celestial & Rays | Vegetation & Props | Sand & Lighting |
|---|---|---|---|---|---|
| **Dawn / Morning** | `6:00 - 10:00` | Soft golden amber sunrise (`#ea580c` -> `#fb923c` -> `#fed7aa`) | Low golden sun disc at x=90, y=130 with warm halo and translucent angled morning sunbeams (`rgba(254, 240, 138, 0.08)`) | Dewy verdant bamboo (`#65a30d`), floating sakura petals | Warm golden raked sand (`#d7ba8d`) with soft amber ridge grooves (`#bf9b68`) |
| **Day** | `10:00 - 17:00` | Serene vibrant azure daylight (`#0284c7` -> `#38bdf8` -> `#bae6fd`) | Radiant high sun at x=330, y=42 with pixel rays and drifting cumulus clouds | Emerald bamboo groves (`#15803d`, `#22c55e`), drifting sakura blossoms | Pristine beige raked sand (`#f5ebd7`) with defined shadow grooves (`#ded0b6`) |
| **Sunset / Dusk** | `17:00 - 20:00` | Warm magenta / crimson twilight (`#4a044e` -> `#9d174d` -> `#ea580c` -> `#fde047`) | Setting sun dipping low on horizon; lengthening dramatic shadows | Silhouetted bamboo (`#1e1b4b`), twilight-tinted cherry petals | Dusk sand (`#bfa084`) with purple-orange tinted raked grooves; stone lantern amber window glowing |
| **Night** | `20:00 - 6:00` | Deep midnight indigo starry sky (`#020617` -> `#0f172a` -> `#1e1b4b`) | Silver crescent moon at x=335, y=42; 10 twinkling pixel stars; bioluminescent glowing fireflies | Deep slate bamboo silhouettes; floating fireflies with sine paths & chartreuse halos | Cool silvery-slate raked sand (`#1e293b`) with pale silver-blue specular highlights (`#94a3b8`) reflecting moonlight; stone lantern casting warm radial ground glow |

### 2.3 Authentic Karesansui Geometry & Retro Visual Assets
1. **Raked Sand Ridges (Sand Waves)**:
   - Ground plane occupies `y = 230` to `320` (90px serene bed).
   - Horizontal parallel wavy lines spaced every 7px with sinusoidal perturbation `sin(x * 0.04) * 1.5`.
   - Concentric elliptical ripple rings encircling rock islands (3 rings around rock triad at x=120; 2 rings around rock pair at x=275).
2. **Three-Stone Triad (San-zon-seki)**:
   - Meditative rock triad at x=120, y=260: center monolith stone (22x30px), flanking boulders (16x16px and 18x10px), accented with green moss cuffs at base.
3. **Stone Pagoda Lantern (Kasuga-dōrō)**:
   - Anchored at x=325, y=210: base, column, flared platform, lattice light chamber, pagoda roof, and jewel finial.
   - Light chamber reacts to time of day: unlit stone in Day, soft amber in Dawn, warm flickering beacon in Sunset, and luminous lantern with radial light gradient in Night.
4. **Interactive Particles**:
   - Sakura petals pool (18 drifting petals swaying with `Math.sin(now * swaySpeed)`).
   - Fireflies pool (10 glowing fireflies bobbing and pulsating alpha during Night/Dusk).
5. **Retro Banner & Responsive Typography**:
   - Positioned at y=65:
     - Header: `'ALL CLEAR. REST EASY.'` (Preserves exact regex match for AC6).
     - Subtitle:
       - Dawn: `'DAWN ZEN GARDEN :: A FRESH MORNING'`
       - Day: `'MIDDAY ZEN GARDEN :: PURE HARMONY'`
       - Sunset: `'TWILIGHT ZEN GARDEN :: PEACE AT DUSK'`
       - Night: `'MIDNIGHT ZEN GARDEN :: SERENE DREAMS'`

---

## 3. Proposed Code Specification

### 3.1 State Tracking & Transitions (`static/index.html`)

```javascript
// State variables for Zen Garden & Startup Tier 0 disambiguation
let hasHadTasks = false;
let hasClearedAll = false;
let zenTransitionAlpha = 0.0;
window.zenSimulatedHour = null; // Test/debug override hook

// In initTasks():
function initTasks() {
  if (window.pywebview && window.pywebview.api && window.pywebview.api.get_tasks) {
    window.pywebview.api.get_tasks().then((tasks) => {
      hasLoadedTasksOnce = true;
      if (Array.isArray(tasks) && tasks.length > 0) {
        hasHadTasks = true;
        tasks.forEach(t => addDieToStack(t, true));
      }
    }).catch(err => {
      console.error('[TaskbarDice] get_tasks error:', err);
    });
  }
}

// In taskForm submission handler:
taskForm.addEventListener('submit', (e) => {
  // ... (after validation)
  hasHadTasks = true;
  hasClearedAll = false;
  zenTransitionAlpha = 0.0;
  // ...
});

// In confirmCompleteBtn click handler:
confirmCompleteBtn.addEventListener('click', () => {
  // ... (after removing task from diceStack)
  if (diceStack.length === 0 && hasHadTasks) {
    hasClearedAll = true;
    spawnFloatingText(200, 140, 'ALL TASKS CLEARED!', '#ffd700');
  }
});
```

### 3.2 Time Period Calculation & Test Hooks

```javascript
/**
 * Resolves current time period into 4 discrete phases based on local hour
 */
function getZenTimePeriod() {
  const hour = (window.zenSimulatedHour !== null && window.zenSimulatedHour !== undefined)
    ? window.zenSimulatedHour
    : new Date().getHours();

  if (hour >= 6 && hour < 10) return 'dawn';     // 6:00 - 10:00
  if (hour >= 10 && hour < 17) return 'day';     // 10:00 - 17:00
  if (hour >= 17 && hour < 20) return 'sunset';  // 17:00 - 20:00
  return 'night';                                // 20:00 - 6:00
}

// Public test hooks for automated E2E probe validation
window.setZenGardenTime = function(hour) {
  window.zenSimulatedHour = (hour !== null && hour !== undefined) ? parseInt(hour, 10) : null;
};
window.getZenGardenPeriod = function() {
  return getZenTimePeriod();
};
window.triggerZenGarden = function() {
  diceStack = [];
  hasHadTasks = true;
  hasClearedAll = true;
  zenTransitionAlpha = 1.0;
};
window.isZenGardenActive = function() {
  return diceStack.length === 0 && (hasHadTasks || hasClearedAll);
};
```

### 3.3 Complete `renderZenGarden(c)` Implementation

```javascript
// Persistent particle systems for Zen Garden
const zenPetals = [];
for (let i = 0; i < 18; i++) {
  zenPetals.push({
    x: Math.random() * 400,
    y: Math.random() * 320,
    vx: 0.3 + Math.random() * 0.5,
    vy: 0.4 + Math.random() * 0.6,
    size: Math.random() > 0.5 ? 3 : 2,
    swaySpeed: 0.002 + Math.random() * 0.003,
    seed: Math.random() * 100
  });
}

const zenFireflies = [];
for (let i = 0; i < 10; i++) {
  zenFireflies.push({
    x: 40 + Math.random() * 320,
    y: 120 + Math.random() * 130,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    phase: Math.random() * Math.PI * 2
  });
}

/**
 * Renders the Peaceful Pixel Zen Garden Victory State with Dynamic 4-Period Day/Night Lighting
 */
function renderZenGarden(c) {
  const now = Date.now();
  const period = getZenTimePeriod();
  const currentHour = (window.zenSimulatedHour !== null && window.zenSimulatedHour !== undefined)
    ? window.zenSimulatedHour
    : new Date().getHours();
  const isDaytime = (period === 'dawn' || period === 'day');

  // ==========================================
  // 1. SKY GRADIENT & CELESTIAL BODIES
  // ==========================================
  const skyGrad = c.createLinearGradient(0, 0, 0, 240);
  if (period === 'dawn') {
    skyGrad.addColorStop(0, '#ea580c');
    skyGrad.addColorStop(0.4, '#fb923c');
    skyGrad.addColorStop(1, '#fed7aa');
  } else if (period === 'day') {
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.5, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
  } else if (period === 'sunset') {
    skyGrad.addColorStop(0, '#4a044e');
    skyGrad.addColorStop(0.35, '#9d174d');
    skyGrad.addColorStop(0.7, '#ea580c');
    skyGrad.addColorStop(1, '#fde047');
  } else {
    // night
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.5, '#0f172a');
    skyGrad.addColorStop(1, '#1e1b4b');
  }
  c.fillStyle = skyGrad;
  c.fillRect(0, 0, canvas.width, 240);

  // Celestial details per period
  if (period === 'dawn') {
    // Low Golden Morning Sun (x=90, y=125)
    c.fillStyle = 'rgba(254, 240, 138, 0.25)';
    c.beginPath();
    c.arc(90, 125, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fef08a';
    c.beginPath();
    c.arc(90, 125, 12, 0, Math.PI * 2);
    c.fill();

    // Gentle Morning Sunbeams (angled translucent polygons)
    c.save();
    c.fillStyle = 'rgba(254, 240, 138, 0.08)';
    const beamPulse = 0.07 + Math.sin(now * 0.002) * 0.02;
    c.fillStyle = `rgba(254, 240, 138, ${beamPulse})`;
    c.beginPath();
    c.moveTo(90, 125);
    c.lineTo(160, 260);
    c.lineTo(220, 260);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(90, 125);
    c.lineTo(260, 270);
    c.lineTo(340, 270);
    c.closePath();
    c.fill();
    c.restore();
  } else if (period === 'day') {
    // Radiant High Sun (x=330, y=42)
    c.fillStyle = '#fde047';
    c.fillRect(324, 36, 14, 14);
    c.fillStyle = '#facc15';
    c.fillRect(320, 41, 4, 4);
    c.fillRect(338, 41, 4, 4);
    c.fillRect(329, 32, 4, 4);
    c.fillRect(329, 50, 4, 4);

    // Drifting Cumulus Clouds
    const c1x = (now * 0.015) % 460 - 50;
    const c2x = ((now * 0.01) + 200) % 460 - 50;
    c.fillStyle = 'rgba(255, 255, 255, 0.8)';
    c.fillRect(c1x, 48, 34, 10);
    c.fillRect(c1x + 6, 42, 22, 6);
    c.fillRect(c2x, 70, 28, 8);
    c.fillRect(c2x + 4, 65, 18, 5);
  } else if (period === 'sunset') {
    // Sinking Twilight Sun (x=200, y=200)
    c.fillStyle = 'rgba(254, 215, 170, 0.3)';
    c.beginPath();
    c.arc(200, 200, 24, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fde047';
    c.beginPath();
    c.arc(200, 200, 14, 0, Math.PI * 2);
    c.fill();
  } else {
    // Night: Silver Crescent Moon & Twinkling Stars
    c.save();
    c.fillStyle = 'rgba(226, 232, 240, 0.15)';
    c.beginPath();
    c.arc(336, 42, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f8fafc';
    c.beginPath();
    c.arc(336, 42, 10, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.arc(332, 40, 9, 0, Math.PI * 2);
    c.fill();

    // 10 Twinkling Pixel Stars
    c.fillStyle = '#f8fafc';
    const starCoords = [
      { x: 30, y: 35 }, { x: 75, y: 65 }, { x: 130, y: 30 },
      { x: 180, y: 80 }, { x: 235, y: 40 }, { x: 280, y: 70 },
      { x: 310, y: 25 }, { x: 375, y: 45 }, { x: 110, y: 110 },
      { x: 260, y: 120 }
    ];
    starCoords.forEach((s, idx) => {
      const isTwinkle = ((Math.floor(now / 350) + idx) % 3 !== 0);
      if (isTwinkle) {
        c.fillRect(s.x, s.y, 2, 2);
      }
    });
    c.restore();
  }

  // ==========================================
  // 2. RAKED SAND BED & KARESANSUI RIPPLES
  // ==========================================
  const SAND_TOP = 230;
  let sandBase, sandGroove, sandHighlight;

  if (period === 'dawn') {
    sandBase = '#d7ba8d';
    sandGroove = '#bf9b68';
    sandHighlight = '#fef08a';
  } else if (period === 'day') {
    sandBase = '#f5ebd7';
    sandGroove = '#ded0b6';
    sandHighlight = '#ffffff';
  } else if (period === 'sunset') {
    sandBase = '#bfa084';
    sandGroove = '#9c7a60';
    sandHighlight = '#fed7aa';
  } else {
    // night: silver moonlight on sand
    sandBase = '#1e293b';
    sandGroove = '#0f172a';
    sandHighlight = '#94a3b8';
  }

  // Base sand floor
  c.fillStyle = sandBase;
  c.fillRect(0, SAND_TOP, canvas.width, 320 - SAND_TOP);

  // Concentric sand ripple rings around rock triad (x=120, y=265)
  c.save();
  c.lineWidth = 1.5;
  c.strokeStyle = sandGroove;
  for (let r = 1; r <= 3; r++) {
    c.beginPath();
    c.ellipse(120, 265, 26 + r * 10, 10 + r * 4, 0, 0, Math.PI * 2);
    c.stroke();
    if (period === 'night') {
      c.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      c.stroke();
    }
  }

  // Concentric sand ripple rings around secondary rocks (x=275, y=275)
  for (let r = 1; r <= 2; r++) {
    c.beginPath();
    c.ellipse(275, 275, 20 + r * 8, 8 + r * 3, 0, 0, Math.PI * 2);
    c.stroke();
  }

  // Parallel wavy raked lines across ground
  c.lineWidth = 1;
  for (let y = SAND_TOP + 8; y < 320; y += 7) {
    c.strokeStyle = sandGroove;
    c.beginPath();
    for (let x = 0; x <= 400; x += 10) {
      const wave = Math.sin(x * 0.04 + y) * 1.2;
      if (x === 0) c.moveTo(x, y + wave);
      else c.lineTo(x, y + wave);
    }
    c.stroke();

    // Moonlight sheen on ridge tops
    if (period === 'night') {
      c.strokeStyle = 'rgba(203, 213, 225, 0.3)';
      c.beginPath();
      for (let x = 0; x <= 400; x += 10) {
        const wave = Math.sin(x * 0.04 + y) * 1.2;
        if (x === 0) c.moveTo(x, y + wave - 1);
        else c.lineTo(x, y + wave - 1);
      }
      c.stroke();
    }
  }
  c.restore();

  // ==========================================
  // 3. MEDITATIVE ROCK TRIAD (San-zon-seki)
  // ==========================================
  function drawZenStone(x, y, w, h, mossColor) {
    c.save();
    c.fillStyle = isDaytime ? '#475569' : '#1e293b';
    c.fillRect(x - w / 2, y - h, w, h);
    c.fillStyle = isDaytime ? '#64748b' : '#334155';
    c.fillRect(x - w / 2 + 2, y - h + 2, w - 4, h / 2);
    c.strokeStyle = '#0f172a';
    c.lineWidth = 1.5;
    c.strokeRect(x - w / 2, y - h, w, h);

    // Moss accent at base
    c.fillStyle = mossColor;
    c.fillRect(x - w / 2 - 2, y - 3, w + 4, 3);
    c.restore();
  }

  const mossHue = (period === 'night' || period === 'sunset') ? '#14532d' : '#65a30d';
  drawZenStone(120, 265, 20, 28, mossHue); // Center monolith
  drawZenStone(105, 268, 14, 14, mossHue); // Left attendant stone
  drawZenStone(135, 270, 16, 10, mossHue); // Right flat stone
  drawZenStone(275, 278, 16, 12, mossHue); // Secondary boulder

  // ==========================================
  // 4. JAPANESE STONE LANTERN (Tōrō)
  // ==========================================
  const lx = 330;
  const ly = 245;

  c.save();
  const stoneColor = isDaytime ? '#334155' : '#0f172a';
  const stoneLight = isDaytime ? '#475569' : '#1e293b';

  // Base platform & pillar
  c.fillStyle = stoneColor;
  c.fillRect(lx - 10, ly - 4, 20, 4); // Base
  c.fillRect(lx - 4, ly - 20, 8, 16);  // Post
  c.fillRect(lx - 11, ly - 24, 22, 4); // Platform

  // Light chamber (Hibukuro)
  c.fillStyle = '#0f172a';
  c.fillRect(lx - 7, ly - 36, 14, 12);

  // Lantern illumination
  if (period === 'sunset' || period === 'night' || period === 'dawn') {
    const flicker = Math.sin(now * 0.01) * 2;
    const fireAlpha = (period === 'night') ? 0.95 : 0.75;
    c.fillStyle = `rgba(251, 191, 36, ${fireAlpha})`;
    c.fillRect(lx - 4, ly - 33, 8, 7);
    c.fillStyle = '#ffffff';
    c.fillRect(lx - 2 + (flicker > 0 ? 1 : 0), ly - 31, 3, 3);

    // Radial ground glow for night
    if (period === 'night') {
      const glowGrad = c.createRadialGradient(lx, ly - 28, 4, lx, ly, 45);
      glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
      glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.12)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
      c.fillStyle = glowGrad;
      c.beginPath();
      c.ellipse(lx, ly, 45, 18, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    // Day unlit window
    c.fillStyle = '#475569';
    c.fillRect(lx - 4, ly - 33, 8, 7);
  }

  // Roof & Jewel Finial
  c.fillStyle = stoneLight;
  c.beginPath();
  c.moveTo(lx - 14, ly - 36);
  c.lineTo(lx + 14, ly - 36);
  c.lineTo(lx + 6, ly - 44);
  c.lineTo(lx - 6, ly - 44);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = stoneColor;
  c.fillRect(lx - 3, ly - 48, 6, 4); // Finial
  c.restore();

  // ==========================================
  // 5. VERDANT BAMBOO GROVES (Take)
  // ==========================================
  function drawBambooStalk(bx, by, stalkHeight, isLeft) {
    c.save();
    const bColor = isDaytime ? '#15803d' : '#064e3b';
    const bNode = isDaytime ? '#166534' : '#022c22';
    const bLeaf = isDaytime ? '#22c55e' : '#059669';

    c.fillStyle = bColor;
    c.fillRect(bx, by - stalkHeight, 5, stalkHeight);

    // Node joints
    c.fillStyle = bNode;
    for (let ny = by; ny > by - stalkHeight; ny -= 22) {
      c.fillRect(bx - 1, ny - 2, 7, 2);

      // Angled bamboo leaf sprigs
      c.fillStyle = bLeaf;
      const dir = isLeft ? 1 : -1;
      c.beginPath();
      c.moveTo(bx + 2, ny - 1);
      c.lineTo(bx + 2 + dir * 10, ny - 6);
      c.lineTo(bx + 2 + dir * 6, ny - 1);
      c.closePath();
      c.fill();
      c.fillStyle = bNode;
    }
    c.restore();
  }

  drawBambooStalk(12, 260, 160, true);
  drawBambooStalk(22, 270, 180, true);
  drawBambooStalk(380, 265, 170, false);
  drawBambooStalk(390, 275, 190, false);

  // ==========================================
  // 6. BLOOMING SAKURA PETALS (Drifting)
  // ==========================================
  c.save();
  const petalColor = (period === 'sunset') ? '#fda4af' : ((period === 'night') ? '#f472b6' : '#fbcfe8');
  zenPetals.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    const sway = Math.sin(now * p.swaySpeed + p.seed) * 1.5;

    c.fillStyle = petalColor;
    c.fillRect(Math.floor(p.x + sway), Math.floor(p.y), p.size, p.size);

    if (p.x > 415) p.x = -10;
    if (p.y > 325) p.y = -5;
  });
  c.restore();

  // ==========================================
  // 7. GLOWING FIREFLIES (Night & Dusk)
  // ==========================================
  if (period === 'night' || period === 'sunset') {
    c.save();
    zenFireflies.forEach(f => {
      f.x += f.vx;
      f.y += f.vy;
      if (f.x < 30 || f.x > 370) f.vx *= -1;
      if (f.y < 120 || f.y > 280) f.vy *= -1;

      const alphaPulse = 0.35 + 0.45 * Math.sin(now * 0.005 + f.phase);
      c.fillStyle = `rgba(163, 230, 53, ${alphaPulse * 0.4})`;
      c.beginPath();
      c.arc(f.x, f.y, 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgba(254, 240, 138, ${alphaPulse})`;
      c.fillRect(Math.floor(f.x - 1), Math.floor(f.y - 1), 2, 2);
    });
    c.restore();
  }

  // ==========================================
  // 8. FLOATING RETRO BANNER & SUBTITLE
  // ==========================================
  const floatY = 65 + Math.sin(now * 0.003) * 3;
  c.save();
  c.font = '8px "Press Start 2P"';
  c.textAlign = 'center';

  let titleColor, titleShadow, subColor, subtitleText;
  if (period === 'dawn') {
    titleColor = '#f59e0b';
    titleShadow = '#451a03';
    subColor = '#d97706';
    subtitleText = 'DAWN ZEN GARDEN :: A FRESH MORNING';
  } else if (period === 'day') {
    titleColor = '#0284c7';
    titleShadow = '#082f49';
    subColor = '#0369a1';
    subtitleText = 'MIDDAY ZEN GARDEN :: PURE HARMONY';
  } else if (period === 'sunset') {
    titleColor = '#fbbf24';
    titleShadow = '#4c0519';
    subColor = '#f97316';
    subtitleText = 'TWILIGHT ZEN GARDEN :: PEACE AT DUSK';
  } else {
    titleColor = '#e2e8f0';
    titleShadow = '#020617';
    subColor = '#94a3b8';
    subtitleText = 'MIDNIGHT ZEN GARDEN :: SERENE DREAMS';
  }

  // Drop shadow
  c.fillStyle = titleShadow;
  c.fillText('ALL CLEAR. REST EASY.', 201, floatY + 1);

  // Main banner
  c.fillStyle = titleColor;
  c.fillText('ALL CLEAR. REST EASY.', 200, floatY);

  // Subtitle
  c.font = '6px "Press Start 2P"';
  c.fillStyle = subColor;
  c.fillText(subtitleText, 200, floatY + 16);
  c.restore();
}
```

---

## 4. Caveats
1. **Milestone Coordination**:
   - `m2_1` is responsible for Tier 0 Void styling and Tiers 1–10 Abyss backgrounds, plus the compression formula `180 / (count - 1)` for 10-dice stacking.
   - `m2_2` is responsible for dynamic rot hue shifting and smooth de-escalation between tiers.
   - Our Zen Garden design interfaces cleanly with both: it activates strictly when `diceStack.length === 0 && (hasClearedAll || hasHadTasks)`.
2. **Animation Loop Cross-Fade**:
   - The proposed `zenTransitionAlpha` gracefully ramps from 0.0 to 1.0 upon clearing the final die so the canvas does not jerk abruptly from dark abyss to radiant Zen Garden.
3. **Simulated Time Hook**:
   - `window.zenSimulatedHour` is strictly additive and defaults to `null`, ensuring production uses local machine clock (`new Date().getHours()`) while automated probes can verify all 4 lighting states deterministically.

---

## 5. Conclusion
- The investigation revealed the root cause of the startup empty void bug (premature setting of `hasLoadedTasksOnce = true` on empty task fetch), and provided the state disambiguation logic (`hasHadTasks` / `hasClearedAll`).
- A production-grade 4-phase dynamic Day/Night lighting engine has been designed to replace the rudimentary 2-state toggle, fully adhering to the Japanese Zen Garden aesthetic requirements (Dawn sunbeams, Day verdant bamboo & sakura petals, Sunset glowing stone lantern, Night moonlit raked sand & fireflies).
- The solution strictly maintains backwards compatibility with all existing E2E probe assertions (`re.search(r'function renderZenGarden|renderZenGarden')`, `re.search(r'getHours\(\)|isDaytime')`, and `re.search(r'ALL CLEAR\. REST EASY\.')`).

---

## 6. Verification Method

### 6.1 Unit & E2E Automated Test Commands
Run the E2E probe suite to verify existing AC6 regex and behavioral contracts:
```powershell
python -m unittest tests/test_e2e_probe.py
```

### 6.2 Browser / Sandbox Verification
In the browser console or pywebview test harness:
1. Verify Tier 0 on fresh startup:
   - Clear storage: `tasks.json` has `[]`.
   - On page load, canvas renders `#121417` with "TYPE TASK & ROLL TO BEGIN".
2. Add task and complete task:
   - Add a task via UI or `window.pywebview.api.add_task('Meditation', 1, 15)`.
   - Complete the task.
   - Canvas smoothly transitions into Zen Garden mode.
3. Verify 4 Day/Night Lighting Modes:
   - Dawn: `window.setZenGardenTime(8);` -> Canvas renders golden sunrise sunbeams and "DAWN ZEN GARDEN".
   - Day: `window.setZenGardenTime(14);` -> Canvas renders azure sky, drifting clouds, sakura blossoms.
   - Sunset: `window.setZenGardenTime(18);` -> Canvas renders magenta twilight, flickering stone lantern beacon.
   - Night: `window.setZenGardenTime(23);` -> Canvas renders starry indigo sky, crescent moon, glowing fireflies, silver moonlit raked sand.
   - Reset: `window.setZenGardenTime(null);` -> Restores realtime local clock.
