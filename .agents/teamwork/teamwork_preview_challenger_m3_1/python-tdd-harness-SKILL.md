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
