"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { status?: number };
  reset: () => void;
}) {
  const isServerError = error.status !== undefined && error.status >= 500;

  return (
    <main style={{ padding: "64px", fontFamily: "DM Sans, sans-serif" }}>
      <h1 className="heading">{isServerError ? "500 - Internal Server Error" : "Unable to connect"}</h1>
      <p className="subtext">{isServerError ? "The server could not complete the request." : "The server is unreachable. Check that the API is running and try again."}</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}