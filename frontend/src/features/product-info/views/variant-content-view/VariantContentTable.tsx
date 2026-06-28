import React from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveTable,
  TableCard,
} from "@/components/ui/ResponsiveTable";
import type { ProductDescription } from "@/features/product-info/api/productDescApi";
import { htmlToPlainText } from "@/shared/html";

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

type VariantContentTableProps = {
  items: ProductDescription[];
  loading: boolean;
  onView: (item: ProductDescription) => void;
  onEdit: (item: ProductDescription) => void;
  onDelete: (item: ProductDescription) => void;
};

type VariantContentActionsProps = {
  item: ProductDescription;
  onView: (item: ProductDescription) => void;
  onEdit: (item: ProductDescription) => void;
  onDelete: (item: ProductDescription) => void;
  deleteLabel: string;
  stopDeletePropagation?: boolean;
};

const VariantContentActions: React.FC<VariantContentActionsProps> = ({
  item,
  onView,
  onEdit,
  onDelete,
  deleteLabel,
  stopDeletePropagation = false,
}) => (
  <div className="flex flex-wrap items-center justify-center gap-1">
    <button
      type="button"
      onClick={() => onView(item)}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sky-300 hover:bg-sky-500/15"
      aria-label="Xem nội dung"
    >
      <EyeIcon className="h-4 w-4" />
    </button>
    <button
      type="button"
      onClick={() => onEdit(item)}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300 hover:bg-white/10"
      aria-label="Sửa nội dung"
    >
      <PencilSquareIcon className="h-4 w-4" />
    </button>
    {item.descVariantId != null && item.descVariantId > 0 ? (
      <button
        type="button"
        onClick={(event) => {
          if (stopDeletePropagation) event.stopPropagation();
          onDelete(item);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-300 hover:bg-rose-500/15"
        aria-label={deleteLabel}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    ) : null}
  </div>
);

const VariantContentCard: React.FC<Omit<VariantContentTableProps, "items" | "loading"> & { item: ProductDescription }> = ({
  item,
  onView,
  onEdit,
  onDelete,
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="font-mono text-xs text-white/70">
          ID {item.descVariantId != null ? item.descVariantId : "—"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <VariantContentActions
          item={item}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          deleteLabel="Xóa"
        />
      </div>
    </div>
    <p className="mt-2 text-xs text-white/55">
      Mô tả ngắn: {previewShort(item.shortDescription)}
    </p>
    <p className="mt-1 text-xs text-white/55">
      Quy tắc: {preview(item.rulesHtml ?? item.rules)}
    </p>
    <p className="mt-1 text-xs text-white/55">
      Mô tả: {preview(item.descriptionHtml ?? item.description)}
    </p>
  </div>
);

export const VariantContentTable: React.FC<VariantContentTableProps> = ({
  items,
  loading,
  onView,
  onEdit,
  onDelete,
}) => (
  <ResponsiveTable
    className="product-info-surface__table-wrap"
    showCardOnMobile={true}
    cardView={
      <TableCard
        data={items as unknown as Record<string, unknown>[]}
        renderCard={(row) => (
          <VariantContentCard
            item={row as unknown as ProductDescription}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
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
          <th className="px-4 py-3 text-left font-semibold">Mô tả ngắn</th>
          <th className="px-4 py-3 text-left font-semibold">Quy tắc</th>
          <th className="px-4 py-3 text-left font-semibold">Mô tả</th>
          <th className="px-2 py-3 text-center font-semibold">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {items.length === 0 && !loading ? (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-white/50">
              Chưa có dòng nào. Dùng nút Thêm thông tin sản phẩm ở trên để tạo bản ghi{" "}
              <span className="font-mono text-indigo-200/70">desc_variant</span>.
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
                <VariantContentActions
                  item={row}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  deleteLabel="Xóa desc_variant"
                  stopDeletePropagation
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </ResponsiveTable>
);
