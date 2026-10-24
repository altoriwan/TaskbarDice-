# Recursive Self-Improvement (RSI) Patterns for AI Agents

This document compiles state-of-the-art patterns for building self-improving agents,
with a focus on **harness engineering** (keeping underlying LLM model weights frozen
while dynamically optimizing prompts, rules, tools, and execution scaffolding).

---

## 1. Google Research: `harness2`

### Key Principle: Scaffolding as an Editable Artifact
Rather than treating agent instructions as static markdown files, `harness2` decomposes
an agent's scaffolding into 8 editable, version-controlled components:
1. **System Prompts**: High-level behavioral identity and persona.
2. **Guardrails & Invariants**: Non-negotiable safety and execution boundaries.
3. **Memory & Context**: Historical context retrieval and short/long-term playbooks.
4. **Tool Guidance**: Granular tips on when and how to invoke specific tools.
5. **Subagents**: Specialized delegation topologies.
6. **Skills**: Step-by-step modular procedural guides (`SKILL.md`).
7. **Scripts**: Deterministic helper executables.
8. **Plugins**: Bundled customization modules.

### The Propose–Probe–Compose Loop
- **Propose**: Generate targeted candidate mutations based on recent failure modes.
- **Probe**: Execute candidate mutations against a sandboxed test harness.
- **Compose**: Merge successful mutations while rejecting regressive ones.

---

## 2. Microsoft: `PromptWizard`

### Task-Aware Prompt Optimization
- **Feedback-Driven Instruction Evolution**: Instead of human trial-and-error, an LLM critiques its own instructions based on execution errors.
- **In-Context Example Synthesis**: Generates high-signal negative and positive few-shot demonstrations directly from recent session transcripts.
- **Constraint Tightening**: Automatically converts vague instructions (e.g., "be careful with encoding") into concrete syntax assertions (e.g., "always pass `-Encoding UTF8` to PowerShell commands").

---

## 3. Stanford: `DSPy` & Compiled Workflows

### Compiling Natural Language Pipelines
- Treats prompt templates as parameters in an optimizer.
- Defines **Teleprompters / Optimizers** (e.g., BootstrapFewShotWithRandomSearch, MIPRO) that evaluate program outputs against assertions and search for the best instructions and demonstrations.
- **Lesson for Antigravity**: Keep rule files modular so individual sections can be scored, audited, and optimized independently.

---

## 4. Reflexion: Reinforcement via Verbal Reflection

- When an agent encounters an error or receives corrective feedback from the user, it performs a **Verbal Reflection**:
  1. What did I assume incorrectly?
  2. What tool or rule did I fail to consult?
  3. What concrete rule addition would prevent this mistake next time?
- Reflections are stored in a persistent memory file (`Playbook`) and referenced in future turns.

---

## 5. Practical Safety Invariants for Self-Evolving Agents

1. **Human-in-the-Loop Gate**: All proposed rule/skill modifications must be displayed as a diff and approved by the user.
2. **Sandbox Probing Before Proposal**: Proposed changes must be verified against baseline probes (e.g., encoding, non-destructive file operations) before prompting the user.
3. **Rollback Guarantee**: Maintain version control (`git` or backup copies) for every modified rule or skill.
