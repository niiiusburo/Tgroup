import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAppointments, updateAppointment, type ApiAppointment } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';

/**
 * Hook for the Overview three-zone appointment flow
 * @crossref:used-in[Overview]
 *
 * Zone 3: Today's Appointments — top-level status: scheduled → arrived | cancelled
 * Zone 1: Patient Check-in  — downline status (only for arrived): waiting → in-treatment → done
 * Zone 2: Today's Services   — driven by completed treatments (future)
 */

// ─── Top-level appointment status (Zone 3) ───────────────────────
export type AppointmentTopStatus = 'scheduled' | 'arrived' | 'cancelled';

// ─── Downline check-in status (Zone 1, only after arrived) ───────
export type CheckInStatus = 'waiting' | 'in-treatment' | 'done';

export interface OverviewAppointment {
  readonly id: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorName: string;
  readonly doctorId: string;
  readonly time: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly note: string;
  readonly topStatus: AppointmentTopStatus;
  readonly checkInStatus: CheckInStatus | null; // null until arrived
  readonly color: string | null; // color code 0-7 from database
}

// ─── Zone 3 filter tabs ──────────────────────────────────────────
export type Zone3Filter = 'all' | 'arrived' | 'cancelled';

// ─── Zone 1 filter tabs ──────────────────────────────────────────
export type Zone1Filter = 'all' | 'waiting' | 'in-treatment' | 'done';

interface UseOverviewAppointmentsResult {
  readonly appointments: readonly OverviewAppointment[];
  readonly isLoading: boolean;

  // Zone 3
  readonly zone3Filter: Zone3Filter;
  readonly setZone3Filter: (filter: Zone3Filter) => void;
  readonly zone3Appointments: readonly OverviewAppointment[];
  readonly zone3Counts: { all: number; arrived: number; cancelled: number };
  readonly markArrived: (id: string) => Promise<void>;
  readonly markCancelled: (id: string) => Promise<void>;

  // Zone 1
  readonly zone1Filter: Zone1Filter;
  readonly setZone1Filter: (filter: Zone1Filter) => void;
  readonly zone1Appointments: readonly OverviewAppointment[];
  readonly zone1Counts: { all: number; waiting: number; 'in-treatment': number; done: number };
  readonly updateCheckInStatus: (id: string, status: CheckInStatus) => Promise<void>;

  // Refresh
  readonly refresh: () => void;
}

function mapStateToTopStatus(state: string | null): AppointmentTopStatus {
  const s = state?.toLowerCase() ?? '';
  if (s === 'arrived' || s === 'confirmed') return 'arrived';
  // 'in examination' is a valid in-progress state — still counts as arrived
  if (s === 'in examination' || s === 'in-progress') return 'arrived';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  // 'done' is completed — counts as arrived (still in the flow)
  if (s === 'done' || s === 'completed') return 'arrived';
  return 'scheduled';
}

// Map any DB state to the unified check-in status
function mapStateToCheckInStatus(state: string | null): CheckInStatus | null {
  const s = state?.toLowerCase() ?? '';
  if (s === 'arrived' || s === 'confirmed') return 'waiting';
  if (s === 'in examination' || s === 'in-progress') return 'in-treatment';
  if (s === 'done' || s === 'completed') return 'done';
  return null;
}



function mapApiToOverview(apt: ApiAppointment): OverviewAppointment {
  const topStatus = mapStateToTopStatus(apt.state);
  // Only cancelled appointments have no check-in status
  const checkInStatus: CheckInStatus | null = topStatus === 'cancelled'
    ? null
    : (mapStateToCheckInStatus(apt.state) ?? 'waiting');
  return {
    id: apt.id,
    customerName: apt.partnername || apt.partnerdisplayname || '',
    customerPhone: apt.partnerphone || '',
    doctorName: apt.doctorname || '---',
    doctorId: apt.doctorid || '',
    time: apt.time || '09:00',
    locationId: apt.companyid || '',
    locationName: apt.companyname || '',
    note: apt.note || '',
    topStatus,
    checkInStatus,
    color: apt.color,
  };
}

