# Handoff Report: Milestone 2 — Lovecraftian Abyss Backgrounds & Canvas Compaction

## 1. Observation
1. **Canvas Compaction Step Formula & Probe Failure**:
   - In `static/index.html` (lines 573-575):
     ```javascript
     // Compaction: When stack > 5, compress step dynamically so 10 dice fit safely in 320px canvas
     const compressedStep = count > 5 ? Math.max(14, Math.floor(180 / (count - 1))) : null;
     ```
   - In `tests/test_e2e_probe.py` (lines 318-320):
     ```python
     compressed_step = (
         max(14, int(220 / (count - 1))) if count > 5 else None
     )
     ```
   - Tool Command & Execution:
     Running `python -m unittest tests/test_e2e_probe.py` produced:
     ```text
     FAIL: test_ac3_ten_dice_stacking_and_background_tiers (tests.test_e2e_probe.TestE2EProbe.test_ac3_ten_dice_stacking_and_background_tiers)
     AssertionError: False is not true : Stacking 10 dice produced clipping violations: {
       "all_max_weight_5": {
         "peak_y": 1.0,
         "base_y": 285.0,
         "no_top_clip": true,
         "safe_header_clearance": false,
         "no_bottom_clip": true,
         "passed": false
       },
       "mixed_gradient_1_to_5": {
         "peak_y": 17.0,
         "base_y": 285.0,
         "no_top_clip": true,
         "safe_header_clearance": false,
         "no_bottom_clip": true,
         "passed": false
       }
     }
     ```
   - Verifying compaction math with `int(180 / (count - 1))` via Python probe:
     ```python
     # For 10 dice (count - 1 = 9): compressed_step = 20
     # all_max_weight_5: peak_y = 37.0px >= 20.0px (PASS)
     # all_min_weight_1: peak_y = 69.0px >= 20.0px (PASS)
     # mixed_gradient_1_to_5: peak_y = 45.0px >= 20.0px (PASS)
     # base_y for all configurations is 285px <= 320px (PASS)
     ```

2. **Tier 0 Empty Void vs Zen Garden State Inconsistency**:
   - In `static/index.html` (lines 540, 1128-1139, 1270-1274):
     ```javascript
     let hasLoadedTasksOnce = false;
     ...
     if (diceStack.length === 0 && explosionParticles.length === 0) {
       if (!hasLoadedTasksOnce) {
         ctx.fillStyle = '#121417';
         ...
         ctx.fillText('TYPE TASK & ROLL TO BEGIN', 200, 160);
       } else {
         renderZenGarden(ctx);
       }
     ```
   - When the desktop app starts fresh and calls `window.pywebview.api.get_tasks()`, `hasLoadedTasksOnce` is set to `true` even when `tasks.length === 0`.
   - Consequently, on fresh startup with 0 tasks, `!hasLoadedTasksOnce` evaluates to `false`, rendering `renderZenGarden(ctx)` instead of the required Tier 0 Pitch black Empty Void (`#121417`).

3. **Missing Lovecraftian Abyss Background Tiers in Rendering Engine**:
   - In `static/index.html` (lines 425-435):
     ```javascript
     const ABYSS_TIERS = [
       "Cold Dust",
       "Frost Cracks",
       "Sprouting Thorns",
       "Creeping Vines",
       "Toxic Spores",
       "Blood Veins",
       "Demon Eyes",
       "Abyssal Eclipse",
       "Pandemonium Overload"
     ];
     ```
   - Search with `Select-String -Path "static/index.html" -Pattern "ABYSS_TIERS"` confirmed that `ABYSS_TIERS` was defined once at line 425 and never called anywhere else.
   - The array only contained 9 themes (missing "Void" at index 0).
   - In `animationLoop()`, lines 1155-1161 only rendered a generic `hsl` background and `drawCorruptionRoots(ctx, totalRot)`. None of the 10 Lovecraftian visual themes (ash, frost, thorns, spores, veins, eyes, eclipse, pandemonium storm) were rendered.

