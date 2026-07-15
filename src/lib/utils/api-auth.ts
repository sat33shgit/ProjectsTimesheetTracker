import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Guards destructive/admin-only endpoints (e.g. full DB reset, bulk seed).
 *
 * Requires an `ADMIN_API_TOKEN` env var to be set and the caller to send it
 * back via the `x-admin-token` header. Without a configured token, the
 * endpoint is locked down entirely (fails closed) rather than left open.
 */
export function requireAdminToken(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "This endpoint is disabled. Set ADMIN_API_TOKEN to enable it." },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-admin-token");
  // Constant-time comparison prevents timing attacks on the token.
  const a = Buffer.from(provided ?? "");
  const b = Buffer.from(expected);
  if (!provided || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * Parses a route param expected to be a positive integer id.
 * Returns null if invalid so callers can return a 400 instead of
 * silently querying with NaN.
 */
export function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Validates a required string field: must be a non-empty string after
 * trimming and within maxLength. Returns the trimmed value or null.
 */
export function requireString(value: unknown, maxLength = 255): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

/**
 * Validates an optional free-text field. Non-strings and empty strings
 * become null; overly long text is rejected (returns undefined).
 */
export function optionalText(value: unknown, maxLength = 10_000): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  if (value.length > maxLength) return undefined;
  return value;
}

/**
 * Parses hours: must be a finite number between 0 (exclusive) and 24.
 */
export function parseHours(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 24) return null;
  return n;
}

/**
 * Validates a YYYY-MM-DD date string within a sane year range.
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const year = d.getUTCFullYear();
  return year >= 2000 && year <= 2100;
}

/**
 * Escapes LIKE/ILIKE wildcards in user-supplied search terms so `%` and `_`
 * are matched literally, and caps the length.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.slice(0, 100).replace(/[\\%_]/g, (m) => `\\${m}`);
}
