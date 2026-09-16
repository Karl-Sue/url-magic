"use client"

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { MonitoredUrl } from "@/types/response";
import { Input, Button } from "@/components"
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { SPARKBAR_SLOTS, STATUS_LABELS } from "@/libs/constants";
import { useMonitoredUrls } from "@/hooks/useMonitoredUrls";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false },
);

{/* History URL check spark bar*/}
function Sparkbar({ history }: { history: MonitoredUrl["history"] }) {
  const filled = history.slice(-SPARKBAR_SLOTS);
  const empty = SPARKBAR_SLOTS - filled.length;
    const max = Math.max(...filled.map((h) => h.latency ?? 0), 1);
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "24px" }}>
            {Array.from({ length: empty }).map((_, i) => (
            <div key={`e${i}`} style={{ width: "7px", height: "4px", background: "#f0f0f0" }} />
            ))}
            {filled.map((h, i) => (
                <div
                    key={i}
                    style={{
                    width: "7px",
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
      updateUrls((current) =>
        current.map((u) => u.id === id
          ? { ...u, status: "offline", lastChecked: new Date(), error: error instanceof Error ? error.message : "Health check failed" }
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
      updateUrls((current) => current.map((u) => ({
        ...u,
        status: "offline",
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Health check failed",
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
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      addMonitoredUrl(url.href);
      setInput("");
    } catch { /* noop */ }
  };

  const online = urls.filter((u) => u.status === "online").length;
  const offline = urls.filter((u) => u.status === "offline").length;
  const checked = urls.filter((u) => u.latency !== null);
  const avgLatency = checked.length ? Math.round(checked.reduce((a, b) => a + (b.latency ?? 0), 0) / checked.length) : null;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#d8d8d8", border: "1px solid #d8d8d8", marginBottom: "56px" }}>
        {[
          { label: "Online",      value: online,               color: "#008800" },
          { label: "Offline",     value: offline,              color: "#cc0000" },
          { label: "Avg Latency", value: formatMs(avgLatency), color: "#111111" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#ffffff", padding: "32px", textAlign: "center" }}>
            <p style={{ fontSize: "40px", fontWeight: 600, fontFamily: "DM Sans, sans-serif", color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#b0b0b0", marginTop: "10px", fontFamily: "DM Sans, sans-serif" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "40px" }}>
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
      <div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 100px 140px 160px 48px",
          gap: "20px",
          padding: "10px 0",
          borderBottom: "1.5px solid #111111",
          fontSize: "12px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#b0b0b0",
          fontFamily: "DM Sans, sans-serif",
        }}>
          <span>URL</span>
          <span>Status</span>
          <span>Latency</span>
          <span>Checked</span>
          <span>History</span>
          <span />
        </div>

        {urls.length === 0 && (
          <p style={{ padding: "40px 0", fontSize: "15px", color: "#c0c0c0", fontFamily: "DM Sans, sans-serif" }}>No URLs added yet.</p>
        )}

        {urls.map((u) => (
          <div
            key={u.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 100px 140px 160px 48px",
              gap: "20px",
              padding: "18px 0",
              borderBottom: "1px solid #f2f2f2",
              alignItems: "center",
              transition: "background 100ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "14px", color: "#111111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.url}
              </p>
              {u.error && <p style={{ fontSize: "12px", color: "#cc0000", marginTop: "3px", fontFamily: "DM Sans, sans-serif" }}>{u.error}</p>}
            </div>

            <StatusLabel status={u.status} />

            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "14px", color: u.latency === null ? "#c0c0c0" : u.latency < 500 ? "#008800" : u.latency < 1500 ? "#b85c00" : "#cc0000" }}>
              {formatMs(u.latency)}
            </span>

            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", color: "#c0c0c0" }}>
              {formatTime(u.lastChecked)}
            </span>

            <Sparkbar history={u.history} />

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => checkOne(u.id, u.url)}
                title="Refresh"
                style={{ width: "32px", height: "32px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8c8c8", transition: "color 100ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c8c8c8")}
              >
                <Image src="/refresh.svg" alt="" width={15} height={15} />
              </button>
              <button
                onClick={() => removeUrl(u.id)}
                title="Remove"
                style={{ width: "32px", height: "32px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8c8c8", transition: "color 100ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#cc0000")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c8c8c8")}
              >
                <Image src="/close.svg" alt="" width={15} height={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}