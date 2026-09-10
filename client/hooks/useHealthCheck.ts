import { useCallback } from "react";
import { HealthCheckResponse, URLHealthStatus } from "@/types/response";
import { API_BASE_URL } from "@/libs/constants";

export function useHealthCheck() {
  const checkUrlsHealth = useCallback(
    async (urls: string[]): Promise<URLHealthStatus[]> => {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) {
        throw new Error("Failed to check URL health");
      }

      const result = (await response.json()) as HealthCheckResponse;
      return result.results;
    },
    [],
  );

  return { checkUrlsHealth };
}

