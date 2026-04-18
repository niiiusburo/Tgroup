"""
Hermes calendar flow.
Tests: day/week/month views render without error, test data not visible.
"""

from flows.base import BaseFlow


class CalendarFlow(BaseFlow):
    """Test calendar views render and test data is hidden."""

    def entity_type(self) -> str:
        return "appointment"

    def build_task(self) -> str:
        return f"""
TASK: Test calendar views and verify test data is hidden from today's view.

Steps:
1. Navigate to {self.site.url}/calendar
2. Verify the calendar page loads without errors.
   FAIL if: blank page, error message, or crash.
3. Look for view toggle buttons (Day, Week, Month) and click each one:
   a. Click "Day" view — verify it renders time slots for today.
      FAIL if: day view is blank or throws an error.
   b. Click "Week" view — verify it renders a 7-day grid.
      FAIL if: week view is blank or throws an error.
   c. Click "Month" view — verify it renders a full month calendar.
      FAIL if: month view is blank or throws an error.
4. Go back to the Day view for today's date.
5. Look through today's appointments.
   VERIFY: No appointments with names starting with "HERMES_" are visible.
   (Test data uses dates like 1900-01-01, so they should NOT appear in today's view.)
   FAIL if: test data (HERMES_ prefix) appears in today's calendar view.
   This would mean test data is leaking into real dashboards.
6. Report what you found.

Expected: All three calendar views render correctly, no test data visible in today's view.
"""
