import { useCallback } from "react";
import { HealthCheckResponse, URLHealthStatus } from "@/types/response";
import { API_BASE_URL } from "@/libs/constants";
import { ApiError, NetworkError } from "@/libs/errors";

export function useHealthCheck() {
  const checkUrlsHealth = useCallback(
    async (urls: string[]): Promise<URLHealthStatus[]> => {
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ urls }),
        });
      } catch {
        throw new NetworkError("Unable to connect to the server — the API appears to be down.");
      }

      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new NetworkError("Unable to connect to the server — the API appears to be down.");
        }

        let message = "Failed to check URL health";
        try {
          const body = await response.json();
          if (typeof body?.detail === "string") {
            message = body.detail;
          } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
            message = body.detail[0].msg;
          }
        } catch {
          message = response.statusText || `Server error (${response.status})`;
        }
        throw new ApiError(response.status, message);
      }

      const result = (await response.json()) as HealthCheckResponse;
      return result.results;
    },
    [],
  );

  return { checkUrlsHealth };
}

