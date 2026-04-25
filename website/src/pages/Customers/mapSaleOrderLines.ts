import { formatInTimezone } from "@/lib/dateUtils";
import type { ApiSaleOrderLine } from "@/lib/api/saleOrders";
import type { CustomerService } from "@/types/customer";

const CLINIC_TIMEZONE = "Asia/Ho_Chi_Minh";

type SaleOrderLineInput = Partial<ApiSaleOrderLine> & { id: string };

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeServiceDate(value: string | null | undefined): string {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value.includes("T")) return formatInTimezone(value, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "-";
}

export function mapSaleOrderLineToCustomerService(line: SaleOrderLineInput): CustomerService {
  return {
    id: line.id,
    date: normalizeServiceDate(line.date),
    service: line.productname || "-",
    doctor: line.doctorname || "N/A",
    doctorId: line.employeeid || undefined,
    assistantId: line.assistantid || undefined,
    assistantName: line.assistantname || undefined,
    catalogItemId: line.productid || undefined,
    cost: parseMoney(line.pricetotal),
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
    paidAmount: parseMoney(line.amountpaid || line.paid_amount),
    residual: parseMoney(line.so_residual || line.amountresidual),
    locationName: line.companyname || undefined,
  };
}
