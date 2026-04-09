import React, { useCallback, useState } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import {
  ResponsiveTable,
  TableCard,
} from "@/components/ui/ResponsiveTable";
import {
  ProductDescription,
  deleteProductDescriptionRecord,
  saveProductDescription,
} from "@/lib/productDescApi";
import { normalizeErrorMessage } from "@/lib/textUtils";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import { CreateDescVariantModal } from "../components/CreateDescVariantModal";
import { DescVariantEditModal } from "../components/DescVariantEditModal";
import { DescVariantViewModal } from "../components/DescVariantViewModal";
import { useVariantContent } from "../hooks/useVariantContent";
import { PAGE_SIZE, htmlToPlainText } from "../utils/productInfoHelpers";

const preview = (html: string | undefined | null, max = 96) => {
  const plain = htmlToPlainText(html ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "—";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
};

const previewShort = (text: string | undefined | null, max = 72) => {
  const plain = (text ?? "").replace(/\s+/g, " ").trim();
  if (!plain) return "—";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
};

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

  const [editing, setEditing] = useState<ProductDescription | null>(null);
  const [viewing, setViewing] = useState<ProductDescription | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDescription | null>(
    null
  );
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
    async (payload: {
      productId: string;
      descVariantId: number | null;
      rules: string;
      description: string;
      shortDesc: string;
      imageUrl: string | null;
    }) => {
      setSaving(true);
      setSaveError(null);
      try {
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
        await reload();
        await onReloadProductList();
      } catch (e) {
        setSaveError(
          normalizeErrorMessage(
            e instanceof Error ? e.message : String(e ?? ""),
            { fallback: "Không thể lưu desc_variant." }
          )
        );
      } finally {
        setSaving(false);
      }
    },
    [closeEdit, reload, onReloadProductList]
  );

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
        normalizeErrorMessage(
          e instanceof Error ? e.message : String(e ?? ""),
          { fallback: "Không thể xóa desc_variant." }
        )
      );
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteTarget, reload, onReloadProductList]);

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

        <ResponsiveTable
          className="product-info-surface__table-wrap"
          showCardOnMobile={true}
          cardView={
             <TableCard
              data={items as unknown as Record<string, unknown>[]}
              renderCard={(row) => {
                const r = row as unknown as ProductDescription;
                return (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-white/70">
                        ID{" "}
                        {r.descVariantId != null
                          ? r.descVariantId
                          : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openView(r)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sky-300 hover:bg-sky-500/15"
                        aria-label="Xem nội dung"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300 hover:bg-white/10"
                        aria-label="Sửa"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      {r.descVariantId != null && r.descVariantId > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(r);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-300 hover:bg-rose-500/15"
                          aria-label="Xóa"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/55">
                    Mô tả ngắn: {previewShort(r.shortDescription)}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Quy tắc: {preview(r.rulesHtml ?? r.rules)}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Mô tả: {preview(r.descriptionHtml ?? r.description)}
                  </p>
                </div>
                );
              }}
              className="product-info-surface__mobile-cards p-2"
            />
          }
        >
          <table className="min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "12%", minWidth: "100px" }} />
            </colgroup>
            <thead className="bg-white/5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Mô tả ngắn
                </th>
                <th className="px-4 py-3 text-left font-semibold">Quy tắc</th>
                <th className="px-4 py-3 text-left font-semibold">Mô tả</th>
                <th className="px-2 py-3 text-center font-semibold">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-white/50"
                  >
                    Chưa có dòng nào. Dùng nút Thêm thông tin sản phẩm ở trên để
                    tạo bản ghi{" "}
                    <span className="font-mono text-indigo-200/70">
                      desc_variant
                    </span>
                    .
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={`${row.descVariantId ?? "x"}-${row.productId}`}>
                    <td className="px-4 py-3 font-mono text-xs text-white/70">
                      {row.descVariantId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {previewShort(row.shortDescription)}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {preview(row.rulesHtml ?? row.rules)}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {preview(row.descriptionHtml ?? row.description)}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openView(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sky-300 hover:bg-sky-500/15"
                          aria-label="Xem nội dung"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300 hover:bg-white/10"
                          aria-label="Sửa nội dung"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        {row.descVariantId != null && row.descVariantId > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteError(null);
                              setDeleteTarget(row);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-300 hover:bg-rose-500/15"
                            aria-label="Xóa desc_variant"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>

        <div className="border-t border-white/10 px-4 py-3">
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <CreateDescVariantModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {viewing ? (
        <DescVariantViewModal item={viewing} onClose={closeView} />
      ) : null}

      {editing && (
        <DescVariantEditModal
          item={editing}
          saving={saving}
          saveError={saveError}
          onClose={closeEdit}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => {
          if (!deleteSubmitting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
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
};
