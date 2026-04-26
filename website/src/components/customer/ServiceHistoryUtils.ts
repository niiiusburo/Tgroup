import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';

export function getPaymentsForService(
  service: CustomerService,
  payments?: readonly PaymentWithAllocations[],
): PaymentWithAllocations[] {
  if (!payments) return [];
  return payments.filter(
    (payment) =>
      payment.serviceId === service.id ||
      payment.serviceId === service.orderId ||
      payment.allocations?.some(
        (allocation) => allocation.invoiceId === service.id || allocation.invoiceId === service.orderId,
      ),
  );
}

export function resolveServiceFinancials(service: CustomerService) {
  const paidAmount = service.paidAmount ?? Math.max(0, service.cost - (service.residual ?? service.cost));
  const derivedResidual = Math.max(0, service.cost - paidAmount);
  const rawResidual = service.residual;
  const residualIsStale =
    rawResidual !== undefined &&
    service.cost > 0 &&
    Math.abs(rawResidual + paidAmount - service.cost) > 1;

  return {
    paidAmount,
    residual: rawResidual === undefined || residualIsStale ? derivedResidual : rawResidual,
  };
}
