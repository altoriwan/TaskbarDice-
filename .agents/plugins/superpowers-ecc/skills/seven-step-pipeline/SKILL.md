---
name: seven-step-pipeline
description: >-
  Implements the closed-loop 7-step engineering pipeline adapted from Affaan Mustafa's
  Everything Claude Code (ECC): Plan -> Test -> Implement -> Review -> Verify -> Remember -> Improve.
  Ensures disciplined task execution with file-based state persistence.
---

# Seven-Step Engineering Pipeline (ECC Standard)

Ad-hoc coding without a standardized workflow leads to skipped tests, missed edge cases,
and forgotten architectural decisions. The ECC 7-Step Pipeline establishes a disciplined,
reproducible engineering lifecycle for AI agents.

---

## The 7-Step Lifecycle

```text
[1. Plan] ----> [2. Test] ----> [3. Implement] ----> [4. Review]
                                                        |
[7. Improve] <-- [6. Remember] <-- [5. Verify] <--------+
```

| Step | Name | Objective | Tool / Artifact |
|------|------|-----------|-----------------|
| **1** | **Plan** | Decompose task, establish invariants, specify acceptance criteria. | `/plan` or `writing-plans` |
| **2** | **Test** | Write failing reproduction or unit tests *before* writing production code. | `python-tdd-harness` |
| **3** | **Implement** | Write minimal, clean code satisfying the test criteria. | File editing tools |
| **4** | **Review** | Evaluate against 2-tier criteria (spec compliance + code quality). | `subagent-code-reviewer` |
| **5** | **Verify** | Execute full test suite in sandbox to confirm zero regressions. | Sandbox CLI execution |
| **6** | **Remember** | Record architectural decisions and failure patterns into persistent memory. | `.agents/memory/playbook.md` |
| **7** | **Improve** | If recurring friction occurred, trigger self-evolution. | `self-evolver` |

---

## State Tracking with `pipeline_tracker.py`

To track state and progress across multi-turn sessions:
```powershell
# 1. Initialize task
python .agents/plugins/superpowers-ecc/skills/seven-step-pipeline/scripts/pipeline_tracker.py --init "Build User Authentication Service"

# 2. Advance to next step
python .agents/plugins/superpowers-ecc/skills/seven-step-pipeline/scripts/pipeline_tracker.py --advance "Completed step 2: Tests written"

# 3. View current status
python .agents/plugins/superpowers-ecc/skills/seven-step-pipeline/scripts/pipeline_tracker.py --status
```

See [Pipeline Lifecycle Guide](./references/pipeline_lifecycle.md) for deep-dive examples.
