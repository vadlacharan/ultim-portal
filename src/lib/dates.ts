/** Client-safe date helpers (no server-only imports). */

/** YYYY-MM-DD in the facility timezone (Asia/Kolkata, matching the backend). */
export function istDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA gives YYYY-MM-DD
}

/** UTC ISO boundaries of an IST calendar day — matches how sessions are stored. */
export function istDayRange(date = new Date()): { startISO: string; endISO: string } {
  const day = istDateString(date);
  return {
    startISO: `${day}T00:00:00.000+05:30`,
    endISO: `${day}T23:59:59.999+05:30`,
  };
}

export function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
