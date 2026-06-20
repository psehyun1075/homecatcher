export function formatDate(value?: string | null) {
  if (!value) return "없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatMoney(value?: number | string | null, currency = "KRW") {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "금액 없음";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

export function toNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

export function isValidUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function compactUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function todayRangeInSeoul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return {
    dueFrom: new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0)).toISOString(),
    dueTo: new Date(Date.UTC(year, month - 1, day, 14, 59, 59, 999)).toISOString(),
  };
}
