#!/usr/bin/env python3
"""
NK3 Save Round-Trip Smoke Harness
=================================

Purpose
-------
Catch the *class* of bug the user kept hitting: a create/edit form that LOOKS
like it saved but silently DROPS data on persist — most dangerously the two-DB
Cosmetic LOB v2 split (a CTV scoped to dental+cosmetic must land in BOTH
tdental_demo AND tcosmetic_demo). The flagship case is:

    "Creating a CTV with dental + cosmetic selected only saved cosmetic —
     there was no dental line."

Instead of eyeballing each feature one at a time, this harness drives the REAL
create endpoints against the REAL local two-DB stack, then reads the rows back
out of BOTH physical databases and asserts what actually persisted. If a write
path ever regresses (e.g. a deploy ships older code that drops the dental row),
this fails loudly with exit code 1 — wire it into a pre-deploy gate.

It is LOCAL + SELF-CLEANING: every row it creates is deleted at the end (and the
fixtures use a unique marker so a crashed run can be swept). It NEVER touches
real NK / NK2.

Design mirrors scripts/nk2-regression.py (one test per invariant, colored
PASS/FAIL, exit 0/1) so it slots into the same CI/pre-deploy habit.

Usage
-----
    # 1. Start the API locally with cosmetic enabled (separate shell):
    cd api && TZ=Asia/Ho_Chi_Minh JWT_SECRET=devsecret \
        COSMETIC_LOB_ENABLED=true PORT=3002 node src/server.js

    # 2. Run the harness:
    python3 scripts/nk3-only/nk3-save-roundtrip-smoke.py

    # Overrides:
    NK3_API=http://127.0.0.1:3002 JWT_SECRET=devsecret \
    PGHOST=127.0.0.1 PGPORT=5433 \
    python3 scripts/nk3-only/nk3-save-roundtrip-smoke.py

Requires: an admin partner that resolves to the admin group. By default it
discovers one automatically from the dental DB (employee_permissions in
group 11111111-0000-0000-0000-000000000001).
"""
from __future__ import annotations
import json, os, sys, time, uuid, hmac, hashlib, base64, subprocess

API = os.environ.get("NK3_API", "http://127.0.0.1:3002").rstrip("/")
JWT_SECRET = os.environ.get("JWT_SECRET", "devsecret")
PGHOST = os.environ.get("PGHOST", "127.0.0.1")
PGPORT = os.environ.get("PGPORT", "5433")
PGUSER = os.environ.get("PGUSER", "postgres")
PGPASSWORD = os.environ.get("PGPASSWORD", "postgres")
DENTAL_DB = os.environ.get("NK3_DENTAL_DB", "tdental_demo")
COSMETIC_DB = os.environ.get("NK3_COSMETIC_DB", "tcosmetic_demo")
ADMIN_GROUP_ID = "11111111-0000-0000-0000-000000000001"

# Unique marker so partial/crashed runs are sweepable and never collide.
MARKER = f"__rtsmoke_{int(time.time())}_{uuid.uuid4().hex[:6]}"

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
results: list[tuple[str, bool, str]] = []
created_ids: list[str] = []  # partner ids to clean up (exist in either DB)


