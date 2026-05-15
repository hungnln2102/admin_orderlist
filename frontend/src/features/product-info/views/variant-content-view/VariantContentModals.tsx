import type React from "react";

import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import type { ProductDescription } from "@/lib/productDescApi";

import { CreateDescVariantModal } from "../../components/CreateDescVariantModal";
import { DescVariantEditModal } from "../../components/DescVariantEditModal";
import { DescVariantViewModal } from "../../components/DescVariantViewModal";

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
    productId: string;
    descVariantId: number | null;
    rules: string;
    description: string;
    shortDesc: string;
    imageUrl: string | null;
  }) => Promise<void>;
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
}) => (
  <>
    <CreateDescVariantModal
      open={createOpen}
      onClose={onCloseCreate}
      onCreated={onCreated}
    />

    {viewing ? <DescVariantViewModal item={viewing} onClose={onCloseView} /> : null}

    {editing ? (
      <DescVariantEditModal
        item={editing}
        saving={saving}
        saveError={saveError}
        onClose={onCloseEdit}
        onSave={onSave}
      />
    ) : null}

    <ConfirmModal
      isOpen={deleteTarget != null}
      onClose={onCloseDelete}
      onConfirm={onConfirmDelete}
      title="Xóa nội dung desc_variant?"
      message={
        deleteTarget?.descVariantId != null
          ? `Bản ghi id ${deleteTarget.descVariantId} sẽ bị xóa. Các biến thể đang trỏ tới bản ghi này sẽ được gỡ liên kết (id_desc → null).`
          : ""
      }
      confirmLabel="Xóa"
      cancelLabel="Hủy"
      isSubmitting={deleteSubmitting}
    />
  </>
);

export default VariantContentModals;
