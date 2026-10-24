---
name: agent-security-guard
description: >-
  Pre-execution static code and command security auditor inspired by ECC's AgentShield.
  Scans files, scripts, and git diffs for leaked secrets, API keys, command injection vectors,
  and destructive filesystem operations.
---

# Agent Security Guard (AgentShield Protocol)

AI coding agents can inadvertently introduce vulnerabilities, hardcode sensitive credentials,
or execute destructive commands. `agent-security-guard` provides an automated pre-execution
security scanner to enforce strict safety boundaries.

---

## What AgentShield Scans For

1. **Secret & Credential Leaks**:
   - OpenAI, Anthropic, Google Cloud API keys.
   - GitHub Personal Access Tokens (`ghp_...`).
   - AWS access keys (`AKIA...`), private RSA/SSH keys.
   - Generic hardcoded passwords and tokens.

2. **Dangerous & Destructive Shell Commands**:
   - Arbitrary root deletion: `rm -rf /`, `rmdir /s /q C:\`.
   - Disk formatting: `mkfs`, `Format-Volume`.
   - Unrestricted command injection: `eval()`, unescaped string concatenation in shell runners.

3. **Workspace Invariant Violations**:
   - Attempts to delete, move, or overwrite files under `input/` (violating read-only sources).
   - Silent overwriting of critical configuration files without consent.

---

## How to Run Security Scans

### Run Automated Security Scan on Workspace or Directory:
```powershell
python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --path .
```

### Scan a Specific Code Snippet / Script:
```powershell
python .agents/plugins/superpowers-ecc/skills/agent-security-guard/scripts/security_scanner.py --file path/to/script.py
```

### Exit Codes & Enforcement:
- Exit code `0`: Clean, no security violations detected.
- Exit code `1`: Security risks detected. Details and line numbers are printed for immediate remediation.
