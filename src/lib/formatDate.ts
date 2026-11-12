const IST = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

const istPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function istParts(date: Date) {
  const parts = istPartsFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    day: `${read('year')}-${read('month')}-${read('day')}`,
    time: `${read('hour')}:${read('minute')}`,
  };
}

export function formatDateIST(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function todayIST() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function greetingIST() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: '2-digit', hour12: false }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Calendar day in IST as YYYY-MM-DD. */
export function todayISTDate(now: Date = new Date()) {
  return istParts(now).day;
}

/** Yesterday's calendar day in IST as YYYY-MM-DD. */
export function yesterdayISTDate() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return istParts(d).day;
}

/** Default 6 PM IST deadline for a day, in the value format of a datetime-local input. */
export function defaultDeadlineInput(day: string) {
  return `${day}T18:00`;
}

/** Converts a datetime-local value (read as IST) into an ISO timestamp. Supports input with or without seconds. */
export function istInputToIso(value: string) {
  if (!value) return '';
  const trimmed = value.trim();
  const timePart = trimmed.split('T')[1] ?? '';
  const colonCount = (timePart.match(/:/g) || []).length;
  const withSeconds = colonCount === 1 ? `${trimmed}:00` : trimmed;
  return new Date(`${withSeconds}${IST_OFFSET}`).toISOString();
}

/** Converts an ISO timestamp into a datetime-local value shown in IST. */
export function isoToIstInput(iso: string) {
  const { day, time } = istParts(new Date(iso));
  return `${day}T${time}`;
}

export function formatTimeIST(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: IST,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "Today, 6:00 PM" for the current IST day, otherwise "10 Nov, 6:00 PM". */
export function formatDeadlineIST(iso: string, now: Date = new Date()) {
  const isToday = istParts(new Date(iso)).day === todayISTDate(now);
  const dayLabel = isToday
    ? 'Today'
    : new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short' }).format(new Date(iso));
  return `${dayLabel}, ${formatTimeIST(iso)}`;
}

export function formatDateTimeIST(iso: string) {
  return formatDeadlineIST(iso);
}
