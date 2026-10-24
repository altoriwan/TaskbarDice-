---
name: self-evolver
description: >-
  Audits the current Antigravity ecosystem (rules, skills, workflows, and logs),
  benchmarks against state-of-the-art agent patterns on the internet, and generates
  safe, verified diff proposals to continuously improve rules and capabilities.
---

# Self-Evolver: Recursive Self-Improvement (RSI) Skill

The `self-evolver` skill enables Antigravity to inspect its own operational scaffolding,
identify recurring failure modes or suboptimal instructions, benchmark against the latest
research and community patterns (such as `google-research/harness2`, `PromptWizard`,
and `DSPy`), and propose tested, human-approved enhancements to workspace rules and skills.

## Core Architecture: Propose – Probe – Compose

```text
[Audit Current Setup] --> [Web Search SOTA Patterns] --> [Propose Scaffolding Diff]
                                                                 |
                                                                 v
[Human-in-the-Loop Approval] <-- [Regression Verification] <-- [Sandbox Probe]
```

## Step-by-Step Procedure

### 1. Audit Current Ecosystem
Run the ecosystem auditor to discover active rules, skills, and configuration health:
```powershell
python .agents/skills/self-evolver/scripts/audit_ecosystem.py
```
- Examine the generated report for rule conflicts, missing capabilities, or outdated guidelines.
- Review recent session logs/transcripts to extract user corrections and recurring errors.

### 2. Search & Cross-Reference Latest Patterns
- When tackling a specific upgrade (e.g., test automation, code refactoring, error recovery):
  - Consult [RSI Patterns Guide](./references/rsi_patterns.md).
  - Search the web for recent repos and papers on agent harnesses, system prompt mutations, or tool calling best practices.
  - Identify concrete changes: adding negative constraints, few-shot examples, or explicit validation loops.

### 3. Generate Candidate Mutations
- Draft targeted improvements for:
  - Rules: `GEMINI.md` or `.agents/rules/*.md`
  - Skills: `.agents/skills/<skill_name>/SKILL.md`
  - Scripts: Helper automation scripts
- Follow progressive disclosure: keep primary instructions concise, deferring bulky references to `./references/`.

### 4. Probe in Sandbox for Regressions
Before showing the proposed change to the user, run the probing benchmark:
```powershell
python .agents/skills/self-evolver/scripts/benchmark_probe.py
```
- Ensure all safety invariants are met:
  - Read-only protection of critical inputs
  - Proper UTF-8 encoding handling
  - Windows PowerShell compatibility
  - Clear evidence labeling (VERIFIED / INFERRED / NOT VERIFIED)

### 5. Present Diff for Human Approval
- Never overwrite rules or skills silently.
- Present a unified diff or side-by-side comparison to the user.
- Explain the rationale, evidence, and expected improvements.
- Proceed only when explicitly approved by the user.
