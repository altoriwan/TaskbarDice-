# Handoff Report: Stage 5 Physics & Animation Mechanics (Twitch Vibration, Slime Drips & Floor Puddles)

**Agent**: `teamwork_preview_explorer_m3_2`  
**Milestone**: M3 (Stage 5 Physics & Visual Polish)  
**Target File**: `static/index.html`  
**Date**: 2026-10-24  

---

## 1. Observation

Direct examination of `static/index.html` and supporting files revealed the following exact lines and behaviors:

### A. Coordinate System & Ground Plane
- `static/index.html:422`: `const GROUND_Y = 290;` defines the floor plane.
- `static/index.html:691`: `d.targetY = GROUND_Y - cfg.ry - cfg.height;` defines the resting position of the base die in the tower. The bottom vertex lands exactly at `GROUND_Y = 290px`.
- `static/index.html:1855, 1985`: `const centerX = 200;` is the horizontal center axis of the 400x320 canvas.

### B. Missing Twitch Vibration on Dice
- In the rendering loop (`static/index.html:1984-1995`):
  ```javascript
  // Render die with rot
  drawRotIsometricDice(ctx, centerX, renderY, cfg.width, cfg.height, d.weight_score, d.title, rot);

  // 2px Glowing pixel border for hovered resting die
  if (d === hoveredDie) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)'; // glow border
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - cfg.width / 2 - 2, renderY - cfg.ry - 2, cfg.width + 4, cfg.height + cfg.ry * 2 + 4);
    ctx.restore();
  }
  ```
  **Observation**: The die is rendered strictly at `centerX` and `renderY` with zero horizontal or vertical jitter offset, regardless of whether `rot >= 0.8` (Stage 5) or `rot >= 1.0` (Overdue). The only twitch in the file is on the background corruption roots (`line 803: const isTwitching = overallRot >= 0.75;`).

### C. Inadequate Slime Drip Mechanics & Memory Management
- `static/index.html:542`:
  ```javascript
  // Particle Pools
  const slimeParticles = [];
  ```
- `static/index.html:912-920`:
  ```javascript
  if (Math.random() < 0.07) {
    const spawnSide = Math.random() > 0.5 ? 1 : -1;
    slimeParticles.push({
      x: cx + (Math.random() * rx * 0.7 * spawnSide),
      y: cy + ry + height,
      vy: 0.6 + Math.random() * 0.6,
      color: Math.random() > 0.5 ? '#84cc16' : '#c084fc'
    });
  }
  ```
- `static/index.html:864-880`:
  ```javascript
  function updateAndDrawSlime(c) {
    if (slimeParticles.length > 100) {
      slimeParticles.splice(0, slimeParticles.length - 80);
    }
    for (let i = slimeParticles.length - 1; i >= 0; i--) {
      const p = slimeParticles[i];
      p.y += p.vy;
      p.vy += 0.05;

      c.fillStyle = p.color;
      c.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);

      if (p.y >= GROUND_Y + 4) {
        slimeParticles.splice(i, 1);
      }
    }
  }
  ```
  **Observation**:
  1. Particle creation uses `slimeParticles.push({ ... })` and removal uses `splice(i, 1)`. Dynamic object allocation and array splicing every frame creates garbage collector (GC) churn and risk of micro-stutter below 60fps.
  2. Spawning is hardcoded to 7% probability per frame with no intensification when overdue (`rot >= 1.0`).
  3. Drips are fixed 2x2 squares with no viscous elongation or fluid physics.
  4. At `p.y >= GROUND_Y + 4`, droplets are simply deleted (`splice`). **Zero floor puddles or floor bubbling exists**.

---

## 2. Logic Chain

From the observations to the design solution:

