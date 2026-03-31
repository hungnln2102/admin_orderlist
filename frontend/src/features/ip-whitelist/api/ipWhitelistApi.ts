import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
import type { IpWhitelistItem, IpWhitelistPayload } from "../types";

type IpWhitelistListResponse = {
  items?: unknown[];
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const redirectToLogin = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const normalizeIpWhitelistItem = (value: unknown): IpWhitelistItem => {
  const item = (value ?? {}) as Record<string, unknown>;

  return {
    id: Number(item.id ?? 0),
    ipAddress: String(item.ipAddress ?? ""),
    description:
      typeof item.description === "string" ? item.description : item.description == null ? null : String(item.description),
    isActive:
      typeof item.isActive === "boolean"
        ? item.isActive
        : item.isActive == null
          ? undefined
          : Boolean(item.isActive),
    createdAt:
      typeof item.createdAt === "string" ? item.createdAt : item.createdAt == null ? null : String(item.createdAt),
    updatedAt:
      typeof item.updatedAt === "string" ? item.updatedAt : item.updatedAt == null ? null : String(item.updatedAt),
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

export async function fetchIpWhitelistItems(): Promise<IpWhitelistItem[]> {
  const response = await apiFetch(API_ENDPOINTS.IP_WHITELISTS);

  return parseResponse(response, (payload) => {
    const data = (payload ?? {}) as IpWhitelistListResponse;
    if (!Array.isArray(data.items)) {
      return [];
    }

    return data.items.map(normalizeIpWhitelistItem);
  });
}

export async function createIpWhitelistItem(
  payload: IpWhitelistPayload
): Promise<IpWhitelistItem> {
  const response = await apiFetch(API_ENDPOINTS.IP_WHITELISTS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, normalizeIpWhitelistItem);
}

export async function updateIpWhitelistItem(
  id: number,
  payload: IpWhitelistPayload
): Promise<IpWhitelistItem> {
  const response = await apiFetch(API_ENDPOINTS.IP_WHITELIST_BY_ID(id), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, normalizeIpWhitelistItem);
}

export async function deleteIpWhitelistItem(id: number): Promise<void> {
  const response = await apiFetch(API_ENDPOINTS.IP_WHITELIST_BY_ID(id), {
    method: "DELETE",
  });

  await parseResponse(response, () => undefined);
}
