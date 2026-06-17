/**
 * Parses a time range string like "03:00 - 04:30 PM" or "10:30 - 12:00 AM" or "03:00 PM - 05:00 PM"
 * into start and end minutes since midnight.
 */
export function parseTimeRange(rangeStr: string): { start: number; end: number } | null {
  try {
    const parts = rangeStr.split('-').map(s => s.trim());
    if (parts.length !== 2) return null;

    let startPart = parts[0];
    let endPart = parts[1];

    let startAmPm = startPart.match(/(AM|PM)$/i)?.[0]?.toUpperCase();
    const endAmPm = endPart.match(/(AM|PM)$/i)?.[0]?.toUpperCase();

    const startClean = startPart.replace(/(AM|PM)/i, '').trim();
    const endClean = endPart.replace(/(AM|PM)/i, '').trim();

    const startMatch = startClean.match(/^(\d+):(\d+)$/);
    const endMatch = endClean.match(/^(\d+):(\d+)$/);
    if (!startMatch || !endMatch) return null;

    let startHour = parseInt(startMatch[1], 10);
    const startMin = parseInt(startMatch[2], 10);
    let endHour = parseInt(endMatch[1], 10);
    const endMin = parseInt(endMatch[2], 10);

    if (!startAmPm && endAmPm) {
      if (endAmPm === 'AM') {
        if (startHour >= 10 && startHour < 12) {
          // E.g. "10:30 - 12:00 AM" -> Start is 10:30 PM, End is 12:00 AM (midnight)
          startAmPm = 'PM';
        } else {
          startAmPm = 'AM';
        }
      } else if (endAmPm === 'PM') {
        if (startHour >= 12 || startHour < endHour) {
          startAmPm = 'PM';
        } else {
          startAmPm = 'AM';
        }
      }
    }

    if (!startAmPm) startAmPm = 'AM';

    // Convert start to minutes since midnight
    let startHour24 = startHour;
    if (startAmPm === 'PM' && startHour < 12) startHour24 += 12;
    if (startAmPm === 'AM' && startHour === 12) startHour24 = 0;

    // Convert end to minutes since midnight
    let endAmPmResolved = endAmPm || startAmPm;
    let endHour24 = endHour;
    if (endAmPmResolved === 'PM' && endHour < 12) endHour24 += 12;
    if (endAmPmResolved === 'AM' && endHour === 12) endHour24 = 0;

    let startMinSinceMidnight = startHour24 * 60 + startMin;
    let endMinSinceMidnight = endHour24 * 60 + endMin;

    // Handle standard overnight / crossover slot
    if (endMinSinceMidnight <= startMinSinceMidnight) {
      endMinSinceMidnight += 24 * 60;
    }

    return { start: startMinSinceMidnight, end: endMinSinceMidnight };
  } catch {
    return null;
  }
}

/**
 * Checks if two time ranges overlap.
 */
export function areSlotsOverlapping(time1: string, time2: string): boolean {
  if (!time1 || !time2) return false;
  
  const t1 = time1.trim().toLowerCase();
  const t2 = time2.trim().toLowerCase();
  
  if (t1 === t2) {
    return true;
  }

  const r1 = parseTimeRange(time1);
  const r2 = parseTimeRange(time2);
  if (!r1 || !r2) return false;

  return r1.start < r2.end && r2.start < r1.end;
}
