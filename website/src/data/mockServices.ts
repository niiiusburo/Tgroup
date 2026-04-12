/**
 * Service types re-exported from /types/
 * @crossref:used-in[Services, useServices, ServiceForm]
 */

import type { ServiceCatalogItem, ServiceRecord, ServiceVisit, ServiceStatus, VisitStatus } from '@/types/service';

export type { ServiceCatalogItem, ServiceRecord, ServiceVisit, ServiceStatus, VisitStatus };

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Đang điều trị',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const SERVICE_STATUS_STYLES: Record<ServiceStatus, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  completed: 'Completed',
  scheduled: 'Scheduled',
  missed: 'Missed',
  cancelled: 'Cancelled',
};

export const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  missed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
