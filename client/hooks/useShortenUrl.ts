import { useCallback } from "react";
import { ShortLink } from "@/types/response";
import { API_BASE_URL, SHORT_LINKS_STORAGE_KEY } from "@/libs/constants";

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
function getStoredLinks(): ShortLink[] {
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
    const response = await fetch(`${API_BASE_URL}/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error("Failed to shorten URL");
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
