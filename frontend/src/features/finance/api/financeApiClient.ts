import { apiClient } from "@/shared/api/apiClient";

async function ensureSuccess(response: Response, fallbackMessage: string): Promise<Response> {
  if (response.ok) return response;
  const text = await response.text();
  let message = fallbackMessage;
  try {
    const payload = JSON.parse(text);
    message = payload.message || payload.error || fallbackMessage;
  } catch {
    // Non-JSON error responses use the established generic UI message.
  }
  throw new Error(message);
}

export async function getFinanceSummary(query: URLSearchParams): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/summary?" + query.toString()), "Không thể tải dữ liệu tài chính");
}

export async function createFixedCost(body: unknown): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/fixed-costs", { method: "POST", body }), "Thêm chi phí thất bại");
}
export async function updateFixedCost(id: number, body: unknown): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/fixed-costs/" + id, { method: "PUT", body }), "Cập nhật chi phí thất bại");
}
export async function deleteFixedCost(id: number): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/fixed-costs/" + id, { method: "DELETE" }), "Xóa chi phí thất bại");
}

export async function createInstallment(body: unknown): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/installments", { method: "POST", body }), "Thêm khoản trả góp thất bại");
}
export async function updateInstallment(id: number, body: unknown): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/installments/" + id, { method: "PUT", body }), "Cập nhật trả góp thất bại");
}
export async function deleteInstallment(id: number): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/installments/" + id, { method: "DELETE" }), "Xóa trả góp thất bại");
}

export async function createPersonalAsset(body: unknown): Promise<Response> {
  return ensureSuccess(await apiClient("/api/finance/personal-assets", { method: "POST", body }), "Thêm tài sản thất bại");
}
export async function updatePersonalAsset(path: string, body: unknown): Promise<Response> {
  return ensureSuccess(await apiClient(path, { method: "PUT", body }), "Cập nhật tài sản thất bại");
}
export async function deletePersonalAsset(path: string): Promise<Response> {
  return ensureSuccess(await apiClient(path, { method: "DELETE" }), "Xóa tài sản thất bại");
}
