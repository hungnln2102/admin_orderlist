/**
 * ProductCard Component
 * Mobile-friendly card view for products
 */

import React from "react";
import {
  PencilSquareIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { MergedProduct, stripDurationSuffix, sanitizeHtmlForDisplay, toHtmlFromPlain } from "../utils/productInfoHelpers";

type ProductCardProps = {
  item: MergedProduct;
  onEdit: (item: MergedProduct) => void;
  onView?: (item: MergedProduct) => void;
};

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onEdit,
  onView,
}) => {
  const displayName = stripDurationSuffix(
    item.packageProduct || item.productName || item.productId || "--"
  );
  const categoryLabel = (item.packageName || "").trim();
  const safeRulesHtml = sanitizeHtmlForDisplay(
    item.rulesHtml || toHtmlFromPlain(item.rules || "")
  ) || "Không có thông tin bán hàng";
  const safeDescriptionHtml = sanitizeHtmlForDisplay(
    item.descriptionHtml || toHtmlFromPlain(item.description || "")
  ) || "Không có thông tin sản phẩm";

  return (
    <div className="product-card glass-panel-dark rounded-2xl p-4 border border-white/5 space-y-4 shadow-xl">
      <div className="product-card__header flex items-start gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={displayName}
            className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/64?text=No+Image";
            }}
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base truncate">
            {displayName}
          </h3>
          <p className="text-sm text-white/70 mt-1">
            Mã: {stripDurationSuffix(item.productId || "") || "--"}
          </p>
          {categoryLabel && (
            <p className="text-xs text-white/60 mt-1">
              Danh mục: {categoryLabel}
            </p>
          )}
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">
          Quy tắc bán hàng
        </p>
        <div
          className="text-sm text-white/70 line-clamp-2 rich-display"
          dangerouslySetInnerHTML={{ __html: safeRulesHtml }}
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">
          Mô tả
        </p>
        <div
          className="text-sm text-white/70 line-clamp-2 rich-display"
          dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
        />
      </div>

      {/* Actions */}
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
