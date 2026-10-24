# BRIEFING — 2026-10-24T09:01:30Z

## Mission
Investigate and design the integration of Rot Engine with Tooltip and Overdue Feedback (Milestones 3 & 4) in static/index.html.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_3
- Original parent: c7033bf1-17f5-4e3e-b0da-884a138572ab
- Milestone: Milestone 3 & 4 Synergy (Rot Engine + Tooltip & Overdue Feedback)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in codebase
- Windows PowerShell environment
- Answer in Vietnamese, identifiers/code in English
- Keep BRIEFING under ~100 lines
- Write only to teamwork_preview_explorer_m3_3 folder

## Current Parent
- Conversation ID: c7033bf1-17f5-4e3e-b0da-884a138572ab
- Updated: not yet

## Investigation State
- **Explored paths**: static/index.html (lines 530-635, 880-1060, 1920-2040, 2160-2275), tests/test_e2e_probe.py (lines 220-265, 625-670), tests/verify_js_m2.js, ORIGINAL_REQUEST.md, PROJECT.md, peer dispatches (m3_1, m3_2).
- **Key findings**:
  1. Overdue die label missing: currently no banner above die when rot >= 1.0; only tooltip time text changes to QUÁ HẠN. Designed pulsing banner `! QUÁ HẠN !` at `cy - ry - 14`.
  2. Tooltip title truncated: `die.title.substring(0, 16)` cuts titles; designed dynamic multi-line title wrapping up to 2 lines and dynamic width 160-220px.
  3. Tooltip countdown blinking missing: static `#e76e55` replaced with 220ms alternating red flash (`#ff2222` vs `#881111`).
  4. Tooltip layout clamping: hardcoded min/max replaced with dynamic padding 8px and smart cursor flip (left/right, above/below) preventing canvas 400x320 overflow.
  5. Glowing border: 2px strokeRect enhanced with pulsing sine glow (`rgba(255, 215, 0, alpha)` / overdue red glow).
- **Unexplored areas**: None for M3_3 scope. Ready for handoff.

## Key Decisions Made
- Designed non-breaking, clean mathematical models for isometric hit-testing, clamping, pulsing banners, and retro NES tooltips.
- Verified test_e2e_probe.py AC4 string contracts are strictly preserved.

## Artifact Index
- DISPATCH.md — Dispatch log
- BRIEFING.md — Persistent context
- progress.md — Liveness & status heartbeat
- handoff.md — Final investigation report
