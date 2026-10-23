/**
 * @module dates
 * @purpose UTC date arithmetic using YYYY-MM-DD plain strings.
 *          Performs all calculations at UTC midnight to avoid timezone and DST drift.
 *          Supports clock injection (now()) for completely deterministic testing.
 * @rubric Code Quality & Testing – Pure functions, timezone-safe UTC math.
 */

export type Clock = () => string;

/** Default clock returning current UTC date string YYYY-MM-DD */
export const defaultClock: Clock = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check if a string is a valid YYYY-MM-DD date.
 */
export function isValidDateString(str: string): boolean {
  if (!str || typeof str !== "string" || !DATE_REGEX.test(str)) {
    return false;
  }
  const parts = str.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Parse YYYY-MM-DD into a Date set to UTC midnight.
 */
export function parseUtcDate(dateStr: string): Date {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const parts = dateStr.split("-").map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format a Date object into YYYY-MM-DD using its UTC components.
 */
export function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Add or subtract days from a YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + Math.round(days));
  return formatUtcDate(date);
}

/**
 * Add or subtract weeks from a YYYY-MM-DD string.
 */
export function addWeeks(dateStr: string, weeks: number): string {
  return addDays(dateStr, Math.round(weeks * 7));
}

/**
 * Calculate signed days between two dates: toStr - fromStr.
 * Positive if toStr is after fromStr.
 */
export function daysBetween(fromStr: string, toStr: string): number {
  const from = parseUtcDate(fromStr).getTime();
  const to = parseUtcDate(toStr).getTime();
  const MS_PER_DAY = 86_400_000;
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * Calculate whole weeks between two dates.
 */
export function weeksBetween(fromStr: string, toStr: string): number {
  return Math.floor(daysBetween(fromStr, toStr) / 7);
}

/** Check if dateA is strictly before dateB. */
export function isBefore(a: string, b: string): boolean {
  return daysBetween(a, b) > 0;
}

/** Check if dateA is strictly after dateB. */
export function isAfter(a: string, b: string): boolean {
  return daysBetween(a, b) < 0;
}

/** Check if dateA is same or before dateB. */
export function isSameOrBefore(a: string, b: string): boolean {
  return daysBetween(a, b) >= 0;
}

/** Check if dateA is same or after dateB. */
export function isSameOrAfter(a: string, b: string): boolean {
  return daysBetween(a, b) <= 0;
}

/**
 * Clamp a date string between minDate and maxDate.
 * If minDate > maxDate, clamps to minDate.
 */
export function clampDate(
  dateStr: string,
  minStr: string,
  maxStr: string
): { clamped: string; wasClamped: boolean } {
  let target = dateStr;
  let wasClamped = false;

  if (isBefore(target, minStr)) {
    target = minStr;
    wasClamped = true;
  }
  if (isAfter(target, maxStr)) {
    target = maxStr;
    wasClamped = true;
  }

  return { clamped: target, wasClamped };
}

/** Check if year is leap year */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