export function useOverviewAppointments(locationId?: string): UseOverviewAppointmentsResult {
  const { getToday, getEndOfDay, timezone } = useTimezone();
  const [appointments, setAppointments] = useState<OverviewAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zone3Filter, setZone3Filter] = useState<Zone3Filter>('all');
  const [zone1Filter, setZone1Filter] = useState<Zone1Filter>('all');

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use global timezone from TimezoneContext
      const todayStr = getToday();
      const endOfDay = getEndOfDay(todayStr);

      const response = await fetchAppointments({
        limit: 200,
        dateFrom: todayStr,
        dateTo: endOfDay,
        companyId: locationId && locationId !== 'all' ? locationId : undefined,
      });

      const mapped = response.items.map(mapApiToOverview);
      // Sort by time ascending (earliest first) — stable sort so status changes don't reorder
      mapped.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(mapped);
    } catch (error) {
      console.error('Failed to load overview appointments:', error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [locationId, timezone, getToday, getEndOfDay]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments, timezone]);

  // ─── Zone 3: filtered appointments ─────────────────────────────
  const zone3Counts = useMemo(() => ({
    all: appointments.length,
    arrived: appointments.filter((a) => a.topStatus === 'arrived').length,
    cancelled: appointments.filter((a) => a.topStatus === 'cancelled').length,
  }), [appointments]);

  const zone3Appointments = useMemo(() => {
    if (zone3Filter === 'all') return appointments;
    return appointments.filter((a) => a.topStatus === zone3Filter);
  }, [appointments, zone3Filter]);

  // ─── Zone 1: only arrived patients with downline status ────────
  const arrivedAppointments = useMemo(
    () => appointments.filter((a) => a.topStatus !== 'cancelled'),
    [appointments],
  );

  const zone1Counts = useMemo(() => ({
    all: arrivedAppointments.length,
    waiting: arrivedAppointments.filter((a) => a.checkInStatus === 'waiting' || a.checkInStatus === null).length,
    'in-treatment': arrivedAppointments.filter((a) => a.checkInStatus === 'in-treatment').length,
    done: arrivedAppointments.filter((a) => a.checkInStatus === 'done').length,
  }), [arrivedAppointments]);

  const zone1Appointments = useMemo(() => {
    if (zone1Filter === 'all') return arrivedAppointments;
    if (zone1Filter === 'waiting') return arrivedAppointments.filter((a) => a.checkInStatus === 'waiting' || a.checkInStatus === null);
    return arrivedAppointments.filter((a) => a.checkInStatus === zone1Filter);
  }, [arrivedAppointments, zone1Filter]);

  // ─── Actions ───────────────────────────────────────────────────
  const markArrived = useCallback(async (id: string) => {
    try {
      await updateAppointment(id, { state: 'arrived' });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, topStatus: 'arrived' as const, checkInStatus: 'waiting' as const } : a,
        ),
      );
    } catch (error) {
      console.error('Failed to mark arrived:', error);
    }
  }, []);

  const markCancelled = useCallback(async (id: string) => {
    try {
      await updateAppointment(id, { state: 'cancelled' });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, topStatus: 'cancelled' as const, checkInStatus: null } : a,
        ),
      );
    } catch (error) {
      console.error('Failed to mark cancelled:', error);
    }
  }, []);

  const updateCheckInStatus = useCallback(async (id: string, status: CheckInStatus) => {
    try {
      // Map downline status to API-valid states
      const stateMap: Record<CheckInStatus, string> = {
        waiting: 'arrived',
        'in-treatment': 'in Examination',
        done: 'done',
      };
      await updateAppointment(id, { state: stateMap[status] });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, checkInStatus: status } : a,
        ),
      );
    } catch (error) {
      console.error('Failed to update check-in status:', error);
    }
  }, []);

  return {
    appointments,
    isLoading,
    zone3Filter,
    setZone3Filter,
    zone3Appointments,
    zone3Counts,
    markArrived,
    markCancelled,
    zone1Filter,
    setZone1Filter,
    zone1Appointments,
    zone1Counts,
    updateCheckInStatus,
    refresh: loadAppointments,
  };
}
