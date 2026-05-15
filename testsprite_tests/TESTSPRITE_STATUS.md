# TestSprite Test Suite — Status Report

**Date:** 2026-05-16  
**Target:** http://127.0.0.1:5175 (local dev)  
**Runner:** `run_testsprite_parallel.py`  
**Parallel Workers:** 5  
**Total Runtime:** ~38 seconds

---

## Results: 23/23 PASS ✅

| Test ID | Category | Description | Status |
|---------|----------|-------------|--------|
| TC001 | Auth | Admin login reaches protected overview | ✅ PASS |
| TC002 | Auth | Logout clears session | ✅ PASS |
| TC003 | Auth | Invalid credentials are rejected | ✅ PASS |
| TC004 | Routes | Admin can access core guarded pages | ✅ PASS |
| TC005 | UI | Sidebar exposes expected admin navigation | ✅ PASS |
| TC006 | Customer | Admin can create TEST_SPRITE customer | ✅ PASS |
| TC007 | Customer | Admin can edit TEST_SPRITE customer | ✅ PASS |
| TC008 | Permissions | Customer mutation controls visible for admin | ✅ PASS |
| TC009 | Safety | Delete requires confirmation | ✅ PASS |
| TC010 | Employee | Employees page loads and search works | ✅ PASS |
| TC011 | Employee | Employee creation for TESTSPRITE | ✅ PASS |
| TC012 | Employee | Employee edit for TESTSPRITE | ✅ PASS |
| TC013 | Permissions | Permission board loads | ✅ PASS |
| TC014 | Permissions | Employee fail doesn't break permissions | ✅ PASS |
| TC015 | Reports | Reports routes render | ✅ PASS |
| TC016 | Payment | Payment page renders safely | ✅ PASS |
| TC017 | Services | Service catalog renders | ✅ PASS |
| TC018 | Settings | Settings renders safely | ✅ PASS |
| TC019 | Permissions | Permission matrix wildcard admin | ✅ PASS |
| TC020 | Permissions | Permission viewer read-only | ✅ PASS |
| TC022 | Permissions | Services route permission | ✅ PASS |
| TC030 | Calendar | Calendar Excel with session token | ✅ PASS |
| TC031 | Search | Accent-insensitive search | ✅ PASS |

---

## Infrastructure

### Virtual Environment
- Location: `testsprite_tests/.venv/`
- Python: 3.12
- Key packages: `playwright==1.59.0`
- Browsers: Chromium (installed via `playwright install chromium`)

### Test Runner
- File: `run_testsprite_parallel.py`
- Features:
  - Parallel execution with configurable worker count
  - Regex pattern filtering (`--pattern`)
  - Category filtering (`--category`)
  - Per-test timeout (`--timeout`)
  - JSON report generation

### Running Tests

```bash
cd testsprite_tests
source .venv/bin/activate

# Run all tests (5 parallel workers)
python3.12 run_testsprite_parallel.py --parallel 5

# Run specific tests by pattern
python3.12 run_testsprite_parallel.py --pattern "TC00[1-5]"

# Run by category
python3.12 run_testsprite_parallel.py --category Auth Customer

# Run with custom timeout
python3.12 run_testsprite_parallel.py --parallel 5 --timeout 120
```

---

## TestScript MCP Integration

The TestSprite MCP server is configured in `~/.claude.json`:
- Package: `@testsprite/testsprite-mcp@latest`
- Env var: `API_KEY`
- Status: ✅ Working (key updated 2026-05-16)

---

## v2 Rewrites

Many original tests used brittle xpath selectors and wrong credentials. They were rewritten as `_v2.py` versions with:
- Semantic selectors (`input[type="email"]`, `button:has-text('Save')`)
- Correct credentials (`tg@clinic.vn` / `123456`)
- Proper wait states and timeouts
- Better error messages

### v2 Test Files
- `TC001_Admin_login_reaches_protected_overview_v2.py`
- `TC002_Logout_clears_session_v2.py`
- `TC004_Admin_can_access_core_guarded_pages_v2.py`
- `TC006_Admin_can_create_a_new_TEST_SPRITE_customer_v2.py`
- `TC007_Admin_can_edit_the_existing_TEST_SPRITE_customer_v2.py`
- `TC008_Customer_profile_mutation_controls_are_visible_for_admin_v2.py`
- `TC009_Delete_and_hard_delete_require_explicit_confirmation_and_are_not_completed_v2.py`
- `TC010_Employees_page_loads_and_search_works_v2.py`
- `TC011_Employee_creation_should_work_for_TESTSPRITE_employee_v2.py`
- `TC012_Employee_edit_should_work_for_TESTSPRITE_employee_if_creation_succeeds_v2.py`
- `TC013_Permission_board_loads_groups_and_employees_v2.py`
- `TC014_Employee_create_failure_does_not_break_permission_surfaces_v2.py`
- `TC015_Reports_protected_routes_render_v2.py`
- `TC016_Payment_page_renders_without_submitting_money_actions_v2.py`
- `TC017_Service_catalog_page_renders_and_searchfilter_works_v2.py`
- `TC019_Permission_matrix_wildcard_admin_v2.py`
- `TC020_Permission_viewer_readonly_v2.py`

---

## Next Steps

1. **CI/CD Integration**: Add the test runner to GitHub Actions or similar
2. **Live Site Tests**: Run against `https://nk.2checkin.com` using `.agents/live-site.env` credentials
3. **Expand Coverage**: Add tests for remaining pending items from `standard_prd.json`
4. **Visual Regression**: Add screenshot comparison tests
5. **API Tests**: Add backend API endpoint tests
