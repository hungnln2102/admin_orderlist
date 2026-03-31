import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
import type { SiteMaintenanceStatus } from "../types";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const redirectToLogin = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const normalizeSiteMaintenanceStatus = (
  value: unknown
): SiteMaintenanceStatus => {
  const item = (value ?? {}) as Record<string, unknown>;
  const enabled = Boolean(item.enabled);

  return {
    enabled,
    value: enabled ? "on" : "off",
    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : item.updatedAt == null
          ? null
          : String(item.updatedAt),
  };
};

const readErrorMessage = async (response: Response) => {
  const fallback = `Yêu cầu thất bại (${response.status}).`;

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

async function parseResponse<T>(
  response: Response,
  transform: (value: unknown) => T
): Promise<T> {
  if (response.status === 401) {
    redirectToLogin();
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as unknown;
  return transform(payload);
}

export async function fetchSiteMaintenanceStatus(): Promise<SiteMaintenanceStatus> {
  const response = await apiFetch(API_ENDPOINTS.SITE_MAINTENANCE);
  return parseResponse(response, normalizeSiteMaintenanceStatus);
}

export async function updateSiteMaintenanceStatus(
  enabled: boolean
): Promise<SiteMaintenanceStatus> {
  const response = await apiFetch(API_ENDPOINTS.SITE_MAINTENANCE, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });

  return parseResponse(response, normalizeSiteMaintenanceStatus);
}
