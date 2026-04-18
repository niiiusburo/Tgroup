"""
Hermes service flow.
Tests: create service → verify fields → edit → verify → cleanup.
Tests from both /services page and customer profile page.
"""

from flows.base import BaseFlow


class ServiceFlow(BaseFlow):
    """Test the service add/edit flow on the Services page."""

    def entity_type(self) -> str:
        return "service"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        name = create_fields.get("name", "HERMES_SVC_{timestamp}").replace("{timestamp}", ts)
        price = create_fields.get("price", "1500000")

        edit_price = "2000000"

        return f"""
TASK: Test service create, verify, edit, verify flow on the Services page.

Steps:
1. Navigate to {self.site.url}/services
2. Look for and click the "Thêm dịch vụ" (Add Service) button, or any button that lets you add a new service.
   FAIL if: no add button exists or it does not respond.
3. In the service form, fill in:
   - Service name: {name}
   - Price: {price}
   - Set the date to: 1900-01-01 (if there is a date field)
4. Click the submit/save button.
5. After creation, find "{name}" in the services list.
   FAIL if: service is not found.
6. Click on "{name}" to open or highlight it.
7. VERIFY every field:
   - Name is exactly: {name}
   - Price is exactly: {price}
   FAIL if: any field is wrong, empty, or null.
8. Click the edit button for this service.
9. Change the price to: {edit_price}
10. Save the edit.
11. Reload the services page and find "{name}" again.
12. VERIFY the price is now: {edit_price}
    FAIL if: price reverted or is blank.
13. Report what you found.

Expected: Service created with correct fields, edit persisted after reload.
"""
