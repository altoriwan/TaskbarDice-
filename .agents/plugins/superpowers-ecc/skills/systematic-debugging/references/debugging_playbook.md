# Systematic Debugging Playbook

This reference provides rapid diagnostic patterns for the most common bug classes
encountered during AI-assisted software engineering.

---

## 1. State Mutation & Leaks
- **Symptom**: A test passes when run in isolation, but fails when run as part of the full test suite.
- **Root Cause**: Global variables, singleton instances, or class-level mutable attributes (e.g., `data = []`) mutating across test runs.
- **Remedy**: Use fixtures with explicit teardown, or reset shared state in `setUp()`.

## 2. Path & Shell Quoting Traps (Windows / PowerShell)
- **Symptom**: Commands fail with `cannot find path` or parameters are split unexpectedly.
- **Root Cause**: Spaces or Vietnamese diacritics in directory names unquoted, or using Unix-specific syntax in Windows PowerShell.
- **Remedy**: Always enclose paths in double quotes: `Get-Item -Path "..."`. Use standard PowerShell 5.1 constructs.

## 3. Encoding & Unicode Traps
- **Symptom**: Special characters (Vietnamese marks, emojis) turn into `???` or cause `UnicodeDecodeError`.
- **Root Cause**: Defaulting to system ANSI/CP1252 code page rather than UTF-8.
- **Remedy**: Explicitly declare `-Encoding UTF8` in PowerShell or `encoding="utf-8"` in Python `open()`.

## 4. Off-by-One & Boundary Condition Bugs
- **Symptom**: The last element in a loop is missing, or index out of range occurs on empty lists.
- **Root Cause**: Using `<=` instead of `<` or assuming list length $> 0$.
- **Remedy**: Write test assertions specifically for:
  - Empty input `[]` or `""`
  - Single-item input `[1]`
  - Maximum boundary values
