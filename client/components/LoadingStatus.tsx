"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false },
);

interface LoadingStatusProps {
  label: string;
  detail: string;
}

export function LoadingStatus({ label, detail }: LoadingStatusProps) {
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsTakingLonger(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "18px",
        marginTop: "-24px",
        marginBottom: "32px",
        padding: "18px 0",
        borderTop: "1px solid #eeeeee",
        borderBottom: "1px solid #eeeeee",
      }}
    >
      <div style={{ width: "64px", height: "64px", flexShrink: 0 }}>
        <DotLottieReact src="/animations/loading.lottie" loop autoplay />
      </div>
      <div>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px", color: "#111111" }}>
          {isTakingLonger ? `Still ${label.toLowerCase()}...` : `${label}...`}
        </p>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "#999999", marginTop: "4px" }}>
          {detail}
        </p>
      </div>
    </div>
  );
}
