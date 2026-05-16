import { API_BASE_URL } from "../../config/env";
import type { HealthResponse } from "./types";

const DEFAULT_HEADERS = {
  Accept: "application/json",
};

function buildUrl(path: string): string {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(buildUrl("/api/health"), {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