1. **Twitch Vibration Requirement (`rot >= 0.8` and `rot >= 1.0`)**:
   - *From Observation B*: Dice currently render statically at `(centerX, renderY)`.
   - *Design*: Stage 5 represents necrotic Lovecraftian decay. When `rot >= 0.8`, the die should undergo nervous micro-tremors. When `rot >= 1.0` (overdue), the task is in crisis; frequency and amplitude must double or triple into violent spasmodic convulsions.
   - *Logic*: Non-linear multi-harmonic sine waves combined with stochastic micro-noise produce erratic, organic twitches rather than a robotic sine sway. Applying `(dx, dy)` directly to the isometric rendering coordinates `dieRenderX = centerX + dx` and `dieRenderY = renderY + dy` ensures all isometric faces, pips, and textures shake in unison.
   - *Hit-Testing Decoupling*: The resting hit tests in `mousemove` (line 2186) and `dblclick` (line 2255) must continue to test against the nominal resting coordinates `(centerX, d.currentY)` so that the user's cursor does not jitter in and out of the bounding box during violent spasms. The hover glow border, however, must track `dieRenderX` and `dieRenderY` so it moves synchronously with the shaking die.

2. **Continuous Viscous Slime Drips Requirement**:
   - *From Observation C*: Drips currently spawn sparsely (7%), lack elongation, and delete at ground level.
   - *Design*: Viscous fluids start slow at detachment, accelerate under gravity, and stretch vertically due to fluid surface tension.
   - *Logic*:
     - Spawning along the bottom V-shaped isometric rim (`cy + ry + height - u * ry`).
     - Velocity-based elongation: `length = Math.max(2, Math.min(6, Math.floor(p.vy * 1.8)))`.
     - Dual toxic palette: Toxic Acid Green (`#84cc16`, `#a3e635`) and Necrotic Abyssal Purple (`#c084fc`, `#a855f7`).
     - Spawn rate increases from ~8% in normal Stage 5 (`0.8 <= rot < 1.0`) to ~22% with higher initial velocity when overdue (`rot >= 1.0`).

3. **Persistent Pooling Slime Puddles & Floor Bubbling**:
   - *From Observation A & C*: Floor plane is `GROUND_Y = 290`. When drips reach `p.y + p.length >= GROUND_Y`, they should not vanish silently.
   - *Design*: Drips hitting the floor plane deposit viscous slime into persistent floor puddles.
   - *Logic*:
     - When a drip impacts the floor, it checks if an active puddle exists within absorption radius (`|puddle.x - drip.x| < puddle.width * 0.6 + 10`).
     - If nearby: Puddle absorbs the volume, increasing `targetWidth` (up to `maxWidth = 55px`) and `alpha`.
     - If not nearby: An inactive puddle slot from the pre-allocated pool is activated at `(drip.x, GROUND_Y + 1..3)` with initial `width = 4, targetWidth = 12`.
     - Viscous pooling: Puddle smoothly expands toward `targetWidth` via exponential damping: `puddle.width += (puddle.targetWidth - puddle.width) * 0.06`.
     - Isometric presentation: Rendered as squashed ellipses (`ellipse(puddle.x, puddle.y, width/2, height/2)`) with a dark viscous core, glistening specular edge, and outer rim.
     - Bubbling: Each puddle contains 3 pre-allocated bubble slots. Bubbles swell (`sin(progress * PI)`), reach a peak radius with a 1px specular highlight, and pop/reset to a new location.
     - Zen Garden Transition: When all tasks are cleared (`diceStack.length === 0`), puddles slowly fade out (`alpha -= 0.015`) to leave the Zen Garden clean.

4. **Particle Pool Recycling & 60 FPS Performance (Zero GC Leaks)**:
   - *From Observation C*: Avoid `push()` and `splice()` in 60fps hot loops.
   - *Design*: Pre-allocated fixed-size object pools:
     - `slimeDripPool` (80 slots)
     - `slimePuddlePool` (12 slots)
     - `slimeSplashPool` (24 slots)
   - *Logic*: Toggling `active: boolean` eliminates all dynamic allocations. When all 80 drip slots are active, spawner gracefully skips, preventing runaway lag while ensuring silky smooth 60fps rendering without heap fragmentation.

