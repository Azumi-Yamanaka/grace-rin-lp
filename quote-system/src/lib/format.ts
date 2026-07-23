export function yen(n: number | null | undefined): string {
  if (n === null || n === undefined) return "−";
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "−";
  return `${Math.round(n * 10) / 10}%`;
}

export function dateStr(d: Date | string | null | undefined): string {
  if (!d) return "−";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function dateTimeStr(d: Date | string | null | undefined): string {
  if (!d) return "−";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
