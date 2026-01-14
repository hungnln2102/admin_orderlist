import { useCallback, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { Supply, SupplyStats } from "../types";

export const useSupplyList = () => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [stats, setStats] = useState<SupplyStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    monthlyOrders: 0,
    totalImportValue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/supply-insights");
      if (!res.ok) throw new Error("Lỗi tải dữ liệu");
      const data = await res.json();

      const items: Supply[] = (data.supplies || []).map((item: any) => {
        const isActive = item.isActive ?? (item.status !== "inactive" && item.status !== "tạm dừng");
        return {
          ...item,
          isActive,
          status: isActive ? "active" : "inactive",
          products: Array.isArray(item.products) ? item.products.filter(Boolean) : [],
        };
      });

      setSupplies(items);
      setStats({
        totalSuppliers: Number(data.stats?.totalSuppliers) || 0,
        activeSuppliers: Number(data.stats?.activeSuppliers) || items.filter((i) => i.isActive).length,
        monthlyOrders: Number(data.stats?.monthlyOrders) || 0,
        totalImportValue: Number(data.stats?.totalImportValue) || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    setSupplies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !currentStatus, status: !currentStatus ? "active" : "inactive" } : s))
    );
    try {
      await apiFetch(`/api/supplies/${id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      await fetchSupplies();
    } catch {
      setSupplies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: currentStatus, status: currentStatus ? "active" : "inactive" } : s))
      );
      alert("Không thể cập nhật trạng thái");
    }
  };

  return { supplies, stats, loading, error, fetchSupplies, setSupplies, toggleStatus };
};
