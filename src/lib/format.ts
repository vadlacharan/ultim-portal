export function formatINR(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(Number(value ?? 0));
}

export function formatDate(value?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
    ...opts,
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  return formatDate(value, { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatTime12h(value?: string | null): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

export function initialsOf(name?: string | null, fallback = "?"): string {
  if (!name) return fallback;
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Plan duration (Payload stores months as "1" | "3" | "6" | "12"). */
export function durationLabel(months?: string | null): string {
  switch (months) {
    case "1":
      return "1 month";
    case "3":
      return "3 months";
    case "6":
      return "6 months";
    case "12":
      return "1 year";
    default:
      return "—";
  }
}

export function titleCase(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
