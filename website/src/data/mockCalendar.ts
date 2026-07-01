/**
 * Calendar types re-exported from /types/
 * @crossref:used-in[Calendar, DayView, WeekView, MonthView, TimeSlot, AppointmentCard]
 */

import type { CalendarAppointment, AppointmentStatus } from '@/types/appointment';
import { STATUS_STYLE_MAP, STATUS_LABELS } from '@/constants/statusStyles';

export type { CalendarAppointment, AppointmentStatus };
export { STATUS_STYLE_MAP, STATUS_LABELS };