---

## 3. Caveats

1. **Peer Interface with `m3_1` and `m3_3`**:
   - `m3_1` is implementing the 5 visual stages in `drawRotIsometricDice`. The jitter offsets `(dx, dy)` should be applied to `(cx, cy)` passed into `drawRotIsometricDice`, preserving full compatibility with `m3_1`'s internal face textures.
   - `m3_3` is implementing the retro hover tooltip and overdue banner. The hover highlight rectangle in `animationLoop` must use `dieRenderX` and `dieRenderY` so it moves synchronously with the twitching die.
2. **Floor Level Alignment**:
   - Floor plane is fixed at `GROUND_Y = 290px`. Puddles are drawn between `y = 290` and `y = 294`, which is right at the base of the lowest die (`diceStack[0]`). If dice stack sorting changes, puddles stay properly grounded on the floor.
3. **No Code Modification Undertaken**:
   - In adherence to explorer role constraints, all implementations are provided as concrete, drop-in code patches below for the worker agent to apply.

---

## 4. Conclusion & Proposed Implementation Specification

### A. Twitch Vibration Algorithm
Add the following helper function in `static/index.html`:

```javascript
/**
 * Calculates erratic micro-jitter offsets (dx, dy) for Stage 5 twitch vibration.
 * Frequency and amplitude intensify significantly when overdue (rot >= 1.0).
 */
function calculateTwitchJitter(rot, index, timestamp) {
  if (rot < 0.8) return { dx: 0, dy: 0 };

  const isOverdue = rot >= 1.0;
  // Overdue amplifies amplitude up to 2.8x
  const severity = isOverdue ? Math.min(2.8, 1.2 + (rot - 1.0) * 1.6) : 1.0;
  // Overdue increases frequency from 0.028 to 0.055
  const freq = isOverdue ? 0.055 : 0.028;
  const t = timestamp * freq + (index * 19.73);

  // Spasm gate: erratic bursts simulating nervous twitching
  const spasmGate = Math.sin(t * 2.1) * Math.cos(t * 3.7);
  const inBurst = isOverdue || Math.abs(spasmGate) > 0.25;

  let dx = 0;
  let dy = 0;

  if (inBurst) {
    const harmonicX = Math.sin(t * 5.3) * 0.5 + Math.sin(t * 11.7) * 0.3;
    const harmonicY = Math.cos(t * 4.7) * 0.4 + Math.cos(t * 9.1) * 0.3;
    const noiseX = (Math.random() - 0.5) * 1.2;
    const noiseY = (Math.random() - 0.5) * 1.0;

    const baseAmp = isOverdue ? 2.4 : 1.0;
    dx = (harmonicX + noiseX) * baseAmp * severity;
    dy = (harmonicY + noiseY) * (baseAmp * 0.75) * severity;
  }

  // Micro-clamp to keep pixel art aesthetic crisp
  const maxClamp = isOverdue ? 4.5 : 1.8;
  dx = Math.max(-maxClamp, Math.min(maxClamp, dx));
  dy = Math.max(-maxClamp, Math.min(maxClamp, dy));

  return { dx, dy };
}
```

### B. Pre-Allocated Particle & Puddle Pools (Zero Allocations at 60 FPS)
Replace line 542 (`const slimeParticles = [];`) with:

