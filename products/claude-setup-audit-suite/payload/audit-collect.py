#!/usr/bin/env python3
"""
audit-collect.py — deterministic inventory of a Claude Code setup.

Part of the `audit-setup` skill. This script gathers the RAW FACTS about a
Claude Code configuration (agents, commands, skills, hooks, settings,
permissions, plugins, memory) and emits them as a single JSON document. The
skill (SKILL.md) is what interprets that JSON into a human-readable report.

Design goals:
  * Cross-platform: pure Python 3 stdlib only (no PyYAML, no jq). Runs the
    same on Windows + Git Bash, macOS, and Linux. Paths via pathlib; temp dir
    via tempfile (never a hardcoded /tmp).
  * Deterministic: same setup in -> same inventory out, so two people's audits
    are directly diffable. No LLM, no network.
  * Non-destructive: read-only. Never writes inside the audited .claude dir;
    the JSON report goes to the OS temp dir only.

Usage:
    python3 audit-collect.py [path-to-.claude-dir]

If no path is given, it resolves $CLAUDE_CONFIG_DIR, else ~/.claude.
Full JSON is printed to stdout (the skill consumes this). Status messages and
the saved-report path are printed to stderr so they never pollute the JSON.
"""

import sys
import os
import re
import json
import platform
import tempfile
import socket
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_VERSION = "1.0"

# Permission patterns that materially widen blast radius. Each tuple is
# (severity, label, compiled-regex). We match against permission rule strings
# from settings*.json. These are heuristics meant to surface review candidates,
# not a verdict.
_DANGER = [
    ("critical", "arbitrary code execution", r"\b(python3?|powershell|pwsh|bash|sh|node|deno|ruby|perl)\b\s*\*|\b(eval|exec)\b"),
    ("critical", "privilege escalation", r"\b(sudo|runas|RunAs)\b|-Verb\s+RunAs"),
    ("high", "destructive / process kill", r"\brm\s+-[rf]|Remove-Item|Stop-Process|\bkill\b|mkfs|\bdd\s|format\b|drop\s+(table|database)|truncate"),
    ("high", "registry / boot / system mutation", r"Set-ItemProperty|reg\s+(add|delete)|bcdedit|New-ItemProperty"),
    ("medium", "unrestricted file read/copy", r"(Get-Content|Copy-Item|cat|type)\s*\*"),
    ("medium", "arbitrary package install", r"(winget\s+install|brew\s+install|apt(-get)?\s+install|pip3?\s+install|npm\s+install\s+-g)"),
    ("medium", "outbound network", r"\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|scp|nc)\b"),
]
_DANGER = [(sev, lbl, re.compile(rx, re.IGNORECASE)) for sev, lbl, rx in _DANGER]

# Keys whose values, if present and non-empty, look like leaked secrets.
_SECRET_KEY = re.compile(
    r"(token|secret|password|passwd|api[_-]?key|client[_-]?secret|access[_-]?key|"
    r"private[_-]?key|connection[_-]?string|database[_-]?url|db[_-]?url|\bdsn\b)",
    re.IGNORECASE,
)
# String VALUES with embedded user:pass@host credentials (e.g. a DB URL).
_SECRET_VALUE = re.compile(r"://[^/\s:@]+:[^/\s@]+@")

# Tokens inside a hook command string that name a script file.
_SCRIPT_TOKEN = re.compile(r"[\w./~\\-]+\.(?:sh|py|js|ts|ps1)")


def err(msg):
    """Status output -> stderr so stdout stays pure JSON."""
    print(msg, file=sys.stderr)


def find_claude_dir(argv):
    """Resolve the .claude directory to audit, explicit arg > env > default."""
    if len(argv) > 1 and argv[1].strip():
        candidate = Path(argv[1]).expanduser()
    elif os.environ.get("CLAUDE_CONFIG_DIR"):
        candidate = Path(os.environ["CLAUDE_CONFIG_DIR"]).expanduser()
    else:
        candidate = Path.home() / ".claude"
    return candidate


def read_text(path):
    """Read a text file, returning None on absence and a marker on error.

    Absence is an expected, non-error state (the setup simply lacks the file),
    so we distinguish it from a real read failure rather than swallowing both.
    """
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return None
    except OSError as exc:
        return "\x00READ_ERROR\x00" + str(exc)


