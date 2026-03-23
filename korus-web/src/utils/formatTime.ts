const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toDate(dateInput: string | Date): Date {
  return dateInput instanceof Date ? dateInput : new Date(dateInput);
}

/**
 * Twitter-style relative time.
 *
 * - < 1 min   -> "now"
 * - < 60 min  -> "5m"
 * - < 24 h    -> "2h"
 * - < 7 d     -> "3d"
 * - same year -> "Mar 23"
 * - other year -> "Mar 23, 2025"
 */
export function formatRelativeTime(dateInput: string | Date): string {
  const date = toDate(dateInput);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < MINUTE) return 'now';
  if (diffSeconds < HOUR) return `${Math.floor(diffSeconds / MINUTE)}m`;
  if (diffSeconds < DAY) return `${Math.floor(diffSeconds / HOUR)}h`;
  if (diffSeconds < WEEK) return `${Math.floor(diffSeconds / DAY)}d`;

  const month = SHORT_MONTHS[date.getMonth()];
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }

  return `${month} ${day}, ${date.getFullYear()}`;
}

/**
 * Full timestamp for a post detail page.
 * Example: "7:38 PM · Mar 23, 2026"
 */
export function formatFullTimestamp(dateInput: string | Date): string {
  const date = toDate(dateInput);

  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const paddedMinutes = minutes.toString().padStart(2, '0');

  const month = SHORT_MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${hours12}:${paddedMinutes} ${period} \u00b7 ${month} ${day}, ${year}`;
}
