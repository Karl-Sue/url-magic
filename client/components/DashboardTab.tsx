"use client"

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import { MonitoredUrl } from "@/types/response";
import { Input, Button } from "@/components"
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { ApiError, NetworkError } from "@/libs/errors";
import { normalizeWebUrl } from "@/libs/url";
import { SPARKBAR_SLOTS, STATUS_LABELS } from "@/libs/constants";
import { useMonitoredUrls } from "@/hooks/useMonitoredUrls";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false },
);

function AnimatedNumber({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    if (startValueRef.current === value) return;

    let animId: number;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Calmer easeOutQuart curve with smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValueRef.current + (value - startValueRef.current) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{displayValue}</span>;
}

{/* History URL check spark bar*/}
function Sparkbar({ history }: { history: MonitoredUrl["history"] }) {
  const filled = history.slice(-SPARKBAR_SLOTS);
  const empty = SPARKBAR_SLOTS - filled.length;
  const max = Math.max(...filled.map((h) => h.latency ?? 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "24px", width: "100%", maxWidth: "160px" }}>
      {Array.from({ length: empty }).map((_, i) => (
        <div key={`e${i}`} style={{ flex: 1, minWidth: "3px", maxWidth: "7px", height: "4px", background: "#f0f0f0" }} />
      ))}
      {filled.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: "3px",
            maxWidth: "7px",
            height: `${Math.max(4, ((h.latency ?? 0) / max) * 24)}px`,
            background: h.ok ? "#111111" : "#cc0000",
            opacity: 0.45 + i * 0.03,
            transition: "height 200ms",
          }}
          title={h.ok ? `${h.latency}ms` : "Failed"}
        />
      ))}
    </div>
  );
}


function StatusLabel({ status }: { status: MonitoredUrl["status"] }) {
  const { label, color } = STATUS_LABELS[status];
  return (
    <span style={{ fontSize: "14px", fontFamily: "DM Mono, monospace", color }}>
      {label}
    </span>
  );
}

