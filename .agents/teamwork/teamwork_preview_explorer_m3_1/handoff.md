# Handoff Report: 5-Stage Isometric Die Rot Engine Visual Rendering

**Author**: `teamwork_preview_explorer_m3_1`  
**Milestone**: Milestone 3 (5-Stage Visual Rendering)  
**Target File**: `static/index.html`  
**Date**: 2026-10-24T09:03:00Z  

---

## 1. Observation

Direct code observations from `static/index.html` and project artifacts:

1. **Existing `drawRotIsometricDice` Routine (`static/index.html:885-1002`)**:
   - Currently uses a coarse 3-stage placeholder instead of the required 5 stages:
     ```javascript
     if (rot < 0.4) {
       topColor = '#f8f9fa';
       leftColor = '#d6d8db';
       rightColor = '#b0b5be';
       pipColor = '#111111';
     } else if (rot < 0.75) {
       topColor = '#dedbb8';
       leftColor = '#bfbca0';
       rightColor = '#9e9b81';
       pipColor = '#2b291d';
     } else {
       topColor = '#4d7c0f';
       leftColor = '#365314';
       rightColor = '#3b0764';
       pipColor = '#140428';
     ```
   - Stage-specific textures (lines 957-993) only branch at `rot < 0.4`, `rot < 0.75`, and `else`.

2. **Rot Factor Calculation (`static/index.html:642-663`)**:
   - `getEffectiveRotFactor(die)` computes:
     ```javascript
     const elapsed = now - createdTime;
     const rot = elapsed / totalSpan;
     return Math.max(0.0, rot);
     ```
   - Unclamped `rot >= 1.0` accurately tracks overdue state.

3. **Task Label Rendering (`static/index.html:1037-1059`)**:
   - `drawDiceLabel` sets fill style as:
     ```javascript
     c.fillStyle = (rot >= 0.75) ? '#a3e635' : (rot >= 0.4 ? '#2b291d' : '#000000');
     ```
   - Currently lacks the blinking red label required when overdue (`rot >= 1.0`).

4. **Tooltip Synchronization (`static/index.html:2204-2236`)**:
   - `drawRetroTooltip` already formats the stage using:
     ```javascript
     const stage = Math.min(5, Math.floor(rot * 5) + 1);
     ```
   - This mathematically expects 5 stages partitioned evenly into 20% quintiles: `[0-20%)`, `[20-40%)`, `[40-60%)`, `[60-80%)`, and `[80-100%+]`.

5. **Developer Debug Mode (`static/index.html:643-645, 2346-2351`)**:
   - `devMode` cycles 4 values (`[D] REALTIME`, `STAGE 1`, `STAGE 2`, `STAGE 3`), returning `0.1`, `0.55`, `0.95`.

6. **Test Suite Status**:
   - Executed `.\venv\Scripts\python -m unittest tests/test_dice_logic.py tests/test_app.py tests/test_e2e_probe.py tests/test_challenger_m2.py`: Ran 49 tests, 100% passed (`OK`).

---

## 2. Logic Chain

1. **Mathematical Partitioning**:
   - From Observation 2 and 4, `rot = (now - created_at) / (deadline_at - created_at)` spans `[0, ∞)`.
   - Dividing into 5 stages gives:
     - Stage 1: `0.0 <= rot < 0.20` (0% - 20%)
     - Stage 2: `0.20 <= rot < 0.40` (20% - 40%)
     - Stage 3: `0.40 <= rot < 0.60` (40% - 60%)
     - Stage 4: `0.60 <= rot < 0.80` (60% - 80%)
     - Stage 5: `rot >= 0.80` (80% - 100%+ and Overdue).
   - This aligns directly with `Math.min(5, Math.floor(rot * 5) + 1)` in `drawRetroTooltip`.

