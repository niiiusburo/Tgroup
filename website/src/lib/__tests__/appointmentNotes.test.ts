import { describe, it, expect } from 'vitest';
import { parseAppointmentNote } from '../appointmentNotes';

describe('parseAppointmentNote', () => {
  it('parses duration, type and free text', () => {
    const note = 'Duration: 30 min\nType: Khám mới\nGhi chú thêm';
    const parsed = parseAppointmentNote(note);
    expect(parsed.duration).toBe('30 min');
    expect(parsed.type).toBe('Khám mới');
    expect(parsed.freeText).toBe('Ghi chú thêm');
  });

  it('returns empty object for empty note', () => {
    const parsed = parseAppointmentNote('');
    expect(parsed).toEqual({ duration: '', type: '', freeText: '' });
  });
});
