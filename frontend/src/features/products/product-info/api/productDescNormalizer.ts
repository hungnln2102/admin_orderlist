import type { ProductDescription } from "./productDescTypes";

export const normalizeSavedProductDescription = (
  data: Record<string, unknown>
): ProductDescription => {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      if (key in data) return data[key];
    }
    return undefined;
  };
  const toStringOrEmpty = (value: unknown) =>
    typeof value === "string" ? value : String(value ?? "");
  const toStringOrNull = (value: unknown) =>
    value == null ? null : typeof value === "string" ? value : String(value);

  const descVariantRaw = pick("descVariantId", "desc_variant_id");
  const descVariantId = (() => {
    if (descVariantRaw == null || descVariantRaw === "") return null;
    const n = Number(descVariantRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  return {
    id: Number(pick("id")) || 0,
    descVariantId,
    productId: toStringOrEmpty(pick("productId", "product_id")),
    productName: toStringOrNull(pick("productName", "product_name")),
    rules: toStringOrEmpty(pick("rules")),
    rulesHtml: toStringOrEmpty(pick("rulesHtml", "rules")),
    description: toStringOrEmpty(pick("description")),
    descriptionHtml: toStringOrEmpty(pick("descriptionHtml", "description")),
    shortDescription: toStringOrNull(
      pick("shortDescription", "shortDesc", "short_desc")
    ),
    imageUrl: toStringOrNull(pick("imageUrl", "image_url")),
    packageImageUrl: toStringOrNull(
      pick("packageImageUrl", "package_image_url")
    ),
  };
};

