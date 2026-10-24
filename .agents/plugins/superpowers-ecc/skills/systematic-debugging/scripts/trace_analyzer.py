"""
trace_analyzer.py
Part of the Systematic Debugging skill (Superpowers & ECC Suite).
Parses stack traces, isolates project call sites, and creates a hypothesis template.
"""

import argparse
import json
import re
import sys
from pathlib import Path


def parse_python_traceback(text: str) -> dict:
    """Extract frames, error type, and message from a Python traceback."""
    frames = []
    lines = text.splitlines()
    error_type = "UnknownError"
    error_message = ""

    # Regex for python traceback frames
    frame_pattern = re.compile(r'File "([^"]+)", line (\d+), in (\w+)')

    for i, line in enumerate(lines):
        match = frame_pattern.search(line)
        if match:
            file_path, line_num, func_name = match.groups()
            code_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            frames.append({
                "file": file_path,
                "line": int(line_num),
                "function": func_name,
                "code": code_line,
                "is_project_file": not ("site-packages" in file_path or "lib" in file_path.lower()),
            })

    # Last line typically contains the error message
    for line in reversed(lines):
        if ":" in line and not line.strip().startswith("File "):
            parts = line.split(":", 1)
            error_type = parts[0].strip()
            error_message = parts[1].strip()
            break

    return {
        "error_type": error_type,
        "error_message": error_message,
        "total_frames": len(frames),
        "frames": frames,
    }


def generate_hypothesis_template(parsed: dict) -> str:
    """Generate structured markdown hypothesis template for the agent."""
    project_frames = [f for f in parsed["frames"] if f["is_project_file"]]
    deepest_frame = project_frames[-1] if project_frames else (parsed["frames"][-1] if parsed["frames"] else None)

    site_desc = (
        f"{deepest_frame['file']}:{deepest_frame['line']} in `{deepest_frame['function']}()`"
        if deepest_frame
        else "Unknown location"
    )

    template = f"""### Systematic Debugging: Investigation Report
- **Error Type**: `{parsed['error_type']}`
- **Message**: {parsed['error_message']}
- **Primary Divergence Point**: {site_desc}

#### 1. Observed State
- Expected behavior: ...
- Actual behavior: ...

#### 2. Root Cause Hypothesis
- **Hypothesis**: The failure occurs because ...
- **Testable Condition**: If we inspect ..., we should see ...

#### 3. Verification Plan
- [ ] Minimal reproduction test confirms failure.
- [ ] Patch applied to {deepest_frame['file'] if deepest_frame else 'target file'}.
- [ ] Full regression suite passes.
"""
    return template


def main():
    parser = argparse.ArgumentParser(description="Analyze tracebacks for systematic debugging")
    parser.add_argument("--trace", help="Traceback text directly as string")
    parser.add_argument("--file", help="Path to file containing traceback")
    parser.add_argument("--stdin", action="store_true", help="Read traceback from stdin")
    parser.add_argument("--json", action="store_true", help="Output parsed JSON instead of template")
    args = parser.parse_args()

    content = ""
    if args.trace:
        content = args.trace
    elif args.file:
        content = Path(args.file).read_text(encoding="utf-8", errors="replace")
    elif args.stdin:
        content = sys.stdin.read()
    else:
        # Default sample for demonstration / probe
        content = '''Traceback (most recent call last):
  File "app/service.py", line 42, in process_record
    value = record["payload"]["data"]
KeyError: 'data'
'''

    parsed = parse_python_traceback(content)

    if args.json:
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    else:
        print(generate_hypothesis_template(parsed))


if __name__ == "__main__":
    main()
