"""
Hermes login flow.
Tests authentication, version check, and API health.
"""

from flows.base import BaseFlow


class LoginFlow(BaseFlow):
    """Test: navigate to login, authenticate, verify dashboard + API calls."""

    def entity_type(self) -> str:
        return "customer"  # Not used for cleanup, but required by ABC

    def build_task(self) -> str:
        return f"""
TASK: Test login and verify the application is healthy.

Steps:
1. Navigate to {self.site.url}/login
2. Fill in the email field with: {self.site.email}
3. Fill in the password field with: {self.site.password}
4. Click the login/submit button
5. After login, verify you see a dashboard page with a sidebar navigation.
   FAIL if: you see a login error, blank page, or "access denied" message.
6. Navigate to {self.site.url}/api/auth/me in the browser address bar.
   Verify the response contains user data (JSON with email field).
   FAIL if: response is 401, 403, or empty.
7. Navigate to {self.site.url}/version.json.
   Note the version number in your response.
8. Navigate back to the dashboard.

Expected result: Successfully logged in, dashboard visible, API healthy, version noted.
Report your findings.
"""