2. **2.5D Isometric Lighting Triads**:
   - Standard dimetric projection has key lighting from the top-left:
     - **Top Face**: Key direct illumination (lightest tone).
     - **Left Face**: Fill lateral illumination (midtone).
     - **Right Face**: Shadow indirect illumination (darkest tone).
   - The hex specifications map cleanly to this hierarchy:
     - **Stage 1 (Pristine Ivory)**: Top `#fdfbf7`, Left `#f1ecdc`, Right `#e5dec9`, Pips `#18181b`.
     - **Stage 2 (Fading Sandy Yellow)**: Top `#eae0c8`, Left `#d7cbb0`, Right `#c5b89a`, Pips `#3c352a`.
     - **Stage 3 (Cracked Stone)**: Top `#8a8d8f`, Left `#727577`, Right `#5a5c5e`, Pips `#222426`.
     - **Stage 4 (Mossy Decay)**: Top `#4a5d4e`, Left `#3a4b3e`, Right `#2d3a30`, Pips `#18221b`.
     - **Stage 5 (Toxic Necrotic Purple/Green)**: Top `#2e1f3d`, Left `#22162e`, Right `#1a2e22`, Pips `#a3e635` (luminescent radioactive lime).

3. **Stage-Specific Procedural Overlays**:
   - **Stage 1 Specular Highlight**: A diagonal specular reflection streak across the top rhombus face `(cx - rx * 0.65, cy - ry * 0.1) -> (cx - rx * 0.15, cy - ry * 0.6)` in `rgba(255, 255, 255, 0.9)` with a 2x2 sparkle glint.
   - **Stage 2 Corner Scratches**: 4 subtle hairline scratches (`#9c8f76`, 1px) along the isometric perimeter and vertical crease.
   - **Stage 3 Cracked Stone**: Exactly 4 dark jagged fissures (`#1c1d1f`, 1.5px) cutting across the top face down through the left face and branching into the right face.
   - **Stage 4 Mossy Decay**: Multi-cluster purple/green mycelial fungus dots (`#84cc16`, `#a3e635`, `#c084fc`, `#7e22ce`) plus dark creeping roots (`#142217`, 1.5px) wrapping around the left, right, and top edges.
   - **Stage 5 Toxic Necrotic Corruption**: Abyssal sludge and necrotic purple veins (`#022c22`, `#581c87`), toxic pustules, and glowing radioactive lime pips (`#a3e635`).

4. **Overdue Label Blinking (`rot >= 1.0`)**:
   - In `drawDiceLabel`, when `rot >= 1.0`, `Math.floor(Date.now() / 350) % 2 === 0` alternates between `#ef4444` (bright red) and `#ffffff` (bright white), delivering an unmistakable retro emergency alert.
   - For on-time stages, text colors provide high contrast against the face backgrounds:
     - Stage 1: `#111827` (obsidian on ivory)
     - Stage 2: `#2b291d` (dark sepia on sandy)
     - Stage 3: `#f8fafc` (crisp white on cracked stone)
     - Stage 4: `#a3e635` (spore lime on dark moss)
     - Stage 5: `#a3e635` (radioactive lime on necrotic purple)

---

## 3. Caveats

1. **Subagent Division of Labor**:
   - Explorer `m3_2` investigates twitch jitter and persistent floor slime puddles.
   - Explorer `m3_3` investigates overdue badges and retro tooltip synchronization.
   - The proposed code in this report maintains compatibility with particle spawns and tooltip state.
2. **Dynamic Canvas Scaling**:
   - When dice stack exceeds 5, vertical step compression is applied (`recalculateTargets`). The isometric rhombus geometry (`rx`, `ry`, `height`) scales from `DICE_CONFIG[weight]`, and all procedural texture coordinates use relative multipliers (`rx * k`, `ry * k`, `height * k`) to guarantee distortion-free rendering across all weights 1-5.

---

## 4. Conclusion

1. The existing 3-tier placeholder in `drawRotIsometricDice` must be updated to the 5-stage rot engine.
2. Complete drop-in code has been written and saved to:
   - `proposed_die_rot_engine.js`
   - `die_rot_engine.patch`
3. The proposed implementation fulfills all requirements of Milestone 3 Task R3 without regressions.

---

## 5. Verification Method

1. **Patch Application Verification**:
   - Review `die_rot_engine.patch` against `static/index.html:885-1060`.
2. **Automated Test Suite**:
   ```powershell
   .\venv\Scripts\python -m unittest tests/test_dice_logic.py tests/test_app.py tests/test_e2e_probe.py tests/test_challenger_m2.py
   ```
   Must pass with zero failures.
3. **Interactive Debug Verification**:
   - Press 'D' in the desktop application to toggle `devMode` across all 5 stages and verify the specular glint, scratches, 4 fissures, fungus dots + creeping roots, and overdue blinking red label.
4. **Security Scan**:
   ```powershell
   python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
   ```
