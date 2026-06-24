import { apiFetch } from "@/shared/api/client";
import type {
  AdobeSystemCode,
  StorefrontRenewStatusPayload,
} from "../types/storefrontRenew.types";

type ApiErrorShape = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
};

type ResolveSystemResponse = ApiErrorShape & {
  email?: string;
  system_note?: AdobeSystemCode;
  order_id?: string | number | null;
};

type FixAdesPublicResponse<T = unknown> = ApiErrorShape & {
  ok: boolean;
  status: number;
  data: T;
};

export type FixAdesCheckData = {
  email?: string;
  status?: string;
  message?: string;
  teamName?: string;
  groupName?: string;
  productName?: string;
  organizationId?: string | number;
  existedInSystem?: boolean;
  switchAvailable?: boolean;
  switchTargetTeamName?: string;
  transferTeamResponse?: Record<string, unknown> | null;
  adesSource?: {
    existedInSystem?: boolean;
    transferTeamResponse?: Record<string, unknown> | null;
  };
};

type FixAdesSyncData = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function throwApiError(
  res: Response,
  data: ApiErrorShape | null,
  fallbackMessage: string,
): never {
  const message = data?.error || data?.message;
  if (message) {
    throw new Error(message);
  }
  throw new Error(!res.ok ? `HTTP ${res.status}` : fallbackMessage);
}

const STATUS_TIMEOUT_MS = 45_000;
const ACTIVATE_TIMEOUT_MS = 600_000;

export async function resolveStorefrontRenewSystem(
  email: string,
): Promise<ResolveSystemResponse> {
  const res = await apiFetch(
    `/api/renew-adobe/public/resolve-system?email=${encodeURIComponent(email)}`,
    { credentials: "include" },
  );
  const data = await readJsonSafe<ResolveSystemResponse>(res);
  if (!res.ok) {
    throwApiError(res, data ?? null, "Không kiểm tra được hệ thống cho email này.");
  }
  return data ?? { ok: false, error: "Không kiểm tra được hệ thống cho email này." };
}

export async function checkStorefrontFixAdesStatus(
  email: string,
): Promise<FixAdesPublicResponse<FixAdesCheckData>> {
  const res = await apiFetch("/api/renew-adobe/public/fix-ades/check-transfer-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  const data = await readJsonSafe<FixAdesPublicResponse<FixAdesCheckData>>(res);
  if (!res.ok || !data?.ok) {
    throwApiError(res, data ?? null, "Không kiểm tra được trạng thái Fix Ades.");
  }
  return data;
}

export async function syncStorefrontFixAdesAccount(
  email: string,
): Promise<FixAdesPublicResponse<FixAdesSyncData>> {
  const res = await apiFetch("/api/renew-adobe/public/fix-ades/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  const data = await readJsonSafe<FixAdesPublicResponse<FixAdesSyncData>>(res);
  if (!res.ok || !data?.ok) {
    throwApiError(res, data ?? null, "Không đồng bộ được dữ liệu Fix Ades.");
  }
  return data;
}

export async function fetchStorefrontRenewStatus(
  email: string,
): Promise<StorefrontRenewStatusPayload> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
  try {
    const res = await apiFetch(
      `/api/renew-adobe/public/status?email=${encodeURIComponent(email)}`,
      {
        credentials: "include",
        signal: controller.signal,
      },
    );
    const data =
      await readJsonSafe<StorefrontRenewStatusPayload & ApiErrorShape>(res);
    if (!res.ok || !data?.success) {
      throwApiError(
        res,
        data ?? null,
        "Không kiểm tra được profile. Vui lòng thử lại sau.",
      );
    }
    return data;
  } finally {
    clearTimeout(id);
  }
}

export async function activateStorefrontRenewProfile(
  email: string,
): Promise<StorefrontRenewStatusPayload> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ACTIVATE_TIMEOUT_MS);
  try {
    const res = await apiFetch(`/api/renew-adobe/public/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    const data =
      await readJsonSafe<StorefrontRenewStatusPayload & ApiErrorShape>(res);
    if (!res.ok || !data?.success) {
      throwApiError(
        res,
        data ?? null,
        "Không kích hoạt được profile. Vui lòng thử lại sau.",
      );
    }
    return data;
  } finally {
    clearTimeout(id);
  }
}