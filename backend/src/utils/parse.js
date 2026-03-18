export function toNumber(input, fallback = 0) {
  if (input == null) return fallback;
  const normalized = String(input).replace(/[$,%\s,]/g, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

export function toCompactNumber(n) {
  if (!Number.isFinite(n)) return "-";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

export function ageSeconds(ts) {
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
}
