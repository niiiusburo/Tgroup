"""
Hermes customer flow.
Tests: create customer → verify all fields → edit → verify edit stuck → cleanup.
"""

from flows.base import BaseFlow


class CustomerFlow(BaseFlow):
    """Test the customer add/edit flow on the Customers page."""

    def entity_type(self) -> str:
        return "customer"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        name = create_fields.get("name", "HERMES_TEST_{timestamp}").replace("{timestamp}", ts)
        phone = create_fields.get("phone", "0000000000")
        email = create_fields.get("email", "hermes_test_{timestamp}@test.vn").replace("{timestamp}", ts.lower())

        edit_name = f"HERMES_TEST_EDIT_{ts}"

        return f"""
TASK: Test customer create, verify, edit, verify flow.

Steps:
1. Navigate to {self.site.url}/customers
2. Look for and click the "Thêm khách hàng" (Add Customer) button.
   FAIL if: button is missing or does nothing when clicked.
3. In the customer form that appears, fill in:
   - Name/Full name: {name}
   - Phone: {phone}
   - Email: {email}
4. Click the submit/save button to create the customer.
5. After creation, search for "{name}" in the customer list.
   FAIL if: customer is not found in the list.
6. Click on the customer "{name}" to open their detail/profile page.
7. VERIFY every field matches what you submitted:
   - Name is exactly: {name}
   - Phone is exactly: {phone}
   - Email is exactly: {email}
   FAIL if: any field is empty, different, or null.
8. Find and click the edit button on this customer.
9. Change the name to: {edit_name}
10. Save the edit.
11. Reload the page (navigate away and back to this customer).
12. VERIFY the name is now: {edit_name}
    FAIL if: the name reverted to the old value or is blank.
13. Report the customer ID if visible in the URL or page.

Expected: Customer created with all fields verified, edit persisted after reload.
"""
