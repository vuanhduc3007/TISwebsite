// SQL DATE is a calendar day, not an instant. Keep YYYY-MM-DD at the DB/form
// boundary; never interpret it using the machine's local timezone.
function parseCalendarDate(value: string | null): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1) return null;
  const anchor = new Date(0);
  anchor.setUTCFullYear(year, month - 1, day);
  return anchor.getUTCFullYear() === year
    && anchor.getUTCMonth() === month - 1
    && anchor.getUTCDate() === day ? anchor : null;
}

export function calendarDateInput(value: string | null): string {
  return parseCalendarDate(value) ? value! : "";
}

export function formatProjectCalendarDate(value: string | null, dateDisplay: string | null): string {
  const display = dateDisplay?.trim();
  if (display) return display;
  const anchor = parseCalendarDate(value);
  return anchor ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(anchor) : "";
}
