const requestLog = new Map<string, { count: number; windowStart: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = requestLog.get(identifier);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    requestLog.set(identifier, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil(
      (entry.windowStart + WINDOW_MS - now) / 1000,
    );
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
