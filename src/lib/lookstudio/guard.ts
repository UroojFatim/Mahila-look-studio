import "server-only";

// Small in-memory rate limiter so a public demo can't drain the API units.
// Per server instance only — good enough for a demo, not a security boundary.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}

// Result URLs we chain into the next task must be YouCam's own storage.
const ALLOWED_RESULT_HOSTS = [/\.amazonaws\.com$/i, /\.makeupar\.com$/i, /\.perfectcorp\.com$/i];

export function isAllowedResultUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 4000) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_RESULT_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}
