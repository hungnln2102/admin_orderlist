import { useCallback, useState } from "react";

import type { ProductDescription } from "@/features/product-info/api/productDescApi";
import {
  createProductDescription,
  deleteProductDescriptionRecord,
  saveProductDescription,
} from "@/features/product-info/api/productDescApi";
import { normalizeErrorMessage } from "@/lib/textUtils";

type SavePayload = {
  productId: string;
  descVariantId: number | null;
  rules: string;
  description: string;
  shortDesc: string;
  imageUrl: string | null;
};

type UseVariantContentActionsOptions = {
  reload: () => Promise<void>;
  onReloadProductList: () => Promise<void>;
  onOpenEditor: () => void;
};

export const useVariantContentActions = ({
  reload,
  onReloadProductList,
  onOpenEditor,
}: UseVariantContentActionsOptions) => {
  const [editing, setEditing] = useState<ProductDescription | null>(null);
  const [viewing, setViewing] = useState<ProductDescription | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDescription | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const openEdit = useCallback(
    (row: ProductDescription) => {
      onOpenEditor();
      setViewing(null);
      setSaveError(null);
      setEditing(row);
    },
    [onOpenEditor]
  );

  const openView = useCallback(
    (row: ProductDescription) => {
      onOpenEditor();
      setEditing(null);
      setSaveError(null);
      setViewing(row);
    },
    [onOpenEditor]
  );

  const closeEdit = useCallback(() => {
    setEditing(null);
    setSaveError(null);
    setSaving(false);
  }, []);

  const closeView = useCallback(() => {
    setViewing(null);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setViewing(null);
    setSaveError(null);
    onOpenEditor();
    setCreateOpen(true);
  }, [onOpenEditor]);

  const handleCreated = useCallback(async () => {
    await reload();
    await onReloadProductList();
  }, [reload, onReloadProductList]);

  const handleSave = useCallback(
    async (payload: SavePayload, mode: "create" | "edit" | "view") => {
      setSaving(true);
      setSaveError(null);
      try {
        if (mode === "create") {
          await createProductDescription({
            productId: payload.productId,
            rules: payload.rules,
            description: payload.description,
            shortDesc: payload.shortDesc,
          });
          setCreateOpen(false);
        } else {
          await saveProductDescription({
            ...(payload.productId.trim()
              ? { productId: payload.productId.trim() }
              : {}),
            descVariantId: payload.descVariantId,
            rules: payload.rules,
            description: payload.description,
            shortDesc: payload.shortDesc,
            imageUrl: payload.imageUrl,
          });
          closeEdit();
        }
        await reload();
        await onReloadProductList();
      } catch (e) {
        setSaveError(
          normalizeErrorMessage(e instanceof Error ? e.message : String(e ?? ""), {
            fallback: "Không thể lưu desc_variant.",
          })
        );
      } finally {
        setSaving(false);
      }
    },
    [closeEdit, reload, onReloadProductList]
  );

  const openDelete = useCallback((row: ProductDescription) => {
    setDeleteError(null);
    setDeleteTarget(row);
  }, []);

  const closeDelete = useCallback(() => {
    if (!deleteSubmitting) setDeleteTarget(null);
  }, [deleteSubmitting]);

  const handleConfirmDelete = useCallback(async () => {
    const id = deleteTarget?.descVariantId;
    if (id == null || id <= 0) {
      setDeleteTarget(null);
      return;
    }
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteProductDescriptionRecord(id);
      setDeleteTarget(null);
      await reload();
      await onReloadProductList();
    } catch (e) {
      setDeleteError(
        normalizeErrorMessage(e instanceof Error ? e.message : String(e ?? ""), {
          fallback: "Không thể xóa desc_variant.",
        })
      );
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteTarget, reload, onReloadProductList]);

  return {
    editing,
    viewing,
    createOpen,
    saving,
    saveError,
    deleteTarget,
    deleteError,
    deleteSubmitting,
    openEdit,
    openView,
    openCreate,
    closeEdit,
    closeView,
    closeCreate: () => setCreateOpen(false),
    openDelete,
    closeDelete,
    handleCreated,
    handleSave,
    handleConfirmDelete,
  };
};
