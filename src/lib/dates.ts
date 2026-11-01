const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-12" → "Dec 2026"; "2026" stays "2026". */
export function monthYear(s: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : s;
}

/** Date → "Oct 30, 2026" */
export function longDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);
}
