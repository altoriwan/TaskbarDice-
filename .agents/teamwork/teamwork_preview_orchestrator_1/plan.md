# Plan: TaskbarDice Overhaul Orchestration

## Objective
Orchestrate the complete, production-grade implementation and end-to-end verification of TaskbarDice retro 2.5D desktop widget per `ORIGINAL_REQUEST.md`.

## Methodology & Architecture
Follow the Project Pattern with dual tracks:
1. Implementation Track (Milestones M1 to M5)
2. E2E Testing & Security Verification Track (Opaque-box test suite + E2E probe + AgentShield static scan)

## Iteration & Milestones
- **Phase 0: Comprehensive Survey & Spec Mining**
  - Dispatch 3 parallel agents:
    - Spec Miner: Extract every constraint, formula, timing, UI spec, and error behavior from ORIGINAL_REQUEST.md and existing specs.
    - Codebase Explorer 1: Inspect backend (`main.py`, `app.py`, `dice_logic.py`, `tasks.json`, Flask/webview/PyQt architecture).
    - Codebase Explorer 2: Inspect frontend canvas, layout, HTML/CSS/JS in `static/` or template files, existing physics/rendering engine.
  - Compile `PROJECT.md` (Feature Inventory, Architecture, Code Layout, Interfaces) and `TEST_INFRA.md`.

- **Phase 1: Parallel Tracks Launch**
  - Track A (E2E Testing Track): Develop E2E test harness & probe script covering Tiers 1-4.
  - Track B (Implementation Track):
    - M1: Zero-Overflow 400x420 Flexbox Layout & 2-Row Control Panel (Header 26px + Canvas 320px + Control Panel 74px, W: 1-5, T: presets).
    - M2: 10 Escalating Lovecraftian Abyss Backgrounds + Dynamic Hue Rot Shifts + Zen Garden (Day/Night dynamic lighting).
    - M3: 5-Stage Isometric Die Rot Engine + Physics & Slime Puddles + Twitch vibration + Blinking red label when overdue.
    - M4: Retro Hover Inspection Tooltip (Bounding box detection, glowing pixel border, countdown timer / overdue counter).
    - M5: Overdue Penalty, Streak Combo Logic, Full Acceptance Verification, and AgentShield Security Scan.

- **Phase 2: Final Acceptance & Reporting**
  - Run full E2E test suite and automated probe.
  - Run AgentShield security scan.
  - Forensic Auditor integrity attestation.
  - Synthesize and send completion message to Sentinel.
