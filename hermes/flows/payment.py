"""
Hermes payment flow.
Tests: create payment → verify amount formatting → cleanup.
"""

from flows.base import BaseFlow


class PaymentFlow(BaseFlow):
    """Test the payment add flow on the Payment page."""

    def entity_type(self) -> str:
        return "payment"

    def build_task(self) -> str:
        ts = self.timestamp
        create_fields = self.config.create.fields if self.config.create else {}
        amount = create_fields.get("amount", "1500000")
        method = create_fields.get("method", "cash")

        return f"""
TASK: Test payment creation and verify amount formatting.

Steps:
1. Navigate to {self.site.url}/payment
2. Look for a button or form to add a new payment.
   FAIL if: no way to add a payment exists.
3. Fill in the payment form:
   - Amount: {amount}
   - Payment method: {method}
   - Customer: Select any customer (prefer HERMES test customer if available)
   - Date: 1900-01-01
4. Submit the payment.
5. After creation, find this payment in the list (look for amount {amount}).
   FAIL if: payment not found.
6. VERIFY the amount:
   - The amount should be exactly {amount} (one million five hundred thousand)
   - FAIL if: amount shows as 1500.00 (decimal shift) or 1500000000 (extra zeros)
   This is the amount formatting check.
7. Report what you found.

Expected: Payment created with correct amount, no formatting corruption.
"""
