"""
security_scanner.py
Part of the Agent Security Guard skill (Superpowers & ECC Suite).
Performs static security analysis to detect leaked secrets, destructive commands,
and invariant violations.
"""

import argparse
import os
import re
import sys
from pathlib import Path

# Secret patterns
SECRET_PATTERNS = [
    (re.compile(r"sk-[a-zA-Z0-9]{32,}", re.IGNORECASE), "OpenAI / Claude API Key"),
    (re.compile(r"ghp_[a-zA-Z0-9]{36}", re.IGNORECASE), "GitHub Personal Access Token"),
    (re.compile(r"AIza[0-9A-Za-z-_]{35}"), "Google Cloud / Gemini API Key"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS Access Key ID"),
    (re.compile(r"-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----"), "Private Cryptographic Key"),
    (re.compile(r'(?i)(password|secret|api_key|token)\s*=\s*["\'][^"\']{8,}["\']'), "Hardcoded Credential"),
]

# Destructive command patterns
DESTRUCTIVE_PATTERNS = [
    (re.compile(r"\brm\s+-rf\s+[/~]"), "Critical filesystem deletion (rm -rf /)"),
    (re.compile(r"\brmdir\s+/s\s+/q\s+[c-zC-Z]:\\", re.IGNORECASE), "Critical Windows volume deletion"),
    (re.compile(r"\bFormat-Volume\b", re.IGNORECASE), "Disk formatting command"),
    (re.compile(r"\bmkfs\b"), "Filesystem format command"),
]

# Ignored directories
IGNORE_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", ".agents"}


def scan_file(file_path: Path) -> list[dict]:
    """Scan a single file for security issues."""
    violations = []
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return [{"file": str(file_path), "line": 0, "type": "READ_ERROR", "detail": str(e)}]

    # Check for writing/deleting in input/ directory
    if "input" in [p.lower() for p in file_path.parts]:
        violations.append({
            "file": str(file_path),
            "line": 0,
            "type": "INVARIANT_VIOLATION",
            "detail": "Target file resides inside protected 'input/' read-only directory.",
        })

    for line_num, line in enumerate(content.splitlines(), start=1):
        # 1. Check secrets
        for pattern, desc in SECRET_PATTERNS:
            # Skip false positives in the scanner itself or tests
            if "SECRET_PATTERNS" in line or "re.compile" in line:
                continue
            if pattern.search(line):
                violations.append({
                    "file": str(file_path),
                    "line": line_num,
                    "type": "SECRET_LEAK",
                    "detail": f"Potential {desc}",
                })

        # 2. Check destructive commands
        for pattern, desc in DESTRUCTIVE_PATTERNS:
            if "DESTRUCTIVE_PATTERNS" in line or "re.compile" in line:
                continue
            if pattern.search(line):
                violations.append({
                    "file": str(file_path),
                    "line": line_num,
                    "type": "DESTRUCTIVE_COMMAND",
                    "detail": desc,
                })

    return violations


def scan_directory(base_dir: Path) -> list[dict]:
    """Recursively scan all code/text files in a directory."""
    all_violations = []
    for root, dirs, files in os.walk(base_dir):
        # Prune ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            p = Path(root) / file
            if p.suffix.lower() in [".py", ".md", ".json", ".yaml", ".yml", ".sh", ".ps1", ".js", ".ts"]:
                violations = scan_file(p)
                all_violations.extend(violations)
    return all_violations


def main():
    parser = argparse.ArgumentParser(description="AgentShield Security Scanner")
    parser.add_argument("--path", default=".", help="Directory to scan recursively")
    parser.add_argument("--file", help="Specific file to scan")
    args = parser.parse_args()

    target_desc = args.file if args.file else args.path
    print("=" * 60)
    print("AGENTSHIELD STATIC SECURITY AUDITOR")
    print(f"Target: {target_desc}")
    print("=" * 60)

    if args.file:
        violations = scan_file(Path(args.file))
    else:
        violations = scan_directory(Path(args.path))

    if not violations:
        print("[PASS] No secret leaks, destructive commands, or invariant violations detected.")
        print("=" * 60)
        sys.exit(0)
    else:
        print(f"[FAIL] {len(violations)} security violation(s) detected:")
        for v in violations:
            loc = f"{v['file']}:{v['line']}" if v["line"] > 0 else v["file"]
            print(f"  - [{v['type']}] {loc} -> {v['detail']}")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
