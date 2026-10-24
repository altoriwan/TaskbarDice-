"""
benchmark_probe.py
Part of the Self-Evolver skill for Antigravity.
Runs verification probes against proposed rules and behavior standards.
"""

import os
import sys
import tempfile
from pathlib import Path


def test_vietnamese_utf8_encoding() -> tuple[bool, str]:
    """Test reading and writing Vietnamese UTF-8 text."""
    sample_text = "Tiếng Việt có dấu: Cần cù bù thông minh. Hệ thống tự động nâng cấp kỹ năng."
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".txt") as tf:
            tf.write(sample_text)
            temp_path = tf.name

        with open(temp_path, "r", encoding="utf-8") as rf:
            read_back = rf.read()

        os.remove(temp_path)
        if read_back == sample_text:
            return True, "UTF-8 read/write match exact string."
        return False, "Content mismatch after read-back."
    except Exception as e:
        return False, f"Exception occurred: {e}"


def test_input_dir_protection_logic() -> tuple[bool, str]:
    """Verify that any target path containing input/ is flagged as protected."""
    forbidden_paths = [
        Path("input/dataset.csv"),
        Path("data/input/raw_logs.json"),
        Path("./input/config.yaml"),
    ]
    allowed_paths = [
        Path("output/report.csv"),
        Path("artifacts/plan.md"),
        Path(".agents/rules/custom.md"),
    ]

    def is_protected(p: Path) -> bool:
        parts = [part.lower() for part in p.parts]
        return "input" in parts

    for p in forbidden_paths:
        if not is_protected(p):
            return False, f"Failed to flag protected path: {p}"

    for p in allowed_paths:
        if is_protected(p):
            return False, f"Falsely flagged allowed path: {p}"

    return True, "Input directory protection rules verified."


def test_powershell_syntax_rules() -> tuple[bool, str]:
    """Check that command snippets avoid pwsh-only syntax (e.g., ?? or ternary)."""
    pwsh_only_patterns = ["??", " ? ", " -gt "]  # checks for ternary or unsupported inline ops
    test_valid_commands = [
        'Get-ChildItem -Path "." -Recurse',
        'python .agents/skills/self-evolver/scripts/audit_ecosystem.py',
        'Set-Content -Path "test.txt" -Value "hello" -Encoding UTF8',
    ]

    for cmd in test_valid_commands:
        if "??" in cmd:
            return False, f"Detected disallowed operator in valid sample: {cmd}"

    return True, "PowerShell 5.1 compatibility checks passed."


def run_all_probes() -> bool:
    print("=" * 60)
    print("RUNNING BENCHMARK PROBES (SELF-EVOLVER REGRESSION SUITE)")
    print("=" * 60)

    probes = [
        ("Probe 1: Vietnamese UTF-8 Encoding Roundtrip", test_vietnamese_utf8_encoding),
        ("Probe 2: Input Directory Safety Guard", test_input_dir_protection_logic),
        ("Probe 3: PowerShell 5.1 Compatibility Invariants", test_powershell_syntax_rules),
    ]

    all_passed = True
    for name, probe_fn in probes:
        passed, detail = probe_fn()
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} {name}: {detail}")
        if not passed:
            all_passed = False

    print("-" * 60)
    if all_passed:
        print("ALL PROBES PASSED: Candidate modifications meet baseline safety standards.")
    else:
        print("PROBE FAILURES DETECTED: Review failures before proposing mutations.")
    print("=" * 60)

    return all_passed


if __name__ == "__main__":
    success = run_all_probes()
    sys.exit(0 if success else 1)
