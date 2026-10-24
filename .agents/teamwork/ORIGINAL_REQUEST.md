# Original User Request

## 2026-10-24T06:53:49Z

Overhaul TaskbarDice into a production-grade retro 2.5D desktop widget with 400x420 zero-overflow layout, 2-row NES input, 10 escalating Lovecraftian abyss backgrounds, 5-stage time-scaled rot engine, and retro hover countdown inspection.

Working directory: c:\Users\haquo\Documents\antigravity\amazing-turing
Integrity mode: development

## Requirements

### R1. Zero-Overflow 400x420 Flexbox Layout & 2-Row Control Panel
- Window size 400x420 anchored above Windows 11 Taskbar (margin_y: 64, margin_x: 16).
- Flexbox column layout: Header 26px + Canvas 320px + Control Panel 74px (0px overflow).
- Row 1: Text input (78%) + Green NES ADD button (22%).
- Row 2: Weight selection (W: [1][2][3][4][5]) + Time presets (T: [15m][25m][1h][4h][..m]).

### R2. 10 Escalating Lovecraftian Abyss Backgrounds
- Tier 0: Pitch black Empty Void (#121417) with 'TYPE TASK & ROLL TO BEGIN' for fresh startup with 0 tasks.
- Tier 1 to 10: Scaling with dice stack count (1 to 10):
  - Void -> Cold Dust -> Frost Cracks -> Sprouting Thorns -> Creeping Vines -> Toxic Spores -> Blood Veins -> Demon Eyes -> Abyssal Eclipse -> Pandemonium Overload.
- Background hue dynamically shifts with overall rot factor.
- Completing tasks de-escalates background tiers smoothly; clearing all tasks transitions to Zen Garden.

### R3. 5-Stage Isometric Die Rot Engine
- Rot factor: (now - created_at) / (deadline_at - created_at).
- Stage 1 (0-20%): Pristine ivory + shine highlight.
- Stage 2 (20-40%): Fading sandy yellow + corner scratches.
- Stage 3 (40-60%): Cracked stone + 3-4 dark jagged fissures.
- Stage 4 (60-80%): Mossy decay + purple/green fungus dots + creeping roots.
- Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green + twitch vibration + continuous slime drips creating floor puddles. Blinking red label when overdue.

### R4. Retro Hover Inspection Tooltip
- Mousemove on canvas detects resting die bounding box and renders glowing pixel border.
- Floating retro tooltip displays: Full Title, Weight, Stage X/5, Countdown Timer ('CÒN: Xm Ys' or blinking red 'QUÁ HẠN: +Xm Ys').

### R5. Overdue Penalty & Zen Garden Victory
- Completing overdue Stage 5 task resets sessionStreak = 0.
- Completing on-time task increments sessionStreak (+1 STREAK combo if >= 2).
- Clearing all dice triggers Zen Garden (Day/Night dynamic lighting).

## Acceptance Criteria
- [ ] 400x420 window rendered with no bottom bar clipping or overflow.
- [ ] Adding task with Weight=4 and Time=15m records exact weight and ISO timestamps.
- [ ] Stacking 10 dice escalates background from Tier 1 to Tier 10 without canvas clipping.
- [ ] Hovering resting die renders highlight and countdown tooltip.
- [ ] Overdue task completion resets streak to 0.
- [ ] Zero task clear triggers Zen Garden.
- [ ] E2E probe script and AgentShield static security scan pass 100%.


## 2026-10-24T10:32:07Z

User approved: continue. Please proceed with Orchestrator Generation 2, complete Milestone 3/4 verification, and run final E2E and AgentShield scan.
