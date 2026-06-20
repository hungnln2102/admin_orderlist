import { useCallback, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import { Supply, SupplyStats } from "../types";
import { showAppNotification } from "@/lib/notifications";

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
      const suppliesRaw = Array.isArray(data?.supplies)
        ? (data.supplies as Array<Record<string, unknown>>)
        : [];

      const items: Supply[] = suppliesRaw.map((item) => {
        const rawActive = item.isActive ?? item.active_supply;
        const activeText = String(rawActive ?? item.status ?? "active").trim().toLowerCase();
        const isActive =
          typeof rawActive === "boolean"
            ? rawActive
            : activeText !== "inactive" &&
              activeText !== "tạm dừng" &&
              activeText !== "tam dung" &&
              activeText !== "false";
        return {
          id: Number(item.id) || 0,
          sourceName: String(item.sourceName ?? ""),
          numberBank: item.numberBank == null ? null : String(item.numberBank),
          binBank: item.binBank == null ? null : String(item.binBank),
          nameBank: item.nameBank == null ? null : String(item.nameBank),
          bankName: item.bankName == null ? null : String(item.bankName),
          isActive,
          status: isActive ? "active" : "inactive",
          products: Array.isArray(item.products)
            ? (item.products as unknown[]).filter(Boolean)
              .map((product) => String(product))
            : [],
          monthlyOrders: Number(item.monthlyOrders) || 0,
          monthlyImportValue: Number(item.monthlyImportValue) || 0,
          lastOrderDate: item.lastOrderDate == null ? null : String(item.lastOrderDate),
          totalOrders: Number(item.totalOrders) || 0,
          totalPaidImport: Number(item.totalPaidImport) || 0,
          totalUnpaidImport: Number(item.totalUnpaidImport) || 0,
          payableToSupplier: Number(item.payableToSupplier) || 0,
          supplierRefundToShop: Number(item.supplierRefundToShop) || 0,
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
        body: JSON.stringify({
          isActive: !currentStatus,
          is_active: !currentStatus,
          active: !currentStatus,
          active_supply: !currentStatus,
        }),
      });
      await fetchSupplies();
    } catch {
      setSupplies((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                isActive: currentStatus,
                status: currentStatus ? "active" : "inactive",
              }
            : s
        )
      );
      showAppNotification({
        type: "error",
        title: "Lỗi cập nhật trạng thái",
        message: "Không thể cập nhật trạng thái",
      });
    }
  };

  return { supplies, stats, loading, error, fetchSupplies, setSupplies, toggleStatus };
};