```javascript
// ---------------------------------------------------------------------------
// STAGE 5 PHYSICS: ZERO-ALLOCATION RECYCLING POOLS (60 FPS & MEMORY LEAK PROOF)
// ---------------------------------------------------------------------------
const MAX_SLIME_DRIPS = 80;
const slimeDripPool = [];
for (let i = 0; i < MAX_SLIME_DRIPS; i++) {
  slimeDripPool.push({
    active: false,
    x: 0,
    y: 0,
    vy: 0,
    gravity: 0.1,
    length: 2,
    color: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.4)',
    type: 'green'
  });
}
// Alias for backward-compatibility with external probes/inspections
const slimeParticles = slimeDripPool;

const MAX_SLIME_PUDDLES = 12;
const slimePuddlePool = [];
for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
  slimePuddlePool.push({
    active: false,
    x: 0,
    y: GROUND_Y,
    width: 0,
    targetWidth: 0,
    maxWidth: 55,
    height: 3,
    color: '#140428',
    rimColor: '#7e22ce',
    highlightColor: '#c084fc',
    bubbleColor: '#a855f7',
    alpha: 1.0,
    bubbles: [
      { xRel: -4, progress: 0.1, speed: 0.02, size: 2.2 },
      { xRel: 3, progress: 0.6, speed: 0.015, size: 2.6 },
      { xRel: -7, progress: 0.85, speed: 0.025, size: 1.8 }
    ]
  });
}

const MAX_SLIME_SPLASHES = 24;
const slimeSplashPool = [];
for (let i = 0; i < MAX_SLIME_SPLASHES; i++) {
  slimeSplashPool.push({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 12,
    color: '#84cc16'
  });
}
```

### C. Drip Spawning, Floor Impact, and Puddle Simulation Functions
Replace `updateAndDrawSlime` (lines 864-880) with:

