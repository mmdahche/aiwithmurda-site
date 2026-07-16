"""Table-driven tests for the Swarm-intake readiness collector (M12 §10).

The golden `fixtures/ready/` repo must return READY (all 10 checks pass). Each
NOT-READY case copies the golden repo to a tmp dir, mutates exactly ONE artifact,
and asserts the verdict flips to NOT-READY with the EXPECTED check failing and a
remediation present. Also unit-tests the stdlib mini-YAML parser and the
fail-closed secret gate (C10). Pure stdlib + pytest; cross-platform (PYTHONUTF8).
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

LIB = Path(__file__).resolve().parent.parent / "lib"
sys.path.insert(0, str(LIB))

import readiness_check as rc  # noqa: E402

FIXTURE_READY = Path(__file__).resolve().parent / "fixtures" / "ready"


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _clone_ready(tmp_path) -> Path:
    dst = tmp_path / "repo"
    shutil.copytree(FIXTURE_READY, dst)
    return dst


def _status(report, check_id):
    for c in report["checks"]:
        if c["id"] == check_id:
            return c["status"]
    raise AssertionError("no such check: %s" % check_id)


def _failing_ids(report):
    return {c["id"] for c in report["checks"] if c["status"] == "fail"}


# --------------------------------------------------------------------------- #
# Baseline: the golden fixture is READY
# --------------------------------------------------------------------------- #
def test_ready_fixture_is_ready():
    report = rc.collect(FIXTURE_READY)
    assert report["verdict"] == "READY", report["remediations"]
    assert report["summary"]["fail"] == 0
    assert report["summary"]["total"] == 10
    # every check object is well-formed (fixed-shape report contract)
    for c in report["checks"]:
        assert set(c) >= {"id", "title", "status", "remediation", "detail"}
        assert c["status"] in ("pass", "fail", "skip")


# --------------------------------------------------------------------------- #
# NOT-READY: one mutation per check -> the right check fails + remediation given
# --------------------------------------------------------------------------- #
def _mut_remove_module_claude(repo):
    (repo / "packages" / "module-a" / "CLAUDE.md").unlink()


def _mut_codeowners_drop_allteam_owner(repo):
    # shared has only one owner -> all-team requirement (>=2) violated
    p = repo / ".github" / "CODEOWNERS"
    text = p.read_text(encoding="utf-8")
    text = text.replace("packages/shared/          @dev-a @dev-b @founder",
                        "packages/shared/          @dev-a")
    p.write_text(text, encoding="utf-8")


def _mut_empty_deterministic_checks(repo):
    p = repo / "swarm.config.yml"
    text = p.read_text(encoding="utf-8")
    # blank out the deterministic_checks block body -> empty
    out, skip = [], False
    for line in text.splitlines():
        if line.startswith("deterministic_checks:"):
            out.append("deterministic_checks: {}")
            skip = True
            continue
        if skip:
            if line and not line[0].isspace():
                skip = False
                out.append(line)
            # else: drop indented body lines
            continue
        out.append(line)
    p.write_text("\n".join(out) + "\n", encoding="utf-8")


def _mut_task_missing_until(repo):
    p = repo / ".swarm" / "intake" / "tasks.yaml"
    text = p.read_text(encoding="utf-8")
    text = text.replace(
        '    until: "AC-A1: the landing page renders and the component test passes"\n', "")
    p.write_text(text, encoding="utf-8")


def _mut_commit_secret(repo):
    # plant a credential-shaped string in a tracked config file
    (repo / "packages" / "module-b" / "config.ts").write_text(
        'export const TOKEN = "ghp_' + "A" * 30 + '";\n', encoding="utf-8")


def _mut_security_not_first(repo):
    p = repo / "CLAUDE.md"
    text = p.read_text(encoding="utf-8")
    # inject a non-security section before the security boundary
    text = text.replace("## Security boundary",
                        "## Overview\n\nIntro text.\n\n## Security boundary", 1)
    p.write_text(text, encoding="utf-8")


def _mut_remove_project_state_accept(repo):
    p = repo / "docs" / "PROJECT_STATE.md"
    text = p.read_text(encoding="utf-8")
    text = text.replace("## 3. Acceptance criteria", "## 3. Stuff")
    p.write_text(text, encoding="utf-8")


def _mut_empty_memory(repo):
    (repo / ".swarm" / "memory.md").write_text("# title only\n", encoding="utf-8")


def _mut_remove_ci(repo):
    (repo / ".github" / "workflows" / "ci.yml").unlink()


def _mut_remove_module_dir(repo):
    shutil.rmtree(repo / "packages" / "module-b")


CASES = [
    ("C3_module_claude", _mut_remove_module_claude),
    ("C4_codeowners", _mut_codeowners_drop_allteam_owner),
    ("C5_swarm_config", _mut_empty_deterministic_checks),
    ("C8_task_graph", _mut_task_missing_until),
    ("C10_no_secrets", _mut_commit_secret),
    ("C2_root_claude", _mut_security_not_first),
    ("C7_project_state", _mut_remove_project_state_accept),
    ("C9_memory_seed", _mut_empty_memory),
    ("C6_ci", _mut_remove_ci),
    ("C1_workspace_manifest", _mut_remove_module_dir),
]


@pytest.mark.parametrize("check_id,mutate", CASES, ids=[c[0] for c in CASES])
def test_not_ready_per_check(tmp_path, check_id, mutate):
    repo = _clone_ready(tmp_path)
    mutate(repo)
    report = rc.collect(repo)
    assert report["verdict"] == "NOT-READY", "expected NOT-READY after mutating %s" % check_id
    assert _status(report, check_id) == "fail", (
        "expected %s to FAIL; failing=%s" % (check_id, _failing_ids(report)))
    # the failing check carries an actionable remediation
    rem = [r for r in report["remediations"] if r["id"] == check_id]
    assert rem and rem[0]["remediation"].strip()


@pytest.mark.parametrize("bad_until", ["false", "true", "0", "[]"])
def test_c8_typed_scalar_until_fails_closed(tmp_path, bad_until):
    # P9 fail-closed: a YAML-typed scalar (bool/int/empty list) is NOT a
    # measurable done-condition. The custom parser coerces these to Python
    # False/True/0/[] -- str()-ing them yields non-empty strings, so a bare
    # emptiness check would silently pass a goalless directive. C8 must FAIL.
    repo = _clone_ready(tmp_path)
    p = repo / ".swarm" / "intake" / "tasks.yaml"
    text = p.read_text(encoding="utf-8")
    text = text.replace(
        '    until: "AC-A1: the landing page renders and the component test passes"',
        "    until: %s" % bad_until)
    p.write_text(text, encoding="utf-8")
    report = rc.collect(repo)
    assert report["verdict"] == "NOT-READY", "until: %s must not pass C8" % bad_until
    assert _status(report, "C8_task_graph") == "fail"
    problems = next(c for c in report["checks"]
                    if c["id"] == "C8_task_graph")["detail"]["problems"]
    assert any("until" in prob for prob in problems), problems


def test_c8_valid_string_until_still_passes(tmp_path):
    # Preserve valid-directive behavior: a normal string `until` stays READY.
    repo = _clone_ready(tmp_path)
    report = rc.collect(repo)
    assert _status(report, "C8_task_graph") == "pass"
    assert report["verdict"] == "READY", report["remediations"]


def test_c3_remediation_names_missing_module(tmp_path):
    repo = _clone_ready(tmp_path)
    _mut_remove_module_claude(repo)
    report = rc.collect(repo)
    c3 = next(c for c in report["checks"] if c["id"] == "C3_module_claude")
    assert "module-a" in c3["detail"]["missing"]


def test_c4_prefix_collision_does_not_falsely_cover(tmp_path):
    # Regression: a CODEOWNERS path that merely shares a string PREFIX with a
    # module path (packages/shared-extras vs module 'shared') must NOT count as
    # covering that module. Otherwise C4 false-PASSes on missing coverage.
    repo = _clone_ready(tmp_path)
    p = repo / ".github" / "CODEOWNERS"
    text = p.read_text(encoding="utf-8")
    text = text.replace("packages/shared/          @dev-a @dev-b @founder",
                        "packages/shared-extras/   @dev-a @dev-b @founder")
    p.write_text(text, encoding="utf-8")
    report = rc.collect(repo)
    assert _status(report, "C4_codeowners") == "fail"
    c4 = next(c for c in report["checks"] if c["id"] == "C4_codeowners")
    assert "packages/shared" in c4["detail"]["uncovered"]


@pytest.mark.parametrize("ancestor_name", ["build", "dist", "target", "venv", "Pods"])
def test_c10_scan_not_fooled_by_skip_dir_named_ancestor(tmp_path, ancestor_name):
    # Regression: the C10 secret sweep used to skip files when ANY component
    # of the absolute path matched SKIP_DIRS. If the CI checkout / tmp root
    # happens to sit under e.g. /home/runner/build/... or C:/dist/project/...,
    # every file was skipped and C10 vacuously PASSED -- a silent total bypass
    # of the fail-closed security gate. The walker MUST scope SKIP_DIRS to
    # project-relative parts so a planted secret is still caught when the
    # project root itself lives under a SKIP_DIRS-named ancestor directory.
    parent = tmp_path / ancestor_name
    parent.mkdir()
    repo = parent / "repo"
    shutil.copytree(FIXTURE_READY, repo)
    # plant a real credential shape inside the project tree
    (repo / "packages" / "module-b" / "config.ts").write_text(
        'export const TOKEN = "ghp_' + "A" * 30 + '";\n', encoding="utf-8")
    report = rc.collect(repo)
    assert _status(report, "C10_no_secrets") == "fail", (
        "C10 must fail-closed even when project root lives under a "
        "SKIP_DIRS-named ancestor (%s); got verdict=%s, failing=%s"
        % (ancestor_name, report["verdict"], _failing_ids(report)))
    c10 = next(c for c in report["checks"] if c["id"] == "C10_no_secrets")
    hits = c10["detail"]["hits"]
    assert hits and hits[0]["pattern"] == "github-token"
    assert hits[0]["file"] == "packages/module-b/config.ts"
    # fail-closed contract: matched VALUE is never leaked into the report
    blob = json.dumps(report)
    assert "ghp_" + "A" * 30 not in blob


def test_c10_logs_pattern_name_not_value(tmp_path):
    repo = _clone_ready(tmp_path)
    _mut_commit_secret(repo)
    report = rc.collect(repo)
    c10 = next(c for c in report["checks"] if c["id"] == "C10_no_secrets")
    hits = c10["detail"]["hits"]
    assert hits and hits[0]["pattern"] == "github-token"
    # fail-closed contract: the matched VALUE never appears in the report
    blob = json.dumps(report)
    assert "ghp_" + "A" * 30 not in blob


def test_missing_config_fails_closed(tmp_path):
    repo = _clone_ready(tmp_path)
    (repo / "swarm.config.yml").unlink()
    report = rc.collect(repo)
    assert report["verdict"] == "NOT-READY"
    assert _status(report, "C5_swarm_config") == "fail"
    # dependent checks that need the module list also fail, not crash
    assert _status(report, "C1_workspace_manifest") == "fail"


# --------------------------------------------------------------------------- #
# mini-YAML parser unit tests
# --------------------------------------------------------------------------- #
def test_yaml_nested_map_and_seq():
    doc = rc.parse_yaml(
        "workspace:\n  manager: pnpm\n  modules:\n    - a\n    - b\n")
    assert doc["workspace"]["manager"] == "pnpm"
    assert doc["workspace"]["modules"] == ["a", "b"]


def test_yaml_seq_of_maps():
    doc = rc.parse_yaml(
        'tasks:\n  - id: "t1"\n    blockedBy: []\n    cross_module: false\n'
        '  - id: "t2"\n    blockedBy:\n      - "t1"\n    cross_module: true\n')
    assert [t["id"] for t in doc["tasks"]] == ["t1", "t2"]
    assert doc["tasks"][0]["blockedBy"] == []
    assert doc["tasks"][0]["cross_module"] is False
    assert doc["tasks"][1]["blockedBy"] == ["t1"]
    assert doc["tasks"][1]["cross_module"] is True


def test_yaml_inline_comment_and_quotes():
    doc = rc.parse_yaml('a: "x # not a comment"  # real comment\nb: 3\n')
    assert doc["a"] == "x # not a comment"
    assert doc["b"] == 3


def test_yaml_tab_indent_is_rejected():
    with pytest.raises(rc.YamlError):
        rc.parse_yaml("workspace:\n\tmanager: pnpm\n")


# --------------------------------------------------------------------------- #
# CLI smoke test: exit codes + JSON shape
# --------------------------------------------------------------------------- #
def test_cli_ready_exit_zero():
    proc = subprocess.run(
        [sys.executable, str(LIB / "readiness_check.py"), str(FIXTURE_READY)],
        capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    report = json.loads(proc.stdout)
    assert report["verdict"] == "READY"
    assert report["schema"] == "swarm.readiness.v1"


def test_cli_not_ready_exit_one(tmp_path):
    repo = _clone_ready(tmp_path)
    _mut_remove_ci(repo)
    proc = subprocess.run(
        [sys.executable, str(LIB / "readiness_check.py"), str(repo), "--format", "human"],
        capture_output=True, text=True)
    assert proc.returncode == 1
    assert "NOT-READY" in proc.stdout


def test_cli_missing_root_exit_two(tmp_path):
    proc = subprocess.run(
        [sys.executable, str(LIB / "readiness_check.py"), str(tmp_path / "nope")],
        capture_output=True, text=True)
    assert proc.returncode == 2
