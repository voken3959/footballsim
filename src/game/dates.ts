// ============================================================
// DATE UTILITIES
// ============================================================

/** Current real-world ISO date string — used only for save metadata */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Parse 'YYYY-MM-DD' into a Date at UTC midnight */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format a Date as 'YYYY-MM-DD' */
export function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add N days to an ISO date */
export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Add N months */
export function addMonths(iso: string, months: number): string {
  const d = parseDate(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISODate(d);
}

/** Add N years */
export function addYears(iso: string, years: number): string {
  const d = parseDate(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return toISODate(d);
}

/** Difference in days (b - a) */
export function daysBetween(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Is a before b */
export function isBefore(a: string, b: string): boolean {
  return a < b; // ISO strings compare lexicographically
}

/** Is a after b */
export function isAfter(a: string, b: string): boolean {
  return a > b;
}

/** Compute age in years from birthdate to a reference date */
export function ageOn(birthISO: string, refISO: string): number {
  const b = parseDate(birthISO);
  const r = parseDate(refISO);
  let age = r.getUTCFullYear() - b.getUTCFullYear();
  const monthDiff = r.getUTCMonth() - b.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && r.getUTCDate() < b.getUTCDate())) {
    age--;
  }
  return age;
}

/** Human-friendly display: 'Mon 14 Sep 2025' */
export function formatDate(iso: string): string {
  const d = parseDate(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Short display: '14 Sep' */
export function formatShort(iso: string): string {
  const d = parseDate(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Day of week (0=Sun) */
export function dayOfWeek(iso: string): number {
  return parseDate(iso).getUTCDay();
}

/**
 * Next Saturday on or after the given date.
 * Used for league match scheduling — matches are typically Saturdays.
 */
export function nextSaturday(iso: string): string {
  const dow = dayOfWeek(iso);
  const offset = (6 - dow + 7) % 7;
  return addDays(iso, offset);
}

/** Season string for a given date, e.g. '2025/26' for Aug 2025 to May 2026 */
export function seasonForDate(iso: string): string {
  const d = parseDate(iso);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  // New season starts in July/August
  if (month >= 7) {
    return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}/${String(year % 100).padStart(2, '0')}`;
}
