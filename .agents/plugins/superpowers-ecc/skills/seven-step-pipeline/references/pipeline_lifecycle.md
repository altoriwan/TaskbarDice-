# Seven-Step Pipeline Lifecycle Reference

This document provides detailed operational guidelines for each stage of the
ECC 7-step engineering pipeline.

---

## Step 1: Plan
- **Goal**: Clarify user requirements and define clear acceptance criteria.
- **Rules**:
  - Always explore the codebase first before proposing architectural changes.
  - Break down tasks into distinct, verifiable increments.
  - Never start writing production code without an approved plan.

## Step 2: Test
- **Goal**: Establish the automated verification harness.
- **Rules**:
  - Write reproduction or unit test cases (using `python-tdd-harness`).
  - Verify that the test actually runs and fails for the expected reason (Red phase).

## Step 3: Implement
- **Goal**: Write minimal, clean production code.
- **Rules**:
  - Keep changes focused strictly on the tested requirement.
  - Preserve all unrelated comments and docstrings.
  - Do not introduce premature optimizations or gratuitous refactorings.

## Step 4: Review
- **Goal**: Independent 2-tier quality assessment.
- **Rules**:
  - Evaluate against Tier 1 (Spec compliance) and Tier 2 (Quality & Security).
  - Check for edge cases, missing type annotations, or performance bottlenecks.

## Step 5: Verify
- **Goal**: Complete regression prevention.
- **Rules**:
  - Run the entire test suite in the sandbox.
  - Confirm exit code 0 and quote output lines.

## Step 6: Remember
- **Goal**: Multi-session knowledge retention.
- **Rules**:
  - Append any key learnings, architectural patterns, or bug resolutions to `.agents/memory/playbook.md`.

## Step 7: Improve
- **Goal**: Scaffolding optimization.
- **Rules**:
  - If a rule or skill caused confusion during the task, trigger `self-evolver` to propose a patch.
