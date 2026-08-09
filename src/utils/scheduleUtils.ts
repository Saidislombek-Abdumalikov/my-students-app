/**
 * Schedule-aware date utilities for Teacher OS.
 * Groups have schedules like "Dushanba / Chorshanba / Juma" (Mon/Wed/Fri)
 * or "Seshanba / Payshanba / Shanba" (Tue/Thu/Sat).
 * These helpers compute valid lesson days for a group.
 */

// JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const MWF_DAYS = [1, 3, 5]; // Mon, Wed, Fri
const TTS_DAYS = [2, 4, 6]; // Tue, Thu, Sat

/**
 * Returns the set of valid weekday numbers (0-6) for a group based on its scheduleDescription.
 */
export function getScheduleDays(scheduleDescription: string): number[] {
  const lower = scheduleDescription.toLowerCase();
  if (lower.includes('dushanba') || lower.includes('chorshanba') || lower.includes('juma')) {
    return MWF_DAYS;
  }
  if (lower.includes('seshanba') || lower.includes('seshonba') || lower.includes('payshanba') || lower.includes('shanba')) {
    return TTS_DAYS;
  }
  // Fallback: every weekday
  return [1, 2, 3, 4, 5, 6];
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a valid scheduled lesson day for the group.
 * Optional param customLessonDates allows including override/extra lesson dates created in DB.
 */
export function isLessonDay(dateStr: string, scheduleDescription: string, customLessonDates?: Set<string>): boolean {
  if (customLessonDates && customLessonDates.has(dateStr)) {
    return true;
  }
  const date = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = date.getDay();
  const validDays = getScheduleDays(scheduleDescription);
  return validDays.includes(dayOfWeek);
}

/**
 * Gets the next valid lesson date from a given date (inclusive or exclusive).
 */
export function getNextLessonDate(dateStr: string, scheduleDescription: string, inclusive = false): string {
  const date = new Date(dateStr + 'T12:00:00');
  const validDays = getScheduleDays(scheduleDescription);

  if (!inclusive) {
    date.setDate(date.getDate() + 1);
  }

  for (let i = 0; i < 14; i++) {
    if (validDays.includes(date.getDay())) {
      return date.toISOString().split('T')[0];
    }
    date.setDate(date.getDate() + 1);
  }

  return dateStr; // fallback
}

/**
 * Gets the previous valid lesson date from a given date (exclusive).
 */
export function getPrevLessonDate(dateStr: string, scheduleDescription: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const validDays = getScheduleDays(scheduleDescription);

  date.setDate(date.getDate() - 1);

  for (let i = 0; i < 14; i++) {
    if (validDays.includes(date.getDay())) {
      return date.toISOString().split('T')[0];
    }
    date.setDate(date.getDate() - 1);
  }

  return dateStr; // fallback
}

/**
 * Gets the closest valid lesson date (today or nearest future/past).
 */
export function getClosestLessonDate(scheduleDescription: string): string {
  const todayStr = new Date().toISOString().split('T')[0];
  if (isLessonDay(todayStr, scheduleDescription)) {
    return todayStr;
  }
  // Find the nearest lesson day (check both directions)
  return getNextLessonDate(todayStr, scheduleDescription, true);
}

/**
 * Returns a human-readable Uzbek day name for a date string.
 */
export function getUzbekDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = date.getDay();
  const names: Record<number, string> = {
    0: 'Yakshanba',
    1: 'Dushanba',
    2: 'Seshanba',
    3: 'Chorshanba',
    4: 'Payshanba',
    5: 'Juma',
    6: 'Shanba',
  };
  return names[dayOfWeek] || '';
}