```javascript
/**
 * Spawns continuous viscous slime drips from Stage 5 dice along isometric lower edges.
 */
function spawnStage5SlimeDrip(renderX, renderY, rx, ry, height, rot) {
  if (rot < 0.8) return;

  const isOverdue = rot >= 1.0;
  // Drip spawn chance: 8% normal Stage 5, 22% when overdue
  const spawnChance = isOverdue ? 0.22 : 0.08;
  if (Math.random() > spawnChance) return;

  for (let k = 0; k < MAX_SLIME_DRIPS; k++) {
    const p = slimeDripPool[k];
    if (!p.active) {
      p.active = true;
      const side = Math.random() < 0.5 ? -1 : 1;
      const u = Math.random();
      p.x = renderX + side * u * rx * 0.85;
      p.y = renderY + ry + height - (u * ry * 0.6);
      p.vy = isOverdue ? (0.7 + Math.random() * 0.7) : (0.4 + Math.random() * 0.4);
      p.gravity = 0.08 + Math.random() * 0.04;
      p.length = 2;

      const isPurple = Math.random() < 0.45;
      if (isPurple) {
        p.color = Math.random() < 0.5 ? '#c084fc' : '#a855f7';
        p.glowColor = 'rgba(192, 132, 252, 0.4)';
        p.type = 'purple';
      } else {
        p.color = Math.random() < 0.5 ? '#84cc16' : '#a3e635';
        p.glowColor = 'rgba(132, 204, 22, 0.4)';
        p.type = 'green';
      }
      break;
    }
  }
}

/**
 * Handles slime droplet impact on floor: triggers splash and expands/creates puddles.
 */
function triggerSlimeFloorImpact(impactX, color, type) {
  // 1. Trigger micro-splatter
  let splashCount = 0;
  for (let i = 0; i < MAX_SLIME_SPLASHES && splashCount < 2; i++) {
    const s = slimeSplashPool[i];
    if (!s.active) {
      s.active = true;
      s.x = impactX;
      s.y = GROUND_Y;
      s.vx = (Math.random() - 0.5) * 1.8;
      s.vy = -0.5 - Math.random() * 0.8;
      s.life = 0;
      s.maxLife = 8 + Math.floor(Math.random() * 6);
      s.color = color;
      splashCount++;
    }
  }

  // 2. Feed or create floor puddle
  let absorbed = false;
  for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
    const p = slimePuddlePool[i];
    if (p.active && Math.abs(p.x - impactX) < (p.width * 0.6 + 10)) {
      p.targetWidth = Math.min(p.maxWidth, p.targetWidth + 3.5);
      p.alpha = Math.min(1.0, p.alpha + 0.1);
      absorbed = true;
      break;
    }
  }

  if (!absorbed) {
    for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
      const p = slimePuddlePool[i];
      if (!p.active) {
        p.active = true;
        p.x = impactX;
        p.y = GROUND_Y + (Math.random() * 3);
        p.width = 4;
        p.targetWidth = 12;
        p.maxWidth = 42 + Math.floor(Math.random() * 20);
        p.height = 3;
        p.alpha = 0.95;
        if (type === 'purple') {
          p.color = '#1e1b4b';
          p.rimColor = '#7e22ce';
          p.highlightColor = '#c084fc';
          p.bubbleColor = '#a855f7';
        } else {
          p.color = '#022c22';
          p.rimColor = '#365314';
          p.highlightColor = '#84cc16';
          p.bubbleColor = '#a3e635';
        }
        p.bubbles.forEach((b, idx) => {
          b.progress = idx * 0.33;
          b.speed = 0.012 + Math.random() * 0.012;
          b.size = 1.8 + Math.random() * 1.2;
          b.xRel = (Math.random() - 0.5) * 8;
        });
        break;
      }
    }
  }
}

/**
 * Updates and draws animated dripping slime particles, floor puddles, and bubbles.
 * Completely recycled with zero runtime heap allocations.
 */
function updateAndDrawSlime(c) {
  const isZen = (diceStack.length === 0);

  // 1. DRAW & UPDATE FLOOR PUDDLES
  for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
    const p = slimePuddlePool[i];
    if (!p.active) continue;

    if (isZen) {
      p.alpha -= 0.015;
      if (p.alpha <= 0) {
        p.active = false;
        continue;
      }
    }

    // Viscous pooling expansion
    p.width += (p.targetWidth - p.width) * 0.06;
    p.height = Math.max(3, Math.min(8, p.width * 0.22));

    c.save();
    c.globalAlpha = p.alpha;

    // Outer viscous rim
    c.fillStyle = p.rimColor;
    c.beginPath();
    c.ellipse(p.x, p.y, p.width / 2 + 1, p.height / 2 + 0.5, 0, 0, Math.PI * 2);
    c.fill();

    // Dark core puddle
    c.fillStyle = p.color;
    c.beginPath();
    c.ellipse(p.x, p.y, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
    c.fill();

    // Specular glistening edge
    c.strokeStyle = p.highlightColor;
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(p.x, p.y - 1, p.width * 0.35, p.height * 0.3, 0, Math.PI, Math.PI * 2);
    c.stroke();

    // Bubbles on floor puddle
    p.bubbles.forEach(b => {
      b.progress += b.speed;
      if (b.progress >= 1.0) {
        b.progress = 0;
        b.speed = 0.012 + Math.random() * 0.015;
        b.size = 1.5 + Math.random() * 1.5;
        b.xRel = (Math.random() - 0.5) * (p.width * 0.65);
      }
      const curRadius = b.size * Math.sin(b.progress * Math.PI);
      if (curRadius > 0.4) {
        const bx = p.x + b.xRel;
        const by = p.y - (curRadius * 0.5);
        c.fillStyle = p.bubbleColor;
        c.beginPath();
        c.arc(bx, by, curRadius, 0, Math.PI * 2);
        c.fill();
        if (curRadius > 1.3) {
          c.fillStyle = '#ffffff';
          c.fillRect(Math.floor(bx - 0.5), Math.floor(by - curRadius * 0.5), 1, 1);
        }
      }
    });

    c.restore();
  }

  // 2. UPDATE & DRAW FALLING SLIME DRIPS
  for (let i = 0; i < MAX_SLIME_DRIPS; i++) {
    const p = slimeDripPool[i];
    if (!p.active) continue;

    p.vy += p.gravity;
    p.y += p.vy;
    p.length = Math.max(2, Math.min(6, Math.floor(p.vy * 1.8)));

    if (p.y + p.length >= GROUND_Y) {
      p.active = false;
      triggerSlimeFloorImpact(p.x, p.color, p.type);
      continue;
    }

    // Viscous teardrop rendering with glow
    c.fillStyle = p.glowColor;
    c.fillRect(Math.floor(p.x) - 1, Math.floor(p.y), 3, p.length);
    c.fillStyle = p.color;
    c.fillRect(Math.floor(p.x), Math.floor(p.y), 2, p.length);
  }

  // 3. UPDATE & DRAW SPLASH PARTICLES
  for (let i = 0; i < MAX_SLIME_SPLASHES; i++) {
    const s = slimeSplashPool[i];
    if (!s.active) continue;

    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.2;
    s.life++;

    c.fillStyle = s.color;
    c.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);

    if (s.life >= s.maxLife || s.y > GROUND_Y + 6) {
      s.active = false;
    }
  }
}
```

