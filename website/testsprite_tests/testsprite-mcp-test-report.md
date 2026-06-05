# TestSprite MCP Partial Run Report

## 1. Document Metadata

- Project: `tgclinic-website`
- Project path: `/Users/thuanle/Documents/TamTMV/Tgrouptest/website`
- Run date: `2026-06-05`
- Target tested: local production preview `http://localhost:5175/`
- API target used by preview build: `https://tmv.2checkin.com/api`
- TestSprite project ID: `9e902418-dfc6-4df5-92b9-6bd308b2e49f`
- Scope: production read-only smoke; no create/edit/delete/save/payment/permission mutation approved.
- Official save-results status: incomplete. TestSprite runner stayed in `tests_running` because `TS-031` remained `processing`.

## 2. Requirement Validation Summary

| Test ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| TS-001 | Admin login and redirect | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/d916d189-9fa9-4a0f-82e0-9c158d00e48b |
| TS-002 | Invalid login rejection | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/96cf99e4-f999-4b11-b481-1ed686fdeb69 |
| TS-003 | Logout clears session | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/f090f5f4-c188-43d7-8b86-ece2a95a6dce |
| TS-010 | Customer list page loads | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/50326cbd-7314-4d0c-a5b9-6ce5f443724d |
| TS-011 | Customer search works | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/224782a6-20d2-421b-a740-4b6677d52de1 |
| TS-020 | Employee list page loads | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/8c127ea5-d3ef-4552-8fe0-263fd3face0d |
| TS-030 | Calendar page loads | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/e77214cb-79c7-4e65-a457-21b86d70492f |
| TS-031 | Calendar date navigation | INCOMPLETE | TestSprite SSE stayed at `processing` with no result URL after the other 9 tests passed. |
| TS-040 | Payment history page loads | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/a2193d64-499e-4059-a7c8-f7038f591d7b |
| TS-050 | Permission matrix loads | PASSED | https://www.testsprite.com/dashboard/mcp/tests/9e902418-dfc6-4df5-92b9-6bd308b2e49f/c6ab195e-9699-48ad-982a-57e0f63fe526 |

## 3. Coverage And Matching Metrics

- Selected TestSprite IDs: 10.
- Passed: 9.
- Incomplete/hung: 1 (`TS-031`).
- Failed: 0 reported by TestSprite SSE before runner termination.
- Mutating IDs intentionally excluded: `TS-012`, `TS-013`, `TS-021`.
- Local gates passed before execution: production build, localhost preview health, TestSprite pre-flight probe, TestSprite tunnel probe.

## 4. Key Gaps / Risks

- TestSprite did not write `testsprite_tests/tmp/test_results.json` or `testsprite_tests/tmp/raw_report.md` because the runner never left `tests_running`.
- `TS-031 Calendar date navigation` needs a single-test retry or replacement with a local Playwright check.
- The original generated plan was a grouped object, but TestSprite runner expects a flat test-case array.
- The runner requires a localhost endpoint; pointing `localEndpoint` directly to `https://tmv.2checkin.com` made it probe `localhost:443`.
- Existing stale TestSprite MCP processes were not globally reaped; only the runner and preview server started for this pass were stopped.
