---
name: systematic-debugging
description: >-
  Enforces a rigorous 4-phase debugging methodology adapted from Jesse Vincent's
  Superpowers. Use whenever encountering a bug, test failure, unexpected behavior,
  or stack trace. Strictly forbids guessing or making speculative code edits.
---

# Systematic Debugging Protocol (Superpowers Standard)

When code fails, human developers and AI models often make the mistake of "shotgun debugging":
speculating on possible causes and randomly changing lines until something works. This leads
to subtle regressions, messy codebases, and lost time.

This skill mandates an evidence-based, four-phase debugging process.

```text
[1. Reproduce Minimally] ---> [2. Isolate State & Path] ---> [3. Formulate Hypothesis]
                                                                        |
                                                                        v
[5. Solved & Verified] <--- [Zero Regressions?] <--- [4. Apply Minimal Patch]
```

---

## The Four Phases

### Phase 1: Minimal Reproduction
- **Do not touch implementation code yet.**
- Create a standalone test case or run a single CLI command that consistently reproduces the failure.
- Confirm the exit code is non-zero or the assertion fails with the exact observed symptom.

### Phase 2: Isolation & Trace Analysis
- Run the trace analyzer to map the failure:
  ```powershell
  python .agents/plugins/superpowers-ecc/skills/systematic-debugging/scripts/trace_analyzer.py --trace "<paste_traceback_or_log>"
  ```
- Identify:
  1. The outermost call site in your project code (where execution diverged).
  2. The actual runtime state / variables passed at that exact moment.
  3. The expected vs actual values.

### Phase 3: Falsifiable Hypothesis
- Before writing a patch, state your hypothesis explicitly:
  > *"Hypothesis: The function `process_record` throws KeyError because the payload from API endpoint `/v2/data` wraps the dictionary inside a `result` key under pagination mode."*
- If your hypothesis cannot be proven or disproven by checking the code or printing variable state, it is too vague.

### Phase 4: Minimal Targeted Fix & Verification
- Apply the smallest necessary edit to address the root cause.
- Re-run the reproduction test: It **must pass**.
- Run the full regression test suite: Ensure no existing tests break.
- Consult [Debugging Playbook](./references/debugging_playbook.md) for recurring failure patterns.
