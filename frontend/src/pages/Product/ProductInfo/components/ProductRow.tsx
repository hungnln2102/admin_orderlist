import React from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  MergedProduct,
  getInitials,
  sanitizeHtmlForDisplay,
  splitCombinedContent,
  stripDurationSuffix,
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
  const initials = getInitials(displayName);
  const dimensions =
    size === "large" ? "w-32 h-32 text-2xl" : "w-12 h-12 text-xs";
  const baseClasses =
    "rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold";

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

  return (
    <div className={`${dimensions} ${baseClasses}`}>
      <span>{initials}</span>
    </div>
  );
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
  const { rulesHtml: displayRulesHtml, descriptionHtml: displayDescriptionHtml } =
    splitCombinedContent(rawRulesHtml, rawDescriptionHtml);
  const safeRulesHtml =
    sanitizeHtmlForDisplay(displayRulesHtml) || "Không có thông tin bán hàng";
  const safeDescriptionHtml =
    sanitizeHtmlForDisplay(
      displayDescriptionHtml || toHtmlFromPlain(item.description || "")
    ) || "Không có thông tin sản phẩm";

  return (
    <React.Fragment key={`${item.id}-${item.productId}`}>
      <tr
        className={`hover:bg-white/5 cursor-pointer ${
          isExpanded ? "bg-white/5" : ""
        }`}
        onClick={() => onToggle(isExpanded ? null : Number(item.id))}
      >
        <td className="px-4 py-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={displayName}
              className="h-12 w-12 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/48?text=No+Image";
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center text-white/50 text-xs">
              No Image
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-white">
          <div className="flex flex-col">
            <span className="font-semibold text-white">
              {stripDurationSuffix(item.productId || "") || "--"}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-white">
          {stripDurationSuffix(displayName) || "--"}
        </td>
        <td className="px-4 py-3 text-white/80 border-r border-white/10 min-w-[160px]">
          <span className="block truncate" title={categoryLabel || undefined}>
            {categoryLabel || "--"}
          </span>
        </td>
        <td className="px-5 py-3 pr-5 text-white/80 align-top border-r border-white/10 min-w-[240px]">
          <span
            className="block whitespace-pre-line break-words rich-display"
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
        <td className="px-5 py-3 pl-5 text-white/80 align-top border-r border-white/10 min-w-[240px]">
          <span
            className="block whitespace-pre-line break-words rich-display"
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
        <td className="px-4 py-3 space-x-2 whitespace-nowrap text-center align-top">
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title="Xem"
            type="button"
          >
            <EyeIcon className="h-5 w-5 text-blue-400" />
          </button>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title="Sửa"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(item);
            }}
          >
            <PencilSquareIcon className="h-5 w-5 text-green-400" />
          </button>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title="Xóa"
            type="button"
          >
            <TrashIcon className="h-5 w-5 text-red-400" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-white/5">
          <td colSpan={6} className="px-6 py-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-3 flex flex-col items-center text-center">
              <p className="text-sm font-semibold text-white">
                Thông tin chi tiết
              </p>
              <p className="mt-2 text-white/80 leading-relaxed">
                {stripDurationSuffix(
                  item.packageProduct || item.productName || item.productId || ""
                ) || "Không có thông tin chi tiết."}
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-64 rounded-lg border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center text-white">
                <ProductAvatar item={item} size="large" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    Quy tắc bán hàng
                  </p>
                  <div
                    className="mt-2 text-white/80 leading-relaxed break-words rich-display"
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
                    className="mt-2 text-white/80 leading-relaxed break-words rich-display"
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
