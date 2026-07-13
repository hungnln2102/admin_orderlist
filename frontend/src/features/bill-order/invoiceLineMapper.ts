import { ORDER_CODE_PREFIXES } from "@/constants";
import { multiplyValue } from "@/shared/pricing";
import { ORDER_COLS, VARIANT_PRICING_COLS } from "@/lib/tableSql";
import {
  InvoiceEntry,
  InvoiceLine,
  OrderRow,
  ProductPriceRow,
  extractMonths,
  normalizeDiscountRatio,
  normalizeKey,
  resolveOrderType,
  stripVariantDurationSuffix,
  toPositiveNumber,
} from "./helpers";

export const buildOrderMap = (orders: OrderRow[]) => {
  const map = new Map<string, OrderRow>();
  orders.forEach((row) => {
    const key = normalizeKey(row?.[ORDER_COLS.idOrder] as string | null);
    if (key) {
      map.set(key, row);
    }
  });
  return map;
};

export const buildProductPriceMap = (productPrices: ProductPriceRow[]) => {
  const map = new Map<string, ProductPriceRow>();
  productPrices.forEach((row) => {
    const key = normalizeKey(row?.[VARIANT_PRICING_COLS.code] as string | null);
    if (key) {
      map.set(key, row);
    }
  });
  return map;
};

const resolveStudentUnitPrice = (
  wholesalePrice: number,
  product?: ProductPriceRow
) => {
  const pctStuRaw =
    product?.[VARIANT_PRICING_COLS.pctStu] ?? product?.pct_stu ?? null;
  const pctStuProvided =
    pctStuRaw !== null &&
    pctStuRaw !== undefined &&
    !(typeof pctStuRaw === "string" && String(pctStuRaw).trim() === "");
  const marginForStudent = pctStuProvided
    ? pctStuRaw
    : product?.[VARIANT_PRICING_COLS.pctKhach] ?? product?.pct_khach ?? null;
  const studentUnit = multiplyValue(wholesalePrice, marginForStudent);

  return typeof studentUnit === "number" &&
    Number.isFinite(studentUnit) &&
    studentUnit > 0
    ? studentUnit
    : wholesalePrice;
};

const resolveUnitPrice = (
  orderCode: unknown,
  entryCode: string,
  wholesalePrice: number,
  retailPrice: number,
  product?: ProductPriceRow
) => {
  const orderType = resolveOrderType(String(orderCode || entryCode));

  if (orderType === ORDER_CODE_PREFIXES.COLLABORATOR) {
    return wholesalePrice;
  }

  if (orderType === ORDER_CODE_PREFIXES.STUDENT) {
    return resolveStudentUnitPrice(wholesalePrice, product);
  }

  if (orderType === ORDER_CODE_PREFIXES.GIFT) {
    return 0;
  }

  if (
    orderType === ORDER_CODE_PREFIXES.CUSTOMER ||
    orderType === ORDER_CODE_PREFIXES.PROMO
  ) {
    return retailPrice;
  }

  return retailPrice || wholesalePrice;
};

const buildInvoiceLineDescription = (
  entryCode: string,
  order?: OrderRow,
  product?: ProductPriceRow
) => {
  const months =
    extractMonths(order?.[ORDER_COLS.idProduct] as string | null) ||
    extractMonths(product?.[VARIANT_PRICING_COLS.code] as string | null);
  const monthsLabel = months ? `${months} tháng` : "";
  const variantNameRaw = String(
    product?.[VARIANT_PRICING_COLS.variantName] || ""
  ).trim();
  const fallbackFromDisplay = stripVariantDurationSuffix(
    String(product?.[VARIANT_PRICING_COLS.code] || order?.[ORDER_COLS.idProduct] || "")
  );
  const baseName =
    variantNameRaw ||
    fallbackFromDisplay ||
    (product?.[VARIANT_PRICING_COLS.packageName] as string) ||
    entryCode;

  return monthsLabel ? `${baseName} ${monthsLabel}` : baseName;
};

export const buildInvoiceLines = (
  invoiceCodes: InvoiceEntry[],
  orderMap: Map<string, OrderRow>,
  productMap: Map<string, ProductPriceRow>
): InvoiceLine[] => {
  return invoiceCodes.map((entry) => {
    const order = orderMap.get(normalizeKey(entry.code));
    const productKey = normalizeKey(order?.[ORDER_COLS.idProduct] as string | null);
    const product = productMap.get(productKey);
    const wholesalePrice =
      toPositiveNumber(product?.computed_wholesale_price) ||
      toPositiveNumber(order?.[ORDER_COLS.price]);
    const retailPrice =
      toPositiveNumber(product?.computed_retail_price) || wholesalePrice;
    const unitPrice = resolveUnitPrice(
      order?.[ORDER_COLS.idOrder],
      entry.code,
      wholesalePrice,
      retailPrice,
      product
    );
    const orderType = resolveOrderType(
      String(order?.[ORDER_COLS.idOrder] || entry.code)
    );
    const discountRatio =
      orderType === ORDER_CODE_PREFIXES.PROMO
        ? normalizeDiscountRatio(product?.[VARIANT_PRICING_COLS.pctPromo])
        : 0;
    const discountPct = Number((discountRatio * 100).toFixed(2));
    const quantity = 1;
    const total = Math.max(0, unitPrice * quantity * (1 - discountRatio));

    return {
      id: entry.id,
      code: entry.code,
      description: buildInvoiceLineDescription(entry.code, order, product),
      unitPrice,
      quantity,
      discountPct,
      total,
    };
  });
};
