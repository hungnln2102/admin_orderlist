import React, { useEffect, useState } from "react";
import { EyeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CategoryRow } from "../types";
import { getCategoryPillVisualStyle } from "../utils/categoryColors";

function categoryTableImageSrc(url: string, listEpoch: number): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";
  const separator = trimmedUrl.includes("?") ? "&" : "?";
  return `${trimmedUrl}${separator}_cv=${listEpoch}`;
}

type PackageCellThumbProps = {
  url: string;
  listEpoch: number;
  alt: string;
};

const PackageCellThumb: React.FC<PackageCellThumbProps> = ({
  url,
  listEpoch,
  alt,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url, listEpoch]);

  if (!url.trim() || failed) return null;

  return (
    <img
      key={`${url}-${listEpoch}`}
      src={categoryTableImageSrc(url, listEpoch)}
      alt={alt}
      className="h-12 w-12 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
};

type CategoryTableRowProps = {
  group: CategoryRow;
  expanded: boolean;
  listDisplayEpoch: number;
  onToggleExpanded: (key: string) => void;
  onEditCategory: (group: CategoryRow) => void;
};

export const CategoryTableRow: React.FC<CategoryTableRowProps> = ({
  group,
  expanded,
  listDisplayEpoch,
  onToggleExpanded,
  onEditCategory,
}) => (
  <React.Fragment>
    <tr className="product-info-surface__row hover:bg-white/5">
      <td className="px-4 py-3">
        <PackageCellThumb
          url={group.imageUrl || ""}
          listEpoch={listDisplayEpoch}
          alt={group.packageName}
        />
      </td>

      <td className="px-4 py-3 font-semibold text-white">
        {group.packageName}
      </td>

      <td className="px-4 py-3 text-white/80">
        <div className="flex flex-wrap gap-2">
          {(group.categories || []).map((category, index) => (
            <span
              key={`${group.key}-${category.id || category.name}`}
              className="category-pill"
              style={getCategoryPillVisualStyle(category, index)}
            >
              {category.name}
            </span>
          ))}
        </div>
      </td>

      <td className="px-4 py-3 text-center">
        <button
          className="product-info-action-button product-info-action-button--view inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10"
          title="Xem"
          type="button"
          onClick={() => onToggleExpanded(group.key)}
        >
          <EyeIcon className="h-5 w-5 text-blue-400" />
        </button>

        <button
          className="product-info-action-button product-info-action-button--edit ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10"
          title="Chỉnh sửa"
          type="button"
          onClick={() => onEditCategory(group)}
        >
          <PencilSquareIcon className="h-5 w-5 text-green-400" />
        </button>
      </td>
    </tr>

    {expanded && (
      <tr className="product-info-surface__expanded-row bg-white/5">
        <td colSpan={4} className="px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => {
              const productCode = item.productId || "";
              const productLabel =
                item.packageProduct || item.productName || item.productId || "";

              return (
                <div
                  key={`${group.key}-${item.id}-${item.productId}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-white">
                    {productCode}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {productLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
);
