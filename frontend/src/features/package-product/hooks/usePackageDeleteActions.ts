import { useCallback, useState } from "react";
import type React from "react";
import { apiFetch } from "@/lib/api";
import { showAppNotification } from "@/lib/notifications";
import type { AugmentedRow, PackageRow, PackageTemplate } from "../utils/packageHelpers";

type UsePackageDeleteActionsParams = {
  rows: PackageRow[];
  selectedPackage: string | null;
  onResetSelectedPackage: () => void;
  setRows: React.Dispatch<React.SetStateAction<PackageRow[]>>;
  setTemplates: React.Dispatch<React.SetStateAction<PackageTemplate[]>>;
};

export const usePackageDeleteActions = ({
  rows,
  selectedPackage,
  onResetSelectedPackage,
  setRows,
  setTemplates,
}: UsePackageDeleteActionsParams) => {
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [packagesMarkedForDeletion, setPackagesMarkedForDeletion] = useState<
    Set<string>
  >(new Set());
  const [deleteRowTarget, setDeleteRowTarget] = useState<AugmentedRow | null>(
    null
  );
  const [deleteRowProcessing, setDeleteRowProcessing] = useState(false);
  const [deleteRowError, setDeleteRowError] = useState<string | null>(null);

  const resetDeleteSelection = useCallback(() => {
    setDeleteMode(false);
    setPackagesMarkedForDeletion(new Set());
  }, []);

  const handleStartDeleteMode = useCallback(() => {
    setDeleteMode(true);
    setPackagesMarkedForDeletion(new Set());
  }, []);

  const togglePackageMarked = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPackagesMarkedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(trimmed)) {
        next.delete(trimmed);
      } else {
        next.add(trimmed);
      }
      return next;
    });
  }, []);

  const handleConfirmDeletePackages = useCallback(async () => {
    if (packagesMarkedForDeletion.size === 0) {
      resetDeleteSelection();
      return;
    }

    setDeleteProcessing(true);
    const names = Array.from(packagesMarkedForDeletion);
    const packageIds = names
      .map((name) => rows.find((row) => (row.package || "").trim() === name)?.productId)
      .filter((id): id is number => id != null && Number.isFinite(id));

    if (packageIds.length === 0) {
      setDeleteProcessing(false);
      resetDeleteSelection();
      return;
    }

    try {
      const response = await apiFetch("/api/package-products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageIds }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      setRows((prev) =>
        prev.filter((row) => !packageIds.includes(row.productId ?? -1))
      );
      setTemplates((prev) =>
        prev.filter((template) => !packageIds.includes(template.productId ?? -1))
      );

      if (selectedPackage && names.includes(selectedPackage)) {
        onResetSelectedPackage();
      }
    } catch (error) {
      console.error("Xóa nhóm thất bại:", error);
      showAppNotification({
        type: "error",
        title: "Lỗi xóa loại gói",
        message: `Xóa nhóm thất bại: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`,
      });
    } finally {
      setDeleteProcessing(false);
      resetDeleteSelection();
    }
  }, [
    onResetSelectedPackage,
    packagesMarkedForDeletion,
    resetDeleteSelection,
    rows,
    selectedPackage,
    setRows,
    setTemplates,
  ]);

  const handleDeleteRow = useCallback((row: AugmentedRow) => {
    setDeleteRowError(null);
    setDeleteRowTarget(row);
  }, []);

  const closeDeleteRowModal = useCallback(() => {
    setDeleteRowProcessing(false);
    setDeleteRowError(null);
    setDeleteRowTarget(null);
  }, []);

  const confirmDeleteRow = useCallback(async () => {
    if (!deleteRowTarget || deleteRowProcessing) return;

    const targetId = deleteRowTarget.id;
    const targetName = (deleteRowTarget.package || "").trim();

    if (targetId === undefined || targetId === null) {
      setDeleteRowError("Không tìm thấy ID gói để xóa.");
      return;
    }

    setDeleteRowProcessing(true);

    const parseError = async (response: Response) => {
      const rawText = await response.text().catch(() => "");
      const cleanedMessage = rawText
        ? rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : "";
      const statusLabel = response.status ? ` (HTTP ${response.status})` : "";
      const friendlyMessage =
        cleanedMessage || response.statusText || "Không thể thực hiện xóa trên máy chủ";
      throw new Error(`Không thể xóa gói${statusLabel}: ${friendlyMessage}`);
    };

    try {
      const response = await apiFetch(`/api/package-products/${targetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await parseError(response);
      }

      const data = (await response.json().catch(() => ({}))) as {
        deletedIds?: Array<number | string>;
        deletedNames?: string[];
      };
      console.log("Delete package product response", {
        targetId,
        targetName,
        data,
      });

      const deletedIds = new Set(
        (data.deletedIds && data.deletedIds.length ? data.deletedIds : [targetId]).map((value) =>
          String(value)
        )
      );

      setRows((prev) =>
        prev.filter((item) => {
          const idStr =
            item.id !== undefined && item.id !== null ? String(item.id) : "__";
          return !deletedIds.has(idStr);
        })
      );
      closeDeleteRowModal();
    } catch (error) {
      console.error("Xóa gói thất bại:", error);
      setDeleteRowError(
        error instanceof Error ? error.message : "Lỗi không xác định"
      );
      setDeleteRowProcessing(false);
    }
  }, [closeDeleteRowModal, deleteRowProcessing, deleteRowTarget, setRows]);

  return {
    deleteMode,
    deleteProcessing,
    packagesMarkedForDeletion,
    deleteRowTarget,
    deleteRowProcessing,
    deleteRowError,
    handleStartDeleteMode,
    resetDeleteSelection,
    togglePackageMarked,
    handleConfirmDeletePackages,
    handleDeleteRow,
    closeDeleteRowModal,
    confirmDeleteRow,
  };
};
