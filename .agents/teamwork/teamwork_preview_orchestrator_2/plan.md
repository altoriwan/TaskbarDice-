# Execution Plan: TaskbarDice Overhaul Completion

## Objective
Complete remaining milestones (M3/M4 gate verification, M5 implementation & verification), full test suite execution, security scan, forensic audit attestation, and sentinel handoff.

## Steps
1. **Step 1: State & Gap Inspection (M3, M4, M5)**
   - Dispatch `teamwork_preview_explorer` to inspect `static/index.html`, `app.py`, `dice_logic.py`, and verify existing implementation status of M3, M4, and M5 (streak handling, overdue penalty, combo display, Zen Garden trigger).

2. **Step 2: Milestone 3 & 4 Verification & Gate**
   - Dispatch Reviewer (`teamwork_preview_reviewer`), Challenger (`teamwork_preview_challenger`), and Forensic Auditor (`teamwork_preview_auditor`) to verify `worker_m3_iter2_2`'s tooltip word wrapping, rot stages, twitch, and puddles.
   - Record verdicts in `GATE_STATUS.md`.

3. **Step 3: Milestone 5 Implementation & Verification**
   - If M5 needs changes or fixes: dispatch Worker (`teamwork_preview_worker`) to implement overdue penalty streak reset, on-time combo streak, Zen Garden victory display.
   - Verify M5 with Reviewers, Challenger, and Auditor.

4. **Step 4: End-to-End Acceptance Suite & Security Audit**
   - Worker runs `tests/test_e2e_probe.py` (all 7 ACs pass), `tests/verify_js_m3.js`, full discover unit tests, and AgentShield static security scanner.

5. **Step 5: Final Project Forensic Attestation & Sentinel Handoff**
   - Dispatch final Forensic Auditor for project-wide attestation.
   - Send complete report to Sentinel (`1b1b4ab3-bfc4-4e5f-a228-b08f8c7148ca`).
