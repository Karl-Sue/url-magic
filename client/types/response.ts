export interface ShortLink {
    shortCode: string;
    shortURL: string;
    originalURL: string;
    createdAt: string;
    ttl: number;
}

interface URLHealthStatus {
    url: string;
    status: string;
    statusCode: number | null;
    latency_ms: number | null;
    error: string | null;
}

export interface MonitoredUrl {
    results: URLHealthStatus[];
}