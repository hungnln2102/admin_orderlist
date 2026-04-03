import { roundGiaBanValue } from "@/lib/helpers";
import { VARIANT_PRICING_COLS } from "@/lib/tableSql";
import {
  calculateSellingPriceFromMarginInput,
  getDiscountRatioInput,
} from "@/shared/utils/pricing";
import type { ApiPriceEntry } from "../types";
import { parseDurationFromSku } from "./quoteApiParsing";
import {
  normalizeProductKey,
  toNumber,
} from "./quoteNormalize";

export const computeLinePricing = (
  apiPricing: ApiPriceEntry | undefined,
  selected: {
    basePrice?: number;
    unitPrice?: number;
    pctPromo?: number;
    pctKhach?: number;
    pctCtv?: number;
    wholesalePrice?: number;
  }
) => {
  if (apiPricing) {
    const unitPrice = roundGiaBanValue(apiPricing.price || 0);
    const promoPrice = roundGiaBanValue(apiPricing.promoPrice || 0);
    const discount =
      promoPrice > 0 && unitPrice > 0 && promoPrice < unitPrice
        ? roundGiaBanValue(unitPrice - promoPrice)
        : 0;
    return { unitPrice, discount };
  }

  const basePrice = selected?.basePrice ?? 0;
  const fallbackRetailPrice = selected?.unitPrice ?? basePrice;
  const wholesalePrice =
    selected?.wholesalePrice && selected.wholesalePrice > 0
      ? selected.wholesalePrice
      : basePrice > 0 && basePrice < fallbackRetailPrice
        ? calculateSellingPriceFromMarginInput(basePrice, selected?.pctCtv) ??
          fallbackRetailPrice
        : fallbackRetailPrice;
  const retailPrice = roundGiaBanValue(
    calculateSellingPriceFromMarginInput(wholesalePrice, selected?.pctKhach) ??
      fallbackRetailPrice
  );
  const pctPromoDecimal = getDiscountRatioInput(selected?.pctPromo) ?? 0;
  const discount =
    pctPromoDecimal > 0
      ? roundGiaBanValue(retailPrice * pctPromoDecimal)
      : 0;
  return { unitPrice: retailPrice, discount };
};

export const buildProductOptions = (
  productPrices: Record<string, any>[],
  priceMap: Record<string, ApiPriceEntry>
) => {
  const seen = new Set<string>();
  const options: Array<{
    value: string;
    productDisplay: string;
    packageDisplay: string;
    label: string;
    durationMonths: number | null;
    durationDays: number | null;
    term: string;
    unitPrice: number;
    discountValue: number;
    pctPromo: number;
    pctKhach: number;
    pctCtv: number;
    wholesalePrice: number;
    productId: string;
    basePrice?: number;
    promoPrice?: number;
  }> = [];

  productPrices.forEach((row) => {
    const sanPham =
      (row?.[VARIANT_PRICING_COLS.code] as string) ||
      (row?.san_pham as string) ||
      "";
    const value = sanPham.trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const durationInfo = parseDurationFromSku(value);

    const pctKhachRaw = toNumber(
      row?.pct_khach ?? row?.[VARIANT_PRICING_COLS.pctKhach]
    );
    const pctCtvRaw = toNumber(
      row?.pct_ctv ?? row?.[VARIANT_PRICING_COLS.pctCtv]
    );
    const pctPromoRaw = toNumber(
      row?.pct_promo ?? row?.[VARIANT_PRICING_COLS.pctPromo]
    );
    const pctPromo = getDiscountRatioInput(pctPromoRaw) ?? 0;
    const baseSupply = toNumber(row?.max_supply_price);
    const wholesaleRaw =
      calculateSellingPriceFromMarginInput(baseSupply, pctCtvRaw) ?? baseSupply;
    const wholesaleRounded =
      wholesaleRaw > 0 ? roundGiaBanValue(wholesaleRaw) : 0;

    const retailBase =
      toNumber(
        row?.computed_retail_price ??
          row?.retail_price ??
          row?.gia_le ??
          row?.gia_ban
      ) || 0;
    const promoBase =
      toNumber(
        row?.computed_promo_price ??
          row?.promo_price ??
          row?.gia_khuyen_mai ??
          row?.gia_km
      ) || 0;

    const retailPriceRaw =
      calculateSellingPriceFromMarginInput(wholesaleRounded, pctKhachRaw) ??
      retailBase ??
      promoBase ??
      wholesaleRounded;
    const retailPrice = roundGiaBanValue(retailPriceRaw);
    const promoPriceRaw = retailPrice * (1 - pctPromo);
    const promoRounded = roundGiaBanValue(promoPriceRaw);
    const promoClamped = Math.min(
      retailPrice,
      wholesaleRounded > 0
        ? Math.max(wholesaleRounded, promoRounded)
        : promoRounded
    );
    const discountValue = promoClamped > 0 ? retailPrice - promoClamped : 0;
    const unitPrice = retailPrice;

    const packageProduct =
      (row?.[VARIANT_PRICING_COLS.variantName] as string) ||
      (row?.package_product as string) ||
      (row?.package_product_label as string) ||
      "";

    const label = packageProduct
      ? `${packageProduct} (${value})`
      : row?.package
        ? `${row?.package} (${value})`
        : value;

    const priceKey = normalizeProductKey(value);
    const apiPrice = priceMap[priceKey];

    options.push({
      productId: value,
      value,
      productDisplay: row?.package || value,
      packageDisplay: packageProduct || row?.package || value,
      label,
      durationMonths: durationInfo.months,
      durationDays: durationInfo.days,
      term: durationInfo.days ? `${durationInfo.days} ngày` : "",
      unitPrice: retailPrice,
      discountValue,
      basePrice: baseSupply || wholesaleRounded || retailBase || retailPrice,
      promoPrice: apiPrice?.promoPrice ?? 0,
      pctPromo: pctPromoRaw,
      pctKhach: pctKhachRaw,
      pctCtv: pctCtvRaw,
      wholesalePrice: wholesaleRounded,
    });
  });

  return options.sort((a, b) => a.label.localeCompare(b.label, "vi"));
};