def read_json(path):
    """Return (data, error). error is None on success, a string otherwise."""
    raw = read_text(path)
    if raw is None:
        return None, "absent"
    if raw.startswith("\x00READ_ERROR\x00"):
        return None, raw.replace("\x00READ_ERROR\x00", "read error: ")
    try:
        return json.loads(raw), None
    except json.JSONDecodeError as exc:
        return None, "invalid JSON: {}".format(exc)


def parse_frontmatter(text):
    """Parse a leading '---' YAML-ish frontmatter block into a flat dict.

    We deliberately avoid a YAML dependency. Frontmatter in agent/command/skill
    files is flat 'key: value' pairs, so a first-colon split is sufficient and
    robust (descriptions contain colons, hence split on the FIRST ': ' only).
    """
    if text is None or not text.startswith("---"):
        return {}
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    out = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        out[key.strip().lower()] = value.strip()
    return out


def scan_markdown_dir(directory, kind):
    """Inventory a flat directory of *.md definition files (agents/commands)."""
    items = []
    if not directory.is_dir():
        return items
    for path in sorted(directory.glob("*.md")):
        fm = parse_frontmatter(read_text(path))
        items.append({
            "name": fm.get("name") or path.stem,
            "file": path.name,
            "description": fm.get("description", ""),
            "model": fm.get("model", ""),
            "tools": fm.get("tools") or fm.get("allowed-tools", ""),
            "kind": kind,
        })
    return items


def scan_skills(skills_dir):
    """Inventory <skills_dir>/<name>/SKILL.md entries."""
    items = []
    if not skills_dir.is_dir():
        return items
    for sub in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
        skill_md = sub / "SKILL.md"
        if not skill_md.is_file():
            continue
        fm = parse_frontmatter(read_text(skill_md))
        extra = sorted(p.name for p in sub.iterdir() if p.is_file() and p.name != "SKILL.md")
        items.append({
            "name": fm.get("name") or sub.name,
            "dir": sub.name,
            "description": fm.get("description", ""),
            "extra_files": extra,
        })
    return items


def collect_hook_scripts(hooks_block):
    """Flatten the settings hooks block into per-event command entries."""
    flat = []
    referenced = set()
    if not isinstance(hooks_block, dict):
        return flat, referenced
    for event, groups in hooks_block.items():
        if not isinstance(groups, list):
            continue
        for group in groups:
            matcher = group.get("matcher", "") if isinstance(group, dict) else ""
            for hook in (group.get("hooks", []) if isinstance(group, dict) else []):
                command = hook.get("command", "") if isinstance(hook, dict) else str(hook)
                flat.append({"event": event, "matcher": matcher, "command": command})
                for tok in _SCRIPT_TOKEN.findall(command):
                    referenced.add(os.path.basename(tok.replace("\\", "/")))
    return flat, referenced


def scan_hooks_dir(hooks_dir, referenced_basenames):
    """List scripts present in hooks/ and mark which are wired vs orphaned."""
    present = []
    if not hooks_dir.is_dir():
        return present
    for path in sorted(hooks_dir.iterdir()):
        if not path.is_file():
            continue
        if path.suffix not in (".sh", ".py", ".js", ".ts", ".ps1"):
            continue
        try:
            size = path.stat().st_size
        except OSError:
            size = -1
        present.append({
            "file": path.name,
            "bytes": size,
            "wired": path.name in referenced_basenames,
        })
    return present


