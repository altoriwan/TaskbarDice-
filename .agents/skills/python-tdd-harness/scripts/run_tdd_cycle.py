"""
run_tdd_cycle.py
Part of the Python TDD Harness skill.
Runs pytest or standard unittest, captures test results,
and outputs a concise, structured report for the agent's repair loop.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path


def run_tests(test_target: str) -> dict:
    """Run tests using pytest if available, otherwise fallback to unittest."""
    # Check if pytest is available
    use_pytest = False
    try:
        chk = subprocess.run(
            [sys.executable, "-m", "pytest", "--version"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if chk.returncode == 0:
            use_pytest = True
    except Exception:
        use_pytest = False

    if use_pytest:
        cmd = [sys.executable, "-m", "pytest", "-v", "--tb=short", test_target]
    else:
        # Standard library unittest
        target_path = Path(test_target)
        if target_path.is_file():
            cmd = [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                str(target_path.parent),
                "-p",
                target_path.name,
                "-v",
            ]
        else:
            cmd = [sys.executable, "-m", "unittest", "discover", "-s", test_target, "-v"]

    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    output = proc.stdout + "\n" + proc.stderr
    passed = proc.returncode == 0

    # Extract relevant failure lines
    relevant_lines = []
    capture = False
    for line in output.splitlines():
        if any(marker in line for marker in ["FAIL:", "ERROR:", "FAILED", "Traceback", "AssertionError"]):
            capture = True
        if capture:
            relevant_lines.append(line)
        if len(relevant_lines) > 25:
            relevant_lines.append("... [traceback truncated for conciseness]")
            break

    summary = {
        "runner": "pytest" if use_pytest else "unittest",
        "target": test_target,
        "passed": passed,
        "exit_code": proc.returncode,
        "failure_snippets": relevant_lines if not passed else [],
        "output_tail": [line for line in output.splitlines() if line.strip()][-8:],
    }
    return summary


def main():
    parser = argparse.ArgumentParser(description="TDD Test Cycle Runner")
    parser.add_argument("--test-path", required=True, help="Path to test file or directory")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()

    result = run_tests(args.test_path)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        status_str = "SUCCESS" if result["passed"] else "FAILED"
        print("=" * 60)
        print(f"TDD CYCLE TEST RUN: {status_str} (Runner: {result['runner']})")
        print("=" * 60)
        print(f"Target: {result['target']}")
        print(f"Exit Code: {result['exit_code']}")
        print("-" * 60)
        if result["passed"]:
            print("All test assertions passed successfully.")
            for line in result["output_tail"]:
                print(f"  {line}")
        else:
            print("TEST FAILURES DETECTED:")
            for line in result["failure_snippets"]:
                print(f"  {line}")
        print("=" * 60)

    sys.exit(result["exit_code"])


if __name__ == "__main__":
    main()
