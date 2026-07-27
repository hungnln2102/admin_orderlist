import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import type { ReceiptFlowType } from "../helpers";

export function useReceiptFlowTypes() {
  const [flowTypes, setFlowTypes] = useState<ReceiptFlowType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlowTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/receipt-flow-types");
      if (!res.ok) {
        throw new Error("Không thể tải danh sách loại phân loại.");
      }
      const data = await res.json();
      if (data?.success && Array.isArray(data.list)) {
        setFlowTypes(data.list);
      } else {
        setFlowTypes([]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải loại phân loại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowTypes();
  }, []);

  const createFlowType = async (payload: Omit<ReceiptFlowType, "id" | "isSystem" | "isActive">) => {
    const res = await apiFetch("/api/receipt-flow-types", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Không thể tạo loại phân loại mới.");
    }
    await fetchFlowTypes();
    return data.data;
  };

  const updateFlowType = async (id: number, payload: Partial<ReceiptFlowType>) => {
    const res = await apiFetch(`/api/receipt-flow-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Không thể cập nhật loại phân loại.");
    }
    await fetchFlowTypes();
  };

  const deleteFlowType = async (id: number) => {
    const res = await apiFetch(`/api/receipt-flow-types/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Không thể xóa loại phân loại.");
    }
    await fetchFlowTypes();
  };

  return {
    flowTypes,
    loading,
    error,
    refetch: fetchFlowTypes,
    createFlowType,
    updateFlowType,
    deleteFlowType,
  };
}
