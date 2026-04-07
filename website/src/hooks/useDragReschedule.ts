import { useState, useCallback } from 'react';
import type { CalendarAppointment } from '@/data/mockCalendar';

/**
 * Drag-and-drop rescheduling hook for Calendar
 * @crossref:used-in[Calendar]
 *
 * Manages drag state for moving appointments between time slots / dates.
 * The actual data mutation is stubbed (mock data) — in production this would
 * call an API to persist the reschedule.
 */

interface DragState {
  readonly appointment: CalendarAppointment | null;
  readonly isDragging: boolean;
}

interface RescheduleResult {
  readonly appointmentId: string;
  readonly newDate: string;
  readonly newTime: string;
}

export function useDragReschedule(
  onReschedule?: (result: RescheduleResult) => void,
) {
  const [dragState, setDragState] = useState<DragState>({
    appointment: null,
    isDragging: false,
  });

  const handleDragStart = useCallback(
    (e: React.DragEvent, appointment: CalendarAppointment) => {
      e.dataTransfer.setData('application/appointment-id', appointment.id);
      e.dataTransfer.effectAllowed = 'move';
      setDragState({ appointment, isDragging: true });
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDate: string, targetTime: string) => {
      e.preventDefault();
      const appointmentId = e.dataTransfer.getData('application/appointment-id');
      if (!appointmentId) return;

      const result: RescheduleResult = {
        appointmentId,
        newDate: targetDate,
        newTime: targetTime,
      };

      onReschedule?.(result);
      setDragState({ appointment: null, isDragging: false });
    },
    [onReschedule],
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ appointment: null, isDragging: false });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } as const;
}
