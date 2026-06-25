import React from "react";
import {
  MergedProduct,
  htmlToPlainText,
  sanitizeHtmlForDisplay,
  splitCombinedContent,
  toHtmlFromPlain,
  variantHasDescVariantLinked,
} from "../utils/productInfoHelpers";
import { ProductAvatar } from "./ProductAvatar";
import { ProductRowActions } from "./ProductRowActions";
import { ProductRowExpandedDetails } from "./ProductRowExpandedDetails";

type ProductRowProps = {
  item: MergedProduct;
  isExpanded: boolean;
  onToggle: (id: number | null) => void;
  onEdit: (item: MergedProduct) => void;
};

export const ProductRow: React.FC<ProductRowProps> = ({
  item,
  isExpanded,
  onToggle,
  onEdit,
}) => {
  const displayName =
    item.packageProduct || item.productName || item.productId || "--";
  const categoryLabel = (item.packageName || "").trim();
  const rawRulesHtml = item.rulesHtml || toHtmlFromPlain(item.rules || "");
  const rawDescriptionHtml =
    item.descriptionHtml || toHtmlFromPlain(item.description || "");
  const {
    rulesHtml: displayRulesHtml,
    descriptionHtml: displayDescriptionHtml,
  } = splitCombinedContent(rawRulesHtml, rawDescriptionHtml);
  const safeRulesHtml =
    sanitizeHtmlForDisplay(displayRulesHtml) || "Không có thông tin bán hàng";
  const safeDescriptionHtml =
    sanitizeHtmlForDisplay(
      displayDescriptionHtml || toHtmlFromPlain(item.description || "")
    ) || "Không có thông tin sản phẩm";
  /** Ô bảng chỉ hiển thị text thuần (không in đậm/HTML). Chi tiết mở rộng vẫn dùng HTML. */
  const previewRulesPlain =
    htmlToPlainText(safeRulesHtml).replace(/\s+/g, " ").trim() ||
    "Không có thông tin bán hàng";
  const previewDescriptionPlain =
    htmlToPlainText(safeDescriptionHtml).replace(/\s+/g, " ").trim() ||
    "Không có thông tin sản phẩm";
  /** Màu nền: gắn desc_variant (id_desc) vs chưa gắn — lấy từ bảng variant qua /api/products. */
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
        className={`product-row product-info-surface__row ${rowStateClass} ${
          isExpanded ? "product-row--expanded" : ""
        } cursor-pointer`}
        onClick={() => onToggle(isExpanded ? null : Number(item.id))}
      >
        <td className="product-row__cell px-4 py-3">
          <ProductAvatar item={item} />
        </td>

        <td className="px-4 py-3 text-white">
          <div className="flex flex-col">
            <span className="font-semibold text-white">
              {item.productId || "--"}
            </span>
          </div>
        </td>

        <td className="px-4 py-3 text-white">{displayName || "--"}</td>

        <td className="min-w-[160px] border-r border-white/10 px-4 py-3 text-white/80">
          <span className="block truncate" title={categoryLabel || undefined}>
            {categoryLabel || "--"}
          </span>
        </td>

        <td className="min-w-[240px] border-r border-white/10 px-5 py-3 pr-5 align-top text-white/80">
          <span
            className="block break-words"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={previewRulesPlain}
          >
            {previewRulesPlain}
          </span>
        </td>

        <td className="min-w-[240px] border-r border-white/10 px-5 py-3 pl-5 align-top text-white/80">
          <span
            className="block break-words"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={previewDescriptionPlain}
          >
            {previewDescriptionPlain}
          </span>
        </td>

        <ProductRowActions
          item={item}
          isExpanded={isExpanded}
          onToggle={onToggle}
          onEdit={onEdit}
        />
      </tr>

      {isExpanded && (
        <ProductRowExpandedDetails
          item={item}
          expandedStateClass={expandedStateClass}
          rulesHtml={safeRulesHtml}
          descriptionHtml={safeDescriptionHtml}
        />
      )}
    </React.Fragment>
  );
};
