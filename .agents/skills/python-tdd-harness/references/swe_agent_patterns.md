# SWE-Agent Automated Repair & TDD Patterns

This document details practical principles adapted from **SWE-agent**
(Princeton NLP) and **mini-SWE-agent** for LLM coding agents.

---

## 1. The Trap of "One-Shot" Code Generation

In standard chat-based coding, models attempt to generate the entire solution
in one turn without executing it. When subtle syntax bugs, import errors, or logic
flaws occur, the user is forced to manually test and report errors back to the model.

### SWE-Agent Alternative: Closed-Loop Execution
- Treat code generation as an iterative hypothesis-testing loop:
  1. Formulate hypothesis (failing test reproducing expected behavior).
  2. Implement code patch.
  3. Validate against interpreter output.
  4. Iterate until clean.

---

## 2. Token-Efficient Failure Parsing

Feeding hundreds of lines of raw terminal logs back into an LLM context window causes:
- High token cost.
- "Lost in the middle" attention degradation.
- Context pollution with irrelevant warning messages.

**Best Practice**: Use a structured runner (like `run_tdd_cycle.py`) that filters
out boilerplate, extracting only:
- Exit code.
- Specific failing test names.
- The precise `AssertionError` or traceback snippet (capped at 20-25 lines).

---

## 3. The 3-Iteration Circuit Breaker

To avoid infinite loops and token waste:
- If an agent fails to resolve test failures within **3 attempts**, it must break
  the loop, report the exact blockers to the human user, and ask for guidance
  rather than endlessly guessing.
