"use client"

import { useEffect, useState } from "react";
import { Input, Button, CopyButton } from "@/components";
import { useShortenUrl } from "@/hooks/useShortenUrl";
import { ShortLink } from "@/types/response";

export function ShortenerTab() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [links, setLinks] = useState<ShortLink[]>([]);
  const { shortenUrl, loadStoredLinks } = useShortenUrl();

  useEffect(() => {
    setLinks(loadStoredLinks());
  }, [loadStoredLinks]);

  const shorten = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
        const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        const result = await shortenUrl(url.href);
        setLinks((prev) => [
          result,
        ...prev,
        ]);
        setInput("");
        setError("");
    } catch {
      setError("Enter a valid URL or check that the API is running.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "56px" }}>
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
        <Button onClick={shorten}>Shorten</Button>
      </div>

      {links.length > 0 && (
        <div>
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
                <span style={{ fontSize: "13px", color: "#d8d8d8", fontFamily: "DM Mono, monospace" }}>{new Date(link.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <CopyButton text={link.shortURL} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}