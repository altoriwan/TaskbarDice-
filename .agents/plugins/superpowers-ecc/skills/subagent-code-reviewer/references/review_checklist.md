# Two-Tier Code Review Checklist

Use this checklist when evaluating code changes before merging or declaring a task complete.

---

## Tier 1: Specification & Functional Correctness

| # | Check Item | Verification Question | Pass / Fail |
|---|------------|------------------------|-------------|
| 1.1 | Requirement Alignment | Does the code implement all requirements from the prompt? | [ ] |
| 1.2 | Boundary Conditions | Are boundary conditions handled (empty input, 0, negative, unicode)? | [ ] |
| 1.3 | Error Handling | Are expected exceptions caught with informative messages? | [ ] |
| 1.4 | Backward Compatibility | Does the change break any existing functions or interfaces? | [ ] |
| 1.5 | Test Coverage | Does every new branch or feature have an automated test? | [ ] |

---

## Tier 2: Architecture, Quality & Security

| # | Check Item | Verification Question | Pass / Fail |
|---|------------|------------------------|-------------|
| 2.1 | Single Responsibility | Does each function or class have one clear responsibility? | [ ] |
| 2.2 | Type Annotations | Are Python type hints / TypeScript types complete and strict? | [ ] |
| 2.3 | Path & Shell Safety | Are all file paths quoted? Are shell injection vectors blocked? | [ ] |
| 2.4 | Read-Only Invariants | Are `input/` and raw source datasets completely untouched? | [ ] |
| 2.5 | Documentation Integrity| Are existing comments and docstrings preserved properly? | [ ] |
| 2.6 | Resource Management | Are files, sockets, and subprocesses closed cleanly via context managers (`with`)? | [ ] |

---

## Rating Rubric (5-Axis)
- **Accuracy (1-5)**: Functional correctness against specifications.
- **Completeness (1-5)**: Edge cases and tests handled.
- **Clarity (1-5)**: Clean naming, comments, and structure.
- **Actionability (1-5)**: Concrete steps and feedback.
- **Conciseness (1-5)**: Minimal diff without unnecessary rewrites.
