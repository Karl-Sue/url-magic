"use client"

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Input, Button, CopyButton, LoadingStatus } from "@/components";
import { getStoredLinks, useShortenUrl } from "@/hooks/useShortenUrl";
import { ApiError, NetworkError } from "@/libs/errors";
import { normalizeWebUrl } from "@/libs/url";
import { ShortLink } from "@/types/response";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false },
);

/* ── Fade wrapper ──────────────────────────────────────── */
function FadeSection({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 350ms ease, transform 350ms ease",
        pointerEvents: visible ? "auto" : "none",
        position: visible ? "relative" : "absolute",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        paddingTop: "8px",
        paddingBottom: "24px",
        userSelect: "none",
      }}
    >
      <DotLottieReact
        src="/animations/sleeping.lottie"
        loop
        autoplay
        style={{
          width: "clamp(480px, 28vh, 320px)",
          height: "clamp(217px, 28vh, 320px)",
        }}
      />
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "22px",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          color: "#111111",
          margin: "8px 0 6px",
        }}
      >
        Starving for links.
      </p>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          color: "#a0a0a0",
          lineHeight: 1.6,
          maxWidth: "420px",
          margin: 0,
        }}
      >
        The cat is currently empty and snoozing. Feed it an oversized URL above to wake it up and start your list.
      </p>
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */
export function ShortenerTab() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isShortening, setIsShortening] = useState(false);
  const [links, setLinks] = useState<ShortLink[]>(getStoredLinks);
  const { shortenUrl } = useShortenUrl();

  const shorten = async () => {
    const trimmed = input.trim();
    if (!trimmed || isShortening) return;

    // 1. Client-side URL validation
    const validUrl = normalizeWebUrl(trimmed);
    if (!validUrl) {
      setError("Please enter a valid URL (e.g. example.com).");
      return;
    }

    const startedAt = Date.now();
    setIsShortening(true);
    try {
      const result = await shortenUrl(validUrl);
      setLinks((prev) => [result, ...prev]);
      setInput("");
      setError("");
    } catch (err) {
      if (err instanceof NetworkError) {
        setError(err.message || "Unable to connect to the server — the API appears to be down.");
      } else if (err instanceof ApiError) {
        setError(err.message || `Server returned an error (${err.status}).`);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      const remainingTime = Math.max(0, 350 - (Date.now() - startedAt));
      window.setTimeout(() => setIsShortening(false), remainingTime);
    }
  };

  const hasLinks = links.length > 0;

  return (
    <div>
      {/* Input row */}
      <div className="form-row-responsive" style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "56px" }}>
        <div style={{ flex: 1 }}>
          <Input
            value={input}
            onChange={(v) => { setInput(v); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && shorten()}
            placeholder="https://your-long-url.com/path/to/page"
            autoFocus
          />
          {error && (
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#cc0000", fontFamily: "DM Sans, sans-serif" }}>
              {error}
            </p>
          )}
        </div>
        <Button onClick={shorten} disabled={isShortening || !input.trim()}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Image
              src="/paw-print.svg"
              alt="paw print"
              width={16}
              height={16}
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <span>{isShortening ? "Working..." : "Shorten"}</span>
          </span>
        </Button>
      </div>

      {isShortening && (
        <LoadingStatus label="Shortening your URL" detail="The server is preparing your link." />
      )}

      {/* Relative container keeps both panels in flow without layout shift */}
      <div style={{ position: "relative" }}>

        {/* ── Empty state (sleeping cat) ── */}
        <FadeSection visible={!hasLinks}>
          <EmptyState />
        </FadeSection>

        {/* ── Links dashboard ── */}
        <FadeSection visible={hasLinks}>
          <p style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#b0b0b0", marginBottom: "20px", fontFamily: "DM Sans, sans-serif" }}>
            Links — {links.length}
          </p>
          {links.map((link) => (
            <div
              key={link.shortCode}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "32px",
                padding: "22px 0",
                borderBottom: "1px solid #f2f2f2",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "15px", color: "#111111", marginBottom: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {link.shortURL}
                </p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", color: "#b8b8b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {link.originalURL}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", color: "#d8d8d8", fontFamily: "DM Mono, monospace" }}>
                  {new Date(link.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <CopyButton text={link.shortURL} />
              </div>
            </div>
          ))}
        </FadeSection>

      </div>
    </div>
  );
}