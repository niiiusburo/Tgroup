
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** website
- **Date:** 2026-06-10
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Admin signs in and reaches the dashboard
- **Test Code:** [TC001_Admin_signs_in_and_reaches_the_dashboard.py](./TC001_Admin_signs_in_and_reaches_the_dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/2bc7db87-1262-4aae-ad88-c8e144a003b4
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 CTV can generate a QR discount voucher and staff can complete it
- **Test Code:** [TC002_CTV_can_generate_a_QR_discount_voucher_and_staff_can_complete_it.py](./TC002_CTV_can_generate_a_QR_discount_voucher_and_staff_can_complete_it.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/e0e7eef1-480c-49b7-9818-189a126a7bdc
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Staff can verify check-in and complete a generated discount code
- **Test Code:** [TC003_Staff_can_verify_check_in_and_complete_a_generated_discount_code.py](./TC003_Staff_can_verify_check_in_and_complete_a_generated_discount_code.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/f5b621cf-2408-476e-87a0-d00ab44c2e70
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Admin can sign in and reach the overview dashboard
- **Test Code:** [TC004_Admin_can_sign_in_and_reach_the_overview_dashboard.py](./TC004_Admin_can_sign_in_and_reach_the_overview_dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/0a8423a1-88ac-4fe3-bf5d-065d94b79e1b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Admin reaches the overview and can sweep core sidebar routes
- **Test Code:** [TC005_Admin_reaches_the_overview_and_can_sweep_core_sidebar_routes.py](./TC005_Admin_reaches_the_overview_and_can_sweep_core_sidebar_routes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/7f3233ba-53b6-4481-b2ee-e2c04c9c89f0
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Logout ends the session and protects the app
- **Test Code:** [TC006_Logout_ends_the_session_and_protects_the_app.py](./TC006_Logout_ends_the_session_and_protects_the_app.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/5b2da788-c937-49d9-b6e8-3d22749bbfae
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Admin can open every guarded shell route from the sidebar
- **Test Code:** [TC007_Admin_can_open_every_guarded_shell_route_from_the_sidebar.py](./TC007_Admin_can_open_every_guarded_shell_route_from_the_sidebar.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/8f43e375-9d6c-4918-afca-0d1bf6a0ffcd
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 CTV portal login and dashboard access
- **Test Code:** [TC008_CTV_portal_login_and_dashboard_access.py](./TC008_CTV_portal_login_and_dashboard_access.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/625486be-4fc6-4e83-9c48-edf1293fd709
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Protected pages redirect back after login
- **Test Code:** [TC009_Protected_pages_redirect_back_after_login.py](./TC009_Protected_pages_redirect_back_after_login.py)
- **Test Error:** TEST FAILURE

The protected-page -> login -> returnTo flow did not return the user to /customers after signing in.

Observations:
- After login the UI displays the dashboard view "Tổng quan" and the URL is the site root (https://tmv.2checkin.com/), not /customers.
- The previously opened /customers attempt did not result in post-login navigation to /customers; no customers page content or /customers path is visible after signing in.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/9ff9c408-c9d6-43c1-a0cf-93654f5a6de6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 CTV portal access is limited to CTV users
- **Test Code:** [TC010_CTV_portal_access_is_limited_to_CTV_users.py](./TC010_CTV_portal_access_is_limited_to_CTV_users.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/b12570fb-bcde-42ae-9b23-24f38c5ef634
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 CTV portal blocks admin access
- **Test Code:** [TC011_CTV_portal_blocks_admin_access.py](./TC011_CTV_portal_blocks_admin_access.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/61213979-cf17-493b-bb18-07bd78f36cbb
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Admin can assign and then clear a CTV on a service
- **Test Code:** [TC012_Admin_can_assign_and_then_clear_a_CTV_on_a_service.py](./TC012_Admin_can_assign_and_then_clear_a_CTV_on_a_service.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/0769e997-2f86-41d3-8233-65e25ac2f725
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Admin can open every sidebar section without a blank screen
- **Test Code:** [TC013_Admin_can_open_every_sidebar_section_without_a_blank_screen.py](./TC013_Admin_can_open_every_sidebar_section_without_a_blank_screen.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/db3d098f-4abe-4a3a-a464-70f067607430
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 CTV users cannot access admin-only routes
- **Test Code:** [TC014_CTV_users_cannot_access_admin_only_routes.py](./TC014_CTV_users_cannot_access_admin_only_routes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/5b58d35b-e380-4940-9d83-0f3c136be817
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Admin route sweep stays populated
- **Test Code:** [TC015_Admin_route_sweep_stays_populated.py](./TC015_Admin_route_sweep_stays_populated.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/9c20cf75-c516-4133-8897-72f5274a448a/363f9011-73a7-4d44-843c-60448a780b37
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **93.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---