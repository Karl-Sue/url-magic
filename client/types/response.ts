export interface ShortLink {
    shortCode: string;
    shortURL: string;
    originalURL: string;
    createdAt: string;
    ttl: number;
}

export interface URLHealthStatus {
    url: string;
    status: string;
    statusCode: number | null;
    latency_ms: number | null;
    error: string | null;
}

export interface HealthCheckResponse {
    results: URLHealthStatus[];
}

export type MonitorStatus = "online" | "offline" | "checking" | "pending";

export interface MonitorHistoryEntry {
    latency: number | null;
    ok: boolean;
}

export interface MonitoredUrl {
    id: string;
    url: string;
    status: MonitorStatus;
    latency: number | null;
    lastChecked: Date | null;
    history: MonitorHistoryEntry[];
    error?: string | null;
}