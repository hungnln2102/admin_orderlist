import { useCallback } from "react";
import type React from "react";
import { apiFetch } from "../../../../lib/api";
import { showAppNotification } from "@/lib/notifications";
import type { PackageField, PackageRow } from "../utils/packageHelpers";

type UsePackageTemplateActionsParams = {
  setRows: React.Dispatch<React.SetStateAction<PackageRow[]>>;
  closeCreateModal: () => void;
  handleCategorySelect: (value: string) => void;
};

export const usePackageTemplateActions = ({
  setRows,
  closeCreateModal,
  handleCategorySelect,
}: UsePackageTemplateActionsParams) => {
  const handleCreateTemplate = useCallback(
    async (packageId: number, productName: string, _fields: PackageField[]) => {
      if (!Number.isFinite(packageId) || packageId < 1) return;

      try {
        const response = await apiFetch("/api/package-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId,
            slotLimit: 0,
            matchMode: null,
            supplier: null,
            importPrice: null,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const created = (await response.json()) as PackageRow;
        setRows((prev) => [...prev, created]);
        closeCreateModal();
        handleCategorySelect(created.package ?? productName);
      } catch (error) {
        console.error("Tạo loại gói thất bại:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi tạo loại gói",
          message:
            error instanceof Error ? error.message : "Không thể tạo loại gói.",
        });
      }
    },
    [closeCreateModal, handleCategorySelect, setRows]
  );

  return {
    handleCreateTemplate,
  };
};
