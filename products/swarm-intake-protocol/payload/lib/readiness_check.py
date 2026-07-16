#!/usr/bin/env python3
"""readiness_check.py -- the Swarm-intake DISPATCH GATE collector (M12 §3.6).

Given a target project directory, this deterministic, stdlib-only collector emits
a FIXED-SHAPE JSON report (+ exit code) describing exactly which of the 10
swarm-readiness artifacts EXIST vs are MISSING/INVALID, with an ordered
remediation list. It mirrors the core's proven collector->report pattern
(``audit-setup`` / ``eval`` / M05 ``audit_collect.py``): cheap, no-LLM, fully
reproducible, read-only.

READY (all checks pass)  -> exit 0  -> Stage 4 may dispatch via /swarm.
NOT-READY (any check fail) -> exit 1 -> ordered remediation; loop back; never dispatch.

The 10 checks (M12 §3.6), each PASS / FAIL / SKIP + remediation:
  C1  workspace manifest present + matches declared workspace.modules
  C2  root CLAUDE.md present + security-boundary section FIRST
  C3  EVERY declared module dir has a scoped CLAUDE.md
  C4  CODEOWNERS present + covers every module path + shared/integrations -> all-team
  C5  swarm.config.yml present + schema-valid (all required blocks; deterministic_checks non-empty)
  C6  CI workflow present + matrix covers every module + at least lint + typecheck
  C7  PROJECT_STATE.md present + has acceptance-criteria + decisions + architecture sections
  C8  task graph present + EVERY task has goal/until/without + acceptance_criteria + module + blockedBy + complexity + cross_module
  C9  .swarm/memory.md seeded (non-empty)
  C10 no committed secrets (G3 credential-pattern set; FAIL-CLOSED; logs pattern NAME + path, never the value)

HARD RULES honoured: free/OSS, Python STDLIB ONLY, cross-platform (pathlib +
PYTHONUTF8), no network egress, no unsafe exec/eval, READ-ONLY (never writes into
the target repo), fail-closed where relevant (C10, unparseable YAML).

Exit codes: 0 = READY, 1 = NOT-READY, 2 = usage error.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "swarm.readiness.v1"

# Directories never scanned for the secret sweep / file walks.
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist",
             "build", ".pytest_cache", ".mypy_cache", ".swarm-cache", "target",
             ".gradle", "Pods", ".next", ".turbo"}

# Module names that, by blueprint convention, must be reviewed by the WHOLE team.
ALL_TEAM_MODULES = {"shared", "integrations"}

# ---------------------------------------------------------------------------
# G3 credential-pattern set (names only ever logged; values NEVER logged).
# Vendored credential subset of the M08/build-audit-loop redact family. PII
# patterns (email / ssn / credit-card) are deliberately EXCLUDED here: a
# "committed secrets" gate must fail-closed on credential SHAPES without nuking
# legitimate doc content (owner emails in PROJECT_STATE, @handles in CODEOWNERS,
# long digit strings). Secrets, not PII, are the trust-boundary concern.
# ---------------------------------------------------------------------------
_RAW_SECRET_PATTERNS = [
    ("private-key-block",
     r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"
     r".*?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"),
    ("age-secret-key", r"AGE-SECRET-KEY-1[0-9A-Z]{20,}"),
    ("github-token", r"gh[opusr]_[A-Za-z0-9]{16,}"),
    ("github-pat", r"github_pat_[A-Za-z0-9_]{20,}"),
    ("slack-token", r"xox[baprs]-[A-Za-z0-9-]{8,}"),
    ("aws-access-key-id", r"AKIA[0-9A-Z]{16}"),
    ("anthropic-key", r"sk-ant-[A-Za-z0-9_-]{20,}"),
    ("openai-key", r"sk-[A-Za-z0-9]{20,}"),
    ("google-api-key", r"AIza[0-9A-Za-z_-]{32,}"),
    ("jwt", r"eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"),
    ("postgres-url", r"postgres(?:ql)?://[^\s:@/]+:[^\s@]+@[^\s/]+"),
    ("bearer-token", r"[Bb]earer\s+[A-Za-z0-9._~+/=-]{20,}"),
    ("generic-secret-assignment",
     r"(?i)(?:api[_-]?key|secret|token|passwd|password|access[_-]?key)"
     r"\s*[:=]\s*[\"'][A-Za-z0-9._\-/+]{16,}[\"']"),
]
_DOTALL_NAMES = {"private-key-block"}
SECRET_PATTERNS = [
    (name, re.compile(raw, re.DOTALL if name in _DOTALL_NAMES else 0))
    for name, raw in _RAW_SECRET_PATTERNS
]

# Files scanned for committed secrets (text-ish only; binaries skipped by ext).
_SECRET_SCAN_GLOBS = ["**/*"]
_BINARY_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip",
               ".gz", ".tar", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4",
               ".mp3", ".wasm", ".so", ".dylib", ".dll", ".exe", ".bin", ".pyc",
               ".lock"}


# ---------------------------------------------------------------------------
# Minimal, defensive YAML subset parser (stdlib only -- no PyYAML dependency).
# Handles the constructs the intake templates use: nested maps, block sequences,
# dash-introduced mapping items, inline flow lists ([] / [a, b]), scalars,
# quotes, # comments. Tabs in indentation are rejected (fail-closed) -- YAML
# forbids them and silent acceptance would mis-nest the tree.
# ---------------------------------------------------------------------------
class YamlError(ValueError):
    """Raised on malformed YAML so callers can fail-closed on the dependent check."""


def _strip_inline_comment(raw: str) -> str:
    out = []
    in_s = in_d = False
    prev_ws = True
    for ch in raw:
        if ch == "'" and not in_d:
            in_s = not in_s
        elif ch == '"' and not in_s:
            in_d = not in_d
        elif ch == "#" and not in_s and not in_d and prev_ws:
            break
        out.append(ch)
        prev_ws = ch in (" ", "\t")
    return "".join(out)


def _logical_lines(text: str):
    lines = []
    for raw in text.splitlines():
        stripped_full = raw.strip()
        if not stripped_full or stripped_full.startswith("#"):
            continue
        body = _strip_inline_comment(raw)
        if body.strip() == "":
            continue
        if body.strip() in ("---", "..."):
            continue
        leading = body[: len(body) - len(body.lstrip(" "))]
        if "\t" in leading or "\t" in (raw[: len(raw) - len(raw.lstrip())]):
            raise YamlError("tab in indentation (YAML forbids tabs)")
        indent = len(leading)
        lines.append((indent, body.strip()))
    return lines


def _scalar(s: str):
    s = s.strip()
    if s.startswith("[") and s.endswith("]"):
        inner = s[1:-1].strip()
        if not inner:
            return []
        return [_scalar(x) for x in _split_flow(inner)]
    if s == "{}":
        return {}  # only the explicit empty flow-map; brace-wrapped placeholders
        # ({{X}}) fall through to a plain string -- inline flow-maps are unused by templates.
    if (len(s) >= 2) and ((s[0] == s[-1]) and s[0] in ("'", '"')):
        return s[1:-1]
    low = s.lower()
    if low in ("null", "~", ""):
        return None
    if low == "true":
        return True
    if low == "false":
        return False
    if re.fullmatch(r"-?\d+", s):
        try:
            return int(s)
        except ValueError:
            return s
    if re.fullmatch(r"-?\d+\.\d+", s):
        try:
            return float(s)
        except ValueError:
            return s
    return s


def _split_flow(inner: str):
    parts, buf = [], []
    in_s = in_d = False
    for ch in inner:
        if ch == "'" and not in_d:
            in_s = not in_s
        elif ch == '"' and not in_s:
            in_d = not in_d
        if ch == "," and not in_s and not in_d:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if buf:
        parts.append("".join(buf).strip())
    return [p for p in parts if p != ""]


def _is_map_item(content: str) -> bool:
    # True if a dash-item introduces a mapping (`key: ...`) rather than a scalar.
    return bool(re.match(r"[^:\s][^:]*:(\s|$)", content)) or content.endswith(":")


def _parse_block(lines, i, indent):
    if i >= len(lines):
        return None, i
    content = lines[i][1]
    if content == "-" or content.startswith("- "):
        return _parse_seq(lines, i, indent)
    return _parse_map(lines, i, indent)


def _parse_map(lines, i, indent):
    result = {}
    while i < len(lines):
        ind, content = lines[i]
        if ind < indent:
            break
        if ind > indent:
            raise YamlError("unexpected indentation at line: %r" % content)
        if content.startswith("- "):
            raise YamlError("sequence item where mapping expected: %r" % content)
        key, sep, rest = content.partition(":")
        if not sep:
            raise YamlError("expected 'key: value' mapping line: %r" % content)
        key = key.strip()
        rest = rest.strip()
        if rest == "":
            nxt = lines[i + 1] if i + 1 < len(lines) else None
            if nxt is not None and nxt[0] > indent:
                val, i = _parse_block(lines, i + 1, nxt[0])
            elif nxt is not None and nxt[0] == indent and (
                nxt[1] == "-" or nxt[1].startswith("- ")
            ):
                val, i = _parse_seq(lines, i + 1, indent)
            else:
                val, i = None, i + 1
            result[key] = val
        else:
            result[key] = _scalar(rest)
            i += 1
    return result, i


def _parse_seq(lines, i, indent):
    result = []
    while i < len(lines):
        ind, content = lines[i]
        if ind < indent:
            break
        if ind != indent:
            raise YamlError("misaligned sequence item: %r" % content)
        if not (content == "-" or content.startswith("- ")):
            break
        inline = content[1:].lstrip()
        if inline == "":
            nxt = lines[i + 1] if i + 1 < len(lines) else None
            if nxt is not None and nxt[0] > indent:
                val, i = _parse_block(lines, i + 1, nxt[0])
            else:
                val, i = None, i + 1
            result.append(val)
        elif _is_map_item(inline):
            inline_col = indent + (len(content) - len(inline))
            sub = [(inline_col, inline)]
            j = i + 1
            while j < len(lines) and lines[j][0] > indent:
                sub.append(lines[j])
                j += 1
            val, _ = _parse_block(sub, 0, sub[0][0])
            result.append(val)
            i = j
        else:
            result.append(_scalar(inline))
            i += 1
    return result, i


def parse_yaml(text: str):
    lines = _logical_lines(text)
    if not lines:
        return None
    value, _ = _parse_block(lines, 0, lines[0][0])
    return value


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _headings(md: str):
    """Return ordered (level, text) markdown ATX headings."""
    out = []
    for line in md.splitlines():
        m = re.match(r"^(#{1,6})\s+(.*\S)\s*$", line)
        if m:
            out.append((len(m.group(1)), m.group(2).strip()))
    return out


def _check(cid, title, status, remediation="", detail=None):
    return {
        "id": cid, "title": title, "status": status,
        "remediation": remediation if status == "fail" else "",
        "detail": detail or {},
    }


def _first(path_candidates):
    for p in path_candidates:
        if p.exists():
            return p
    return None


# ---------------------------------------------------------------------------
# Workspace resolution -- the module list every other check depends on.
# ---------------------------------------------------------------------------
def resolve_workspace(root: Path):
    """Return (config_dict_or_None, manager, package_dir, modules, parse_error)."""
    cfg_path = root / "swarm.config.yml"
    if not cfg_path.exists():
        cfg_path = root / "swarm.config.yaml"
    if not cfg_path.exists():
        return None, None, "packages", [], None
    try:
        cfg = parse_yaml(_read(cfg_path))
    except YamlError as exc:
        return None, None, "packages", [], str(exc)
    if not isinstance(cfg, dict):
        return None, None, "packages", [], "swarm.config.yml is not a mapping"
    ws = cfg.get("workspace") or {}
    if not isinstance(ws, dict):
        ws = {}
    manager = ws.get("manager")
    package_dir = ws.get("package_dir") or "packages"
    modules = ws.get("modules") or []
    if not isinstance(modules, list):
        modules = []
    modules = [str(m) for m in modules if isinstance(m, (str, int))]
    return cfg, manager, str(package_dir), modules, None


# ---------------------------------------------------------------------------
# The 10 checks
# ---------------------------------------------------------------------------
def check_c1_workspace(root, manager, package_dir, modules, cfg):
    if cfg is None:
        return _check("C1_workspace_manifest", "workspace manifest present + matches declared modules",
                      "fail", "Create swarm.config.yml with a workspace block (manager, package_dir, modules) "
                      "and the matching workspace manifest.")
    pkg_root = root / package_dir
    missing_dirs = [m for m in modules if not (pkg_root / m).is_dir()]
    manifest_ok, manifest_note = True, ""
    mgr = (manager or "").lower()
    if mgr in ("pnpm", "npm", "yarn", "bun"):
        manifest = _first([root / "pnpm-workspace.yaml", root / "pnpm-workspace.yml",
                           root / "package.json"])
        if manifest is None:
            manifest_ok, manifest_note = False, "no pnpm-workspace.yaml / package.json found"
    elif mgr in ("directory", "plain", "polyglot", ""):
        manifest_ok = pkg_root.is_dir()
        manifest_note = "" if manifest_ok else "package_dir '%s/' does not exist" % package_dir
    else:
        manifest_ok, manifest_note = pkg_root.is_dir(), "unknown manager '%s'; checked package_dir" % manager
    if not modules:
        return _check("C1_workspace_manifest", "workspace manifest present + matches declared modules",
                      "fail", "Declare workspace.modules in swarm.config.yml (the module list drives every other check).",
                      {"manager": manager, "package_dir": package_dir})
    ok = manifest_ok and not missing_dirs
    rem = ""
    if not ok:
        bits = []
        if not manifest_ok:
            bits.append(manifest_note)
        if missing_dirs:
            bits.append("missing module dirs: %s" % ", ".join("%s/%s" % (package_dir, m) for m in missing_dirs))
        rem = "Fix workspace manifest / module dirs: " + "; ".join(bits)
    return _check("C1_workspace_manifest", "workspace manifest present + matches declared modules",
                  "pass" if ok else "fail", rem,
                  {"manager": manager, "package_dir": package_dir,
                   "modules": modules, "missing_module_dirs": missing_dirs})


def check_c2_root_claude(root):
    p = root / "CLAUDE.md"
    if not p.exists():
        return _check("C2_root_claude", "root CLAUDE.md present + security-boundary section first",
                      "fail", "Generate root CLAUDE.md (start from /bootstrap-state, then put the security-boundary "
                      "section FIRST; use templates/CLAUDE.root.md).")
    heads = [h for h in _headings(_read(p)) if h[0] >= 2]
    if not heads:
        return _check("C2_root_claude", "root CLAUDE.md present + security-boundary section first",
                      "fail", "Add a '## Security boundary' section as the FIRST section of root CLAUDE.md.")
    first = heads[0][1].lower()
    ok = bool(re.search(r"security|boundary", first))
    return _check("C2_root_claude", "root CLAUDE.md present + security-boundary section first",
                  "pass" if ok else "fail",
                  "" if ok else "Move the security-boundary section to be the FIRST '##' section "
                  "(currently first section is %r)." % heads[0][1],
                  {"first_section": heads[0][1]})


def check_c3_module_claude(root, package_dir, modules):
    if not modules:
        return _check("C3_module_claude", "every module dir has a scoped CLAUDE.md",
                      "fail", "Declare workspace.modules first (C5), then add a scoped CLAUDE.md per module "
                      "(use templates/CLAUDE.module.md).")
    missing = [m for m in modules if not (root / package_dir / m / "CLAUDE.md").exists()]
    return _check("C3_module_claude", "every module dir has a scoped CLAUDE.md",
                  "pass" if not missing else "fail",
                  "" if not missing else "Add a scoped CLAUDE.md to: %s" % ", ".join(
                      "%s/%s/" % (package_dir, m) for m in missing),
                  {"missing": missing})


def _codeowners_path(root):
    return _first([root / ".github" / "CODEOWNERS", root / "CODEOWNERS",
                   root / "docs" / "CODEOWNERS"])


def check_c4_codeowners(root, package_dir, modules):
    p = _codeowners_path(root)
    if p is None:
        return _check("C4_codeowners", "CODEOWNERS present + covers modules + shared/integrations all-team",
                      "fail", "Add .github/CODEOWNERS mapping each module path to its owner; shared/ + integrations/ "
                      "to all team (use templates/CODEOWNERS.tmpl).")
    if not modules:
        return _check("C4_codeowners", "CODEOWNERS present + covers modules + shared/integrations all-team",
                      "fail", "Declare workspace.modules first (C5) so CODEOWNERS coverage can be verified.")
    rules = []
    for line in _read(p).splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        toks = s.split()
        if len(toks) >= 2:
            rules.append((toks[0], toks[1:]))
    uncovered, undermanned = [], []
    for m in modules:
        target = "%s/%s" % (package_dir, m)
        match = [owners for path, owners in rules
                 if path.rstrip("/") == target or path.rstrip("/").startswith(target + "/")]
        if not match:
            uncovered.append(target)
            continue
        if m in ALL_TEAM_MODULES:
            best = max((len(o) for o in match), default=0)
            if best < 2:
                undermanned.append(target)
    ok = not uncovered and not undermanned
    bits = []
    if uncovered:
        bits.append("uncovered module paths: %s" % ", ".join(uncovered))
    if undermanned:
        bits.append("shared/integrations need >=2 owners (all-team): %s" % ", ".join(undermanned))
    return _check("C4_codeowners", "CODEOWNERS present + covers modules + shared/integrations all-team",
                  "pass" if ok else "fail",
                  "" if ok else "Fix CODEOWNERS: " + "; ".join(bits),
                  {"uncovered": uncovered, "undermanned_all_team": undermanned})


_REQUIRED_CONFIG_BLOCKS = ["workspace", "deterministic_checks", "critical_paths",
                           "sensitive_paths", "watchdog", "briefings", "pool"]


def check_c5_swarm_config(root, cfg, parse_error):
    if parse_error:
        return _check("C5_swarm_config", "swarm.config.yml present + schema-valid",
                      "fail", "swarm.config.yml failed to parse (%s) -- fix YAML." % parse_error)
    if cfg is None:
        return _check("C5_swarm_config", "swarm.config.yml present + schema-valid",
                      "fail", "Add swarm.config.yml with all required blocks: %s (use templates/swarm.config.yml.tmpl)."
                      % ", ".join(_REQUIRED_CONFIG_BLOCKS))
    missing = [b for b in _REQUIRED_CONFIG_BLOCKS if b not in cfg]
    dc = cfg.get("deterministic_checks")
    dc_empty = not dc or (isinstance(dc, (list, dict)) and len(dc) == 0)
    ok = not missing and not dc_empty
    bits = []
    if missing:
        bits.append("missing blocks: %s" % ", ".join(missing))
    if dc_empty:
        bits.append("deterministic_checks must be non-empty (per-language lint/typecheck/test commands)")
    return _check("C5_swarm_config", "swarm.config.yml present + schema-valid",
                  "pass" if ok else "fail",
                  "" if ok else "Fix swarm.config.yml: " + "; ".join(bits),
                  {"missing_blocks": missing, "deterministic_checks_empty": dc_empty})


def _ci_path(root):
    wf = root / ".github" / "workflows"
    if not wf.is_dir():
        return None
    for name in ("ci.yml", "ci.yaml"):
        if (wf / name).exists():
            return wf / name
    cands = sorted(list(wf.glob("*.yml")) + list(wf.glob("*.yaml")))
    return cands[0] if cands else None


_LINT_RE = re.compile(r"\b(lint|eslint|ruff|flake8|clippy|golangci|ktlint|swiftlint|rubocop)\b", re.I)
_TYPECHECK_RE = re.compile(
    r"(typecheck|type-check|type check|check-types|\btsc\b|\bmypy\b|pyright|go vet|cargo check)", re.I)


def check_c6_ci(root, package_dir, modules):
    p = _ci_path(root)
    if p is None:
        return _check("C6_ci", "CI present + matrix covers modules + lint + typecheck",
                      "fail", "Add .github/workflows/ci.yml with a per-module matrix running at least lint + "
                      "typecheck (use templates/ci.yml.tmpl).")
    text = _read(p)
    lint_ok = bool(_LINT_RE.search(text))
    typ_ok = bool(_TYPECHECK_RE.search(text))
    matrix_missing = []
    try:
        doc = parse_yaml(text)
    except YamlError:
        doc = None
    matrix_values = _collect_matrix_values(doc)
    if modules:
        present = set(str(v) for v in matrix_values)
        matrix_missing = [m for m in modules if m not in present]
    else:
        matrix_missing = ["<no declared modules>"]
    ok = lint_ok and typ_ok and not matrix_missing
    bits = []
    if matrix_missing:
        bits.append("CI matrix does not cover: %s" % ", ".join(matrix_missing))
    if not lint_ok:
        bits.append("no lint step detected")
    if not typ_ok:
        bits.append("no typecheck step detected")
    return _check("C6_ci", "CI present + matrix covers modules + lint + typecheck",
                  "pass" if ok else "fail",
                  "" if ok else "Fix CI: " + "; ".join(bits),
                  {"lint": lint_ok, "typecheck": typ_ok, "matrix_missing": matrix_missing})


def _collect_matrix_values(doc):
    """Pull every scalar found under any 'matrix:' mapping in a parsed CI doc."""
    found = []

    def walk(node, under_matrix):
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, under_matrix or (str(k).lower() == "matrix"))
        elif isinstance(node, list):
            for v in node:
                walk(v, under_matrix)
        else:
            if under_matrix and node is not None:
                found.append(node)
    if doc is not None:
        walk(doc, False)
    return found


def check_c7_project_state(root):
    p = _first([root / "docs" / "PROJECT_STATE.md", root / "PROJECT_STATE.md"])
    if p is None:
        return _check("C7_project_state", "PROJECT_STATE.md present + acceptance-criteria + decisions + architecture",
                      "fail", "Add docs/PROJECT_STATE.md (start from /bootstrap-state; shape with "
                      "templates/PROJECT_STATE.tmpl.md -- acceptance criteria are the source of truth).")
    text = _read(p).lower()
    heads = " \n ".join(h[1].lower() for h in _headings(_read(p)))
    has_accept = ("acceptance" in heads and "criteria" in heads) or "acceptance criteria" in text
    has_decisions = "decision" in heads or "## decisions" in text or "decisions" in text
    has_arch = "architecture" in heads or "architecture" in text
    missing = []
    if not has_accept:
        missing.append("acceptance-criteria section")
    if not has_decisions:
        missing.append("decisions section")
    if not has_arch:
        missing.append("architecture section")
    return _check("C7_project_state", "PROJECT_STATE.md present + acceptance-criteria + decisions + architecture",
                  "pass" if not missing else "fail",
                  "" if not missing else "Add to PROJECT_STATE.md: %s" % ", ".join(missing),
                  {"missing_sections": missing})


_TASK_REQUIRED = ["goal", "until", "without", "acceptance_criteria", "module",
                  "blockedBy", "complexity", "cross_module"]
_COMPLEXITY_ENUM = {"simple", "complex"}


def _tasks_path(root):
    return _first([root / ".swarm" / "intake" / "tasks.yaml",
                   root / ".swarm" / "intake" / "tasks.yml",
                   root / ".swarm" / "tasks.yaml",
                   root / "tasks.yaml"])


def check_c8_task_graph(root):
    p = _tasks_path(root)
    if p is None:
        return _check("C8_task_graph", "task graph present + every task fully specified",
                      "fail", "Add .swarm/intake/tasks.yaml: every task = goal/until/without + acceptance_criteria + "
                      "module + blockedBy + complexity + cross_module (use templates/task.tmpl.yaml).")
    try:
        doc = parse_yaml(_read(p))
    except YamlError as exc:
        return _check("C8_task_graph", "task graph present + every task fully specified",
                      "fail", "tasks.yaml failed to parse (%s) -- fix YAML." % exc)
    tasks = doc.get("tasks") if isinstance(doc, dict) else doc
    if not isinstance(tasks, list) or not tasks:
        return _check("C8_task_graph", "task graph present + every task fully specified",
                      "fail", "tasks.yaml must contain a non-empty 'tasks:' list.")
    problems = []
    ids = []
    for idx, t in enumerate(tasks):
        if not isinstance(t, dict):
            problems.append("task[%d] is not a mapping" % idx)
            continue
        norm = {str(k).lower(): k for k in t.keys()}
        tid = t.get(norm.get("id", "id"), "task[%d]" % idx)
        ids.append(tid)
        missing = []
        for field in _TASK_REQUIRED:
            key = norm.get(field.lower())
            if key is None:
                missing.append(field)
                continue
            val = t[key]
            if field in ("goal", "until", "without", "module", "complexity"):
                # Fail-closed type gate (P9): these fields are str by schema
                # (tasks.schema.yaml). A YAML-typed scalar -- bool (until: false),
                # int (until: 0), or empty flow list (until: []) -- is NOT a
                # measurable done-condition. str(False)/str(0)/str([]) are all
                # non-empty, so a bare emptiness check would silently pass them.
                # Require an actual non-blank string; anything else is "missing".
                if not isinstance(val, str) or not val.strip():
                    missing.append(field)
            if field == "complexity" and str(val).strip().lower() not in _COMPLEXITY_ENUM:
                problems.append("%s: complexity must be one of %s (got %r)"
                                % (tid, sorted(_COMPLEXITY_ENUM), val))
            if field == "cross_module" and not isinstance(val, bool):
                problems.append("%s: cross_module must be true/false (got %r)" % (tid, val))
        if missing:
            problems.append("%s missing: %s" % (tid, ", ".join(missing)))
    ok = not problems
    return _check("C8_task_graph", "task graph present + every task fully specified",
                  "pass" if ok else "fail",
                  "" if ok else "Fix tasks.yaml: " + "; ".join(problems),
                  {"task_count": len(tasks), "task_ids": ids, "problems": problems})


def check_c9_memory(root):
    p = _first([root / ".swarm" / "memory.md"])
    if p is None or not p.exists():
        return _check("C9_memory_seed", ".swarm/memory.md seeded",
                      "fail", "Seed .swarm/memory.md (4-layer context layer 4; use templates/memory.seed.md).")
    meaningful = [ln for ln in _read(p).splitlines()
                  if ln.strip() and not ln.strip().startswith("#") and not ln.strip().startswith("<!--")]
    ok = len(meaningful) > 0
    return _check("C9_memory_seed", ".swarm/memory.md seeded",
                  "pass" if ok else "fail",
                  "" if ok else ".swarm/memory.md exists but is empty/placeholder-only; add seed content.",
                  {"non_comment_lines": len(meaningful)})


def _iter_scan_files(root: Path):
    for f in root.rglob("*"):
        if not f.is_file():
            continue
        # FAIL-CLOSED: scope SKIP_DIRS to dirs INSIDE the project tree only.
        # `root` is .resolve()d, so f.parts contains every ancestor component
        # too -- including the CI/checkout path (e.g. /home/runner/build/...
        # or C:/dist/project/...) -- any of which may innocently match a
        # SKIP_DIRS name (build, dist, target, venv, Pods, ...), causing the
        # walker to yield nothing and the secret gate to vacuously pass. Use
        # the project-relative parts so only in-project dirs are skipped.
        try:
            rel_parts = f.relative_to(root).parts
        except ValueError:
            # f is not under root (symlink resolving outside) -- skip safely.
            continue
        if any(part in SKIP_DIRS for part in rel_parts):
            continue
        if f.suffix.lower() in _BINARY_EXT:
            continue
        try:
            if f.stat().st_size > 2_000_000:  # skip >2MB blobs (not human-readable config/code)
                continue
        except OSError:
            continue
        yield f


def check_c10_no_secrets(root):
    """FAIL-CLOSED: any credential-shaped match -> fail; any pattern-eval error -> fail.
    Logs the pattern NAME + relative file path only -- never the matched value."""
    hits = []
    eval_error = None
    for f in _iter_scan_files(root):
        text = _read(f)
        if not text:
            continue
        rel = str(f.relative_to(root)).replace("\\", "/")
        for name, pat in SECRET_PATTERNS:
            try:
                if pat.search(text):
                    hits.append({"pattern": name, "file": rel})
            except Exception as exc:  # noqa: BLE001 -- fail-closed on ANY pattern failure
                eval_error = "pattern %s failed to evaluate: %s" % (name, exc)
                break
        if eval_error:
            break
    if eval_error:
        return _check("C10_no_secrets", "no committed secrets (fail-closed)",
                      "fail", "Secret scan could not complete (fail-closed): %s" % eval_error)
    ok = not hits
    rem = ""
    if hits:
        where = "; ".join("%s in %s" % (h["pattern"], h["file"]) for h in hits)
        rem = "Remove committed secret(s) and rotate them; move to .env (gitignored): " + where
    return _check("C10_no_secrets", "no committed secrets (fail-closed)",
                  "pass" if ok else "fail", rem,
                  {"hits": hits})  # hits carry pattern NAME + path only, never the value


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def collect(project_root) -> dict:
    root = Path(project_root).expanduser().resolve()
    cfg, manager, package_dir, modules, parse_error = resolve_workspace(root)

    checks = [
        check_c1_workspace(root, manager, package_dir, modules, cfg),
        check_c2_root_claude(root),
        check_c3_module_claude(root, package_dir, modules),
        check_c4_codeowners(root, package_dir, modules),
        check_c5_swarm_config(root, cfg, parse_error),
        check_c6_ci(root, package_dir, modules),
        check_c7_project_state(root),
        check_c8_task_graph(root),
        check_c9_memory(root),
        check_c10_no_secrets(root),
    ]
    npass = sum(1 for c in checks if c["status"] == "pass")
    nfail = sum(1 for c in checks if c["status"] == "fail")
    nskip = sum(1 for c in checks if c["status"] == "skip")
    verdict = "READY" if nfail == 0 and nskip == 0 else "NOT-READY"
    remediations = [
        {"id": c["id"], "remediation": c["remediation"]}
        for c in checks if c["status"] == "fail"
    ]
    return {
        "schema": SCHEMA,
        "ts": now_iso(),
        "project_root": str(root),
        "workspace_manager": manager,
        "package_dir": package_dir,
        "modules_declared": modules,
        "checks": checks,
        "summary": {"pass": npass, "fail": nfail, "skip": nskip, "total": len(checks)},
        "verdict": verdict,
        "remediations": remediations,
    }


def render_human(report: dict) -> str:
    glyph = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}
    lines = []
    lines.append("Swarm-readiness: %s  (%d/%d checks pass)" % (
        report["verdict"], report["summary"]["pass"], report["summary"]["total"]))
    lines.append("project: %s" % report["project_root"])
    if report["modules_declared"]:
        lines.append("modules: %s" % ", ".join(report["modules_declared"]))
    lines.append("")
    for c in report["checks"]:
        lines.append("[%s] %s -- %s" % (glyph.get(c["status"], "?"), c["id"], c["title"]))
        if c["status"] == "fail" and c["remediation"]:
            lines.append("        -> %s" % c["remediation"])
    if report["verdict"] != "READY":
        lines.append("")
        lines.append("NOT-READY: resolve the FAIL items above, then re-run before /swarm dispatch.")
    return "\n".join(lines) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog="readiness_check.py",
        description="Swarm-intake dispatch gate: emit which readiness artifacts exist vs are missing.")
    ap.add_argument("project_root", nargs="?", default=".",
                    help="path to the target project directory (default: cwd)")
    ap.add_argument("--format", choices=["json", "human"], default="json",
                    help="output format (default: json)")
    args = ap.parse_args(argv)

    root = Path(args.project_root).expanduser()
    if not root.exists():
        sys.stderr.write("readiness_check: project_root not found: %s\n" % root)
        return 2

    report = collect(root)
    if args.format == "human":
        sys.stdout.write(render_human(report))
    else:
        sys.stdout.write(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    return 0 if report["verdict"] == "READY" else 1


if __name__ == "__main__":
    raise SystemExit(main())
