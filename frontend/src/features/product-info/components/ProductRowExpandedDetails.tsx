import React from "react";
import { MergedProduct } from "../utils/productInfoHelpers";
import { ProductAvatar } from "./ProductAvatar";

type ProductRowExpandedDetailsProps = {
  item: MergedProduct;
  expandedStateClass: string;
  rulesHtml: string;
  descriptionHtml: string;
};

export const ProductRowExpandedDetails: React.FC<ProductRowExpandedDetailsProps> = ({
  item,
  expandedStateClass,
  rulesHtml,
  descriptionHtml,
}) => (
  <tr className={`product-info-surface__expanded-row ${expandedStateClass}`}>
    <td colSpan={7} className="px-6 py-4">
      <div className="mb-3 flex flex-col items-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-white">Th?ng tin chi ti?t</p>
        <p className="mt-2 leading-relaxed text-white/80">
          {item.packageProduct ||
            item.productName ||
            item.productId ||
            "Kh?ng c? th?ng tin chi ti?t."}
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white md:w-64">
          <ProductAvatar item={item} size="large" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white">Quy t?c b?n h?ng</p>
            <div
              className="rich-display mt-2 break-words leading-relaxed text-white/80"
              dangerouslySetInnerHTML={{ __html: rulesHtml }}
            />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white">Th?ng tin s?n ph?m</p>
            <div
              className="rich-display mt-2 break-words leading-relaxed text-white/80"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </div>
      </div>
    </td>
  </tr>
);