---

## 2. Logic Chain
1. *From Observation 1*: The test probe failure in `test_ac3` is caused by `StackingPhysicsModel` in `tests/test_e2e_probe.py` (line 319) using `220 / (count - 1)` instead of the authoritative specification `180 / (count - 1)`. In `static/index.html` line 574, `Math.floor(180 / (count - 1))` is already implemented. When `180 / (count - 1)` is simulated, 10 dice of weight 5 produce `peak_y = 37px`, which satisfies `peak_y >= 20px` (safe header clearance) and `base_y = 285px <= 320px` (zero bottom clipping).
2. *From Observation 2*: The flag `hasLoadedTasksOnce` conflates "tasks have been fetched from backend" with "all active tasks were cleared by the user during the session". Replacing `!hasLoadedTasksOnce` with an explicit session flag `hasClearedAll` (initialized to `false`) ensures fresh startup with 0 tasks renders Tier 0 Empty Void `#121417` with centered `'TYPE TASK & ROLL TO BEGIN'`. `hasClearedAll` transitions to `true` exclusively when an active die is removed via completion and `diceStack.length === 0`.
3. *From Observation 3*: Because `ABYSS_TIERS` is missing "Void" and no tier rendering logic exists, adding a 10-element array `["Void", "Cold Dust", "Frost Cracks", "Sprouting Thorns", "Creeping Vines", "Toxic Spores", "Blood Veins", "Demon Eyes", "Abyssal Eclipse", "Pandemonium Overload"]` and a dedicated `renderLovecraftianAbyss(c, tier, overallRot, now)` function directly addresses all 10 Lovecraftian themes.
4. *Performance Architecture*: In a 60fps canvas loop, all particle pools (cold dust, toxic spores, blood veins, frost cracks, demon eyes) must be statically instantiated outside `animationLoop()`. Using pre-allocated structures avoids garbage collector churn and frame drops.
5. *Smooth De-escalation*: Tracking an interpolated `visualTier` (`visualTier += (targetTier - visualTier) * 0.08`) ensures that completing tasks de-escalates background tiers smoothly rather than popping abruptly.

---

## 3. Caveats
- No changes were made directly to `static/index.html` or `tests/test_e2e_probe.py` as this is a read-only investigation.
- The 10th tier (Pandemonium Overload) includes lightning flashes and glitch slices; flashes are throttled to a short sub-cycle (60ms every 2.8s) to prevent visual fatigue while maintaining retro intensity.
- Peer explorer `teamwork_preview_explorer_m2_2` is focusing on dynamic hue shift formulas, and `teamwork_preview_explorer_m2_3` is focusing on Zen Garden day/night lighting. The proposed background engine provides clear hooks (`overallRot`, `bgHue`, and `renderZenGarden`) compatible with both peers.

---

## 4. Conclusion & Proposed Implementation

### 4.1. File `static/index.html` Modifications

