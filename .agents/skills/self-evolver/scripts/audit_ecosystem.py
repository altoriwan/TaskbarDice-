"""
audit_ecosystem.py
Part of the Self-Evolver skill for Antigravity.
Audits the local workspace and Antigravity ecosystem configuration.
"""

import json
import os
import platform
import sys
from pathlib import Path


def find_files_by_pattern(base_dir: Path, pattern: str) -> list[Path]:
    """Find files matching pattern safely without raising permission errors."""
    matches = []
    if not base_dir.exists():
        return matches
    try:
        for p in base_dir.rglob(pattern):
            if p.is_file():
                matches.append(p)
    except Exception:
        pass
    return matches


def audit_ecosystem(workspace_path: Path) -> dict:
    """Audit rules, skills, and environment in the workspace."""
    results = {
        "workspace": str(workspace_path.resolve()),
        "environment": {
            "os": platform.platform(),
            "python_version": sys.version.split()[0],
            "default_encoding": sys.getdefaultencoding(),
            "filesystem_encoding": sys.getfilesystemencoding(),
        },
        "workspace_customizations": {
            "rules": [],
            "skills": [],
            "plugins": [],
        },
        "global_plugins": [],
        "builtin_skills": [],
        "health_checks": [],
    }

    # 1. Check workspace rules
    rule_files = ["GEMINI.md", "AGENTS.md"]
    for rf in rule_files:
        rule_path = workspace_path / rf
        if rule_path.exists():
            results["workspace_customizations"]["rules"].append({
                "path": str(rule_path),
                "size_bytes": rule_path.stat().st_size,
            })

    # Rules in .agents/rules
    agents_rules_dir = workspace_path / ".agents" / "rules"
    if agents_rules_dir.exists():
        for r_file in agents_rules_dir.glob("*.md"):
            results["workspace_customizations"]["rules"].append({
                "path": str(r_file),
                "size_bytes": r_file.stat().st_size,
            })

    # 2. Check workspace skills
    agents_skills_dir = workspace_path / ".agents" / "skills"
    if agents_skills_dir.exists():
        for skill_dir in agents_skills_dir.iterdir():
            skill_md = skill_dir / "SKILL.md"
            if skill_dir.is_dir() and skill_md.exists():
                results["workspace_customizations"]["skills"].append({
                    "name": skill_dir.name,
                    "path": str(skill_md),
                    "has_scripts": (skill_dir / "scripts").exists(),
                    "has_references": (skill_dir / "references").exists(),
                })

    # 3. Check workspace plugins
    agents_plugins_dir = workspace_path / ".agents" / "plugins"
    if agents_plugins_dir.exists():
        for plugin_dir in agents_plugins_dir.iterdir():
            p_json = plugin_dir / "plugin.json"
            if plugin_dir.is_dir() and p_json.exists():
                plugin_skills = []
                p_skills_dir = plugin_dir / "skills"
                if p_skills_dir.exists():
                    plugin_skills = [d.name for d in p_skills_dir.iterdir() if (d / "SKILL.md").exists()]
                results["workspace_customizations"]["plugins"].append({
                    "name": plugin_dir.name,
                    "path": str(p_json),
                    "skills": plugin_skills,
                })

    # 4. Check global plugins
    user_home = Path.home()
    global_plugins_dir = user_home / ".gemini" / "config" / "plugins"
    if global_plugins_dir.exists():
        for gp_dir in global_plugins_dir.iterdir():
            gp_json = gp_dir / "plugin.json"
            if gp_dir.is_dir() and gp_json.exists():
                gp_skills = []
                gp_skills_dir = gp_dir / "skills"
                if gp_skills_dir.exists():
                    gp_skills = [d.name for d in gp_skills_dir.iterdir() if (d / "SKILL.md").exists()]
                results["global_plugins"].append({
                    "name": gp_dir.name,
                    "skills": gp_skills,
                })

    # 5. Check builtin skills
    user_home = Path.home()
    builtin_skills_dir = user_home / ".gemini" / "antigravity" / "builtin" / "skills"
    if builtin_skills_dir.exists():
        try:
            for b_dir in builtin_skills_dir.iterdir():
                b_md = b_dir / "SKILL.md"
                if b_dir.is_dir() and b_md.exists():
                    results["builtin_skills"].append(b_dir.name)
        except Exception:
            pass

    # 4. Health checks & Diagnostics
    checks = []

    # Rule existence check
    has_rules = len(results["workspace_customizations"]["rules"]) > 0
    checks.append({
        "check": "Workspace Rule Definition",
        "passed": has_rules,
        "detail": "GEMINI.md found" if has_rules else "No GEMINI.md in workspace root",
    })

    # Encoding check
    is_utf8 = sys.getdefaultencoding().lower() == "utf-8"
    checks.append({
        "check": "Default Encoding UTF-8",
        "passed": is_utf8,
        "detail": f"Current default encoding is {sys.getdefaultencoding()}",
    })

    # Skills check
    has_skills = len(results["workspace_customizations"]["skills"]) > 0
    checks.append({
        "check": "Custom Workspace Skills",
        "passed": has_skills,
        "detail": f"{len(results['workspace_customizations']['skills'])} skills detected",
    })

    results["health_checks"] = checks
    return results


def main():
    workspace = Path(".").resolve()
    audit_data = audit_ecosystem(workspace)

    print("=" * 60)
    print("ANTIGRAVITY ECOSYSTEM AUDIT REPORT")
    print("=" * 60)
    print(f"Workspace: {audit_data['workspace']}")
    print(f"Python:    {audit_data['environment']['python_version']} ({audit_data['environment']['os']})")
    print(f"Encoding:  {audit_data['environment']['default_encoding']}")
    print("-" * 60)

    print("HEALTH CHECKS:")
    for chk in audit_data["health_checks"]:
        status = "[PASS]" if chk["passed"] else "[WARN]"
        print(f"  {status} {chk['check']}: {chk['detail']}")
    print("-" * 60)

    print(f"WORKSPACE SKILLS ({len(audit_data['workspace_customizations']['skills'])}):")
    for sk in audit_data["workspace_customizations"]["skills"]:
        print(f"  - {sk['name']} (scripts: {sk['has_scripts']}, references: {sk['has_references']})")

    print(f"WORKSPACE PLUGINS ({len(audit_data['workspace_customizations']['plugins'])}):")
    for pl in audit_data["workspace_customizations"]["plugins"]:
        print(f"  - {pl['name']} (skills: {', '.join(pl['skills'])})")

    print(f"GLOBAL PLUGINS ({len(audit_data['global_plugins'])}):")
    for gp in audit_data["global_plugins"]:
        print(f"  - {gp['name']} (skills: {', '.join(gp['skills'])})")

    print(f"WORKSPACE RULES ({len(audit_data['workspace_customizations']['rules'])}):")
    for r in audit_data["workspace_customizations"]["rules"]:
        print(f"  - {r['path']} ({r['size_bytes']} bytes)")

    print(f"BUILT-IN SKILLS DISCOVERED ({len(audit_data['builtin_skills'])}):")
    print("  " + ", ".join(audit_data["builtin_skills"]))
    print("=" * 60)

    # Save report
    out_dir = workspace / ".agents" / "audit_reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "latest_audit.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2, ensure_ascii=False)
    print(f"Detailed JSON report saved to: {out_file}")


if __name__ == "__main__":
    main()
