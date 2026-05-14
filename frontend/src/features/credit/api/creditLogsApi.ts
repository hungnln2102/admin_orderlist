import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
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

export async function submitCreditLogAction(id: number, action: CreditActionType) {
  const response = await apiFetch(API_ENDPOINTS.CREDIT_LOG_ACTION(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const body = (await response.json().catch(() => ({}))) as CreditActionResponse;
  if (!response.ok || !body?.success) {
    throw new Error(String(body?.error || "Không thể cập nhật credit log."));
  }
  return body.item;
}
