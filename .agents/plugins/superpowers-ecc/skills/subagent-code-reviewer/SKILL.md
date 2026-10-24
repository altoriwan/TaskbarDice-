---
name: subagent-code-reviewer
description: >-
  Conducts structured, two-tier code reviews inspired by ECC and Superpowers.
  Evaluates pull requests, diffs, and newly written modules for specification compliance,
  architecture, edge cases, and maintainability.
---

# Two-Tier Subagent Code Reviewer

Code review by an AI agent must not be a superficial "looks good to me" comment.
This skill establishes a **Two-Tier Review** protocol, separating functional correctness
from code quality to ensure comprehensive evaluations.

---

## The Two-Tier Architecture

```text
[Candidate Code / Diff]
           |
           +---> [Tier 1: Specification & Functional Review]
           |      - Meets 100% of user prompt & edge cases?
           |      - Zero breaking changes to existing contracts?
           |
           +---> [Tier 2: Architecture & Quality Review]
                  - Clean Architecture & single responsibility?
                  - Strict typing & input validation?
                  - Security & performance boundaries?
```

---

## Procedure for Code Review

### Step 1: Launch Subagent or Self-Review
When reviewing a module or git diff:
- Inspect changes via `git diff` or inspect target files directly.
- Walk through the [Review Checklist](./references/review_checklist.md).

### Step 2: Tier 1 Evaluation (Functional Correctness)
Answer these questions with concrete line citations:
1. Did the code address the exact problem requested by the user?
2. Are there any edge cases (null, empty strings, large payloads, unicode) left unhandled?
3. Did the code preserve existing functionality without breaking callers?

### Step 3: Tier 2 Evaluation (Code Quality & Security)
Answer these questions:
1. **Typing & Linting**: Are type annotations explicit?
2. **Readability & Comments**: Are complex logic blocks explained? Are irrelevant comments preserved?
3. **Security**: Are there any injection vectors, unvalidated inputs, or unquoted shell executions?

### Step 4: Emit Structured Verdict
The reviewer emits a standardized evaluation:
- **Verdict**: `APPROVE`, `REQUEST_CHANGES`, or `BLOCK`
- **Findings Table**: Listing severity (`CRITICAL`, `WARNING`, `SUGGESTION`), file/line, and proposed fix.
