"""
Hermes appointment flow.
Tests: create appointment → verify date/time (timezone check) → edit time to 23:59 (midnight boundary) → verify → cleanup.
"""

from flows.base import BaseFlow


class AppointmentFlow(BaseFlow):
    """Test the appointment add/edit flow on the Appointments page."""

    def entity_type(self) -> str:
        return "appointment"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        date = create_fields.get("date", "1900-01-01")
        time_val = create_fields.get("time", "09:00")

        edit_time = "23:59"

        return f"""
TASK: Test appointment create, verify (with timezone check), edit to midnight boundary, verify.

Steps:
1. Navigate to {self.site.url}/appointments
2. Look for and click the "Thêm lịch hẹn" (Add Appointment) button, or any button to create a new appointment.
   FAIL if: no add button exists.
3. In the appointment form, fill in:
   - Date: {date}
   - Time: {time_val}
   - Customer: Select any customer from the dropdown (prefer one starting with "HERMES" if available, otherwise pick the first one)
   - Doctor: Select the first available doctor
   - Service: Select the first available service (if required)
4. Click submit/save.
5. After creation, find this appointment in the list (look for date {date} or time {time_val}).
   FAIL if: appointment not found.
6. Click on the appointment to open its details.
7. VERIFY these fields EXACTLY:
   - Date is exactly: {date} (NOT {date} shifted by ±1 day — this is the timezone check)
   - Time is exactly: {time_val}
   - Status is "pending" or "confirmed" (not empty)
   FAIL if: date shows as a different day (e.g., {date} became the day before or after).
   This would indicate a timezone conversion bug.
8. Click the edit button for this appointment.
9. Change the time to: {edit_time}
10. Save the edit.
11. Reload the page and find this appointment again.
12. VERIFY the time is: {edit_time} and the date is STILL {date} (not shifted to the next day).
    This is the midnight boundary check — 23:59 should not cause the date to flip.
    FAIL if: date changed when time was set to 23:59.
13. Report what you found.

Expected: Appointment created with correct date/time, timezone intact, midnight edit does not shift date.
"""
