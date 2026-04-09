/**
 * Appointments types re-exported from /types/
 * @crossref:used-in[Appointments, CheckInFlow, WaitTimer]
 */

import type { ManagedAppointment, AppointmentStatus, CheckInStatus } from '@/types/appointment';
import { CHECK_IN_STATUS_LABELS, CHECK_IN_STATUS_STYLES, CHECK_IN_FLOW_ORDER } from '@/types/appointment';

export type { ManagedAppointment, AppointmentStatus, CheckInStatus };
export { CHECK_IN_STATUS_LABELS, CHECK_IN_STATUS_STYLES, CHECK_IN_FLOW_ORDER };