def pass_(name: str, detail: str = ""):
    results.append((name, True, detail))
    print(f"  {GREEN}PASS{RESET}  {name}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def fail_(name: str, detail: str = ""):
    results.append((name, False, detail))
    print(f"  {RED}FAIL{RESET}  {name}" + (f"  {YELLOW}{detail}{RESET}" if detail else ""))


# --- HTTP (stdlib only) -------------------------------------------------------
import urllib.request, urllib.error


def http(method: str, path: str, token: str | None = None, payload: dict | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"_raw": raw.decode("utf-8", "replace")[:300]}
    except Exception as e:  # connection refused etc.
        return 0, {"_err": str(e)}


# --- Postgres (via psql, no driver dependency) --------------------------------
def psql(db: str, sql: str) -> list[str]:
    env = dict(os.environ, PGPASSWORD=PGPASSWORD)
    out = subprocess.run(
        ["psql", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", db, "-tAc", sql],
        capture_output=True, text=True, env=env, timeout=20,
    )
    if out.returncode != 0:
        raise RuntimeError(f"psql {db} failed: {out.stderr.strip()}")
    return [ln for ln in out.stdout.strip().splitlines() if ln != ""]


# --- Minimal HS256 JWT forge (no PyJWT dependency) ----------------------------
def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def forge_jwt(claims: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    seg = f"{b64url(json.dumps(header).encode())}.{b64url(json.dumps(claims).encode())}"
    sig = hmac.new(JWT_SECRET.encode(), seg.encode(), hashlib.sha256).digest()
    return f"{seg}.{b64url(sig)}"


def discover_admin() -> dict:
    rows = psql(
        DENTAL_DB,
        f"SELECT ep.employee_id, COALESCE(array_to_string(p.lob_scope,','),'') "
        f"FROM dbo.employee_permissions ep JOIN dbo.partners p ON p.id = ep.employee_id "
        f"WHERE ep.group_id = '{ADMIN_GROUP_ID}' "
        f"AND COALESCE(array_length(p.lob_scope,1),0) >= 1 LIMIT 1",
    )
    if not rows:
        # Fallback: any admin-group member, scope defaulted to both for the token.
        rows = psql(DENTAL_DB, f"SELECT employee_id, '' FROM dbo.employee_permissions WHERE group_id = '{ADMIN_GROUP_ID}' LIMIT 1")
    if not rows:
        raise SystemExit(f"{RED}No admin-group member found in {DENTAL_DB}; cannot forge an admin token.{RESET}")
    emp_id, scope_csv = rows[0].split("|") if "|" in rows[0] else (rows[0], "")
    scope = [s for s in scope_csv.split(",") if s] or ["dental", "cosmetic"]
    return {"employeeId": emp_id, "authLob": "dental", "lob_scope": scope, "is_ctv": False,
            "exp": int(time.time()) + 3600}


def row_scope(db: str, partner_id: str) -> str | None:
    """Return the lob_scope array as a normalized string, or None if the row is absent."""
    rows = psql(db, f"SELECT COALESCE(array_to_string(lob_scope,','),'<empty>') FROM dbo.partners WHERE id = '{partner_id}'")
    return rows[0] if rows else None


# --- Tests --------------------------------------------------------------------
def test_ctv_create_both_lobs(token: str):
    """FLAGSHIP: create CTV scoped dental+cosmetic -> row in BOTH DBs, scope has both."""
    name = f"RT Both {MARKER}"
    phone = "0913" + str(int(time.time()) % 1000000).zfill(6)
    email = f"rt_both_{MARKER}@x.vn"
    code, body = http("POST", "/api/ctv", token, {
        "name": name, "phone": phone, "email": email, "password": "rtsmoke123",
        "lob_scope": ["dental", "cosmetic"],
    })
    if code != 201 or not isinstance(body, dict) or not body.get("id"):
        return fail_("CTV create (dental+cosmetic)", f"HTTP {code} {body}")
    pid = body["id"]; created_ids.append(pid)
    d, c = row_scope(DENTAL_DB, pid), row_scope(COSMETIC_DB, pid)
    if d is None:
        return fail_("CTV create (dental+cosmetic)", "DENTAL row MISSING — the exact reported bug")
    if c is None:
        return fail_("CTV create (dental+cosmetic)", "cosmetic mirror MISSING")
    if "dental" not in (d or "") or "cosmetic" not in (d or ""):
        return fail_("CTV create (dental+cosmetic)", f"dental lob_scope wrong: {d!r}")
    pass_("CTV create (dental+cosmetic)", f"dental={d} cosmetic={c}")


def test_ctv_create_cosmetic_only(token: str):
    """Cosmetic-only selection MUST still write a dental auth row (dental forced in)."""
    name = f"RT CosOnly {MARKER}"
    phone = "0914" + str(int(time.time()) % 1000000).zfill(6)
    email = f"rt_cos_{MARKER}@x.vn"
    code, body = http("POST", "/api/ctv", token, {
        "name": name, "phone": phone, "email": email, "password": "rtsmoke123",
        "lob_scope": ["cosmetic"],
    })
    if code != 201 or not body.get("id"):
        return fail_("CTV create (cosmetic-only -> still dental)", f"HTTP {code} {body}")
    pid = body["id"]; created_ids.append(pid)
    d = row_scope(DENTAL_DB, pid)
    if d is None:
        return fail_("CTV create (cosmetic-only -> still dental)", "DENTAL auth row MISSING")
    if "dental" not in (d or ""):
        return fail_("CTV create (cosmetic-only -> still dental)", f"dental not forced into scope: {d!r}")
    pass_("CTV create (cosmetic-only -> still dental)", f"dental scope={d}")


def test_ctv_create_dental_only_no_cosmetic(token: str):
    """Dental-only selection must NOT create a cosmetic mirror row."""
    name = f"RT DenOnly {MARKER}"
    phone = "0915" + str(int(time.time()) % 1000000).zfill(6)
    email = f"rt_den_{MARKER}@x.vn"
    code, body = http("POST", "/api/ctv", token, {
        "name": name, "phone": phone, "email": email, "password": "rtsmoke123",
        "lob_scope": ["dental"],
    })
    if code != 201 or not body.get("id"):
        return fail_("CTV create (dental-only -> no cosmetic mirror)", f"HTTP {code} {body}")
    pid = body["id"]; created_ids.append(pid)
    d, c = row_scope(DENTAL_DB, pid), row_scope(COSMETIC_DB, pid)
    if d is None:
        return fail_("CTV create (dental-only -> no cosmetic mirror)", "dental row MISSING")
    if c is not None:
        return fail_("CTV create (dental-only -> no cosmetic mirror)", f"unexpected cosmetic mirror created: {c!r}")
    pass_("CTV create (dental-only -> no cosmetic mirror)", f"dental={d}, cosmetic=absent")


def test_roster_visibility(token: str):
    """A dental+cosmetic CTV must appear in BOTH the dental and cosmetic admin rosters."""
    target = next((i for i in created_ids), None)
    if not target:
        return fail_("CTV roster visibility (both LOBs)", "no created CTV to check")
    code_d, body_d = http("GET", "/api/Ctvs", token)
    code_c, body_c = http("GET", "/api/cosmetic/Ctvs", token)
    in_d = code_d == 200 and any(c.get("id") == target for c in (body_d.get("ctvs") or []))
    in_c = code_c == 200 and any(c.get("id") == target for c in (body_c.get("ctvs") or []))
    if not in_d:
        return fail_("CTV roster visibility (both LOBs)", f"missing from DENTAL roster (HTTP {code_d})")
    if not in_c:
        return fail_("CTV roster visibility (both LOBs)", f"missing from cosmetic roster (HTTP {code_c}) — empty lob_scope class bug")
    pass_("CTV roster visibility (both LOBs)", "visible in dental + cosmetic rosters")


def cleanup():
    swept = 0
    # delete by explicit ids AND by marker (covers crashed prior runs)
    for db in (DENTAL_DB, COSMETIC_DB):
        try:
            for pid in created_ids:
                psql(db, f"DELETE FROM dbo.partners WHERE id = '{pid}'")
            rows = psql(db, f"SELECT COUNT(*) FROM dbo.partners WHERE name LIKE '%{MARKER}%' OR email LIKE '%{MARKER}%'")
            if rows and rows[0] != "0":
                psql(db, f"DELETE FROM dbo.partners WHERE name LIKE '%{MARKER}%' OR email LIKE '%{MARKER}%'")
                swept += int(rows[0])
        except Exception as e:
            print(f"  {YELLOW}cleanup warning ({db}): {e}{RESET}")
    print(f"{DIM}cleanup: removed test fixtures (marker {MARKER}){RESET}")


def main():
    print(f"\n{DIM}NK3 save round-trip smoke — API={API} DBs={DENTAL_DB}+{COSMETIC_DB}{RESET}\n")
    # Preflight: API reachable?
    code, _ = http("GET", "/api/health")
    if code == 0:
        raise SystemExit(f"{RED}API not reachable at {API}. Start it first (see header).{RESET}")
    admin = discover_admin()
    token = forge_jwt(admin)
    print(f"{DIM}admin employeeId={admin['employeeId']} scope={admin['lob_scope']}{RESET}\n")

    try:
        test_ctv_create_both_lobs(token)
        test_ctv_create_cosmetic_only(token)
        test_ctv_create_dental_only_no_cosmetic(token)
        test_roster_visibility(token)
    finally:
        cleanup()

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n{'='*60}")
    color = GREEN if passed == total else RED
    print(f"{color}{passed}/{total} save round-trip checks passed{RESET}")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
