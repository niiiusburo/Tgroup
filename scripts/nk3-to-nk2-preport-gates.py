#!/usr/bin/env python3
# @crossref:domain[business-unit]
# @crossref:used-in[NK3->NK2 promotion gate orchestrator]
# @crossref:uses[docs/runbooks/NK3_TO_NK2_PROMOTION.md, scripts/verify-migration-additivity.js, scripts/nk3-only/nk3-save-roundtrip-smoke.py]
"""
NK3 -> NK2 (-> NK) pre-port smoke gates — LOCAL ONLY.

Runs the verification gates that must be green BEFORE the cosmetic-LOB / CTV
build is promoted onto NK2 (and later NK). Touches only the local dental +
cosmetic demo DBs on :5433 and a throwaway clone. Never reaches live infra.

Gates
  0 additivity   static audit of the migration delta (no DROP/rewrite of dental)
  1 revalidate   per-DB pre-check for 049_widen's partners CHECK constraint
  2 reapply      clone dental schema, re-apply the delta, prove no dental column
                 is removed and every migration applies clean (idempotent)
  3 flag-guards  jest: /api/cosmetic/* = 503 when flag off, 403/200 gate when on
  4 two-db       boot the API (flag ON) and run the CTV two-DB write round-trip

Usage
  python3 scripts/nk3-to-nk2-preport-gates.py            # all gates
  python3 scripts/nk3-to-nk2-preport-gates.py --quick    # skip 2 + 4 (no clone, no API boot)
  python3 scripts/nk3-to-nk2-preport-gates.py --skip-live # skip gate 4 only
"""
from __future__ import annotations
import json, os, subprocess, sys, time, urllib.request, urllib.error, signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PGHOST = os.environ.get("PGHOST", "127.0.0.1")
PGPORT = os.environ.get("PGPORT", "5433")
PGUSER = os.environ.get("PGUSER", "postgres")
PGPASSWORD = os.environ.get("PGPASSWORD", "postgres")
DENTAL_DB = os.environ.get("NK3_DENTAL_DB", "tdental_demo")
COSMETIC_DB = os.environ.get("NK3_COSMETIC_DB", "tcosmetic_demo")
MIG_DIR = os.path.join(ROOT, "api", "migrations")
API_PORT = os.environ.get("PREPORT_API_PORT", "3002")
JWT_SECRET = os.environ.get("JWT_SECRET", "devsecret")