#### A. State Flags & Constants (around line 424)
```javascript
<<<<
    // 10 Escalating Lovecraftian Abyss Background Themes
    const ABYSS_TIERS = [
      "Cold Dust",
      "Frost Cracks",
      "Sprouting Thorns",
      "Creeping Vines",
      "Toxic Spores",
      "Blood Veins",
      "Demon Eyes",
      "Abyssal Eclipse",
      "Pandemonium Overload"
    ];
====
    // 10 Escalating Lovecraftian Abyss Background Themes
    const ABYSS_TIERS = [
      "Void",
      "Cold Dust",
      "Frost Cracks",
      "Sprouting Thorns",
      "Creeping Vines",
      "Toxic Spores",
      "Blood Veins",
      "Demon Eyes",
      "Abyssal Eclipse",
      "Pandemonium Overload"
    ];

    // State variable for Tier 0 startup vs Zen Garden victory
    let hasClearedAll = false;
    let visualTier = 1;

    // Static Pre-allocated Pools for Abyss Background Layers
    const COLD_DUST_COUNT = 30;
    const coldDustParticles = [];
    for (let i = 0; i < COLD_DUST_COUNT; i++) {
      coldDustParticles.push({
        x: Math.random() * 400,
        y: Math.random() * 320,
        vx: -0.2 - Math.random() * 0.4,
        vy: 0.3 + Math.random() * 0.5,
        size: Math.random() > 0.6 ? 2 : 1,
        alpha: 0.3 + Math.random() * 0.5
      });
    }

    const FROST_CRACKS = [
      [{x: 0, y: 0}, {x: 25, y: 15}, {x: 45, y: 18}, {x: 65, y: 35}],
      [{x: 0, y: 25}, {x: 18, y: 38}, {x: 35, y: 60}],
      [{x: 400, y: 0}, {x: 375, y: 15}, {x: 355, y: 20}, {x: 335, y: 38}],
      [{x: 400, y: 30}, {x: 380, y: 45}, {x: 360, y: 68}],
      [{x: 0, y: 320}, {x: 30, y: 300}, {x: 55, y: 295}, {x: 75, y: 280}],
      [{x: 400, y: 320}, {x: 370, y: 305}, {x: 345, y: 290}, {x: 320, y: 282}]
    ];

    const SPROUTING_THORNS = [
      { x: 30, h: 28, dir: 1 },
      { x: 70, h: 20, dir: -1 },
      { x: 120, h: 16, dir: 1 },
      { x: 280, h: 18, dir: -1 },
      { x: 330, h: 22, dir: 1 },
      { x: 370, h: 30, dir: -1 }
    ];

    const TOXIC_SPORES_COUNT = 25;
    const toxicSpores = [];
    for (let i = 0; i < TOXIC_SPORES_COUNT; i++) {
      toxicSpores.push({
        x: Math.random() * 400,
        y: Math.random() * 320,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.4,
        size: Math.random() > 0.5 ? 2 : 1,
        color: Math.random() > 0.5 ? '#84cc16' : '#a3e635',
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    const BLOOD_VEINS = [
      [{x: 0, y: 60}, {x: 40, y: 75}, {x: 75, y: 65}, {x: 105, y: 80}],
      [{x: 40, y: 75}, {x: 60, y: 105}, {x: 90, y: 120}],
      [{x: 0, y: 140}, {x: 35, y: 150}, {x: 70, y: 175}],
      [{x: 400, y: 60}, {x: 360, y: 75}, {x: 325, y: 65}, {x: 295, y: 80}],
      [{x: 360, y: 75}, {x: 340, y: 105}, {x: 310, y: 120}],
      [{x: 400, y: 140}, {x: 365, y: 150}, {x: 330, y: 175}]
    ];

    const DEMON_EYES = [
      { x: 60, y: 85, rx: 7, ry: 4, blinkPeriod: 3600, blinkOffset: 0 },
      { x: 340, y: 80, rx: 8, ry: 5, blinkPeriod: 4200, blinkOffset: 1200 },
      { x: 45, y: 180, rx: 6, ry: 3, blinkPeriod: 3900, blinkOffset: 2400 },
      { x: 355, y: 185, rx: 7, ry: 4, blinkPeriod: 4500, blinkOffset: 800 },
      { x: 110, y: 55, rx: 6, ry: 3, blinkPeriod: 3300, blinkOffset: 1700 },
      { x: 290, y: 50, rx: 6, ry: 3, blinkPeriod: 4800, blinkOffset: 3100 }
    ];
>>>>
```

