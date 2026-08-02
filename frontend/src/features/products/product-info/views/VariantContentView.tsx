import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import { useVariantContent } from "../hooks/useVariantContent";
import { PAGE_SIZE } from "../utils/productInfoHelpers";
import VariantContentModals from "./variant-content-view/VariantContentModals";
import { useVariantContentActions } from "./variant-content-view/useVariantContentActions";
import { VariantContentTable } from "./variant-content-view/VariantContentTable";

type VariantContentViewProps = {
  searchTerm: string;
  active: boolean;
  onReloadProductList: () => Promise<void>;
  onOpenEditor: () => void;
};

export const VariantContentView: React.FC<VariantContentViewProps> = ({
  searchTerm,
  active,
  onReloadProductList,
  onOpenEditor,
}) => {
  const {
    items,
    loading,
    error,
    total,
    currentPage,
    setCurrentPage,
    reload,
  } = useVariantContent({ searchTerm, active });

  const {
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
    closeCreate,
    openDelete,
    closeDelete,
    handleCreated,
    handleSave,
    handleConfirmDelete,
  } = useVariantContentActions({
    reload,
    onReloadProductList,
    onOpenEditor,
  });

  return (
    <>
      <div className="variant-content-view product-info-surface overflow-hidden rounded-[32px] border border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">
              Nội dung theo biến thể
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              Danh sách tất cả bản ghi{" "}
              <span className="font-mono text-indigo-200/80">desc_variant</span>{" "}
              (đã hoặc chưa gắn variant). Nút bên phải tạo nội dung mới; nối
              variant sẽ làm sau.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/35 bg-indigo-500/18 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/10 transition hover:bg-indigo-500/28"
            >
              <PlusIcon className="h-5 w-5" aria-hidden />
              Thêm thông tin sản phẩm
            </button>
            {loading ? (
              <span className="text-xs text-white/60">Đang tải…</span>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}
        {deleteError && (
          <div className="mx-4 mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {deleteError}
          </div>
        )}

        <VariantContentTable
          items={items}
          loading={loading}
          onView={openView}
          onEdit={openEdit}
          onDelete={openDelete}
        />

        <div className="border-t border-white/10 px-4 py-3">
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <VariantContentModals
        createOpen={createOpen}
        editing={editing}
        viewing={viewing}
        saving={saving}
        saveError={saveError}
        deleteTarget={deleteTarget}
        deleteSubmitting={deleteSubmitting}
        onCloseCreate={closeCreate}
        onCreated={handleCreated}
        onCloseView={closeView}
        onCloseEdit={closeEdit}
        onSave={handleSave}
        onCloseDelete={closeDelete}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  );
};
