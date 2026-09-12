"use client";

import dynamic from "next/dynamic";

// Dynamically import DotLottieReact with SSR disabled
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false }
);

interface ErrorProps {
  error: Error & { digest?: string; statusCode?: number };
  reset: () => void;
}

export default function ErrorPage({ error }: ErrorProps) {

  return (
    <main className="error-page min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center flex flex-col items-center">
        
        {/* Animated Vector Illustration */}
        <div className="w-80 h-80 sm:w-96 sm:h-96 mb-6 flex items-center justify-center">
          <DotLottieReact
            src="/animations/error.lottie"
            loop
            autoplay
            style={{ transform: "scale(1.15)" }}
          />
        </div>

        {/* Main Heading & Copy */}
        <h1 className="heading mb-2">
          I thought I'd fit ...
        </h1>
        <p className="text mb-8">
          {error.message || "Something went wrong while connecting to Url Magic."}
        </p>

        {/* Action Controls */}
        <div className="w-full flex justify-center">
          <a
            href="/"
            className="button button--primary w-full sm:w-auto"
          >
            Back to Home
          </a>
        </div>

        {/* Incident Digest */}
        {error.digest && (
          <p className="mt-8 text-xs font-mono text-neutral-600">
            Incident ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}