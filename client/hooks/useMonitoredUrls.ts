import { useCallback, useEffect, useRef, useState } from "react";
import { MonitoredUrl } from "@/types/response";
import { MONITORED_URLS_STORAGE_KEY } from "@/libs/constants";

type StoredMonitoredUrl = Omit<MonitoredUrl, "history">;
type UrlUpdater = (urls: MonitoredUrl[]) => MonitoredUrl[];

function loadStoredUrls(): MonitoredUrl[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(MONITORED_URLS_STORAGE_KEY);
    if (!stored) return [];

    const urls = JSON.parse(stored) as StoredMonitoredUrl[];
    return urls.map((url) => ({ ...url, history: [] }));
  } catch {
    window.localStorage.removeItem(MONITORED_URLS_STORAGE_KEY);
    return [];
  }
}

function toStoredUrls(urls: MonitoredUrl[]): StoredMonitoredUrl[] {
  return urls.map(({ history: _history, ...url }) => url);
}

export function useMonitoredUrls() {
  const [urls, setUrls] = useState<MonitoredUrl[]>([]);
  const hasLoadedStorage = useRef(false);

  useEffect(() => {
    setUrls(loadStoredUrls());
    hasLoadedStorage.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage.current || typeof window === "undefined") return;

    window.localStorage.setItem(
      MONITORED_URLS_STORAGE_KEY,
      JSON.stringify(toStoredUrls(urls)),
    );
  }, [urls]);

  const updateUrls = useCallback((updater: UrlUpdater) => {
    setUrls(updater);
  }, []);

  const addUrl = useCallback((url: string) => {
    setUrls((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        url,
        status: "pending",
        latency: null,
        lastChecked: null,
        history: [],
      },
    ]);
  }, []);

  const removeUrl = useCallback((id: string) => {
    setUrls((current) => current.filter((url) => url.id !== id));
  }, []);

  return { urls, addUrl, removeUrl, updateUrls };
}
