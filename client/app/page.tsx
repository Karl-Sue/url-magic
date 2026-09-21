"use client"

import Image from "next/image";
import { useState } from "react";
import { QRTab, ShortenerTab, DashboardTab } from "@/components";
import { useClient } from "@/hooks/useClient";

type Tab = "shorten" | "qr" | "dashboard";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "shorten", label: "Shorten", description: "Generate short links" },
  { id: "qr", label: "QR Code", description: "Create QR images" },
  { id: "dashboard", label: "Dashboard", description: "Monitor URL health" },
];

const TAB_TITLES: Record<Tab, { heading: string; sub: string }> = {
  shorten: { heading: "URL Shortener", sub: "Paste a long URL and get a short one." },
  qr: { heading: "QR Generator", sub: "Create a scannable QR code for any URL." },
  dashboard: { heading: "Health Monitor", sub: "Track latency and uptime for this session." },
};

const TAB_ICONS: Record<Tab, { src: string; alt: string }> = {
  shorten: { src: "/link.svg", alt: "Shorten" },
  qr: { src: "/qr.svg", alt: "QR Code" },
  dashboard: { src: "/activity.svg", alt: "Dashboard" },
};

function TabIcon({ id }: { id: Tab }) {
  const icon = TAB_ICONS[id];
  return (
    <Image src={icon.src} alt={icon.alt} width={20} height={20} />
  );
}

export default function HomePage() {
  const { ready, error } = useClient();
  const [tab, setTab] = useState<Tab>("shorten");
  const { heading, sub } = TAB_TITLES[tab];

  if (error) throw error;
  if (!ready) return null;

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        {/* Wordmark */}
        <div className="page-top wordmark">
          <h1 className="heading"> Url Magic </h1>
          <span className="tagline"> less url, more life </span>
        </div>

        {/* Desktop Nav */}
        <nav className="app-nav">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`nav-item ${tab === t.id ? "nav-item--active" : ""}`}
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
              <span style={{ display: "block", fontSize: "16px", fontFamily: "DM Sans, sans-serif", fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? "#111111" : "#555555" }}>
                {t.label}
              </span>
              <span className="nav-desc" style={{ display: "block", fontSize: "14px", fontFamily: "DM Sans, sans-serif", color: "#b8b8b8", marginTop: "2px" }}>
                {t.description}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="app-main">
        {/* Page header */}
        <div className="page-top page-header">
          <h1 className="heading"> {heading} </h1>
          <p className="tagline"> {sub} </p>
        </div>

        {/* Content */}
        <main className="app-content">
          <section hidden={tab !== "shorten"}>
            <ShortenerTab />
          </section>
          <section hidden={tab !== "qr"}>
            <QRTab />
          </section>
          <section hidden={tab !== "dashboard"}>
            <DashboardTab />
          </section>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`mobile-nav-btn ${isActive ? "mobile-nav-btn--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="mobile-nav-icon">
                <TabIcon id={t.id} />
              </div>
              <span className="mobile-nav-label">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
