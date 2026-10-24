# Workspace Rules: Amazing Turing

This project uses the **Self-Evolver** Recursive Self-Improvement (RSI) framework.
All agent activities in this workspace must adhere to the following standards:

---

## 1. Safety & System Invariants

- **Read-Only Sources**: Never modify or delete any file in `input/` or raw benchmark folders.
- **Explicit Approval for Overwrites**: Never overwrite existing outputs or rule files without explicit user consent.
- **PowerShell 5.1 Standards**: Always use Windows PowerShell compatible syntax. Ensure explicit `-Encoding UTF8` when writing files via shell commands.
- **Evidence-Based Reporting**: Label assertions as `VERIFIED` (executed and checked), `INFERRED` (deduced logically), or `NOT VERIFIED`.

---

## 2. Test-Driven Verification

- Before declaring any script complete or proposing a rule mutation:
  - Run the relevant probe or test suite in the sandbox:
    ```powershell
    python .agents/skills/self-evolver/scripts/benchmark_probe.py
    ```
  - Verify zero exit code and quote the key verification output lines.

---

## 3. Continuous Self-Improvement (`self-evolver`)

- When instructed to "tự nâng cấp", "audit setup", or optimize agent workflows:
  - Refer to the workspace skill: [self-evolver](file:///c:/Users/haquo/Documents/antigravity/amazing-turing/.agents/skills/self-evolver/SKILL.md).
  - Run the ecosystem audit script:
    ```powershell
    python .agents/skills/self-evolver/scripts/audit_ecosystem.py
    ```
  - Follow the Propose–Probe–Compose workflow outlined in [RSI Patterns](file:///c:/Users/haquo/Documents/antigravity/amazing-turing/.agents/skills/self-evolver/references/rsi_patterns.md).
  - Always present diffs to the user for explicit approval before modifying any rule or skill file.

---

## 4. Superpowers & ECC Methodology Suite

When implementing features, debugging bugs, or conducting code reviews:
- **7-Step Lifecycle**: Follow `Plan -> Test -> Implement -> Review -> Verify -> Remember -> Improve`.
- **Systematic Debugging**: When an error occurs, follow the 4-phase protocol: *Reproduce -> Isolate -> Hypothesize -> Verify Minimal Fix*. Never guess or apply speculative shotgun edits.
- **Two-Tier Code Review**: Evaluate changes for both *Spec Compliance* (Tier 1) and *Code Quality & Security* (Tier 2).
- **AgentShield Guard**: Run the security scanner prior to finalizing code to guarantee zero secret leaks or dangerous commands:
  ```powershell
  python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
  ```
