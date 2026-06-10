/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[service create/update/delete callbacks composed by website/src/pages/Customers/useCustomerDetailController.ts (customer profile services tab)]
 * @crossref:uses[website/src/hooks/useServices.ts (CreateServiceInput, createServiceRecord/updateServiceRecord), website/src/lib/api.ts (deleteSaleOrderLine), website/src/contexts/BusinessUnitContext.tsx (currentLOB), product-map/domains/customers-partners.yaml]
 */
/**
 * Service action callbacks for the customer profile
 * Bridges CustomerProfile service forms to the useServices hook
 * @crossref:used-in[Customers]
 */
import { useCallback } from 'react';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { CreateServiceInput } from '@/hooks/useServices';
import { deleteSaleOrderLine } from '@/lib/api';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';

interface ServiceCreateInput {
  catalogItemId: string;
  serviceName: string;
  category?: string;
  doctorId: string | null;
  doctorName: string;
  assistantId?: string | null;
  assistantName?: string;
  dentalAideId?: string | null;
  dentalAideName?: string;
  locationId: string;
  locationName: string;
  totalVisits?: number;
  totalCost: number;
  startDate: string;
  expectedEndDate?: string;
  notes: string;
  quantity?: number;
  unit?: string;
  toothNumbers: readonly string[];
  toothComment?: string;
  sourceId?: string | null;
  ctvId?: string | null;
}

interface ServiceUpdateInput extends ServiceCreateInput {
  id: string;
}

interface UseCustomerServiceActionsOptions {
  readonly createServiceRecord: (input: CreateServiceInput) => Promise<unknown>;
  readonly updateServiceRecord: (input: CreateServiceInput) => Promise<unknown>;
  readonly selectedCustomerId: string | null;
  readonly hookProfile: CustomerProfileData | null;
  readonly loadSaleOrderLines: () => Promise<void>;
  readonly refetchProfile?: () => void | Promise<void>;
  readonly refetchServices?: () => void | Promise<void>;
}

/** Map the profile service form input onto the useServices create/update payload. */
function buildServicePayload(
  data: ServiceCreateInput,
  customerId: string | null,
  profile: CustomerProfileData | null,
): CreateServiceInput {
  return {
    customerId: customerId ?? '',
    customerName: profile?.name ?? '',
    customerPhone: profile?.phone ?? '',
    catalogItemId: data.catalogItemId,
    serviceName: data.serviceName,
    category: (data.category ?? 'treatment') as CreateServiceInput['category'],
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    assistantId: data.assistantId ?? null,
    assistantName: data.assistantName ?? '',
    dentalAideId: data.dentalAideId ?? null,
    dentalAideName: data.dentalAideName ?? '',
    locationId: data.locationId,
    locationName: data.locationName,
    totalVisits: data.totalVisits ?? 1,
    totalCost: data.totalCost,
    startDate: data.startDate,
    expectedEndDate: data.expectedEndDate || data.startDate,
    notes: data.notes,
    quantity: data.quantity,
    unit: data.unit,
    toothNumbers: data.toothNumbers,
    toothComment: data.toothComment ?? undefined,
    sourceId: data.sourceId ?? null,
    ctvId: data.ctvId ?? null,
  };
}

export function useCustomerServiceActions({
  createServiceRecord,
  updateServiceRecord,
  selectedCustomerId,
  hookProfile,
  loadSaleOrderLines,
  refetchProfile,
  refetchServices,
}: UseCustomerServiceActionsOptions) {
  const { currentLOB } = useBusinessUnit();

  const handleCreateService = useCallback(
    async (data: ServiceCreateInput) => {
      await createServiceRecord(buildServicePayload(data, selectedCustomerId, hookProfile));
      // Refresh the service list so the new record appears immediately
      await loadSaleOrderLines();
    },
    [createServiceRecord, selectedCustomerId, hookProfile, loadSaleOrderLines],
  );

  const handleUpdateService = useCallback(
    async (data: ServiceUpdateInput) => {
      await updateServiceRecord({ ...buildServicePayload(data, selectedCustomerId, hookProfile), id: data.id });
      await loadSaleOrderLines();
    },
    [updateServiceRecord, selectedCustomerId, hookProfile, loadSaleOrderLines],
  );

  const handleDeleteService = useCallback(
    async (serviceLineId: string) => {
      await deleteSaleOrderLine(serviceLineId, currentLOB);
      await loadSaleOrderLines();
      await refetchProfile?.();
      await refetchServices?.();
    },
    [currentLOB, loadSaleOrderLines, refetchProfile, refetchServices],
  );

  return { handleCreateService, handleUpdateService, handleDeleteService };
}
