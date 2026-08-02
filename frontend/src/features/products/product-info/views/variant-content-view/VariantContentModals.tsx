import type React from "react";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import type { ProductDescription } from "@/features/product-info/api/productDescApi";
import { DescVariantFormModal } from "../../components/desc-variant/DescVariantFormModal";

type VariantContentModalsProps = {
  createOpen: boolean;
  editing: ProductDescription | null;
  viewing: ProductDescription | null;
  saving: boolean;
  saveError: string | null;
  deleteTarget: ProductDescription | null;
  deleteSubmitting: boolean;
  onCloseCreate: () => void;
  onCreated: () => Promise<void>;
  onCloseView: () => void;
  onCloseEdit: () => void;
  onSave: (payload: {
    productId?: string;
    descVariantId?: number | null;
    rules: string;
    description: string;
    shortDesc: string;
    imageUrl?: string | null;
  }, mode: "create" | "edit" | "view") => Promise<void>;
  onCloseDelete: () => void;
  onConfirmDelete: () => Promise<void>;
};

const VariantContentModals: React.FC<VariantContentModalsProps> = ({
  createOpen,
  editing,
  viewing,
  saving,
  saveError,
  deleteTarget,
  deleteSubmitting,
  onCloseCreate,
  onCreated,
  onCloseView,
  onCloseEdit,
  onSave,
  onCloseDelete,
  onConfirmDelete,
}) => {
  // Determine mode and current item
  let mode: "create" | "edit" | "view" | null = null;
  let item: ProductDescription | null = null;
  let isOpen = false;

  if (createOpen) {
    mode = "create";
    isOpen = true;
  } else if (editing) {
    mode = "edit";
    item = editing;
    isOpen = true;
  } else if (viewing) {
    mode = "view";
    item = viewing;
    isOpen = true;
  }

  const handleClose = () => {
    if (mode === "create") onCloseCreate();
    else if (mode === "edit") onCloseEdit();
    else if (mode === "view") onCloseView();
  };

  const handleSave = async (payload: any) => {
    if (mode) {
      await onSave(payload, mode);
    }
  };

  return (
    <>
      {mode && (
        <DescVariantFormModal
          mode={mode}
          open={isOpen}
          item={item}
          saving={saving}
          saveError={saveError}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Xóa nội dung desc_variant?"
        message={
          deleteTarget?.descVariantId != null
            ? `Bản ghi id ${deleteTarget.descVariantId} sẽ bị xóa. Các biến thể đang trỏ tới bản ghi này sẽ được gỡ liên kết (id_desc -> null).`
            : ""
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isSubmitting={deleteSubmitting}
      />
    </>
  );
};

export default VariantContentModals;
