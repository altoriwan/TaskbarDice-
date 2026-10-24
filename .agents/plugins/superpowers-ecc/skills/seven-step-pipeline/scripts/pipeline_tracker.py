"""
pipeline_tracker.py
Part of the Seven-Step Pipeline skill (Superpowers & ECC Suite).
Tracks task progression across the 7 engineering lifecycle stages.
"""

import argparse
import datetime
import json
from pathlib import Path

STEPS = [
    "Plan",
    "Test",
    "Implement",
    "Review",
    "Verify",
    "Remember",
    "Improve",
]


def get_state_file() -> Path:
    base_dir = Path(".agents") / "memory"
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir / "pipeline_state.json"


def load_state() -> dict:
    sf = get_state_file()
    if sf.exists():
        try:
            return json.loads(sf.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "task_name": "No active task",
        "current_step_index": 0,
        "history": [],
        "created_at": datetime.datetime.now().isoformat(),
    }


def save_state(state: dict):
    sf = get_state_file()
    sf.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def init_task(name: str):
    state = {
        "task_name": name,
        "current_step_index": 0,
        "history": [
            {
                "step": STEPS[0],
                "status": "IN_PROGRESS",
                "timestamp": datetime.datetime.now().isoformat(),
                "note": "Task initialized",
            }
        ],
        "created_at": datetime.datetime.now().isoformat(),
    }
    save_state(state)
    print(f"Pipeline initialized: '{name}' at Step 1: {STEPS[0]}")


def advance_step(note: str = ""):
    state = load_state()
    curr_idx = state.get("current_step_index", 0)

    # Mark current step completed
    if curr_idx < len(STEPS):
        curr_step_name = STEPS[curr_idx]
        state["history"].append({
            "step": curr_step_name,
            "status": "COMPLETED",
            "timestamp": datetime.datetime.now().isoformat(),
            "note": note or f"Finished {curr_step_name}",
        })

    next_idx = curr_idx + 1
    if next_idx < len(STEPS):
        state["current_step_index"] = next_idx
        state["history"].append({
            "step": STEPS[next_idx],
            "status": "IN_PROGRESS",
            "timestamp": datetime.datetime.now().isoformat(),
            "note": "Started",
        })
        save_state(state)
        print(f"Advanced to Step {next_idx + 1}: {STEPS[next_idx]}")
    else:
        state["current_step_index"] = len(STEPS)
        save_state(state)
        print("All 7 steps in the engineering pipeline have been successfully completed!")


def print_status():
    state = load_state()
    curr_idx = state.get("current_step_index", 0)
    print("=" * 60)
    print("ECC 7-STEP ENGINEERING PIPELINE STATUS")
    print("=" * 60)
    print(f"Task: {state.get('task_name')}")
    print("-" * 60)

    for i, step in enumerate(STEPS):
        if i < curr_idx:
            mark = "[✓] COMPLETED  "
        elif i == curr_idx:
            mark = "[>] IN PROGRESS"
        else:
            mark = "[ ] PENDING    "
        print(f"  {mark} Step {i + 1}: {step}")

    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="ECC 7-Step Pipeline State Tracker")
    parser.add_argument("--init", help="Initialize a new task name")
    parser.add_argument("--advance", nargs="?", const="Step completed", help="Advance to next pipeline step")
    parser.add_argument("--status", action="store_true", help="Print current status")
    parser.add_argument("--json", action="store_true", help="Output state as JSON")
    args = parser.parse_args()

    if args.init:
        init_task(args.init)
    elif args.advance is not None:
        advance_step(args.advance)
    elif args.json:
        print(json.dumps(load_state(), indent=2, ensure_ascii=False))
    else:
        print_status()


if __name__ == "__main__":
    main()
