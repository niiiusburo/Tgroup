import { formatInTimezone } from "@/lib/dateUtils";
import type { ApiSaleOrderLine } from "@/lib/api/saleOrders";
import type { CustomerService } from "@/types/customer";

const CLINIC_TIMEZONE = "Asia/Ho_Chi_Minh";
const DB_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.(\d+))?/;

type SaleOrderLineInput = Partial<ApiSaleOrderLine> & { id: string };

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCount(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeServiceDate(value: string | null | undefined): string {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const dbTime = value.match(DB_TIMESTAMP);
  if (dbTime) {
    const frac = dbTime[3] ? `.${dbTime[3].slice(0, 3).padEnd(3, "0")}` : "";
    return formatInTimezone(`${dbTime[1]}T${dbTime[2]}${frac}Z`, CLINIC_TIMEZONE, "yyyy-MM-dd");
  }
  if (value.includes("T")) return formatInTimezone(value, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "-";
}

export function mapSaleOrderLineToCustomerService(line: SaleOrderLineInput): CustomerService {
  const cost = parseMoney(line.pricetotal);
  const linePaid = parseMoney(line.amountpaid);
  const backendPaid = parseMoney(line.paid_amount);
  const orderLineCount = parseCount(line.order_line_count) || 1;
  const useBackendPaymentFallback = backendPaid > linePaid && orderLineCount === 1;
  const paidAmount = useBackendPaymentFallback ? Math.min(cost, backendPaid) : linePaid;
  const explicitResidual = parseMoney(line.so_residual ?? line.amountresidual);
  const residual = useBackendPaymentFallback ? Math.max(0, cost - paidAmount) : explicitResidual;

  return {
    id: line.id,
    date: normalizeServiceDate(line.date),
    service: line.productname || "-",
    doctor: line.doctorname || "N/A",
    doctorId: line.employeeid || undefined,
    assistantId: line.assistantid || undefined,
    assistantName: line.assistantname || undefined,
    catalogItemId: line.productid || undefined,
    cost,
    quantity: parseMoney(line.productuomqty) || undefined,
    status:
      line.sostate === "done" || line.sostate === "completed"
        ? "completed"
        : line.iscancelled
          ? "cancelled"
          : "active",
    tooth: line.tooth_numbers || line.toothtype || line.diagnostic || "-",
    notes: line.note || "",
    orderId: line.orderid || undefined,
    orderName: line.ordername || undefined,
    orderCode: line.ordercode || undefined,
    paidAmount,
    residual,
    locationName: line.companyname || undefined,
  };
}
