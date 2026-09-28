export const cruiseUserAgent = "Mozilla/5.0 (compatible; angli-site/1.0; +https://angli.site)";

export async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("User-Agent")) headers.set("User-Agent", cruiseUserAgent);
  const response = await fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Cruise response: ${response.status}`);
  return await response.json() as unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isoDate(value: unknown) {
  if (typeof value !== "string") return null;
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

export function absoluteUrl(origin: string, path: unknown, fallback: string) {
  if (typeof path !== "string" || path.length === 0) return fallback;
  if (path.startsWith("http")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
