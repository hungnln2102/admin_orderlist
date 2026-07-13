import { API_ENDPOINTS } from "@/constants";
import { apiPost } from "@/shared/api/client";
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
  const body = await apiPost<CreditActionResponse>(API_ENDPOINTS.CREDIT_LOG_ACTION(id), payload);
  if (!body?.success) {
    throw new Error(String(body?.error || "Không thể cập nhật credit log."));
  }
  return body.item;
}
