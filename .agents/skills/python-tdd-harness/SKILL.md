---
name: python-tdd-harness
description: >-
  Implements a Test-Driven Development (TDD) and closed-loop automated repair harness
  for Python tasks based on SWE-agent patterns. Use when writing new Python modules,
  fixing bugs, or verifying code correctness via pytest/unittest.
---

# Python TDD & Auto-Repair Harness

This skill implements an agentic **Test-Driven Development (TDD) and Repair Loop**
inspired by `SWE-agent` and `mini-SWE-agent`. Instead of writing untested code,
the agent establishes reproduction tests first, executes them in the sandbox,
and iteratively patches code until all tests pass with zero regressions.

## The Closed-Loop TDD Lifecycle

```text
[1. Write Reproduction Test] ---> [2. Run Test (Must Fail Initially)]
                                            |
                                            v
[5. Final Verified Solution] <--- [4. Test Pass?] <--- [3. Apply Minimal Patch]
                                        | (Fail)
                                        +---> [Analyze Traceback & Loop]
```

## Step-by-Step Procedure

### 1. Write the Reproduction Test First
- Create a test file (e.g., `tests/test_<feature>.py`) capturing expected behaviors or reproducing the reported bug.
- Use Python's standard `unittest` or `pytest`.
- Include boundary conditions (empty inputs, unicode strings, edge cases).

### 2. Execute Test Baseline
Run the automated TDD cycle runner:
```powershell
python .agents/skills/python-tdd-harness/scripts/run_tdd_cycle.py --test-path tests/test_<feature>.py
```
- Confirm the test fails for the expected reason (reproduction verified).

### 3. Generate Minimal Patch
- Write or modify the implementation file.
- Follow Clean Architecture and type annotations.
- Keep modifications minimal and preserve existing comments.

### 4. Run the Repair Loop (Iterative Feedback)
- Re-run `run_tdd_cycle.py`.
- If tests pass: Verify zero regressions across any existing test suite.
- If tests fail: Inspect the structured traceback emitted by `run_tdd_cycle.py`.
  - Max loop limit: 3 iterations.
  - If stuck after 3 iterations, stop and explain the blockers to the user.

### 5. Document & Report
- Cite the test command and exit code.
- Report tests passed, assertions verified, and any remaining edge cases.
