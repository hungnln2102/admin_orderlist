import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";
import { normalizeWarehouseId, type EditableWarehouseFields } from "./shared";

export function usePackageWarehouseItems(open: boolean) {
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchWarehouse = async () => {
      setWarehouseLoading(true);
      try {
        const response = await apiFetch(API_ENDPOINTS.WAREHOUSE);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as WarehouseItem[];
        if (!cancelled) setWarehouseItems(data);
      } catch {
        if (!cancelled) setWarehouseItems([]);
      } finally {
        if (!cancelled) setWarehouseLoading(false);
      }
    };

    fetchWarehouse();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const inStockItems = useMemo(
    () =>
      warehouseItems.filter((item) =>
        (item.status || "").toLowerCase().includes("tá»“n")
      ),
    [warehouseItems]
  );

  const filterItems = useCallback(
    (search: string) => {
      if (!search.trim()) return inStockItems;
      const query = search.toLowerCase();
      return inStockItems.filter(
        (item) =>
          (item.account || "").toLowerCase().includes(query) ||
          (item.category || "").toLowerCase().includes(query) ||
          (item.note || "").toLowerCase().includes(query)
      );
    },
    [inStockItems]
  );

  const findWarehouseItemById = useCallback(
    (id: unknown) => {
      const targetId = normalizeWarehouseId(id);
      if (targetId == null) return null;
      return (
        warehouseItems.find((item) => normalizeWarehouseId(item.id) === targetId) ??
        null
      );
    },
    [warehouseItems]
  );

  const handleUpdateWarehouseInfo = useCallback(
    async (id: number, fields: EditableWarehouseFields) => {
      const targetId = normalizeWarehouseId(id);
      const currentItem = targetId == null ? null : findWarehouseItemById(targetId);

      if (!currentItem) throw new Error("WAREHOUSE_ITEM_NOT_FOUND");

      const payload = {
        category: currentItem.category ?? null,
        account: fields.account || null,
        password: fields.password || null,
        backup_email: fields.backup_email || null,
        two_fa: fields.two_fa || null,
        note: fields.note || null,
        status: currentItem.status ?? null,
        expires_at: fields.expires_at?.trim() || null,
        is_verified: currentItem.is_verified ?? false,
      };

      const response = await apiFetch(`${API_ENDPOINTS.WAREHOUSE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const updated = (await response.json()) as WarehouseItem;
      setWarehouseItems((prev) =>
        prev.map((item) =>
          normalizeWarehouseId(item.id) === targetId
            ? { ...item, ...updated }
            : item
        )
      );
    },
    [findWarehouseItemById]
  );

  return {
    warehouseLoading,
    inStockItems,
    filterItems,
    findWarehouseItemById,
    handleUpdateWarehouseInfo,
  };
}
