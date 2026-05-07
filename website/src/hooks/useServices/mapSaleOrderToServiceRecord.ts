import type { AppointmentType } from '@/constants';
import type { ServiceRecord, ServiceStatus } from '@/data/mockServices';
import type { ApiSaleOrder } from '@/lib/api';

function parseMoney(value: string | number | null | undefined): number {
  const parsed = Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractOrderCode(order: ApiSaleOrder): string | undefined {
  const candidates = [order.code, order.ref, order.origin, order.name];
  for (const c of candidates) {
    if (c && /^S[-\s]?O/i.test(c)) {
      return c;
    }
  }
  return undefined;
}

function mapPaidAmount(order: ApiSaleOrder, totalCost: number, residual: number): number {
  if (order.totalpaid !== null && order.totalpaid !== undefined) {
    return parseMoney(order.totalpaid);
  }
  return Math.max(0, totalCost - residual);
}

export function mapSaleOrderToServiceRecord(order: ApiSaleOrder): ServiceRecord {
  const statusMap: Record<string, ServiceStatus> = {
    sale: 'active',
    done: 'completed',
    cancel: 'cancelled',
    draft: 'active',
  };

  const status = statusMap[order.state || ''] || 'active' as ServiceStatus;
  const completedVisits = status === 'completed' ? 1 : 0;
  const totalCost = parseMoney(order.amounttotal);
  const residual = parseMoney(order.residual);

  return {
    id: order.id,
    customerId: order.partnerid || '',
    customerName: order.partnername || '',
    customerPhone: '',
    catalogItemId: order.productid || '',
    serviceName: order.productname || order.name || '',
    category: 'treatment' as AppointmentType,
    doctorId: order.doctorid || '',
    doctorName: order.doctorname || '',
    assistantId: order.assistantid ?? null,
    assistantName: order.assistantname || '',
    dentalAideId: order.dentalaideid ?? null,
    dentalAideName: order.dentalaidename || '',
    quantity: order.quantity != null ? parseFloat(order.quantity) : 1,
    unit: order.unit || 'services.form.unitPlaceholder',
    locationId: order.companyid || '',
    locationName: order.companyname || '',
    status,
    totalVisits: 1,
    completedVisits,
    totalCost,
    paidAmount: mapPaidAmount(order, totalCost, residual),
    residual,
    startDate: order.datestart?.slice(0, 10) || order.datecreated?.slice(0, 10) || '',
    expectedEndDate: order.dateend?.slice(0, 10) || '',
    notes: order.notes || '',
    toothNumbers: order.tooth_numbers ? order.tooth_numbers.split(',').map((s) => s.trim()).filter(Boolean) : [],
    toothComment: order.tooth_comment || undefined,
    visits: [],
    createdAt: order.datecreated?.slice(0, 10) || '',
    orderName: order.name || undefined,
    orderCode: extractOrderCode(order),
    sourceId: order.sourceid ?? null,
    sourceName: order.sourcename || undefined,
  };
}
