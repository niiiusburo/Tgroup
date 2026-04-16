/**
 * Service-related type definitions
 * @crossref:used-in[Services, useServices, ServiceForm, MultiVisitTracker, ServiceHistoryList]
 */

import type { AppointmentType } from '@/constants';

export type ServiceStatus = 'active' | 'completed' | 'cancelled';
export type VisitStatus = 'completed' | 'scheduled' | 'missed' | 'cancelled';

export interface ServiceCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly category: AppointmentType;
  readonly description: string;
  readonly defaultPrice: number;
  readonly estimatedDuration: number;
  readonly totalVisits: number;
  readonly unit?: string;
}

export interface ServiceVisit {
  readonly id: string;
  readonly serviceRecordId: string;
  readonly visitNumber: number;
  readonly date: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly status: VisitStatus;
  readonly notes: string;
  readonly toothNumbers: readonly string[];
  readonly expectedEndDate?: string; // Extended field
}

export interface ServiceRecord {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly catalogItemId: string;
  readonly serviceName: string;
  readonly category: AppointmentType;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly assistantId?: string | null;
  readonly assistantName?: string;
  readonly dentalAideId?: string | null;
  readonly dentalAideName?: string;
  readonly quantity?: number;
  readonly unit?: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly status: ServiceStatus;
  readonly totalVisits: number;
  readonly completedVisits: number;
  readonly totalCost: number;
  readonly paidAmount: number;
  readonly residual: number;
  readonly startDate: string;
  readonly createdAt?: string;
  // Fields for UI
  readonly visits?: readonly ServiceVisit[];
  readonly expectedEndDate?: string;
  readonly toothNumbers?: readonly string[];
  readonly toothComment?: string;
  readonly notes?: string;
  readonly orderName?: string;
  readonly orderCode?: string;
}