### D. Render Loop Integration (in `animationLoop`, around lines 1970-1995)
Update the per-die loop in `animationLoop`:

```javascript
        let renderY = d.currentY;
        if (d.bounceFrame > 0) {
          renderY += (d.bounceFrame > 2 ? -3 : -1);
          d.bounceFrame--;
        }

        // Apply Twitch vibration micro-jitter for Stage 5 (rot >= 0.8)
        const jitter = calculateTwitchJitter(rot, i, now);
        const dieRenderX = centerX + jitter.dx;
        const dieRenderY = renderY + jitter.dy;

        // Spawn continuous viscous slime drips for Stage 5
        if (rot >= 0.8) {
          spawnStage5SlimeDrip(dieRenderX, dieRenderY, cfg.width / 2, cfg.ry, cfg.height, rot);
        }

        // Contact shadow (subtly tracks x jitter)
        if (i > 0) {
          ctx.fillStyle = (rot >= 0.75) ? 'rgba(5, 46, 22, 0.35)' : 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(centerX + jitter.dx * 0.25, renderY + cfg.height + 2, cfg.width * 0.5, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Render die with jittered coordinates
        drawRotIsometricDice(ctx, dieRenderX, dieRenderY, cfg.width, cfg.height, d.weight_score, d.title, rot);

        // 2px Glowing pixel border for hovered resting die (synchronized with jitter)
        if (d === hoveredDie) {
          ctx.save();
          ctx.strokeStyle = (rot >= 1.0) ? '#e76e55' : 'rgba(255, 215, 0, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(dieRenderX - cfg.width / 2 - 2, dieRenderY - cfg.ry - 2, cfg.width + 4, cfg.height + cfg.ry * 2 + 4);
          ctx.restore();
        }
```

---

## 5. Verification Method

### 1. Automated Regression & Unit Test Verification
Run the project test suites in PowerShell to verify zero regressions:
```powershell
python -m unittest tests/test_dice_logic.py
python -m unittest tests/test_e2e_probe.py
```

### 2. Static Code & Security Verification
Run the AgentShield security scan:
```powershell
python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
```

### 3. Inspection of Physics & 60 FPS Invariants
Inspect the implemented file for:
- [ ] `calculateTwitchJitter` applies `dx, dy` only when `rot >= 0.8`.
- [ ] Frequency and amplitude escalate when `rot >= 1.0` (`isOverdue = true`).
- [ ] `slimeDripPool` and `slimePuddlePool` are pre-allocated with fixed caps.
- [ ] `updateAndDrawSlime` executes with 0 runtime object allocations (`new Object` / `.push()` / `.splice()` are eliminated).
- [ ] Drips reach `GROUND_Y = 290px` and trigger `triggerSlimeFloorImpact`.
- [ ] Puddles pool, expand up to `maxWidth`, render bubbles with specular highlights, and fade when `diceStack.length === 0`.
