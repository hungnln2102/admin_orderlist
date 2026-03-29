import type React from "react";
import { showAppNotification } from "@/lib/notifications";
import { API_ENDPOINTS } from "../../../../constants";
import type { ProductPricingRow } from "../types";

interface UseProductStatusActionsParams {
  apiBase: string;
  statusOverrides: Record<number, boolean>;
  setStatusOverrides: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  updatedTimestampMap: Record<number, string>;
  setUpdatedTimestampMap: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
}

export function useProductStatusActions({
  apiBase,
  statusOverrides,
  setStatusOverrides,
  updatedTimestampMap,
  setUpdatedTimestampMap,
  setProductPrices,
}: UseProductStatusActionsParams) {
  const handleToggleStatus = async (item: ProductPricingRow) => {
    const current = statusOverrides[item.id] ?? item.isActive ?? false;
    const nextStatus = !current;
    const previousOverride = statusOverrides[item.id];
    const previousUpdated = updatedTimestampMap[item.id];
    const optimisticTimestamp = new Date().toISOString();

    setStatusOverrides((prev) => ({
      ...prev,
      [item.id]: nextStatus,
    }));

    setProductPrices((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, isActive: nextStatus } : row
      )
    );

    setUpdatedTimestampMap((prev) => ({
      ...prev,
      [item.id]: optimisticTimestamp,
    }));

    try {
      const response = await fetch(
        `${apiBase}${API_ENDPOINTS.PRODUCT_PRICES}/${item.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: nextStatus,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Lỗi khi cập nhật trạng thái");
      }

      const payload: {
        id: number;
        is_active: boolean;
        update?: string;
      } = await response.json();

      const serverStatus = payload?.is_active ?? nextStatus;
      const serverUpdated =
        typeof payload?.update === "string"
          ? payload.update
          : optimisticTimestamp;

      setStatusOverrides((prev) => ({
        ...prev,
        [item.id]: serverStatus,
      }));

      setProductPrices((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, isActive: serverStatus, lastUpdated: serverUpdated }
            : row
        )
      );

      setUpdatedTimestampMap((prev) => ({
        ...prev,
        [item.id]: serverUpdated,
      }));
    } catch (err) {
      console.error("Failed to toggle product status:", err);

      setStatusOverrides((prev) => {
        const next = { ...prev };
        if (previousOverride === undefined) {
          delete next[item.id];
        } else {
          next[item.id] = previousOverride;
        }
        return next;
      });

      setProductPrices((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                isActive: previousOverride ?? item.isActive ?? false,
              }
            : row
        )
      );

      setUpdatedTimestampMap((prev) => {
        const next = { ...prev };
        if (previousUpdated) {
          next[item.id] = previousUpdated;
        } else {
          delete next[item.id];
        }
        return next;
      });

      showAppNotification({
        type: "error",
        title: "Lỗi cập nhật trạng thái giá",
        message: "Cập nhật thất bại. Vui lòng thử lại.",
      });
    }
  };

  return {
    handleToggleStatus,
  };
}
