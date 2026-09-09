"use client";

import { useEffect, useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  
  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: "6px 14px",
        fontSize: "12px",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 500,
        border: "1px solid #e8e8e8",
        background: copied ? "#111111" : "transparent",
        color: copied ? "#ffffff" : "#999999",
        cursor: "pointer",
        transition: "all 120ms",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}