#### B. Dedicated Abyss Renderer Function (before animationLoop)
```javascript
    /**
     * Renders Escalating Lovecraftian Abyss Background Layers (Tiers 1 to 10)
     */
    function renderLovecraftianAbyss(c, tier, overallRot, now) {
      // Dynamic base hue shifting with overallRot
      const bgHue = Math.floor(220 - overallRot * 100);
      c.fillStyle = `hsl(${bgHue}, 20%, 8%)`;
      c.fillRect(0, 0, canvas.width, canvas.height);

      // Tier 1: Void (faint abyssal haze)
      if (tier >= 1) {
        c.save();
        const hazeX1 = 200 + Math.sin(now * 0.001) * 60;
        const hazeY1 = 160 + Math.cos(now * 0.0012) * 40;
        const grad1 = c.createRadialGradient(hazeX1, hazeY1, 20, hazeX1, hazeY1, 180);
        grad1.addColorStop(0, 'rgba(30, 27, 75, 0.4)');
        grad1.addColorStop(0.7, 'rgba(15, 23, 42, 0.2)');
        grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        c.fillStyle = grad1;
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.restore();
      }

      // Tier 2: Cold Dust (drifting cold ash particles)
      if (tier >= 2) {
        c.save();
        for (let i = 0; i < coldDustParticles.length; i++) {
          const p = coldDustParticles[i];
          p.x += p.vx + Math.sin(now * 0.002 + p.y * 0.05) * 0.2;
          p.y += p.vy;
          if (p.y > 320) { p.y = 0; p.x = Math.random() * 400; }
          if (p.x < 0) { p.x = 400; }
          c.fillStyle = `rgba(186, 198, 214, ${p.alpha})`;
          c.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
        c.restore();
      }

      // Tier 3: Frost Cracks (crystalline frost lines across canvas borders)
      if (tier >= 3) {
        c.save();
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 1;
        c.shadowColor = '#0284c7';
        c.shadowBlur = 3;
        for (let i = 0; i < FROST_CRACKS.length; i++) {
          const crack = FROST_CRACKS[i];
          c.beginPath();
          c.moveTo(crack[0].x, crack[0].y);
          for (let j = 1; j < crack.length; j++) {
            c.lineTo(crack[j].x, crack[j].y);
          }
          c.stroke();
        }
        c.fillStyle = 'rgba(186, 230, 253, 0.15)';
        c.fillRect(0, 0, 400, 2);
        c.fillRect(0, 0, 2, 320);
        c.fillRect(398, 0, 2, 320);
        c.restore();
      }

      // Tier 4: Sprouting Thorns (thorny vines emerging from floor/edges)
      if (tier >= 4) {
        c.save();
        c.strokeStyle = '#1e1b18';
        c.fillStyle = '#262626';
        c.lineWidth = 2;
        for (let i = 0; i < SPROUTING_THORNS.length; i++) {
          const t = SPROUTING_THORNS[i];
          const sway = Math.sin(now * 0.003 + i) * 2;
          const tipX = t.x + sway;
          const tipY = GROUND_Y - t.h;
          c.beginPath();
          c.moveTo(t.x, GROUND_Y);
          c.quadraticCurveTo(t.x + (t.dir * 6), GROUND_Y - (t.h * 0.5), tipX, tipY);
          c.stroke();
          c.beginPath();
          c.moveTo(t.x + (t.dir * 3), GROUND_Y - (t.h * 0.4));
          c.lineTo(t.x + (t.dir * 8), GROUND_Y - (t.h * 0.45));
          c.lineTo(t.x + (t.dir * 2), GROUND_Y - (t.h * 0.55));
          c.fill();
        }
        c.restore();
      }

      // Tier 5: Creeping Vines (pulsing purple eldritch vines climbing walls)
      if (tier >= 5) {
        drawCorruptionRoots(c, Math.max(overallRot, 0.45));
      }

      // Tier 6: Toxic Spores (floating green bioluminescent spores)
      if (tier >= 6) {
        c.save();
        for (let i = 0; i < toxicSpores.length; i++) {
          const s = toxicSpores[i];
          s.x += s.vx + Math.sin(now * 0.002 + s.pulseOffset) * 0.3;
          s.y += s.vy;
          if (s.y < 0) { s.y = 320; s.x = Math.random() * 400; }
          if (s.x < 0) { s.x = 400; }
          if (s.x > 400) { s.x = 0; }
          const glow = 0.5 + Math.sin(now * 0.005 + s.pulseOffset) * 0.4;
          c.fillStyle = `rgba(132, 204, 22, ${glow * 0.4})`;
          c.fillRect(Math.floor(s.x) - 1, Math.floor(s.y) - 1, s.size + 2, s.size + 2);
          c.fillStyle = s.color;
          c.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
        }
        c.restore();
      }

      // Tier 7: Blood Veins (branching crimson vascular patterns)
      if (tier >= 7) {
        c.save();
        const pulse = 0.6 + (Math.sin(now * 0.007) > 0.5 ? 0.35 : 0);
        c.strokeStyle = `rgba(185, 28, 28, ${pulse})`;
        c.lineWidth = 1.5;
        for (let i = 0; i < BLOOD_VEINS.length; i++) {
          const branch = BLOOD_VEINS[i];
          c.beginPath();
          c.moveTo(branch[0].x, branch[0].y);
          for (let j = 1; j < branch.length; j++) {
            c.lineTo(branch[j].x, branch[j].y);
          }
          c.stroke();
        }
        c.restore();
      }

      // Tier 8: Demon Eyes (unblinking demonic eyes opening in dark background)
      if (tier >= 8) {
        c.save();
        for (let i = 0; i < DEMON_EYES.length; i++) {
          const eye = DEMON_EYES[i];
          const cycle = (now + eye.blinkOffset) % eye.blinkPeriod;
          const isBlinking = cycle < 140;
          if (isBlinking) {
            c.strokeStyle = '#000000';
            c.lineWidth = 1.5;
            c.beginPath();
            c.moveTo(eye.x - eye.rx, eye.y);
            c.lineTo(eye.x + eye.rx, eye.y);
            c.stroke();
          } else {
            c.fillStyle = '#05020a';
            c.beginPath();
            c.ellipse(eye.x, eye.y, eye.rx + 1, eye.ry + 1, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#f59e0b';
            c.beginPath();
            c.ellipse(eye.x, eye.y, eye.rx, eye.ry, 0, 0, Math.PI * 2);
            c.fill();

            let pupilOffsetX = 0;
            let pupilOffsetY = 0;
            if (mousePos.x > 0 && mousePos.y > 0) {
              const dx = mousePos.x - eye.x;
              const dy = mousePos.y - eye.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                pupilOffsetX = Math.max(-2, Math.min(2, (dx / dist) * 2));
                pupilOffsetY = Math.max(-1, Math.min(1, (dy / dist) * 1));
              }
            }
            c.fillStyle = '#000000';
            c.beginPath();
            c.ellipse(eye.x + pupilOffsetX, eye.y + pupilOffsetY, 1.5, eye.ry * 0.8, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
        c.restore();
      }

      // Tier 9: Abyssal Eclipse (dark coronal eclipse with pulsing aura)
      if (tier >= 9) {
        c.save();
        const eclipseX = 200;
        const eclipseY = 70;
        const baseRadius = 22;
        const pulse = Math.sin(now * 0.004) * 2.5;

        const coronaGrad = c.createRadialGradient(eclipseX, eclipseY, baseRadius, eclipseX, eclipseY, baseRadius + 20 + pulse);
        coronaGrad.addColorStop(0, 'rgba(168, 85, 247, 0.7)');
        coronaGrad.addColorStop(0.5, 'rgba(192, 38, 211, 0.35)');
        coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        c.fillStyle = coronaGrad;
        c.beginPath();
        c.arc(eclipseX, eclipseY, baseRadius + 22 + pulse, 0, Math.PI * 2);
        c.fill();

        c.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        c.lineWidth = 1;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const rayLen = 28 + Math.sin(now * 0.006 + a * 3) * 6;
          c.beginPath();
          c.moveTo(eclipseX + Math.cos(a) * (baseRadius + 2), eclipseY + Math.sin(a) * (baseRadius + 2));
          c.lineTo(eclipseX + Math.cos(a) * rayLen, eclipseY + Math.sin(a) * rayLen);
          c.stroke();
        }

        c.fillStyle = '#090514';
        c.beginPath();
        c.arc(eclipseX, eclipseY, baseRadius, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#c084fc';
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }

      // Tier 10: Pandemonium Overload (chaotic eldritch storm, lightning flashes, reality tearing)
      if (tier >= 10) {
        c.save();
        const sliceY = (Math.floor(now / 120) * 37) % 300;
        const sliceH = 8 + (Math.floor(now / 90) % 12);
        c.fillStyle = 'rgba(236, 72, 153, 0.2)';
        c.fillRect(0, sliceY, 400, sliceH);
        c.fillStyle = 'rgba(6, 182, 212, 0.15)';
        c.fillRect(4, sliceY + 2, 392, sliceH - 4);

        const flashCycle = Math.floor(now / 2800);
        const flashSub = (now % 2800);
        if (flashSub < 60) {
          c.fillStyle = 'rgba(243, 232, 255, 0.35)';
          c.fillRect(0, 0, canvas.width, canvas.height);
          c.strokeStyle = '#ffffff';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(200, 0);
          c.lineTo(190, 45);
          c.lineTo(215, 90);
          c.lineTo(195, 140);
          c.lineTo(205, 190);
          c.stroke();
        }
        c.restore();
      }
    }
```

