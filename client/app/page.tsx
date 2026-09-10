"use client"

import { useState } from "react";
import { QRTab, ShortenerTab, DashboardTab } from "@/components";
import { useClient } from "@/hooks/useClient";

type Tab = "shorten" | "qr" | "dashboard";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "shorten",   label: "Shorten",   description: "Generate short links" },
  { id: "qr",        label: "QR Code",   description: "Create QR images"     },
  { id: "dashboard", label: "Dashboard", description: "Monitor URL health"   },
];

const TAB_TITLES: Record<Tab, { heading: string; sub: string }> = {
  shorten:   { heading: "URL Shortener",  sub: "Paste a long URL and get a short one."          },
  qr:        { heading: "QR Generator",   sub: "Create a scannable QR code for any URL."        },
  dashboard: { heading: "Health Monitor", sub: "Track latency and uptime for this session."      },
};

export default function HomePage() {
  const { ready, error } = useClient();
  const [tab, setTab] = useState<Tab>("shorten");
  const { heading, sub } = TAB_TITLES[tab];

  if (error) throw error;
  if (!ready) return null;

  return (
    <div style={{ display: "flex", minHeight: "100%", background: "#ffffff" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: "312px",
        flexShrink: 0,
        borderRight: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        {/* Wordmark */}
        <div className="page-top wordmark">
          <h1 className="heading"> Url Magic </h1>
          <span className="tagline"> less url, more life </span>
        </div>

        {/* Nav */}
        <nav style={{ padding: "24px 19px", flex: 1 }}>
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "14px 17px",
                background: tab === t.id ? "#f5f5f5" : "transparent",
                border: "none",
                borderLeft: tab === t.id ? "2px solid #111111" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 100ms",
                marginBottom: "5px",
              }}
              onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.background = "#fafafa"; }}
              onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ display: "block", fontSize: "18px", fontFamily: "DM Sans, sans-serif", fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? "#111111" : "#555555" }}>
                {t.label}
              </span>
              <span style={{ display: "block", fontSize: "14px", fontFamily: "DM Sans, sans-serif", color: "#b8b8b8", marginTop: "2px" }}>
                {t.description}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Page header */}
        <div className="page-top page-header">
          <h1 className="heading"> {heading} </h1>
          <p className="tagline"> {sub} </p>
        </div>

        {/* Content */}
        <main style={{ padding: "62px 67px 115px" }}>
          {tab === "shorten"   && <ShortenerTab />}
          {tab === "qr" && <QRTab />}
          {tab === "dashboard" && <DashboardTab />}
        </main>
      </div>
    </div>
  );
}
