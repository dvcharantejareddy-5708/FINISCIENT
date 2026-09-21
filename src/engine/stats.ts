export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function iqrStats(values: number[]) {
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const med = median(values);
  const iqr = q3 - q1;
  return {
    q1,
    q3,
    iqr,
    median: med,
    fenceLow: q1 - 1.5 * iqr,
    fenceHigh: q3 + 1.5 * iqr,
  };
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function roundRupee(n: number): number {
  return Math.round(n);
}

export function formatINR(n: number, withSign = false): string {
  const abs = Math.abs(Math.round(n));
  const formatted = "₹" + abs.toLocaleString("en-IN");
  if (!withSign) return n < 0 ? `-${formatted}` : formatted;
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}

export function formatPct(n: number): string {
  const v = Math.round(n * 10) / 10;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}

export function formatMonths(n: number): string {
  if (!Number.isFinite(n) || isNaN(n)) return "N/A";
  const rounded = Math.round(n * 10) / 10;
  return `~${rounded} mo`;
}

export function formatDays(n: number): string {
  if (!Number.isFinite(n) || isNaN(n)) return "0 days";
  const d = Math.round(n);
  return `${d} day${d === 1 ? "" : "s"}`;
}
