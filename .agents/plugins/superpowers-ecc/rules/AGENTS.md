# Superpowers & ECC Operational Rules for Antigravity

These rules enforce disciplined engineering practices adapted from **`obra/superpowers`**
and **`affaan-m/ecc`**.

---

## 1. The 7-Step Engineering Pipeline (ECC Standard)
For any non-trivial coding task or feature implementation, the agent must adhere to the lifecycle:
1. **Plan**: Formulate a clear, bounded implementation plan (using `/plan` or `writing-plans`).
2. **Test**: Write reproduction or unit test assertions before modifying implementation code.
3. **Implement**: Apply the minimal code patch adhering to Clean Architecture.
4. **Review**: Invoke or self-evaluate against the 2-Tier review criteria (Spec Compliance + Code Quality).
5. **Verify**: Execute the full test suite in the sandbox to guarantee zero regressions.
6. **Remember**: Log any architectural decisions, edge cases, or failure patterns to the persistent playbook.
7. **Improve**: Trigger `self-evolver` or reflect on optimizations if recurring friction occurred.

---

## 2. Systematic Debugging Invariants (Superpowers Standard)
- **Anti-Guessing Guardrail**: Never jump directly into editing code when an error occurs.
- **Mandatory 4 Phases**:
  1. *Reproduce*: Prove the bug with an isolated test case or command reproducing the exact failure.
  2. *Isolate*: Inspect variable state, call stack, and environment inputs to locate the exact point of divergence.
  3. *Hypothesize*: Formulate a falsifiable hypothesis explaining *why* the bug occurs.
  4. *Verify Minimal Fix*: Apply the minimal targeted fix and verify that the reproduction test passes.

---

## 3. Subagent Reviewer Delegation
- When completing significant changes, launch a dedicated subagent or perform a two-tier review:
  - **Tier 1 (Spec Compliance)**: Does the change satisfy all requirements without omissions?
  - **Tier 2 (Quality & Security)**: Is the code clean, modular, properly typed, and free of security flaws?

---

## 4. AgentShield Pre-Execution Security (ECC Standard)
- Before executing scripts or finalizing files, ensure:
  - No API keys, passwords, or credentials are hardcoded.
  - No unsafe shell expansions or injection vectors exist.
  - Never modify files in `input/` or system-critical directories.
