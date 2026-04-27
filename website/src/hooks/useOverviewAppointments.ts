import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAppointments, updateAppointment, type ApiAppointment } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { getStoredArrivalTime, setStoredArrivalTime } from '@/lib/arrivalTimeStorage';

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
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorName: string;
  readonly doctorId: string;
  readonly date: string;
  readonly time: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly note: string;
  readonly timeexpected: number | null;
  readonly topStatus: AppointmentTopStatus;
  readonly checkInStatus: CheckInStatus | null; // null until arrived
  readonly color: string | null; // color code 0-7 from database
  readonly productId: string | null; // FK to products(id) — the booked service
  readonly arrivalTime: string | null;
  readonly treatmentStartTime: string | null;
  // Assistant / dental aide (populated from API)
  readonly assistantId: string | null;
  readonly assistantName: string | null;
  readonly dentalAideId: string | null;
  readonly dentalAideName: string | null;
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
  readonly zone3Search: string;
  readonly setZone3Search: (term: string) => void;
  readonly markArrived: (id: string) => Promise<void>;
  readonly markCancelled: (id: string) => Promise<void>;

  // Zone 1
  readonly zone1Filter: Zone1Filter;
  readonly setZone1Filter: (filter: Zone1Filter) => void;
  readonly zone1Appointments: readonly OverviewAppointment[];
  readonly zone1Counts: { all: number; waiting: number; 'in-treatment': number; done: number };
  readonly zone1Search: string;
  readonly setZone1Search: (term: string) => void;
  readonly updateCheckInStatus: (id: string, status: CheckInStatus, onSuccess?: () => void) => Promise<void>;

  // Refresh
  readonly refresh: () => void;
}

function mapStateToTopStatus(state: string | null): AppointmentTopStatus {
  const s = state?.toLowerCase() ?? '';
  if (s === 'arrived') return 'arrived';
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
  if (s === 'arrived') return 'waiting';
  if (s === 'in examination' || s === 'in-progress') return 'in-treatment';
  if (s === 'done' || s === 'completed') return 'done';
  return null;
}



function mapApiToOverview(
  apt: ApiAppointment,
  formatDate: (date: Date | string, format?: string) => string,
): OverviewAppointment {
  const topStatus = mapStateToTopStatus(apt.state);
  const checkInStatus: CheckInStatus | null = topStatus === 'arrived'
    ? (mapStateToCheckInStatus(apt.state) ?? 'waiting')
    : null;
  const arrivalTime = topStatus === 'arrived'
    ? getStoredArrivalTime(apt.id) ?? extractTimeFromTimestamp(apt.datetimearrived) ?? extractTimeFromTimestamp(apt.lastupdated)
    : null;
  return {
    id: apt.id,
    customerId: apt.partnerid || '',
    customerName: apt.partnername || apt.partnerdisplayname || '',
    customerPhone: apt.partnerphone || '',
    doctorName: apt.doctorname || '---',
    doctorId: apt.doctorid || '',
    date: apt.date ? formatDate(apt.date, 'yyyy-MM-dd') : '',
    time: apt.time || '09:00',
    locationId: apt.companyid || '',
    locationName: apt.companyname || '',
    note: apt.note || '',
    timeexpected: apt.timeexpected ?? apt.timeExpected ?? null,
    topStatus,
    checkInStatus,
    color: apt.color,
    productId: apt.productid || null,
    arrivalTime,
    treatmentStartTime: checkInStatus === 'in-treatment' || checkInStatus === 'done'
      ? extractTimeFromTimestamp(apt.datetimeseated)
      : null,
    assistantId: apt.assistantid ?? null,
    assistantName: apt.assistantname ?? null,
    dentalAideId: apt.dentalaideid ?? null,
    dentalAideName: apt.dentalaidename ?? null,
  };
}

const ZONE3_FILTER_KEY = 'tgclinic:overview:zone3Filter';
const ZONE1_FILTER_KEY = 'tgclinic:overview:zone1Filter';
const ZONE3_OPTIONS: Zone3Filter[] = ['all', 'arrived', 'cancelled'];
const ZONE1_OPTIONS: Zone1Filter[] = ['all', 'waiting', 'in-treatment', 'done'];

