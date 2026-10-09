// Day/hour helpers pinned to Melbourne time, so "today" and "9am" mean the
// business owner's day wherever the server or the admin's browser is.
// Safe to import from both server and client code.
export const TIME_ZONE = 'Australia/Melbourne';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hourFormat = new Intl.DateTimeFormat('en-AU', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  hourCycle: 'h23',
});

// 'YYYY-MM-DD'
export function melbourneDay(date = new Date()) {
  return dayFormat.format(date);
}

// 0–23
export function melbourneHour(date = new Date()) {
  return Number(hourFormat.format(date));
}

// The last `n` Melbourne day keys, oldest first, ending today.
// Pure calendar arithmetic on today's key, so DST days (23/25h) can't skip or repeat a day.
export function lastDays(n, now = new Date()) {
  const [y, m, d] = melbourneDay(now).split('-').map(Number);
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }
  return keys;
}

export function formatMelbourne(value, options) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: TIME_ZONE, ...options }).format(new Date(value));
}

// "5 min ago" / "3 h ago" / "Fri 9 Oct, 3:12 pm"
export function timeAgo(value, now = Date.now()) {
  const mins = Math.round((now - new Date(value).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  return formatMelbourne(value, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
