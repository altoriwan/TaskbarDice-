## 2026-10-24T09:02:23Z
You are teamwork_preview_worker_m3_1.
Your working directory is: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_worker_m3_1
The authoritative user request is: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_orchestrator_1\PROJECT.md
Project Root: c:\Users\haquo\Documents\antigravity\amazing-turing

You own the following file exclusively:
- `static/index.html`

Read the 3 Explorer handoffs and proposed engine files:
- Visuals: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_1\handoff.md
- Proposed Visual Engine: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_1\proposed_die_rot_engine.js
- Physics & Puddles: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_2\handoff.md
- Proposed Physics Engine: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_2\proposed_stage5_physics.js
- Tooltip & Overdue Sync: c:\Users\haquo\Documents\antigravity\amazing-turing\.agents\teamwork\teamwork_preview_explorer_m3_3\handoff.md

TASK:
Implement Milestone 3 (5-Stage Isometric Die Rot Engine, Twitch Vibration, Slime Drips & Floor Puddles, and Tooltip Sync):
1. In `static/index.html`:
   - Replace the legacy 3-tier placeholder in `drawRotIsometricDice` with the complete 5-Stage Isometric Rot Engine:
     - Stage 1 (0-20%): Pristine ivory (`#fdfbf7`, `#e5dec9`) + specular shine highlight streak across top face.
     - Stage 2 (20-40%): Fading sandy yellow (`#eae0c8`, `#c5b89a`) + corner scratches on isometric edges.
     - Stage 3 (40-60%): Cracked stone (`#8a8d8f`, `#5a5c5e`) + 4 dark jagged fissures across die faces.
     - Stage 4 (60-80%): Mossy decay (`#4a5d4e`, `#2d3a30`) + purple/green fungus dots + creeping roots wrapping around sides.
     - Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green (`#2e1f3d`, `#1a2e22`) + blinking red overdue label when `rot >= 1.0`.
   - Implement Stage 5 Twitch Vibration micro-jitter (`dx, dy`) scaling up frequency and amplitude when overdue.
   - Implement continuous Slime Drips spawning from Stage 5 dice falling to `GROUND_Y = 290px`, creating and expanding persistent pooling Slime Puddles with bubbling.
   - Use pre-allocated object pools (`slimeDripPool`, `slimePuddlePool`, `slimeSplashPool`) to ensure zero-allocation 60 FPS performance.
   - Implement Hover Inspection Tooltip and 2px glowing pixel border on resting dice with smart 4-way clamping inside 400x320 canvas: Full Title, Weight, Stage X/5, Countdown Timer (`CÒN: Xm Ys` or blinking red `QUÁ HẠN: +Xm Ys`).
2. Run test verification using `.\.venv\Scripts\python.exe`:
   - `.\.venv\Scripts\python.exe -m unittest tests/test_e2e_probe.py` (Verify AC1, AC2, AC3, AC4, AC5, AC6, AC7 all PASS).
   - `.\.venv\Scripts\python.exe -m unittest discover -s tests` (All unit and stress tests pass).
   - `.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .` (AgentShield PASS).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

3. Update progress.md with "Last visited" timestamps.
4. Write detailed handoff.md in your working directory and notify caller via send_message.