def assess_permissions(settings_files):
    """Pull allow/deny/ask lists from every settings file and flag risky rules.

    Returns a summary dict. A wide allow-list with no deny-list is the single
    most important thing to surface before a config is shared, so we count
    rules, classify dangerous ones, and explicitly note deny-list presence.
    """
    allow, deny, ask = [], [], []
    has_deny = False
    for label, data in settings_files:
        perms = (data or {}).get("permissions", {}) if isinstance(data, dict) else {}
        for rule in perms.get("allow", []) or []:
            allow.append({"rule": rule, "source": label})
        for rule in perms.get("deny", []) or []:
            deny.append({"rule": rule, "source": label})
            has_deny = True
        for rule in perms.get("ask", []) or []:
            ask.append({"rule": rule, "source": label})

    flagged = []
    for entry in allow:
        rule = entry["rule"]
        for severity, label, rx in _DANGER:
            if rx.search(rule):
                flagged.append({"rule": rule, "source": entry["source"],
                                "severity": severity, "reason": label})
                break  # one (highest-priority) reason per rule is enough
    wildcard_count = sum(1 for e in allow if "*" in e["rule"])

    return {
        "allow_count": len(allow),
        "deny_count": len(deny),
        "ask_count": len(ask),
        "has_deny_list": has_deny,
        "wildcard_allow_count": wildcard_count,
        "flagged_allows": flagged,
        "allow_rules": [e["rule"] for e in allow],
        "deny_rules": [e["rule"] for e in deny],
    }


def find_secrets(settings_files):
    """Surface settings keys that look like inlined secrets (never print values)."""
    hits = []

    def walk(obj, path):
        if isinstance(obj, dict):
            for k, v in obj.items():
                child = path + "." + str(k)
                if isinstance(v, str) and v.strip() and (_SECRET_KEY.search(str(k)) or _SECRET_VALUE.search(v)):
                    hits.append(child)
                walk(v, child)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                walk(v, "{}[{}]".format(path, i))

    for label, data in settings_files:
        walk(data, label)
    return hits


def scan_memory(claude_dir):
    """Count auto-memory files under projects/*/memory/."""
    projects = claude_dir / "projects"
    total, locations = 0, []
    if projects.is_dir():
        for mem in projects.glob("*/memory"):
            if mem.is_dir():
                files = [p.name for p in mem.glob("*.md") if p.name != "MEMORY.md"]
                total += len(files)
                locations.append({"project": mem.parent.name, "fact_count": len(files)})
    return {"total_facts": total, "locations": locations}


def scan_stale(claude_dir):
    """Flag backup/draft clutter (and zero-ish backups that restore nothing)."""
    stale = []
    if not claude_dir.is_dir():
        return stale
    for path in claude_dir.iterdir():
        if not path.is_file():
            continue
        name = path.name
        lower = name.lower()
        # Match the many backup/draft conventions: foo.bak, foo.json.backup-x,
        # backup-foo, *DRAFT*, foo.old, foo.orig, and editor tilde files.
        if (".bak" in lower or ".backup" in lower or "backup-" in lower
                or "draft" in lower or lower.endswith(".old")
                or lower.endswith(".orig") or name.endswith("~")):
            try:
                size = path.stat().st_size
            except OSError:
                size = -1
            stale.append({"file": name, "bytes": size,
                          "empty_backup": 0 <= size <= 3})
    return stale


def compute_maturity(inv):
    """Transparent, deterministic customization score -> tier.

    The point breakdown is returned alongside the tier so the result is
    explainable and reproducible across machines.
    """
    signals = []

    def add(points, label):
        signals.append({"points": points, "signal": label})

    if inv["claude_md"]["global_present"]:
        add(2, "global CLAUDE.md present")
    add(min(len(inv["agents"]), 5), "{} subagent(s)".format(len(inv["agents"])))
    add(min(len(inv["commands"]), 3), "{} slash command(s)".format(len(inv["commands"])))
    add(min(len(inv["skills"]), 5), "{} skill(s)".format(len(inv["skills"])))
    wired = sum(1 for h in inv["settings"]["hooks_flat"])
    add(min(wired, 5), "{} wired hook command(s)".format(wired))
    if inv["plugins"]["enabled"]:
        add(1, "{} plugin(s) enabled".format(len(inv["plugins"]["enabled"])))
    if inv["permissions"]["has_deny_list"]:
        add(1, "deny-list present (good hygiene)")
    if inv["settings"]["model"]:
        add(1, "explicit model pin ({})".format(inv["settings"]["model"]))

    score = sum(s["points"] for s in signals)
    if score <= 2:
        tier = "stock"
    elif score <= 7:
        tier = "light"
    elif score <= 15:
        tier = "moderate"
    else:
        tier = "elaborate"
    return {"score": score, "tier": tier, "signals": signals}


