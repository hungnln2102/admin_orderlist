/**
 * Helpers cho hệ thống Fix Ades — gọi proxy backend `/api/fix-ades/*`.
 */

import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";

export type FixAdesRenewUser = {
  email: string;
  organizationId: number;
  activatedAt: string;
  expiresAt: string;
  durationMonths: number;
  products: string[];
};

export type FixAdesRenewData = {
  success?: boolean;
  message?: string;
  creditsRemaining?: number;
  user?: FixAdesRenewUser;
};

export type FixAdesResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
};

async function callJson<T>(
  url: string,
  body: Record<string, unknown>
): Promise<FixAdesResponse<T>> {
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string })?.error || `HTTP ${res.status}`
    );
  }
  return json as FixAdesResponse<T>;
}

export function checkFixAdesAccount(email: string) {
  return callJson<unknown>(API_ENDPOINTS.FIX_ADES_CHECK, { email });
}

export function checkFixAdesTransferStatus(email: string) {
  return callJson<unknown>(API_ENDPOINTS.FIX_ADES_CHECK_TRANSFER_STATUS, { email });
}

export function renewFixAdesAccount(email: string) {
  return callJson<FixAdesRenewData>(API_ENDPOINTS.FIX_ADES_RENEW, { email });
}
