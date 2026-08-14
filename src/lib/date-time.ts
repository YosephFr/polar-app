export const polarTimeZone = process.env.NEXT_PUBLIC_POLAR_TIME_ZONE || "America/Santiago";

export function formatPolarDateTime(value: string | Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-419", { ...options, timeZone: polarTimeZone }).format(new Date(value));
}

export function polarDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: polarTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