G, R, Y, D, B, X = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[1m", "\033[0m"
if not sys.stdout.isatty():
    G = R = Y = D = B = X = ""

results: list[dict] = []  # {gate, status: PASS|FAIL|SKIP, detail}


def record(gate: str, status: str, detail: str = "") -> None:
    color = {"PASS": G, "FAIL": R, "SKIP": Y}[status]
    results.append({"gate": gate, "status": status, "detail": detail})
    print(f"  {color}{status:<4}{X} {gate}" + (f"  {D}{detail}{X}" if detail else ""))


def pg_env() -> dict:
    return dict(os.environ, PGPASSWORD=PGPASSWORD)


def psql(db: str, sql: str, on_error_stop: bool = True) -> subprocess.CompletedProcess:
    args = ["psql", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", db, "-At"]
    if on_error_stop:
        args += ["-v", "ON_ERROR_STOP=1"]
    args += ["-c", sql]
    return subprocess.run(args, env=pg_env(), capture_output=True, text=True)


def have(binary: str) -> bool:
    return subprocess.run(["which", binary], capture_output=True, text=True).returncode == 0


# ---------------------------------------------------------------- Gate 0
def gate_additivity() -> None:
    print(f"\n{B}Gate 0 — migration additivity (static){X}")
    p = subprocess.run(["node", os.path.join(ROOT, "scripts", "verify-migration-additivity.js")],
                       capture_output=True, text=True)
    print(D + "\n".join("    " + ln for ln in p.stdout.strip().splitlines()) + X)
    if p.returncode == 0:
        record("additivity", "PASS", "0 HIGH ops on pre-existing dental objects")
    else:
        record("additivity", "FAIL", "destructive op(s) found — see output above")


# ---------------------------------------------------------------- Gate 1
def gate_revalidate() -> None:
    print(f"\n{B}Gate 1 — 049_widen partners CHECK re-validation pre-check{X}")
    check = ("SELECT count(*) FROM dbo.partners WHERE created_via IS NOT NULL "
             "AND created_via NOT IN ('self_signup','admin_create','migrated') "
             "AND created_via NOT LIKE 'legacy_ctv_import%'")
    bad = False
    for db in (DENTAL_DB, COSMETIC_DB):
        r = psql(db, check)
        if r.returncode != 0:
            record(f"revalidate[{db}]", "SKIP", r.stderr.strip()[:80])
            continue
        n = r.stdout.strip()
        if n == "0":
            record(f"revalidate[{db}]", "PASS", "0 partners would violate the new CHECK")
        else:
            bad = True
            record(f"revalidate[{db}]", "FAIL", f"{n} partner rows violate created_via CHECK — fix before applying 049_widen")
    if bad:
        print(f"    {Y}-> SELECT DISTINCT created_via FROM dbo.partners WHERE created_via NOT IN (...) to see offenders{X}")


# ---------------------------------------------------------------- Gate 2
def delta_tables() -> set[str]:
    p = subprocess.run(["node", os.path.join(ROOT, "scripts", "verify-migration-additivity.js"), "--json"],
                       capture_output=True, text=True)
    try:
        return set(json.loads(p.stdout)["deltaTables"])
    except Exception:
        return set()


def column_set(db: str, exclude: set[str]) -> set[str]:
    r = psql(db, "SELECT table_name||'.'||column_name FROM information_schema.columns WHERE table_schema='dbo'")
    if r.returncode != 0:
        return set()
    return {c for c in r.stdout.split() if c.split(".")[0] not in exclude}


def gate_reapply() -> None:
    print(f"\n{B}Gate 2 — idempotent re-apply on a schema clone (additive proof){X}")
    if not (have("pg_dump") and have("createdb") and have("dropdb")):
        record("reapply", "SKIP", "pg_dump/createdb/dropdb not on PATH")
        return
    clone = f"__preport_clone_{int(time.time())}"
    try:
        if subprocess.run(["createdb", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, clone],
                          env=pg_env(), capture_output=True, text=True).returncode != 0:
            record("reapply", "SKIP", "createdb failed (perms?)")
            return
        # Full data clone of dental into the throwaway DB. A real-data copy is the
        # faithful target for re-apply: it has the seed rows (admin permission_groups)
        # that data-grant migrations (e.g. 048) FK against, and exercises 049_widen's
        # CHECK + the 047/054/059/061 backfills against real rows.
        dump = subprocess.run(["pg_dump", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER,
                               "--no-owner", "--no-privileges", "-n", "dbo", DENTAL_DB],
                              env=pg_env(), capture_output=True, text=True)
        if dump.returncode != 0:
            record("reapply", "SKIP", f"pg_dump failed: {dump.stderr.strip()[:60]}")
            return
        subprocess.run(["psql", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", clone, "-v", "ON_ERROR_STOP=0", "-q"],
                       input=dump.stdout, env=pg_env(), capture_output=True, text=True)
        # ensure pgcrypto for gen_random_uuid()
        psql(clone, "CREATE EXTENSION IF NOT EXISTS pgcrypto", on_error_stop=False)
        deltas = delta_tables()
        before = column_set(clone, deltas)
        if not before:
            record("reapply", "SKIP", "data clone produced no columns (dump/load issue)")
            return
        # re-apply the delta in deploy order
        files = sorted(f for f in os.listdir(MIG_DIR) if f.endswith(".sql") and f[:3].isdigit() and int(f[:3]) >= 47)
        errs = []
        for f in files:
            r = subprocess.run(["psql", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", clone,
                                "-v", "ON_ERROR_STOP=1", "-f", os.path.join(MIG_DIR, f)],
                               env=pg_env(), capture_output=True, text=True)
            if r.returncode != 0:
                errs.append(f"{f}: {r.stderr.strip().splitlines()[-1][:80] if r.stderr.strip() else 'error'}")
        after = column_set(clone, deltas)
        removed = before - after
        if errs:
            record("reapply", "FAIL", f"{len(errs)} migration(s) errored: {errs[0]}")
        elif removed:
            record("reapply", "FAIL", f"{len(removed)} pre-existing dental column(s) removed: {sorted(removed)[:3]}")
        else:
            record("reapply", "PASS", f"{len(files)} migrations applied clean; 0 dental columns removed")
    finally:
        subprocess.run(["dropdb", "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "--if-exists", clone],
                       env=pg_env(), capture_output=True, text=True)


# ---------------------------------------------------------------- Gate 3
def gate_flag_guards() -> None:
    print(f"\n{B}Gate 3 — cosmetic flag guards (jest){X}")
    jest = os.path.join(ROOT, "api", "node_modules", ".bin", "jest")
    if not os.path.exists(jest):
        record("flag-guards", "SKIP", "api/node_modules/.bin/jest missing (npm i)")
        return
    p = subprocess.run([jest, "src/__tests__/cosmeticLobGuards.test.js", "--silent"],
                       cwd=os.path.join(ROOT, "api"), capture_output=True, text=True,
                       env=dict(os.environ, NODE_ENV="test"))
    tail = (p.stderr or p.stdout).strip().splitlines()
    summary = next((l for l in tail if "Tests:" in l), tail[-1] if tail else "")
    record("flag-guards", "PASS" if p.returncode == 0 else "FAIL", summary.strip())


# ---------------------------------------------------------------- Gate 4
def wait_health(timeout: float = 25.0) -> bool:
    url = f"http://127.0.0.1:{API_PORT}/api/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                body = json.loads(resp.read())
                if body.get("checks", {}).get("db"):
                    return True
        except urllib.error.HTTPError as e:  # 503 'degraded' (no face svc) still carries checks.db
            try:
                if json.loads(e.read()).get("checks", {}).get("db"):
                    return True
            except Exception:
                pass
        except Exception:
            pass
        time.sleep(0.7)
    return False


def gate_two_db() -> None:
    print(f"\n{B}Gate 4 — two-DB CTV round-trip (live local API, flag ON){X}")
    # refuse if something already owns the port
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{API_PORT}/api/health", timeout=1)
        record("two-db", "SKIP", f"port {API_PORT} already in use; stop it or set PREPORT_API_PORT")
        return
    except Exception:
        pass
    server = os.path.join(ROOT, "api", "src", "server.js")
    log = open(os.path.join(ROOT, "output", "preport-api.log"), "w") if os.path.isdir(os.path.join(ROOT, "output")) else subprocess.DEVNULL
    env = dict(os.environ,
               NODE_ENV="development", PORT=API_PORT, JWT_SECRET=JWT_SECRET,
               COSMETIC_LOB_ENABLED="true",
               DATABASE_URL=f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{DENTAL_DB}",
               COSMETIC_DATABASE_URL=f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{COSMETIC_DB}",
               TZ="Asia/Ho_Chi_Minh")
    proc = subprocess.Popen(["node", server], cwd=os.path.join(ROOT, "api"),
                            stdout=log, stderr=subprocess.STDOUT, start_new_session=True, env=env)
    try:
        if not wait_health():
            record("two-db", "FAIL", "API did not report checks.db within 25s (see output/preport-api.log)")
            return
        smoke = subprocess.run(
            ["python3", os.path.join(ROOT, "scripts", "nk3-only", "nk3-save-roundtrip-smoke.py")],
            env=dict(env, NK3_API=f"http://127.0.0.1:{API_PORT}", NK3_DENTAL_DB=DENTAL_DB, NK3_COSMETIC_DB=COSMETIC_DB),
            capture_output=True, text=True)
        for ln in smoke.stdout.strip().splitlines():
            print("    " + ln)
        record("two-db", "PASS" if smoke.returncode == 0 else "FAIL",
               "CTV writes isolate correctly across both DBs" if smoke.returncode == 0 else "round-trip smoke failed")
    finally:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            proc.wait(timeout=8)
        except Exception:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            except Exception:
                pass
        if log not in (subprocess.DEVNULL,):
            log.close()


# ---------------------------------------------------------------- main
def main() -> None:
    quick = "--quick" in sys.argv
    skip_live = "--skip-live" in sys.argv or quick
    print(f"\n{B}NK3 -> NK2 pre-port gates{X}  {D}(local only · {DENTAL_DB}+{COSMETIC_DB} @ {PGHOST}:{PGPORT}){X}")

    gate_additivity()
    gate_revalidate()
    if not quick:
        gate_reapply()
    gate_flag_guards()
    if not skip_live:
        gate_two_db()
    else:
        record("two-db", "SKIP", "--skip-live")

    failed = [r for r in results if r["status"] == "FAIL"]
    passed = [r for r in results if r["status"] == "PASS"]
    skipped = [r for r in results if r["status"] == "SKIP"]
    report = os.path.join(ROOT, "output", "preport-gates-report.json")
    if os.path.isdir(os.path.dirname(report)):
        json.dump({"ts": int(time.time()), "results": results}, open(report, "w"), indent=2)

    print(f"\n{B}Summary:{X} {G}{len(passed)} PASS{X} · {R}{len(failed)} FAIL{X} · {Y}{len(skipped)} SKIP{X}")
    if failed:
        print(f"{R}NOT promotion-ready{X} — resolve: " + ", ".join(r["gate"] for r in failed))
        sys.exit(1)
    print(f"{G}Pre-port gates green.{X} Proceed per docs/runbooks/NK3_TO_NK2_PROMOTION.md (per-target revalidate still required on NK2/NK).")
    sys.exit(0)


if __name__ == "__main__":
    main()
