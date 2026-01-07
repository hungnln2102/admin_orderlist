import { roundGiaBanValue } from "../../../lib/helpers";
import { VARIANT_PRICING_COLS } from "../../../lib/tableSql";

export type QuoteLine = {
  id: string;
  productCode?: string;
  product: string;
  packageName: string;
  term: string;
  durationMonths?: number | null;
  durationDays?: number | null;
  unitPrice: number;
  quantity: number;
  discount?: number;
  note?: string;
};

export type QuoteLineWithTotal = QuoteLine & { total: number };

export type ProductDesc = {
  productId: string;
  rules?: string | null;
  description?: string | null;
};

export type ApiPriceEntry = {
  price: number;
  promoPrice: number;
  resellPrice?: number;
};

export const formatCurrency = (value: number): string =>
  value.toLocaleString("vi-VN");

export const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const normalizeKey = (value?: string | null) =>
  (value || "").trim().toLowerCase();

export const stripDurationSuffix = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  return raw.replace(/--\s*\d+\s*[md]\s*$/i, "").trim();
};

export const normalizeProductKey = (value?: string | null) =>
  (value || "").trim().toLowerCase();

export const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const parseApiPriceEntry = (data: any): ApiPriceEntry => {
  const customerPrice = safeNumber(data?.price);
  const resellPrice = safeNumber(data?.resellPrice);
  const promoPrice = safeNumber(data?.promoPrice);
  return {
    price: customerPrice || resellPrice || promoPrice || 0,
    promoPrice: promoPrice || 0,
    resellPrice: resellPrice || undefined,
  };
};

export const parseDurationFromSku = (
  value: string
): { months: number | null; days: number | null } => {
  if (!value) return { months: null, days: null };
  const match =
    value.match(/--\s*(\d+)\s*([md])\b/i) ||
    value.match(/(\d+)\s*([md])\b/i);
  if (!match || !match[1]) return { months: null, days: null };
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return { months: null, days: null };
  const unit = (match[2] || "").toLowerCase();
  if (unit === "d") return { months: null, days: num };
  if (unit === "m") return { months: num, days: null };
  return { months: null, days: null };
};

export const computeLinePricing = (
  apiPricing: ApiPriceEntry | undefined,
  selected: {
    basePrice?: number;
    unitPrice?: number;
    pctPromo?: number;
    pctKhach?: number;
    pctCtv?: number;
  }
) => {
  if (apiPricing) {
    const unitPrice = roundGiaBanValue(apiPricing.price || 0);
    const discount =
      apiPricing.promoPrice > 0
        ? roundGiaBanValue(apiPricing.promoPrice)
        : 0;
    return { unitPrice, discount };
  }

  const basePrice = selected?.basePrice ?? selected?.unitPrice ?? 0;
  const pctPromo =
    selected?.pctPromo !== undefined ? toNumber(selected.pctPromo) : 0;
  const pctPromoDecimal =
    pctPromo > 1 ? pctPromo / 100 : Math.max(0, pctPromo);
  const pctKhach =
    selected?.pctKhach !== undefined && selected?.pctKhach > 0
      ? selected.pctKhach
      : 1;
  const pctCtv =
    selected?.pctCtv !== undefined && selected?.pctCtv > 0
      ? selected.pctCtv
      : 1;

  const retailPrice = roundGiaBanValue(basePrice * pctKhach * pctCtv);
  const discount =
    pctPromoDecimal > 0
      ? roundGiaBanValue(retailPrice * pctPromoDecimal)
      : 0;
  return { unitPrice: retailPrice, discount };
};

export const htmlToPlainText = (value?: string | null): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const blockTags = new Set(["DIV", "P", "BR", "LI", "UL", "OL", "SECTION"]);
    const lines: string[] = [];

    const walk = (node: ChildNode, buffer: string[]) => {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer.push((node.textContent || "").replace(/\u00a0/g, " "));
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "BR") {
          buffer.push("\n");
          return;
        }
        const childBuffer: string[] = [];
        el.childNodes.forEach((child) => walk(child, childBuffer));
        const joined = childBuffer.join("");
        buffer.push(joined);
        if (blockTags.has(el.tagName)) {
          buffer.push("\n");
        }
      }
    };

    const rootBuffer: string[] = [];
    doc.body.childNodes.forEach((child) => walk(child, rootBuffer));
    return rootBuffer
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  } catch {
    return value || "";
  }
};

export const displayDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
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
    const pctCtvRaw = toNumber(row?.pct_ctv ?? row?.[VARIANT_PRICING_COLS.pctCtv]);
    const pctKhach =
      pctKhachRaw > 10 ? pctKhachRaw / 100 : pctKhachRaw > 0 ? pctKhachRaw : 1;
    const pctCtv =
      pctCtvRaw > 10 ? pctCtvRaw / 100 : pctCtvRaw > 0 ? pctCtvRaw : 1;
    const pctPromoRaw = toNumber(
      row?.pct_promo ?? row?.[VARIANT_PRICING_COLS.pctPromo]
    );
    const pctPromo =
      pctPromoRaw > 1 ? pctPromoRaw / 100 : Math.max(0, pctPromoRaw);
    const baseSupply = toNumber(row?.max_supply_price);

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

    const wholesaleRounded = baseSupply > 0 ? roundGiaBanValue(baseSupply) : 0;
    const fallbackRetail = retailBase || promoBase || wholesaleRounded;
    const retailPriceRaw =
      fallbackRetail *
      (pctCtv > 0 ? pctCtv : 1) *
      (pctKhach > 0 ? pctKhach : 1);
    const retailPrice = roundGiaBanValue(retailPriceRaw);
    const promoPriceRaw = retailPrice * (1 - pctPromo);
    const promoRounded = roundGiaBanValue(promoPriceRaw);
    const promoClamped = Math.min(
      retailPrice,
      wholesaleRounded > 0 ? Math.max(wholesaleRounded, promoRounded) : promoRounded
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
      term: durationInfo.days ? `${durationInfo.days} ngay` : "",
      unitPrice: retailPrice,
      discountValue,
      basePrice:
        apiPrice?.price ?? apiPrice?.resellPrice ?? retailBase ?? retailPrice,
      promoPrice: apiPrice?.promoPrice ?? 0,
      pctPromo,
      pctKhach,
      pctCtv,
      wholesalePrice: wholesaleRounded,
    });
  });

  return options.sort((a, b) => a.label.localeCompare(b.label, "vi"));
};