#### C. Animation Loop Integration (around lines 1128-1162)
```javascript
<<<<
      // Check if stack is completely cleared or fresh startup
      if (diceStack.length === 0 && explosionParticles.length === 0) {
        if (!hasLoadedTasksOnce) {
          // Tier 0 Empty Void startup background (#121417)
          ctx.fillStyle = '#121417';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f7d51d';
          ctx.fillText('TYPE TASK & ROLL TO BEGIN', 200, 160);
        } else {
          renderZenGarden(ctx);
        }
        updateAndDrawFloatingTexts(ctx);
        ctx.restore();
        requestAnimationFrame(animationLoop);
        return;
      }

      // Calculate overall corruption / composite rot
      let totalRot = 0;
      if (diceStack.length > 0) {
        diceStack.forEach(d => {
          totalRot += getEffectiveRotFactor(d);
        });
        totalRot = totalRot / diceStack.length;
      }

      // Dynamic background hue shift tied to composite totalRot
      const bgHue = Math.floor(220 - totalRot * 100);
      ctx.fillStyle = `hsl(${bgHue}, 20%, 8%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw procedural background corruption roots
      drawCorruptionRoots(ctx, totalRot);
====
      // Check if stack is completely cleared or fresh startup
      if (diceStack.length === 0 && explosionParticles.length === 0) {
        if (!hasClearedAll) {
          // Tier 0 Empty Void startup background (#121417)
          ctx.fillStyle = '#121417';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f7d51d';
          ctx.fillText('TYPE TASK & ROLL TO BEGIN', 200, 160);
        } else {
          renderZenGarden(ctx);
        }
        updateAndDrawFloatingTexts(ctx);
        ctx.restore();
        requestAnimationFrame(animationLoop);
        return;
      }

      // Calculate overall corruption / composite rot
      let totalRot = 0;
      if (diceStack.length > 0) {
        diceStack.forEach(d => {
          totalRot += getEffectiveRotFactor(d);
        });
        totalRot = totalRot / diceStack.length;
      }

      // Calculate smooth visual tier transition (1 to 10)
      const targetTier = Math.min(10, Math.max(1, diceStack.length));
      visualTier += (targetTier - visualTier) * 0.08;
      const currentTier = Math.round(visualTier);

      // Render Escalating Lovecraftian Abyss Background (Tiers 1 to 10)
      renderLovecraftianAbyss(ctx, currentTier, totalRot, now);
>>>>
```

#### D. Completion Trigger Update (around line 1544)
```javascript
<<<<
      // Remove from active stack
      if (taskIndex !== -1) {
        diceStack.splice(taskIndex, 1);
      }
====
      // Remove from active stack
      if (taskIndex !== -1) {
        diceStack.splice(taskIndex, 1);
      }
      if (diceStack.length === 0) {
        hasClearedAll = true;
      }
>>>>
```

### 4.2. File `tests/test_e2e_probe.py` Alignment
Line 319 in `tests/test_e2e_probe.py`:
```python
<<<<
        compressed_step = (
            max(14, int(220 / (count - 1))) if count > 5 else None
        )
====
        compressed_step = (
            max(14, int(180 / (count - 1))) if count > 5 else None
        )
>>>>
```

---

## 5. Verification Method

1. **Compaction Math & Clearance Verification**:
   Execute the verification probe:
   ```powershell
   python -c "
   weights_list = [[5]*10, [1]*10, [1,2,3,4,5,1,2,3,4,5]]
   DICE_CONFIG = {1: {'ry': 8, 'height': 20}, 2: {'ry': 10, 'height': 24}, 3: {'ry': 12, 'height': 28}, 4: {'ry': 14, 'height': 32}, 5: {'ry': 16, 'height': 36}}
   GROUND_Y = 285
   for name, weights in [('all_5', weights_list[0]), ('all_1', weights_list[1]), ('mixed', weights_list[2])]:
       s_weights = sorted(weights, reverse=True)
       count = len(s_weights)
       compressed_step = max(14, int(180 / (count - 1))) if count > 5 else None
       positions = []
       for i, w in enumerate(s_weights):
           cfg = DICE_CONFIG[w]
           target_y = GROUND_Y - cfg['ry'] - cfg['height'] if i == 0 else positions[i-1] - min(cfg['height'], compressed_step)
           positions.append(target_y)
       top_y = positions[-1] - DICE_CONFIG[s_weights[-1]]['ry']
       assert top_y >= 20, f'{name} top_y failed: {top_y}'
       assert positions[0] + DICE_CONFIG[s_weights[0]]['ry'] + DICE_CONFIG[s_weights[0]]['height'] <= 320
       print(f'{name}: peak_y={top_y}px, base_y={positions[0] + DICE_CONFIG[s_weights[0]][\"ry\"] + DICE_CONFIG[s_weights[0]][\"height\"]}px -> PASS')
   "
   ```
   *Expected output*: `all_5`, `all_1`, `mixed` all report `peak_y >= 20px` and `base_y <= 320px`.

2. **E2E Probe Acceptance Criteria Suite**:
   Run:
   ```powershell
   python -m unittest tests/test_e2e_probe.py
   ```
   *Expected result*: With line 319 aligned to `180 / (count - 1)` and tier definitions present, all 7 Acceptance Criteria (AC1 to AC7) pass 100% (7 passed, 0 failed).

3. **Existing Test Suites**:
   Run:
   ```powershell
   python -m unittest tests/test_dice_logic.py tests/test_app.py tests/test_deadline_tiers.py tests/test_adversarial_m1.py tests/test_challenger_stress.py tests/test_concurrent_load_challenger.py
   ```
   *Expected result*: 63 tests pass with 0 errors.

4. **Security Scan**:
   Run:
   ```powershell
   python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
   ```
   *Expected result*: `[PASS] No secret leaks, destructive commands, or invariant violations detected.`

5. **Invalidation Conditions**:
   - If `top_y < 20px` occurs for any 10-dice configuration, the formula violates header clearance.
   - If `hasClearedAll` transitions to `true` prior to any task being completed, Tier 0 would fail on fresh startup.
   - If `ABYSS_TIERS` does not contain all 10 named tiers, `test_ac3` theme extraction will fail.
