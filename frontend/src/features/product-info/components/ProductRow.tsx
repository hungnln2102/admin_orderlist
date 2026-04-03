import React from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  MergedProduct,
  sanitizeHtmlForDisplay,
  splitCombinedContent,
  toHtmlFromPlain,
} from "../utils/productInfoHelpers";

type ProductRowProps = {
  item: MergedProduct;
  isExpanded: boolean;
  onToggle: (id: number | null) => void;
  onEdit: (item: MergedProduct) => void;
};

const ProductAvatar: React.FC<{
  item: MergedProduct;
  size?: "small" | "large";
}> = ({ item, size = "small" }) => {
  const displayName = item.productName || item.productId || "--";
  const dimensions =
    size === "large" ? "h-32 w-32 text-2xl" : "h-12 w-12 text-xs";

  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={displayName}
        className={`${dimensions} rounded-md object-cover`}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return null;
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

  return (
    <React.Fragment key={`${item.id}-${item.productId}`}>
      <tr
        className={`product-row product-info-surface__row ${
          isExpanded ? "product-row--expanded bg-white/5" : ""
        } cursor-pointer hover:bg-white/5`}
        onClick={() => onToggle(isExpanded ? null : Number(item.id))}
      >
        <td className="product-row__cell px-4 py-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={displayName}
              className="h-12 w-12 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
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
            className="rich-display block break-words whitespace-pre-line"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={item.rulesHtml ? undefined : item.rules || ""}
            dangerouslySetInnerHTML={{
              __html: safeRulesHtml,
            }}
          />
        </td>

        <td className="min-w-[240px] border-r border-white/10 px-5 py-3 pl-5 align-top text-white/80">
          <span
            className="rich-display block break-words whitespace-pre-line"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={item.descriptionHtml ? undefined : item.description || ""}
            dangerouslySetInnerHTML={{
              __html: safeDescriptionHtml,
            }}
          />
        </td>

        <td className="product-row__actions px-4 py-3 text-center align-top whitespace-nowrap">
          <button
            className="product-info-action-button product-info-action-button--view inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/10 active:scale-90"
            title="Xem"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(isExpanded ? null : Number(item.id));
            }}
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </button>

          <button
            className="product-info-action-button product-info-action-button--edit ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 active:scale-90"
            title="Sửa"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(item);
            }}
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>

          <button
            className="product-info-action-button product-info-action-button--delete ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 active:scale-90"
            title="Xóa"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="product-info-surface__expanded-row bg-white/5">
          <td colSpan={7} className="px-6 py-4">
            <div className="mb-3 flex flex-col items-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-white">Thông tin chi tiết</p>
              <p className="mt-2 leading-relaxed text-white/80">
                {item.packageProduct ||
                  item.productName ||
                  item.productId ||
                  "Không có thông tin chi tiết."}
              </p>
            </div>

            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white md:w-64">
                <ProductAvatar item={item} size="large" />
              </div>

              <div className="flex-1 space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    Quy tắc bán hàng
                  </p>
                  <div
                    className="rich-display mt-2 break-words leading-relaxed text-white/80"
                    dangerouslySetInnerHTML={{
                      __html:
                        sanitizeHtmlForDisplay(
                          splitCombinedContent(
                            item.rulesHtml || toHtmlFromPlain(item.rules || ""),
                            item.descriptionHtml ||
                              toHtmlFromPlain(item.description || "")
                          ).rulesHtml
                        ) || "Không có quy tắc bán hàng.",
                    }}
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    Thông tin sản phẩm
                  </p>
                  <div
                    className="rich-display mt-2 break-words leading-relaxed text-white/80"
                    dangerouslySetInnerHTML={{
                      __html:
                        sanitizeHtmlForDisplay(
                          splitCombinedContent(
                            item.rulesHtml || toHtmlFromPlain(item.rules || ""),
                            item.descriptionHtml ||
                              toHtmlFromPlain(item.description || "")
                          ).descriptionHtml ||
                            toHtmlFromPlain(item.description || "")
                        ) || "Không có thông tin sản phẩm.",
                    }}
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
