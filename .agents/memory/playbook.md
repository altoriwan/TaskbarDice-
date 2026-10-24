# Engineering Playbook & Session Memory

Persistent knowledge repository capturing architectural decisions, edge case patterns,
and operational lessons learned during development sessions.

---

## Pattern: Pure-Python Percentile Interpolation
- **Context**: Calculating $p50$, $p95$, and $p99$ latencies without depending on heavy third-party packages like `numpy` or `scipy`.
- **Solution**: Use linear rank interpolation:
  $$k = (n - 1) \times p$$
  Where $d_0 = \text{val}[\lfloor k \rfloor] \times (\lceil k \rceil - k)$ and $d_1 = \text{val}[\lceil k \rceil] \times (k - \lfloor k \rfloor)$.
- **Benefit**: Zero external C-dependencies, instant startup, lightweight execution in sandbox.

## Pattern: Standalone Generative UI Dashboard
- **Context**: Creating interactive dashboards directly viewable inside Antigravity artifacts.
- **Solution**: Embed Chart.js via CDN in a standalone HTML file with dark/light CSS variables and client-side JavaScript filtering.
- **Benefit**: Fully self-contained, no running server needed, interactive real-time filtering of logs and metrics.

## Invariant: Safe Pipeline Output Separation
- **Context**: Ensuring pipeline outputs never touch or overwrite source data.
- **Solution**: Explicit folder roles:
  - `data/`: Transient pipeline run data (`.jsonl`).
  - `output/`: Generated deliverables (`.html`).
  - `input/`: Strictly read-only reference data.

## Pattern: Real-Time Rot & Decay Engine (TaskbarDice M3)
- **Context**: Visualizing procrastination on 2.5D pixel dice on Canvas 2D without complex 3D physics engines.
- **Solution**:
  - `rot_factor` computed as `(now - created_at) / (deadline_at - created_at)` clamped to `[0.0, 1.0]`.
  - 3-stage visual transition: Pristine Ivory (highlight) -> Cracked Sickly Stone -> Toxic Slime (2x2 dripping particles).
  - Procedural background corruption roots creeping inward from canvas corners with sinusoidal pulse in Stage 3.
  - Developer speed-test mode (Key 'D') cycles through stages instantly without waiting for elapsed time.
- **Benefit**: Pure Canvas 2D lightweight implementation, highly responsive, zero external graphics dependencies.

## Pattern: Particle Explosion, Gravity Collapse & Zen Garden (TaskbarDice M4)
- **Context**: Completing the gamified task loop with satisfying tactile feedback, physics reactions, and clear victory states.
- **Solution**:
  - Double-click 2.5D hit-detection scanning top-to-bottom bounding boxes.
  - Anti-slacking confirmation dialog with NES.css styling.
  - 40-60 particle burst inheriting palette from decay stage, with gravity $gy = 0.25$ and opacity decay.
  - Immediate `recalculateTargets()` triggering smooth gravity collapse on remaining upper blocks.
  - Victory state when stack reaches 0: procedural roots vanish, twilight gradient sky, 2-frame swaying grass, blooming flower clusters, fluttering butterflies, and floating banner "ALL CLEAR. REST EASY.".
- **Benefit**: High replayability, engaging dopamine loop, and complete desktop gamification lifecycle.

## Pattern: 10-Task Overload Mechanic, Micro-Juice & Dynamic Lighting (TaskbarDice QA & Polish)
- **Context**: Enforcing strict desktop widget constraints (preventing dice from clipping past the top border), defending against concurrency/edge-case spam, and amplifying retro tactile juice.
- **Solution**:
  - Dynamic vertical compaction: when count $> 5$, step compresses dynamically $\min(\text{height}, \max(11, \lfloor 108 / (\text{count} - 1) \rfloor))$ ensuring the 10th block stops at $y \ge 34\text{px}$ (never clipping header).
  - Overload state at $N=10$: lock input bar, disable submit button, render flashing retro warning banner, procedural camera wobble/tilt for tower instability, and NES shake animation upon attempting an 11th block.
  - Mid-air drop state lock: ignore double-clicks on blocks that have not finished settling ($|currentY - targetY| > 2.0$).
  - Atomic thread-safe persistence: wrap `TaskStorage` in `threading.Lock()` and write via `.tmp` + `os.replace`.
  - Micro-juice: 3-frame screen shake on heavy drop (weight $\ge 4$) and completion explosions.
  - Streak multiplier: floating combo score text `+1 STREAK! KEEP ROLLING` for $\ge 2$ completions in a session.
  - Dynamic Day/Night lighting: client-time detection shifts Zen Garden between azure sunny sky with pixel sun/clouds and twilight starry sky with crescent moon.
- **Benefit**: Flawless UX stability, complete protection against edge-case corruption, and elevated retro game feel.

## Pattern: Master Overhaul — 10 Lovecraftian Abyss Tiers, 5-Stage Real-Time Rot & Zero-Overflow Flexbox
- **Context**: Scaling task urgency visually across 10 dice levels, providing explicit weight/time control, and guaranteeing 100% UI stability across high-DPI Windows 11 desktop environments without clipping.
- **Solution**:
  - Zero-Overflow Flexbox: 400x420 window with `margin_y: 64` (safely clear of Win 11 Taskbar), Header 26px + Canvas 320px (`GROUND_Y = 285`) + Control Panel 74px (Row 1: Text 78% + Submit 22%; Row 2: Weight 1-5 + Time presets).
  - 10-Tier Lovecraftian Abyss Backgrounds: Scaling procedural Canvas 2D art (Void -> Dust -> Cracks -> Thorns -> Vines -> Spores -> Blood Veins -> Demon Eyes -> Abyssal Eclipse -> Pandemonium Overload), hue shifting dynamically with rot factor.
  - 5-Stage Real-Time Die Rot Engine: Pristine ivory -> Sandy yellow -> Cracked fissures -> Mossy/fungus -> Necrotic slime with twitch jitter micro-vibrations and pooling bubbling slime puddles on the floor.
  - Character-Chunking Ellipsis Word Wrapping: Tooltip boundary clamping with hard character chunking preventing 1000-char continuous tokens from breaking the retro HUD frame.
  - Overdue Stage 5 Penalty: Streak reset to 0 upon completing an overdue task, driving natural behavioral anti-procrastination.
- **Benefit**: Immersive desktop gamification, rigorous zero-leak particle pooling, and bulletproof adversarial stress resistance.



