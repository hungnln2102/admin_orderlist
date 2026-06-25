import React from "react";
import { MergedProduct, resolveVariantDisplayImageUrl } from "../utils/productInfoHelpers";

type ProductAvatarProps = {
  item: MergedProduct;
  size?: "small" | "large";
};

export const ProductAvatar: React.FC<ProductAvatarProps> = ({ item, size = "small" }) => {
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
