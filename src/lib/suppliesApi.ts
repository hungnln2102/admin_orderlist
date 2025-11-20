import { apiFetch } from "./api";

export interface SupplyDeleteResponse {
  success: boolean;
  message?: string;
}

export const deleteSupplyById = async (
  supplyId: number
): Promise<SupplyDeleteResponse> => {
  const response = await apiFetch(`/api/supplies/${supplyId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 404) {
    return { success: true, message: "Nguồn đã được xóa trước đó." };
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Không thể xóa nguồn.");
  }
  const data = await response.json().catch(() => null);
  if (data && typeof data.success === "boolean") {
    return data;
  }
  return { success: true };
};
