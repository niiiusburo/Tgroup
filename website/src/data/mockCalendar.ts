/**
 * Calendar types re-exported from /types/
 * @crossref:used-in[Calendar, DayView, WeekView, MonthView, TimeSlot, AppointmentCard]
 */

import type { CalendarAppointment, AppointmentStatus } from '@/types/appointment';
import { STATUS_BADGE_STYLES, STATUS_DOT_COLORS, STATUS_LABELS } from '@/constants/statusStyles';

export type { CalendarAppointment, AppointmentStatus };
export { STATUS_BADGE_STYLES, STATUS_DOT_COLORS, STATUS_LABELS };