function extractTimeFromTimestamp(ts: string | null): string | null {
  if (!ts) return null;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return null;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getSavedFilter<T extends string>(key: string, options: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const saved = localStorage.getItem(key);
  return options.includes(saved as T) ? (saved as T) : fallback;
}

export function useOverviewAppointments(locationId?: string): UseOverviewAppointmentsResult {
  /*
   * AUDIT LOCK — OVERVIEW PAGE: TODAY-ONLY FILTER
   *
   * CRITICAL:  The Overview dashboard MUST ONLY show appointments for the
   *            current calendar day (based on the user's configured timezone).
   *
   *   dateFrom = today (YYYY-MM-DD from getToday())
   *   dateTo   = end of today (YYYY-MM-DDT23:59:59 from getEndOfDay())
   *
   * NEVER change dateFrom/dateTo to include other days, weeks, or months.
   * NEVER remove the date range filter.
   * NEVER show past or future appointments here.
   *
   * Any AI or developer reading this: DO NOT TOUCH THE DATE RANGE.
   */
  const { getToday, getEndOfDay, timezone, formatDate } = useTimezone();
  const [appointments, setAppointments] = useState<OverviewAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zone3Filter, setZone3Filter] = useState<Zone3Filter>(() =>
    getSavedFilter(ZONE3_FILTER_KEY, ZONE3_OPTIONS, 'all')
  );
  const [zone1Filter, setZone1Filter] = useState<Zone1Filter>(() =>
    getSavedFilter(ZONE1_FILTER_KEY, ZONE1_OPTIONS, 'all')
  );

  useEffect(() => {
    localStorage.setItem(ZONE3_FILTER_KEY, zone3Filter);
  }, [zone3Filter]);

  useEffect(() => {
    localStorage.setItem(ZONE1_FILTER_KEY, zone1Filter);
  }, [zone1Filter]);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      // =========================================================================
      // [AUDIT LOCK] OVERVIEW PAGE: TODAY-ONLY FILTER — HARD-CODED
      // NEVER change this. The Overview dashboard MUST only display appointments
      // scheduled for the current day (based on the user's configured timezone).
      // No past appointments. No future appointments. TODAY ONLY.
      // If any AI or developer reads this: DO NOT MODIFY the date range.
      // =========================================================================
      const todayStr = getToday();
      const endOfDay   = getEndOfDay(todayStr);

      const response = await fetchAppointments({
        limit: 200,
        dateFrom: todayStr,
        dateTo: endOfDay,
        companyId: locationId && locationId !== 'all' ? locationId : undefined,
      });
      // =========================================================================

      const mapped = response.items
        .filter((apt) => {
          const aptDateStr = apt.date ? formatDate(apt.date, 'yyyy-MM-dd') : '';
          return aptDateStr === todayStr; // Client-side guard: today only
        })
        .map((apt) => mapApiToOverview(apt, formatDate));
      // Sort by time ascending (earliest first) — stable sort so status changes don't reorder
      mapped.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(mapped);
    } catch (error) {
      console.error('Failed to load overview appointments:', error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [locationId, timezone, getToday, getEndOfDay, formatDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments, timezone]);

  // Refresh appointments when the tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAppointments();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadAppointments]);

  // ─── Search states ─────────────────────────────────────────────
  const [zone1Search, setZone1Search] = useState('');
  const [zone3Search, setZone3Search] = useState('');

  function matchesSearch(apt: OverviewAppointment, term: string) {
    if (!term.trim()) return true;
    const q = term.toLowerCase();
    return (
      apt.customerName.toLowerCase().includes(q) ||
      apt.customerPhone.toLowerCase().includes(q) ||
      apt.doctorName.toLowerCase().includes(q) ||
      apt.note.toLowerCase().includes(q)
    );
  }

  // ─── Zone 3: filtered appointments ─────────────────────────────
  const zone3Counts = useMemo(() => ({
    all: appointments.length,
    arrived: appointments.filter((a) => a.topStatus === 'arrived').length,
    cancelled: appointments.filter((a) => a.topStatus === 'cancelled').length,
  }), [appointments]);

  const zone3Appointments = useMemo(() => {
    const byTab = zone3Filter === 'all'
      ? appointments
      : appointments.filter((a) => a.topStatus === zone3Filter);
    return byTab.filter((a) => matchesSearch(a, zone3Search));
  }, [appointments, zone3Filter, zone3Search]);

  // ─── Zone 1: only arrived patients with downline status ────────
  const arrivedAppointments = useMemo(
    () => appointments.filter((a) => a.topStatus === 'arrived'),
    [appointments],
  );

  const zone1Counts = useMemo(() => ({
    all: arrivedAppointments.length,
    waiting: arrivedAppointments.filter((a) => a.checkInStatus === 'waiting' || a.checkInStatus === null).length,
    'in-treatment': arrivedAppointments.filter((a) => a.checkInStatus === 'in-treatment').length,
    done: arrivedAppointments.filter((a) => a.checkInStatus === 'done').length,
  }), [arrivedAppointments]);

  /*
  ╔════════════════════════════════════════════════════════════════════════╗
  ║  ZONE 1 APPOINTMENTS SORTING LOGIC                                    ║
  ╠════════════════════════════════════════════════════════════════════════╣
  ║  ⚠️  DO NOT CHANGE THIS SORTING LOGIC                                ║
  ║                                                                      ║
  ║  • When filter = 'all': Sort by status (waiting → in-treatment → done)
  ║  • When filter = specific status: Filter only that status (no sort)  ║
  ║                                                                      ║
  ║  This means clicking a filter tab shows ONLY that status,           ║
  ║  but "Tất cả" shows all sorted correctly.                            ║
  ╚════════════════════════════════════════════════════════════════════════╝
  */
  const zone1Appointments = useMemo(() => {
    let filtered = arrivedAppointments;
    if (zone1Filter !== 'all') {
      filtered = zone1Filter === 'waiting'
        ? arrivedAppointments.filter((a) => a.checkInStatus === 'waiting' || a.checkInStatus === null)
        : arrivedAppointments.filter((a) => a.checkInStatus === zone1Filter);
    } else {
      // Sort all appointments: waiting → in-treatment → done
      filtered = [...arrivedAppointments].sort((a, b) => {
        const statusA = a.checkInStatus ?? 'waiting';
        const statusB = b.checkInStatus ?? 'waiting';
        const order: Record<string, number> = { 'waiting': 0, 'in-treatment': 1, 'done': 2 };
        return (order[statusA] ?? 3) - (order[statusB] ?? 3);
      });
    }
    return filtered.filter((a) => matchesSearch(a, zone1Search));
  }, [arrivedAppointments, zone1Filter, zone1Search]);

  // ─── Actions ───────────────────────────────────────────────────
  const markArrived = useCallback(async (id: string) => {
    try {
      await updateAppointment(id, { state: 'arrived' });
      const arrivalTime = formatDate(new Date(), 'HH:mm:ss');
      setStoredArrivalTime(id, arrivalTime);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, topStatus: 'arrived' as const, checkInStatus: 'waiting' as const, arrivalTime, treatmentStartTime: null } : a,
        ),
      );
    } catch (error) {
      console.error('Failed to mark arrived:', error);
    }
  }, [formatDate]);

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
  }, [formatDate]);

  const updateCheckInStatus = useCallback(async (id: string, status: CheckInStatus, onSuccess?: () => void) => {
    try {
      // Map downline status to API-valid states
      const stateMap: Record<CheckInStatus, string> = {
        waiting: 'arrived',
        'in-treatment': 'in Examination',
        done: 'done',
      };
      await updateAppointment(id, { state: stateMap[status] });
      const treatmentStartTime = status === 'waiting' ? null : formatDate(new Date(), 'HH:mm:ss');
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, checkInStatus: status, treatmentStartTime } : a,
        ),
      );
      onSuccess?.();
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
    zone3Search,
    setZone3Search,
    markArrived,
    markCancelled,
    zone1Filter,
    setZone1Filter,
    zone1Appointments,
    zone1Counts,
    zone1Search,
    setZone1Search,
    updateCheckInStatus,
    refresh: loadAppointments,
  };
}
