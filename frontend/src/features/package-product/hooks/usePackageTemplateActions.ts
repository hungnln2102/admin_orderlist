import { useCallback } from "react";
import type React from "react";
import { apiFetch } from "@/lib/api";
import { showAppNotification } from "@/lib/notifications";
import type {
  PackageField,
  PackageRow,
  PackageTemplate,
} from "../utils/packageHelpers";

type UsePackageTemplateActionsParams = {
  setRows: React.Dispatch<React.SetStateAction<PackageRow[]>>;
  setTemplates: React.Dispatch<React.SetStateAction<PackageTemplate[]>>;
  closeCreateModal: () => void;
  handleCategorySelect: (value: string) => void;
};

function upsertTemplateWithFields(
  prev: PackageTemplate[],
  packageId: number,
  productName: string,
  fields: PackageField[],
  created?: PackageRow
): PackageTemplate[] {
  const name =
    (created?.package ?? "").trim() || productName.trim();
  const byProduct = prev.some((t) => t.productId === packageId);
  const mapped = prev.map((t) => {
    const match = byProduct
      ? t.productId === packageId
      : t.name === productName.trim();
    return match
      ? {
          ...t,
          name: t.name || name,
          fields: [...fields],
          isCustom: true,
          productId: t.productId ?? packageId,
        }
      : t;
  });
  const hasMatch = mapped.some(
    (t) => t.productId === packageId || t.name === name
  );
  if (!hasMatch) {
    return [
      ...mapped,
      {
        name,
        productId: packageId,
        fields: [...fields],
        isCustom: true,
      },
    ].sort((a, b) => a.name.localeCompare(b.name));
  }
  return mapped.sort((a, b) => a.name.localeCompare(b.name));
}

async function patchProductRequiresActivation(
  productId: number,
  requiresActivation: boolean
): Promise<void> {
  const res = await apiFetch(
    `/api/package-products/product-options/${productId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requiresActivation }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
}

function mergeRowsActivationFlag(
  rows: PackageRow[],
  productId: number,
  requiresActivation: boolean
): PackageRow[] {
  return rows.map((r) =>
    r.productId === productId
      ? { ...r, productRequiresActivation: requiresActivation }
      : r
  );
}

export const usePackageTemplateActions = ({
  setRows,
  setTemplates,
  closeCreateModal,
  handleCategorySelect,
}: UsePackageTemplateActionsParams) => {
  const handleTemplateModalSubmit = useCallback(
    async (
      mode: "create" | "edit",
      packageId: number,
      productName: string,
      fields: PackageField[]
    ) => {
      if (!Number.isFinite(packageId) || packageId < 1) return;

      const requiresActivation = fields.includes("activation");

      if (mode === "edit") {
        setTemplates((prev) =>
          upsertTemplateWithFields(prev, packageId, productName, fields)
        );
        closeCreateModal();
        try {
          await patchProductRequiresActivation(packageId, requiresActivation);
          setRows((prev) =>
            mergeRowsActivationFlag(prev, packageId, requiresActivation)
          );
        } catch (error) {
          console.error("Lưu package_requires_activation thất bại:", error);
          showAppNotification({
            type: "error",
            title: "Không lưu được cấu hình kích hoạt",
            message:
              error instanceof Error ? error.message : "Lỗi máy chủ.",
          });
        }
        return;
      }

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

        try {
          await patchProductRequiresActivation(packageId, requiresActivation);
        } catch (patchErr) {
          console.error("Lưu package_requires_activation thất bại:", patchErr);
          showAppNotification({
            type: "error",
            title: "Đã tạo loại gói nhưng chưa lưu cờ kích hoạt",
            message:
              patchErr instanceof Error ? patchErr.message : "Hãy chỉnh sửa loại gói và lưu lại.",
          });
        }

        setRows((prev) =>
          mergeRowsActivationFlag([...prev, created], packageId, requiresActivation)
        );
        setTemplates((prev) =>
          upsertTemplateWithFields(prev, packageId, productName, fields, created)
        );
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
    [closeCreateModal, handleCategorySelect, setRows, setTemplates]
  );

  return {
    handleTemplateModalSubmit,
  };
};
