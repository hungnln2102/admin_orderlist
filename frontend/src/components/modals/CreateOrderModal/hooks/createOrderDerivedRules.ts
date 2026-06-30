import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "../../../../constants";
import {
  isImportOrderCodeOption,
  type OrderCodeSelectOption,
} from "@/shared/hooks/usePricingTiers";
import { formatCurrency } from "@/features/orders/utils/ordersHelpers";
import type { AvailableRefundCredit } from "@/lib/refundCreditsApi";
import type { CreateOrderCreationKind, CustomerType, Order, Product, Supply } from "../types";

export const isCompleteDMY = (value: string): boolean =>
  /^\d{2}\/\d{2}\/\d{4}$/.test((value || "").trim());

export const getPrefillCreditNoteRemaining = (
  prefillContext?: {
    creditNoteId?: number;
    creditAvailableAmount?: number;
    creditApplyAmount?: number;
  } | null
): number | null => {
  if (!prefillContext || !Number(prefillContext.creditNoteId)) return null;
  const avail = Math.max(0, Number(prefillContext.creditAvailableAmount) || 0);
  const apply = Math.max(0, Number(prefillContext.creditApplyAmount) || 0);
  return Math.max(0, avail - apply);
};

export const getManualCreditMoney = (
  selectedCreditNote: AvailableRefundCredit | null,
  hasPrefillCredit: boolean,
  formData: Partial<Order>
) => {
  if (!selectedCreditNote || hasPrefillCredit) return null;
  const avail = Math.max(0, Number(selectedCreditNote.available_amount) || 0);
  const refOld = Math.max(0, Number(selectedCreditNote.refund_amount) || 0);
  const priceNum = Math.max(0, Number(formData[ORDER_FIELDS.PRICE]) || 0);
  const apply = Math.min(avail, priceNum);
  const remaining = Math.max(0, priceNum - apply);
  const noteRemainingAfter = Math.max(0, avail - apply);
  return { avail, refOld, priceNum, apply, remaining, noteRemainingAfter };
};

export const buildCreditNoteMap = (availableCreditNotes: AvailableRefundCredit[]) => {
  const map = new Map<number, AvailableRefundCredit>();
  for (const row of availableCreditNotes) {
    const id = Number(row.id);
    if (Number.isFinite(id) && id > 0) {
      map.set(id, row);
    }
  }
  return map;
};

export const buildAvailableCreditOptions = (availableCreditNotes: AvailableRefundCredit[]) =>
  availableCreditNotes.map((row) => {
    const name = (row.customer_name || "â€”").trim();
    const avail = Math.max(0, Number(row.available_amount) || 0);
    return {
      value: Number(row.id),
      label: `${name} â€” ${formatCurrency(avail)}`,
    };
  });

export const buildProductOptions = (products: Product[]) =>
  products
    .filter((product) => product.is_active !== false)
    .map((product) => ({
      value: product.san_pham,
      label: product.san_pham,
    }));

export const buildSupplyOptions = (supplies: Supply[]) =>
  supplies.map((supply) => ({
    value: supply.id,
    label: supply.supplier_name ?? supply.source_name,
  }));

export const getProductPctPromo = (
  products: Product[],
  productName: string
): Product["pct_promo"] | null => {
  if (!productName) return null;
  const product = products.find(
    (item) => item.san_pham.toLowerCase() === productName.toLowerCase()
  );
  return product?.pct_promo ?? null;
};

export const hasPositivePromoValue = (promoValue: unknown): boolean => {
  if (promoValue === null || promoValue === undefined) return false;
  const numericPromo = Number(promoValue);
  return Number.isFinite(numericPromo) && numericPromo > 0;
};

export const buildCustomerTypeOptions = ({
  orderCodeOptions,
  orderCreationKind,
  hasPromoPrice,
}: {
  orderCodeOptions: OrderCodeSelectOption[];
  orderCreationKind: CreateOrderCreationKind;
  hasPromoPrice: boolean;
}) => {
  const byKind = orderCodeOptions.filter((option) => {
    if (orderCreationKind === "import") {
      return isImportOrderCodeOption(option);
    }
    return !isImportOrderCodeOption(option);
  });

  return byKind
    .filter((option) => {
      const value = option.value;
      if (hasPromoPrice) {
        return value !== ORDER_CODE_PREFIXES.CUSTOMER;
      }
      return value !== ORDER_CODE_PREFIXES.PROMO;
    })
    .map((option) => ({
      value: option.value as CustomerType,
      label: option.label,
    }));
};

export const isCreateOrderDraftReady = (formData: Partial<Order>): boolean => {
  const prod = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
  const src = (formData[ORDER_FIELDS.SUPPLY] as string) || "";
  const info = (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";
  const customer = (formData[ORDER_FIELDS.CUSTOMER] as string) || "";
  return !!prod && !!src && !!info && !!customer;
};
