export interface ParsedAppointmentNote {
  duration: string;
  type: string;
  freeText: string;
}

export function parseAppointmentNote(note: string): ParsedAppointmentNote {
  if (!note) return { duration: '', type: '', freeText: '' };
  const lines = note.split('\n');
  let duration = '';
  let type = '';
  const freeLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('Duration:')) {
      duration = line.replace('Duration:', '').trim();
    } else if (line.startsWith('Type:')) {
      type = line.replace('Type:', '').trim();
    } else if (line.startsWith('Service:')) {
      // intentionally ignore service line; displayed elsewhere if needed
    } else {
      freeLines.push(line);
    }
  }
  return { duration, type, freeText: freeLines.join('\n').trim() };
}
