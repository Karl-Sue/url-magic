"use client"

import Image from "next/image";
import { useEffect, useState } from "react";
import { Input, Button, LoadingStatus } from '@/components';
import { useQR } from "@/hooks/useQR";
import { ApiError, NetworkError } from "@/libs/errors";
import { normalizeWebUrl } from "@/libs/url";

export function QRTab() {
  const [input, setInput] = useState("");
  const [size, setSize] = useState(240);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const { generateQr } = useQR();

  useEffect(() => () => {
    if (qrSrc) URL.revokeObjectURL(qrSrc);
  }, [qrSrc]);

  const handleGenerateQr = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    // 1. Client-side URL validation
    const validUrl = normalizeWebUrl(trimmed);
    if (!validUrl) {
      setError("Please enter a valid URL (e.g. example.com).");
      return;
    }

    const startedAt = Date.now();
    setIsGenerating(true);
    setError("");

    try {
      const nextQrSrc = await generateQr(validUrl, Math.max(1, Math.round(size / 22)));
      if (qrSrc) URL.revokeObjectURL(qrSrc);
      setQrSrc(nextQrSrc);
    } catch (requestError) {
      if (requestError instanceof NetworkError) {
        setError(requestError.message || "Unable to connect to the server — the API appears to be down.");
      } else if (requestError instanceof ApiError) {
        setError(requestError.message || `Server returned an error (${requestError.status}).`);
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Unable to generate the QR code.");
      }
    } finally {
      const remainingTime = Math.max(0, 350 - (Date.now() - startedAt));
      window.setTimeout(() => setIsGenerating(false), remainingTime);
    }
  };

  const handleDownload = () => {
    if (!qrSrc) return;
    const link = document.createElement("a");
    link.href = qrSrc;
    link.download = `catbite-qr-${size}px.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = async () => {
    if (!qrSrc) return;
    try {
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || "image/png"]: blob })
      ]);
      setCopiedImage(true);
      window.setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      // Fallback if ClipboardItem write is unsupported
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInput(text.trim());
        setError("");
      }
    } catch {
      // Permission denied or unsupported
    }
  };

  return (
    <div className="qr-studio-layout">
      {/* ── Left Column: Open Studio Controls ── */}
      <div className="qr-studio-controls">
        {/* Studio Subheader (hidden on screens < 1024px) */}
        <div className="qr-studio-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: 700, margin: 0, color: "#111111" }}>
              QR Code Generator
            </h2>
            <span className="qr-studio-badge">
              Studio Canvas
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#666666", margin: 0 }}>
            Create pixel-perfect, scannable QR codes for any destination link.
          </p>
        </div>

        {/* Destination URL */}
        <div className="qr-studio-section">
          <div className="qr-studio-label-row">
            <label className="qr-studio-label">Destination URL</label>
            <button
              type="button"
              onClick={handlePaste}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#888888",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                transition: "color 120ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}
            >
              Paste Link
            </button>
          </div>

          <Input
            value={input}
            onChange={(value) => {
              setInput(value);
              setError("");
            }}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === "Enter" && handleGenerateQr()}
          />
        </div>

        {/* Resolution & Scale */}
        <div className="qr-studio-section">
          <div className="qr-studio-label-row">
            <label className="qr-studio-label">Resolution & Scale</label>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#111111",
              }}
            >
              {size} × {size} px
            </span>
          </div>

          {/* Quick Preset Chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { label: "Compact", px: 160 },
              { label: "Standard", px: 240 },
              { label: "High-Res", px: 320 },
              { label: "Ultra", px: 400 },
            ].map((p) => (
              <button
                key={p.px}
                type="button"
                onClick={() => setSize(p.px)}
                className={`qr-preset-pill ${size === p.px ? "qr-preset-pill--active" : ""}`}
              >
                {p.px}px · {p.label}
              </button>
            ))}
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min={120}
            max={400}
            step={8}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
            className="qr-range-slider"
          />
        </div>

        {/* Generate Button */}
        <div className="qr-studio-section">
          <Button
            variant="primary"
            onClick={handleGenerateQr}
            disabled={isGenerating || !input.trim()}
            style={{
              width: "100%",
              padding: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {isGenerating ? "Drawing QR Code..." : "Generate QR Code →"}
          </Button>

          {error && (
            <p style={{ color: "#cc0000", fontFamily: "var(--font-sans)", fontSize: "13px", margin: "4px 0 0" }}>
              {error}
            </p>
          )}

          {isGenerating && (
            <div style={{ marginTop: "12px" }}>
              <LoadingStatus label="Generating your QR code" detail="Rendering vector grid and high-precision modules." />
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Floating Canvas Pedestal & Toolbar ── */}
      <div className="qr-studio-preview-pane">
        <div className="qr-canvas-pedestal">
          {/* Subtle architectural corner reticles */}
          <span className="qr-canvas-corner qr-canvas-corner--tl" />
          <span className="qr-canvas-corner qr-canvas-corner--tr" />
          <span className="qr-canvas-corner qr-canvas-corner--bl" />
          <span className="qr-canvas-corner qr-canvas-corner--br" />

          {qrSrc ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src={qrSrc}
                alt="Generated QR code"
                width={size}
                height={size}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  display: "block",
                  transition: "width 180ms ease, height 180ms ease",
                }}
                unoptimized
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#f4f4f5",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: "16px",
                }}
              >
                <Image src="icons/qr.svg" alt="" width={26} height={26} style={{ opacity: 0.35 }} />
              </div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#333333",
                  margin: "0 0 6px",
                }}
              >
                No Pawprints Stamp Yet
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "#888888",
                  margin: 0,
                  maxWidth: "240px",
                  lineHeight: 1.45,
                }}
              >
                Drop a URL above and hit generate to stamp out your scannable code
              </p>
            </div>
          )}
        </div>

        {/* Floating Actions Toolbar */}
        {qrSrc ? (
          <div className="qr-actions-toolbar">
            <div className="qr-toolbar-meta">
              <span className="qr-meta-specs">{size} × {size} PX · Lossless PNG</span>
              <span className="qr-meta-status">
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Ready to Export
              </span>
            </div>

            <div className="qr-toolbar-buttons">
              <Button variant="primary" onClick={handleDownload} style={{ padding: "12px 14px", fontSize: "13px" }}>
                Download PNG
              </Button>
              <Button variant="ghost" onClick={handleCopyImage} style={{ padding: "12px 14px", fontSize: "13px" }}>
                {copiedImage ? "✓ Copied!" : "Copy Image"}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4px 0" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#a1a1aa", margin: 0 }}>
              Output Target: {size} × {size} PX · Lossless PNG
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
