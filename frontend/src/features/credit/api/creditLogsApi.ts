import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import type { CreditActionType } from "../components/CreditTableBlock";

type CreditActionResponse = {
  success: boolean;
  item?: {
    id: number;
    status: string;
    available_amount: number;
    note: string | null;
    updated_at: string | null;
  };
  error?: string;
};

type SubmitCreditLogActionOptions = {
  shopBankAccountId?: number | null;
};

export async function submitCreditLogAction(
  id: number,
  action: CreditActionType,
  options: SubmitCreditLogActionOptions = {}
) {
  const payload: Record<string, unknown> = { action };
  if (action === "complete" && options.shopBankAccountId != null) {
    payload.shopBankAccountId = options.shopBankAccountId;
  }
  const response = await apiFetch(API_ENDPOINTS.CREDIT_LOG_ACTION(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as CreditActionResponse;
  if (!response.ok || !body?.success) {
    throw new Error(String(body?.error || "Không thể cập nhật credit log."));
  }
  return body.item;
}
