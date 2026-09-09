"use client"

import { useState } from 'react';
import { Input, Button } from '@/components';

export function QRTab() {
  const [input, setInput] = useState("");
  const [size, setSize] = useState(220);

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
                <Input value={input} onChange={setInput} placeholder="https://example.com"/>
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

            <Button variant="ghost">Generate QR code</Button>
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
        Your QR code will appear here
        </div>
    </div>
  );
}
