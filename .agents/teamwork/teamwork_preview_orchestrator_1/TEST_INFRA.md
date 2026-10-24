# E2E Test Infra: TaskbarDice Overhaul

## Test Philosophy
- Opaque-box, requirement-driven, deterministic test harness.
- Verification covers all 5 User Requirements (R1 to R5) and 7 Acceptance Criteria.
- Automated headless E2E probe script + unit test coverage + static security scanner.

## Feature Inventory Test Coverage
| # | Feature | Requirement | Tier 1 (Unit) | Tier 2 (Boundary) | Tier 3 (Integration) | Tier 4 (Scenario) |
|---|---------|-------------|:-------------:|:-----------------:|:--------------------:|:-----------------:|
| 1 | Window & Anchor Dimensions | R1 | ✓ | ✓ | ✓ | ✓ |
| 2 | 400x420 Flexbox Layout Budget | R1 | ✓ | ✓ | ✓ | ✓ |
| 3 | Control Panel Row 1 & Row 2 | R1 | ✓ | ✓ | ✓ | ✓ |
| 4 | Explicit Weight & Time API | R1, AC2 | ✓ | ✓ | ✓ | ✓ |
| 5 | Tier 0 Empty Void Background | R2 | ✓ | ✓ | ✓ | ✓ |
| 6 | Tiers 1-10 Abyss Progression | R2, AC3 | ✓ | ✓ | ✓ | ✓ |
| 7 | Dynamic Rot Hue Shifting | R2 | ✓ | ✓ | ✓ | ✓ |
| 8 | Zen Garden Transition & Lighting | R2, R5, AC6 | ✓ | ✓ | ✓ | ✓ |
| 9 | 5-Stage Rot Engine Logic & Visuals | R3 | ✓ | ✓ | ✓ | ✓ |
| 10 | Stage 5 Necrotic Twitch & Slime Puddles | R3 | ✓ | ✓ | ✓ | ✓ |
| 11 | Resting Die Hover Hit Test | R4, AC4 | ✓ | ✓ | ✓ | ✓ |
| 12 | Glowing Pixel Border | R4 | ✓ | ✓ | ✓ | ✓ |
| 13 | Retro Floating Countdown Tooltip | R4 | ✓ | ✓ | ✓ | ✓ |
| 14 | Overdue Streak Penalty | R5, AC5 | ✓ | ✓ | ✓ | ✓ |
| 15 | On-Time Streak Combo | R5 | ✓ | ✓ | ✓ | ✓ |
| 16 | Security & Secret Cleanliness | Rule, AC7 | ✓ | ✓ | ✓ | ✓ |

## Test Architecture
- **Environment**: Target Windows PowerShell using `.\.venv\Scripts\python.exe`.
- **Unit & Regression Suites**:
  - `.\.venv\Scripts\python.exe -m unittest discover -s tests`
  - `.\.venv\Scripts\python.exe .agents/skills/self-evolver/scripts/benchmark_probe.py`
- **E2E Probe Script**:
  - `.\.venv\Scripts\python.exe tests/test_e2e_probe.py`
  - Programmatically exercises API contracts, DOM layout budget, state transitions, rot calculations, background tier escalations, hover hit tests, and streak penalty handling.
- **AgentShield Security Scan**:
  - `.\.venv\Scripts\python.exe .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .`

## Coverage Thresholds
- Unit Tests: 100% pass across all test modules.
- E2E Probe: 100% assertions pass across all 7 Acceptance Criteria.
- AgentShield: 0 secret leaks, 0 command injections, 0 destructive actions.
