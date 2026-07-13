import React from "react";
import { EyeIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import {
  MergedProduct,
  htmlToPlainText,
  sanitizeHtmlForDisplay,
  splitCombinedContent,
  toHtmlFromPlain,
  variantHasDescVariantLinked,
  resolveVariantDisplayImageUrl,
} from "../../utils/productInfoHelpers";

// ============================================================================
// 1. PRODUCT AVATAR
// ============================================================================
type ProductAvatarProps = {
  item: MergedProduct;
  size?: "small" | "large";
};
const ProductAvatar: React.FC<ProductAvatarProps> = ({ item, size = "small" }) => {
  const displayName = item.productName || item.productId || "--";
  const dimensions = size === "large" ? "h-32 w-32 text-2xl" : "h-12 w-12 text-xs";
  const thumbUrl = resolveVariantDisplayImageUrl(item);

  if (!thumbUrl) return null;

  return (
    <img
      src={thumbUrl}
      alt={displayName}
      className={`${dimensions} rounded-md object-cover`}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
};

// ============================================================================
// 2. PRODUCT CARD (MOBILE VIEW)
// ============================================================================
type ProductCardProps = {
  item: MergedProduct;
  onEdit: (item: MergedProduct) => void;
  onView?: (item: MergedProduct) => void;
};
const ProductCard: React.FC<ProductCardProps> = ({ item, onEdit, onView }) => {
  const displayName = item.packageProduct || item.productName || item.productId || "--";
  const categoryLabel = (item.packageName || "").trim();
  const safeRulesHtml = sanitizeHtmlForDisplay(
    item.rulesHtml || toHtmlFromPlain(item.rules || "")
  ) || "Không có thông tin bán hàng";
  const safeDescriptionHtml = sanitizeHtmlForDisplay(
    item.descriptionHtml || toHtmlFromPlain(item.description || "")
  ) || "Không có thông tin sản phẩm";
  
  const previewRulesPlain = htmlToPlainText(safeRulesHtml).replace(/\s+/g, " ").trim() || "Không có thông tin bán hàng";
  const previewDescriptionPlain = htmlToPlainText(safeDescriptionHtml).replace(/\s+/g, " ").trim() || "Không có thông tin sản phẩm";
  
  const cardThumbUrl = resolveVariantDisplayImageUrl(item);
  const hasDescLinked = variantHasDescVariantLinked(item);
  const isInactive = item.isActive === false;
  const cardStateClass = isInactive
    ? "product-card--inactive"
    : hasDescLinked
      ? "product-card--has-desc"
      : "product-card--no-desc";

  return (
    <div className={`product-card glass-panel-dark rounded-2xl border border-white/5 p-4 space-y-4 shadow-xl ${cardStateClass}`}>
      <div className="product-card__header flex items-start gap-3">
        {cardThumbUrl ? (
          <img
            src={cardThumbUrl}
            alt={displayName}
            className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base truncate">{displayName}</h3>
          <p className="text-sm text-white/70 mt-1">Mã: {item.productId || "--"}</p>
          {categoryLabel && <p className="text-xs text-white/60 mt-1">Danh mục: {categoryLabel}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Quy tắc bán hàng</p>
        <p className="text-sm text-white/70 line-clamp-2" title={previewRulesPlain}>{previewRulesPlain}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Mô tả</p>
        <p className="text-sm text-white/70 line-clamp-2" title={previewDescriptionPlain}>{previewDescriptionPlain}</p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
        {onView && (
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 text-blue-400 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all active:scale-95"
            title="Xem"
            type="button"
            onClick={() => onView(item)}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        )}
        <button
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 text-emerald-400 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all active:scale-95"
          title="Sửa"
          type="button"
          onClick={() => onEdit(item)}
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 text-rose-400 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all active:scale-95"
          title="Xóa"
          type="button"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 3. PRODUCT ROW & DETAILS (DESKTOP VIEW)
// ============================================================================
type ProductRowProps = {
  item: MergedProduct;
  isExpanded: boolean;
  onToggle: (id: number | null) => void;
  onEdit: (item: MergedProduct) => void;
};
const ProductRow: React.FC<ProductRowProps> = ({ item, isExpanded, onToggle, onEdit }) => {
  const displayName = item.packageProduct || item.productName || item.productId || "--";
  const categoryLabel = (item.packageName || "").trim();
  const rawRulesHtml = item.rulesHtml || toHtmlFromPlain(item.rules || "");
  const rawDescriptionHtml = item.descriptionHtml || toHtmlFromPlain(item.description || "");
  const { rulesHtml: displayRulesHtml, descriptionHtml: displayDescriptionHtml } = splitCombinedContent(rawRulesHtml, rawDescriptionHtml);
  
  const safeRulesHtml = sanitizeHtmlForDisplay(displayRulesHtml) || "Không có thông tin bán hàng";
  const safeDescriptionHtml = sanitizeHtmlForDisplay(displayDescriptionHtml || toHtmlFromPlain(item.description || "")) || "Không có thông tin sản phẩm";
  
  const previewRulesPlain = htmlToPlainText(safeRulesHtml).replace(/\s+/g, " ").trim() || "Không có thông tin bán hàng";
  const previewDescriptionPlain = htmlToPlainText(safeDescriptionHtml).replace(/\s+/g, " ").trim() || "Không có thông tin sản phẩm";
  
  const hasDescLinked = variantHasDescVariantLinked(item);
  const isInactive = item.isActive === false;
  
  const rowStateClass = isInactive
    ? "product-row--inactive"
    : hasDescLinked
      ? "product-row--has-desc"
      : "product-row--no-desc";
      
  const expandedStateClass = isInactive
    ? "product-info-surface__expanded-row--inactive"
    : hasDescLinked
      ? "product-info-surface__expanded-row--has-desc"
      : "product-info-surface__expanded-row--no-desc";

  return (
    <React.Fragment key={`${item.id}-${item.productId}`}>
      <tr
        className={`product-row product-info-surface__row ${rowStateClass} ${isExpanded ? "product-row--expanded" : ""} cursor-pointer`}
        onClick={() => onToggle(isExpanded ? null : Number(item.id))}
      >
        <td className="product-row__cell px-4 py-3"><ProductAvatar item={item} /></td>
        <td className="px-4 py-3 text-white">
          <div className="flex flex-col">
            <span className="font-semibold text-white">{item.productId || "--"}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-white">{displayName || "--"}</td>
        <td className="min-w-[160px] border-r border-white/10 px-4 py-3 text-white/80">
          <span className="block truncate" title={categoryLabel || undefined}>{categoryLabel || "--"}</span>
        </td>
        <td className="min-w-[240px] border-r border-white/10 px-5 py-3 pr-5 align-top text-white/80">
          <span className="block break-words" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={previewRulesPlain}>
            {previewRulesPlain}
          </span>
        </td>
        <td className="min-w-[240px] border-r border-white/10 px-5 py-3 pl-5 align-top text-white/80">
          <span className="block break-words" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={previewDescriptionPlain}>
            {previewDescriptionPlain}
          </span>
        </td>
        <td className="product-row__actions px-4 py-3 text-center align-top whitespace-nowrap">
          <button
            className="product-info-action-button product-info-action-button--view inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/10 active:scale-90"
            title="Xem"
            type="button"
            onClick={(event) => { event.stopPropagation(); onToggle(isExpanded ? null : Number(item.id)); }}
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="product-info-action-button product-info-action-button--edit ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 active:scale-90"
            title="Sửa"
            type="button"
            onClick={(event) => { event.stopPropagation(); onEdit(item); }}
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="product-info-action-button product-info-action-button--delete ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 active:scale-90"
            title="Xóa"
            type="button"
            onClick={(event) => { event.stopPropagation(); }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className={`product-info-surface__expanded-row ${expandedStateClass}`}>
          <td colSpan={7} className="px-6 py-4">
            <div className="mb-3 flex flex-col items-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-white">Thông tin chi tiết</p>
              <p className="mt-2 leading-relaxed text-white/80">{displayName}</p>
            </div>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white md:w-64">
                <ProductAvatar item={item} size="large" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Quy tắc bán hàng</p>
                  <div className="rich-display mt-2 break-words leading-relaxed text-white/80" dangerouslySetInnerHTML={{ __html: safeRulesHtml }} />
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Thông tin sản phẩm</p>
                  <div className="rich-display mt-2 break-words leading-relaxed text-white/80" dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }} />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

// ============================================================================
// 4. MAIN PRODUCT TABLE
// ============================================================================
type ProductTableProps = {
  products: MergedProduct[];
  mergedTotal: number;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  expandedId: number | null;
  onToggleExpand: (id: number | null) => void;
  onEdit: (item: MergedProduct) => void;
};

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  mergedTotal,
  loading,
  currentPage,
  pageSize,
  onPageChange,
  expandedId,
  onToggleExpand,
  onEdit,
}) => {
  return (
    <div className="product-table product-info-surface overflow-hidden rounded-[32px] border border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
      <div className="product-table__header product-info-surface__header flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="product-table__title product-info-surface__title text-lg font-semibold text-white">
          Sản phẩm
        </h2>
        {loading && (
          <span className="product-table__loading product-info-surface__meta text-xs text-white/60">
            Đang tải...
          </span>
        )}
      </div>

      <ResponsiveTable
        className="product-info-surface__table-wrap"
        showCardOnMobile={true}
        cardView={
          <TableCard
            data={products}
            renderCard={(item) => <ProductCard item={item} onEdit={onEdit} />}
            className="product-info-surface__mobile-cards p-2"
          />
        }
      >
        <table className="product-table__table product-info-surface__table min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%", minWidth: "160px" }} />
            <col style={{ width: "22%", minWidth: "240px" }} />
            <col style={{ width: "21%", minWidth: "240px" }} />
            <col style={{ width: "7%", minWidth: "120px" }} />
          </colgroup>
          <thead className="product-table__head product-info-surface__head bg-white/5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/40">
            <tr>
              <th className="product-table__th px-4 py-3 text-left font-semibold">Hình ảnh</th>
              <th className="px-4 py-3 text-left font-semibold">Mã sản phẩm</th>
              <th className="px-4 py-3 text-left font-semibold">Tên sản phẩm</th>
              <th className="min-w-[160px] border-r border-white/10 px-4 py-3 text-left font-semibold">Danh mục</th>
              <th className="min-w-[240px] border-r border-white/10 px-5 py-3 text-left font-semibold">Quy tắc</th>
              <th className="min-w-[240px] border-r border-white/10 px-5 py-3 text-left font-semibold">Mô tả</th>
              <th className="min-w-[120px] px-4 py-3 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="product-info-surface__body divide-y divide-white/5">
            {products.map((item) => (
              <ProductRow
                key={`${item.id}-${item.productId}`}
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={onToggleExpand}
                onEdit={onEdit}
              />
            ))}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-white/70">
                  Không có sản phẩm nào được hiển thị.
                </td>
              </tr>
            )}
            {loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-white/80">
                  Đang tải danh sách sản phẩm...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveTable>

      <div className="product-info-surface__footer border-t border-white/10 px-4 py-3">
        <Pagination
          className="product-info-pagination"
          currentPage={currentPage}
          totalItems={mergedTotal}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};
