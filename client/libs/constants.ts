import type { MonitorStatus } from "@/types/response";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");
export const GUEST_FLAG_COOKIE = "has_guest_session";

export const SHORT_LINKS_STORAGE_KEY = "url-magic:short-links";
export const MONITORED_URLS_STORAGE_KEY = "url-magic:monitored-urls";
export const SPARKBAR_SLOTS = 20;

export const STATUS_LABELS: Record<MonitorStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "#008800" },
  offline: { label: "Offline", color: "#cc0000" },
  checking: { label: "Checking", color: "#888888" },
  pending: { label: "—", color: "#c0c0c0" },
};