function formatMs(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}ms`;
}

export function DashboardTab() {
  const [input, setInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const { urls, addUrl: addMonitoredUrl, removeUrl, updateUrls } = useMonitoredUrls();
  const { checkUrlsHealth } = useHealthCheck();

  const checkOne = useCallback(async (id: string, url: string) => {
    updateUrls((current) => current.map((u) => u.id === id ? { ...u, status: "checking" } : u));
    try {
      const [result] = await checkUrlsHealth([url]);
      const isOnline = result.status === "healthy";
      updateUrls((current) =>
        current.map((u) =>
          u.id === id
            ? { ...u, status: isOnline ? "online" : "offline", latency: result.latency_ms, lastChecked: new Date(), error: result.error, history: [...u.history.slice(-19), { latency: result.latency_ms, ok: isOnline }] }
            : u
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof NetworkError
          ? "Unable to connect to the server — the API appears to be down."
          : error instanceof ApiError
          ? error.message || `Server error (${error.status})`
          : error instanceof Error
          ? error.message
          : "Health check failed";

      updateUrls((current) =>
        current.map((u) => u.id === id
          ? { ...u, status: "offline", lastChecked: new Date(), error: errorMessage }
          : u
        )
      );
    }
  }, [checkUrlsHealth, updateUrls]);

  function formatTime(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  const checkAll = useCallback(async () => {
    if (urls.length > 100) {
      setLimitError("You can track a maximum of 100 URLs at once. Remove some URLs before checking again.");
      return;
    }

    if (!urls.length) return;

    const startedAt = Date.now();
    setIsChecking(true);
    setIsTakingLonger(false);
    setLimitError(null);
    updateUrls((current) => current.map((u) => ({ ...u, status: "checking" })));

    try {
      const results = await checkUrlsHealth(urls.map((u) => u.url));
      const checkedAt = new Date();
      updateUrls((current) => current.map((u) => {
        const result = results.find((item) => item.url === u.url);
        if (!result) return u;

        const isOnline = result.status === "healthy";
        return {
          ...u,
          status: isOnline ? "online" : "offline",
          latency: result.latency_ms,
          lastChecked: checkedAt,
          error: result.error,
          history: [...u.history.slice(-19), { latency: result.latency_ms, ok: isOnline }],
        };
      }));
    } catch (error) {
      const errorMessage =
        error instanceof NetworkError
          ? "Unable to connect to the server — the API appears to be down."
          : error instanceof ApiError
          ? error.message || `Server error (${error.status})`
          : error instanceof Error
          ? error.message
          : "Health check failed";

      setLimitError(errorMessage);

      updateUrls((current) => current.map((u) => ({
        ...u,
        status: "offline",
        lastChecked: new Date(),
        error: errorMessage,
      })));
    } finally {
      const remainingTime = Math.max(0, 350 - (Date.now() - startedAt));
      window.setTimeout(() => {
        setIsChecking(false);
        setIsTakingLonger(false);
      }, remainingTime);
    }
  }, [checkUrlsHealth, updateUrls, urls]);

  useEffect(() => {
    if (!isChecking) return;

    const timer = window.setTimeout(() => setIsTakingLonger(true), 2000);
    return () => window.clearTimeout(timer);
  }, [isChecking]);

  const addUrl = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const validUrl = normalizeWebUrl(trimmed);
    if (!validUrl) {
      setLimitError("Please enter a valid URL (e.g. example.com).");
      return;
    }
    addMonitoredUrl(validUrl);
    setInput("");
    setLimitError(null);
  };

  const online = urls.filter((u) => u.status === "online").length;
  const offline = urls.filter((u) => u.status === "offline").length;
  const checked = urls.filter((u) => u.latency !== null);
  const avgLatency = checked.length ? Math.round(checked.reduce((a, b) => a + (b.latency ?? 0), 0) / checked.length) : null;
  const uptimePct = urls.length > 0 ? Math.round((online / urls.length) * 100) : 0;

  return (
    <div>
      {/* Telemetry Stats */}
      <div className="stats-grid-responsive">
        {/* Card 1: Online */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Online</span>
            <span className="stat-card-badge" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}>
              <span className="live-beacon-dot" /> Live
            </span>
          </div>
          <div className="stat-card-value" style={{ color: "#059669" }}>
            <AnimatedNumber value={online} />
          </div>
          <p className="stat-card-subtext">
            {urls.length > 0 ? (
              <>
                <AnimatedNumber value={uptimePct} />% operational
              </>
            ) : (
              "No URLs tracked"
            )}
          </p>
        </div>

        {/* Card 2: Offline */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Offline</span>
            {offline > 0 ? (
              <span className="stat-card-badge" style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>
                <span className="alert-beacon-dot" /> Issue
              </span>
            ) : (
              <span className="stat-card-badge" style={{ background: "#f4f4f5", color: "#71717a", border: "1px solid #e4e4e7" }}>
                All Clear
              </span>
            )}
          </div>
          <div className="stat-card-value" style={{ color: offline > 0 ? "#dc2626" : "#111111" }}>
            <AnimatedNumber value={offline} />
          </div>
          <p className="stat-card-subtext">
            {offline === 0
              ? "All endpoints reachable"
              : `${offline} unreachable endpoint${offline > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Card 3: Avg Latency */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Avg Latency</span>
            <span
              className="stat-card-badge"
              style={{
                background:
                  avgLatency === null
                    ? "#f4f4f5"
                    : avgLatency < 500
                    ? "#ecfdf5"
                    : avgLatency < 1500
                    ? "#fefce8"
                    : "#fef2f2",
                color:
                  avgLatency === null
                    ? "#71717a"
                    : avgLatency < 500
                    ? "#065f46"
                    : avgLatency < 1500
                    ? "#854d0e"
                    : "#991b1b",
                border:
                  avgLatency === null
                    ? "1px solid #e4e4e7"
                    : avgLatency < 500
                    ? "1px solid #a7f3d0"
                    : avgLatency < 1500
                    ? "1px solid #fef08a"
                    : "1px solid #fecaca",
              }}
            >
              {avgLatency === null
                ? "Pending"
                : avgLatency < 500
                ? "Optimal"
                : avgLatency < 1500
                ? "Acceptable"
                : "High Latency"}
            </span>
          </div>
          <div className="stat-card-value" style={{ color: "#111111" }}>
            {avgLatency === null ? (
              "—"
            ) : (
              <>
                <AnimatedNumber value={avgLatency} />
                <span className="stat-card-unit">ms</span>
              </>
            )}
          </div>
          <p className="stat-card-subtext">
            {avgLatency === null
              ? "Awaiting health check"
              : `Across ${checked.length} response${checked.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Add row */}
      <div className="form-row-responsive" style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "40px" }}>
        <div style={{ flex: 1 }}>
          <Input value={input} onChange={setInput} onKeyDown={(e) => e.key === "Enter" && addUrl()} placeholder="https://url-to-monitor.com" />
        </div>
        <Button onClick={addUrl} variant="ghost">Add</Button>
        <Button onClick={checkAll} disabled={isChecking || urls.length === 0}>Check All</Button>
      </div>

      {limitError && (
        <p style={{ marginTop: "-24px", marginBottom: "32px", color: "#cc0000", fontFamily: "DM Sans, sans-serif", fontSize: "14px" }}>
          {limitError}
        </p>
      )}

      {isChecking && (
        <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "32px", padding: "18px 0", borderTop: "1px solid #eeeeee", borderBottom: "1px solid #eeeeee" }}>
          <div style={{ width: "64px", height: "64px", flexShrink: 0 }}>
            <DotLottieReact src="/animations/loading.lottie" loop autoplay />
          </div>
          <div>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px", color: "#111111" }}>
              {isTakingLonger ? "Still checking your URLs..." : "Checking your URLs..."}
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
              {urls.length} URL{urls.length === 1 ? "" : "s"} in this check
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="dashboard-table-container">
        <div className="dashboard-table-inner">
          <div className="dashboard-table-header">
            <span>URL</span>
            <span>Status</span>
            <span>Latency</span>
            <span className="dashboard-col-checked">Checked</span>
            <span className="dashboard-col-history">History</span>
            <span />
          </div>

        {urls.length === 0 && (
          <p style={{ padding: "40px 0", fontSize: "15px", color: "#c0c0c0", fontFamily: "DM Sans, sans-serif" }}>No URLs added yet.</p>
        )}

        {urls.map((u) => (
          <div key={u.id} className="dashboard-table-row">
            <div className="dashboard-cell-url" style={{ minWidth: 0 }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "14px", color: "#111111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.url}
              </p>
              {u.error && <p style={{ fontSize: "12px", color: "#cc0000", marginTop: "3px", fontFamily: "DM Sans, sans-serif" }}>{u.error}</p>}
            </div>

            <div className="dashboard-row-meta">
              <StatusLabel status={u.status} />

              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", whiteSpace: "nowrap", color: u.latency === null ? "#c0c0c0" : u.latency < 500 ? "#008800" : u.latency < 1500 ? "#b85c00" : "#cc0000" }}>
                {formatMs(u.latency)}
              </span>
            </div>

            <span className="dashboard-col-checked" style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", color: "#c0c0c0", whiteSpace: "nowrap" }}>
              {formatTime(u.lastChecked)}
            </span>

            <div className="dashboard-col-history" style={{ minWidth: 0 }}>
              <Sparkbar history={u.history} />
            </div>

            <div className="dashboard-cell-actions" style={{ display: "flex", gap: "4px", justifyContent: "flex-end", flexShrink: 0 }}>
              <button
                onClick={() => checkOne(u.id, u.url)}
                title="Refresh"
                style={{ width: "24px", height: "24px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8c8c8", transition: "color 100ms", flexShrink: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c8c8c8")}
              >
                <Image src="icons/refresh.svg" alt="" width={15} height={15} />
              </button>
              <button
                onClick={() => removeUrl(u.id)}
                title="Remove"
                style={{ width: "24px", height: "24px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8c8c8", transition: "color 100ms", flexShrink: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#cc0000")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c8c8c8")}
              >
                <Image src="icons/close.svg" alt="" width={15} height={15} />
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}