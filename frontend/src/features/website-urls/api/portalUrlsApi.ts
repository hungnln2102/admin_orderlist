import { apiEndpoints } from "@/shared/api/apiEndpoints";
import type { PortalUrlsConfig, PortalUrlsResponse } from "../types";

export async function fetchPortalUrlsConfig(): Promise<PortalUrlsResponse> {
  const res = await fetch(apiEndpoints.portalUrls);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Không thể tải cấu hình URL website.");
  }
  return data as PortalUrlsResponse;
}

export async function savePortalUrlsConfig(payload: {
  defaultRouteKey: PortalUrlsConfig["defaultRouteKey"];
  routes: Record<string, { slug: string }>;
}): Promise<PortalUrlsConfig> {
  const res = await fetch(apiEndpoints.portalUrls, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Không thể lưu cấu hình URL website.");
  }
  return data.config as PortalUrlsConfig;
}

export async function resetPortalUrlsConfig(): Promise<PortalUrlsConfig> {
  const res = await fetch(apiEndpoints.portalUrlsReset, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Không thể khôi phục cấu hình URL mặc định.");
  }
  return data.config as PortalUrlsConfig;
}
