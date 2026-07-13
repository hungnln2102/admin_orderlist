import { API_ENDPOINTS } from "@/constants";
import { apiGet, apiPost, apiPut, apiDelete } from "@/shared/api/client";
import type { IpWhitelistItem, IpWhitelistPayload } from "../types";

type IpWhitelistListResponse = {
  items?: unknown[];
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

export async function fetchIpWhitelistItems(): Promise<IpWhitelistItem[]> {
  const data = await apiGet<IpWhitelistListResponse>(API_ENDPOINTS.IP_WHITELISTS);
  if (!Array.isArray(data?.items)) return [];
  return data.items.map(normalizeIpWhitelistItem);
}

export const createIpWhitelistItem = async (payload: IpWhitelistPayload): Promise<IpWhitelistItem> => {
  const raw = await apiPost<unknown>(API_ENDPOINTS.IP_WHITELISTS, payload);
  return normalizeIpWhitelistItem(raw);
};

export const updateIpWhitelistItem = async (id: number, payload: IpWhitelistPayload): Promise<IpWhitelistItem> => {
  const raw = await apiPut<unknown>(API_ENDPOINTS.IP_WHITELIST_BY_ID(id), payload);
  return normalizeIpWhitelistItem(raw);
};

export const deleteIpWhitelistItem = (id: number): Promise<void> =>
  apiDelete(API_ENDPOINTS.IP_WHITELIST_BY_ID(id));
