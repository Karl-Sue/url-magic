import { useCallback } from "react";
import { ShortLink } from "@/types/response";
import { API_BASE_URL, SHORT_LINKS_STORAGE_KEY } from "@/libs/constants";
import { ApiError, NetworkError } from "@/libs/errors";

interface ShortenUrlResponse {
  short_code: string;
  short_url: string;
  original_url: string;
  created_at: string;
  ttl: number;
}

interface StoredShortLink {
  link: ShortLink;
  expiresAt: number;
}

{/* Local Storage processing list of created links shortened */}
export function getStoredLinks(): ShortLink[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(SHORT_LINKS_STORAGE_KEY);
  if (!stored) return [];

  try {
    const entries = JSON.parse(stored) as StoredShortLink[];
    const now = Date.now();
    const activeEntries = entries.filter((entry) => entry.expiresAt > now);

    if (activeEntries.length !== entries.length) {
      window.localStorage.setItem(
        SHORT_LINKS_STORAGE_KEY,
        JSON.stringify(activeEntries),
      );
    }

    return activeEntries.map((entry) => entry.link);
  } catch {
    window.localStorage.removeItem(SHORT_LINKS_STORAGE_KEY);
    return [];
  }
}

function storeLink(link: ShortLink): void {
  if (typeof window === "undefined") return;

  const entries = getStoredLinks().filter(
    (storedLink) => storedLink.shortCode !== link.shortCode,
  );
  const expiresAt = Date.parse(link.createdAt) + link.ttl * 1000;
  const storedEntries: StoredShortLink[] = [
    { link, expiresAt },
    ...entries.map((storedLink) => ({
      link: storedLink,
      expiresAt: Date.parse(storedLink.createdAt) + storedLink.ttl * 1000,
    })),
  ];

  window.localStorage.setItem(
    SHORT_LINKS_STORAGE_KEY,
    JSON.stringify(storedEntries),
  );
}

{/* Calling shorten API */}
export function useShortenUrl() {
  const shortenUrl = async (url: string): Promise<ShortLink> => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
    } catch {
      throw new NetworkError("Unable to connect to the server. The API appears to be offline.");
    }

    if (!response.ok) {
      // 502 Bad Gateway, 503 Service Unavailable, and 504 Gateway Timeout
      // are returned by proxies (like SWA CLI) when the upstream API server is offline.
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new NetworkError("Unable to connect to the server — the API appears to be down.");
      }

      let detail = "Failed to shorten URL";
      try {
        const body = await response.json();
        if (typeof body?.detail === "string") {
          detail = body.detail;
        } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
          detail = body.detail[0].msg;
        }
      } catch {
        detail = response.statusText || `Server error (${response.status})`;
      }
      throw new ApiError(response.status, detail);
    }

    const result = (await response.json()) as ShortenUrlResponse;

    const link: ShortLink = {
      shortCode: result.short_code,
      shortURL: result.short_url,
      originalURL: result.original_url,
      createdAt: result.created_at,
      ttl: result.ttl,
    };

    storeLink(link);
    return link;
  };

  const loadStoredLinks = useCallback((): ShortLink[] => getStoredLinks(), []);

  const deleteStoredLink = useCallback((shortCode: string): void => {
    const links = getStoredLinks().filter(
      (link) => link.shortCode !== shortCode,
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SHORT_LINKS_STORAGE_KEY,
        JSON.stringify(
          links.map((link) => ({
            link,
            expiresAt: Date.parse(link.createdAt) + link.ttl * 1000,
          })),
        ),
      );
    }
  }, []);

  return { shortenUrl, loadStoredLinks, deleteStoredLink };
}
