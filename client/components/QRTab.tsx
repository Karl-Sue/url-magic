"use client"

import Image from "next/image";
import { useEffect, useState } from "react";
import { Input, Button, LoadingStatus } from '@/components';
import { API_BASE_URL } from '@/libs/constants';

export function QRTab() {
    const [input, setInput] = useState("");
    const [size, setSize] = useState(220);
    const [qrSrc, setQrSrc] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => () => {
        if (qrSrc) URL.revokeObjectURL(qrSrc);
    }, [qrSrc]);

    const generateQr = async () => {
        const trimmed = input.trim();
        if (!trimmed || isGenerating) return;

        const startedAt = Date.now();
        setIsGenerating(true);
        setError("");

        try {
            const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
            const response = await fetch(`${API_BASE_URL}/qr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    url: url.href,
                    box_size: Math.max(1, Math.round(size / 22)),
                }),
            });

            if (!response.ok) throw new Error("Failed to generate QR code");
            const nextQrSrc = URL.createObjectURL(await response.blob());
            setQrSrc(nextQrSrc);
        } catch {
            setError("Enter a valid URL or check that the API is running.");
        } finally {
            const remainingTime = Math.max(0, 350 - (Date.now() - startedAt));
            window.setTimeout(() => setIsGenerating(false), remainingTime);
        }
    };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "72px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "44px" }}>
            <div>
                <label 
                    style={{ 
                        display: "block", 
                        fontSize: "12px", 
                        letterSpacing: "0.08em", 
                        textTransform: "uppercase", 
                        color: "#b0b0b0", 
                        marginBottom: "10px", 
                        fontFamily: "DM Sans, sans-serif" 
                    }}
                > 
                    URL 
                </label>
                <Input value={input} onChange={(value) => { setInput(value); setError(""); }} placeholder="https://example.com"/>
            </div>

            <div>
                <label style={{ display: "block", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#b0b0b0", marginBottom: "14px", fontFamily: "DM Sans, sans-serif" }}>
                    Size — {size}px
                </label>
                <input
                    type="range" min={120} max={400} step={8} value={size}
                    onChange={(e) => setSize(+e.target.value)}
                    style={{ width: "100%", accentColor: "#111111" }}
                />
            </div>

            <Button variant="ghost" onClick={generateQr} disabled={isGenerating || !input.trim()}>
                {isGenerating ? "Working..." : "Generate QR code"}
            </Button>
            {error && <p style={{ color: "#cc0000", fontFamily: "DM Sans, sans-serif", fontSize: "13px" }}>{error}</p>}
            {isGenerating && <LoadingStatus label="Generating your QR code" detail="The server is drawing your code." />}
        </div>

        <div
        style={{
            width: size,
            height: size,
            border: "1px solid #e8e8e8",
            display: "grid",
            placeItems: "center",
            padding: size * 0.08,
            boxSizing: "border-box",
            textAlign: "center",
            fontFamily: '"DM Mono", monospace',
            fontSize: `${Math.max(10, Math.round(size / 18))}px`,
            lineHeight: 1.4,
            color: "#999999",
        }}
        >
            {qrSrc ? (
                <Image src={qrSrc} alt="Generated QR code" width={size} height={size} unoptimized />
            ) : (
                "Your QR code will appear here"
            )}
        </div>
    </div>
  );
}
