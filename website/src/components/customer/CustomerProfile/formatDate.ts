export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    // Handle ISO date strings (e.g., "2024-03-15T00:00:00") by extracting just the date part
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    
    // Parse as local date to avoid timezone shifts
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '-';
    
    const date = new Date(year, month - 1, day); // month is 0-indexed
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}