def main():
    # Force LF on stdout so the JSON is byte-identical across OSes (Windows would
    # otherwise emit CRLF), preserving the deterministic-diff goal.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(newline="\n")
    claude_dir = find_claude_dir(sys.argv)
    err("[audit] target .claude dir: {}".format(claude_dir))
    if not claude_dir.is_dir():
        err("[audit] ERROR: directory not found. Pass the path explicitly: "
            "python3 audit-collect.py /path/to/.claude")
        sys.exit(2)

    settings_main, e_main = read_json(claude_dir / "settings.json")
    settings_local, e_local = read_json(claude_dir / "settings.local.json")
    settings_files = [("settings.json", settings_main), ("settings.local.json", settings_local)]

    hooks_block = (settings_main or {}).get("hooks", {}) if isinstance(settings_main, dict) else {}
    hooks_flat, referenced = collect_hook_scripts(hooks_block)
    hooks_present = scan_hooks_dir(claude_dir / "hooks", referenced)
    orphaned = [h["file"] for h in hooks_present if not h["wired"]]
    missing = sorted(b for b in referenced
                     if b not in {h["file"] for h in hooks_present}
                     and (claude_dir / "hooks" / b).exists() is False)

    installed_plugins, _ = read_json(claude_dir / "plugins" / "installed_plugins.json")
    marketplaces, _ = read_json(claude_dir / "plugins" / "known_marketplaces.json")
    enabled_plugins = list((settings_main or {}).get("enabledPlugins", {}).keys()) if isinstance(settings_main, dict) else []

    global_md = read_text(claude_dir / "CLAUDE.md")

    inventory = {
        "schema_version": SCHEMA_VERSION,
        "meta": {
            "claude_dir": str(claude_dir),
            "platform": platform.system(),
            "platform_release": platform.release(),
            "python": platform.python_version(),
            "hostname": socket.gethostname(),
            "collected_at_utc": datetime.now(timezone.utc).isoformat(),
        },
        "settings": {
            "model": (settings_main or {}).get("model", "") if isinstance(settings_main, dict) else "",
            "auto_updates_channel": (settings_main or {}).get("autoUpdatesChannel", "") if isinstance(settings_main, dict) else "",
            "settings_json_error": e_main,
            "settings_local_error": e_local,
            "hooks_flat": hooks_flat,
            "hooks_events": sorted(hooks_block.keys()) if isinstance(hooks_block, dict) else [],
        },
        "agents": scan_markdown_dir(claude_dir / "agents", "agent"),
        "commands": scan_markdown_dir(claude_dir / "commands", "command"),
        "skills": scan_skills(claude_dir / "skills"),
        "hooks_dir": {
            "scripts": hooks_present,
            "orphaned_scripts": orphaned,
            "referenced_but_missing": missing,
        },
        "plugins": {
            "enabled": enabled_plugins,
            "installed": list((installed_plugins or {}).get("plugins", {}).keys()) if isinstance(installed_plugins, dict) else [],
            "marketplaces": list(marketplaces.keys()) if isinstance(marketplaces, dict) else [],
        },
        "permissions": assess_permissions(settings_files),
        "memory": scan_memory(claude_dir),
        "claude_md": {
            "global_present": global_md is not None and not str(global_md).startswith("\x00"),
            "global_bytes": len(global_md) if isinstance(global_md, str) and not global_md.startswith("\x00") else 0,
        },
        "secrets_suspected": find_secrets(settings_files),
        "stale_files": scan_stale(claude_dir),
    }
    inventory["maturity"] = compute_maturity(inventory)

    # Save a timestamped copy to the OS temp dir (cross-platform; never /tmp
    # hardcoded) for the human record, then emit JSON to stdout for the skill.
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_host = re.sub(r"[^A-Za-z0-9_.-]", "_", socket.gethostname())
    out_path = Path(tempfile.gettempdir()) / "claude_audit_{}_{}.json".format(safe_host, stamp)
    try:
        out_path.write_text(json.dumps(inventory, indent=2), encoding="utf-8")
        try:
            os.chmod(str(out_path), 0o600)  # report names hooks/paths; keep it owner-only
        except OSError:
            pass
        err("[audit] saved report: {}".format(out_path))
    except OSError as exc:
        err("[audit] could not save report file: {}".format(exc))

    json.dump(inventory, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
