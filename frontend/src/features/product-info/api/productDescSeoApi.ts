import { apiFetch } from "@/shared/api/client";
import { normalizeErrorMessage } from "@/lib/textUtils";
import type { ProductSeoAuditPayload, ProductSeoAuditResult } from "./productDescTypes";

export const auditProductSeo = async (
  payload: ProductSeoAuditPayload,
  signal?: AbortSignal
): Promise<ProductSeoAuditResult> => {
  const response = await apiFetch("/api/product-descriptions/seo-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const jsonPayload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    const message =
      jsonPayload?.error ||
      jsonPayload?.message ||
      (await response.text().catch(() => ""));
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể audit SEO từ Website.",
      })
    );
  }
  const body = (await response.json().catch(() => null)) as
    | { data?: ProductSeoAuditResult }
    | ProductSeoAuditResult
    | null;
  const data =
    body && typeof body === "object" && "data" in body ? body.data : body;

  if (!data || typeof data !== "object") {
    throw new Error("Phản hồi SEO audit không hợp lệ.");
  }

  return data as ProductSeoAuditResult;
};

