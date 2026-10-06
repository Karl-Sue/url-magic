/**
 * Validates and normalizes user input into a valid HTTP(S) URL.
 * Returns the normalized URL string (e.g. "https://example.com/path") if valid,
 * or null if invalid (typo schemes like "ht!p://", missing TLD, invalid chars, etc.).
 */
export function normalizeWebUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. If input contains "://" it must strictly start with "http://" or "https://"
  // Rejects typos like "ht!p://", "htp://", "ftp://", etc.
  if (trimmed.includes("://")) {
    if (!/^https?:\/\//i.test(trimmed)) {
      return null;
    }
  }

  // 2. Prepend https:// if no scheme is present
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);

    // Protocol must strictly be http: or https:
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Block localhost domain, ip and ensure TLD is at least 2 chars
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost") || host.endsWith(".local")) {
      return null;
    }

    const parts = host.split(".");
    if (parts.length < 2) return null;

    const tld = parts[parts.length - 1];
    if (parts.some((part) => !part) || tld.length < 2) {
      return null;
    }

    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}
