// All dates are local calendar dates in 'YYYY-MM-DD'. D-Day is based on the user's device date (spec 9장).
export const pad = (n: number) => String(n).padStart(2, '0');

export function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parts(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m, d];
}
export function addDays(s: string, n: number): string {
  const [y, m, d] = parts(s);
  return fmt(new Date(y, m - 1, d + n));
}
/** b - a in whole days */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

let override: string | null = null;
/** Test / demo hook: pretend today is another date. */
export function setTodayOverride(s: string | null) {
  override = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
export function today(): string {
  return override ?? fmt(new Date());
}
export function fmtKo(s: string): string {
  const [, m, d] = parts(s);
  return `${m}월 ${d}일`;
}
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parts(s);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
