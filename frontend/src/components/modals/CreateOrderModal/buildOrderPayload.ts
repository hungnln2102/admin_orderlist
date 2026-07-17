import { formatDateToDMY, getTodayDMY } from "@/shared/date";
import { formatCurrency } from "@/shared/money";
import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "../../../constants";
import { calculateExpirationDate, convertDMYToYMD } from "./helpers";
import type { CreateOrderPrefillContext, Order, Product } from "./types";
import type { PaymentMethod } from "@/features/usdt-wallets/types";

export type CreditOrderSelection = {
  id: number;
  availableAmount: number;
  sourceOrderCode: string;
  sourceOrderId: number;
  creditCode: string;
} | null;

export type BuildOrderPayloadParams = {
  formData: Partial<Order>;
  selectedSupplyId: number | null;
  products: Product[];
  prefillContext?: CreateOrderPrefillContext | null;
  creditOrderSelection: CreditOrderSelection;
  paymentMethod?: PaymentMethod;
  /** Ghi đè tên khách / liên hệ từ form dùng chung (multi-order). */
  sharedCustomer?: {
    customer?: string;
    contact?: string | null;
  };
};

export type BuildOrderPayloadResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; reason: "missing_fields" };

export const isSharedOrderBaseComplete = (
  formData: Partial<Order> | undefined,
  selectedSupplyId: number | null
): boolean => {
  if (!formData) return false;
  const isImport = String(formData[ORDER_FIELDS.ID_ORDER] || "").startsWith("MAVN");
  if (isImport) {
    return Boolean(formData[ORDER_FIELDS.ID_PRODUCT]);
  }
  return Boolean(
    formData[ORDER_FIELDS.ID_PRODUCT] && formData[ORDER_FIELDS.CUSTOMER]
  );
};

export const isDraftOrderComplete = (
  formData: Partial<Order> | undefined,
  selectedSupplyId: number | null
): boolean => {
  return Boolean(
    isSharedOrderBaseComplete(formData, selectedSupplyId) &&
    formData?.[ORDER_FIELDS.INFORMATION_ORDER]
  );
};

export const buildOrderPayload = ({
  formData,
  selectedSupplyId,
  products,
  prefillContext,
  creditOrderSelection,
  paymentMethod = "bank",
  sharedCustomer,
}: BuildOrderPayloadParams): BuildOrderPayloadResult => {
  if (!isSharedOrderBaseComplete(formData, selectedSupplyId)) {
    return { ok: false, reason: "missing_fields" };
  }

  if (!String(formData[ORDER_FIELDS.INFORMATION_ORDER] || "").trim()) {
    return { ok: false, reason: "missing_fields" };
  }

  const registerDMY =
    formatDateToDMY(formData[ORDER_FIELDS.ORDER_DATE] as string) ||
    (formData[ORDER_FIELDS.ORDER_DATE] as string) ||
    getTodayDMY();

  const currentExpiryDMY =
    formatDateToDMY(formData[ORDER_FIELDS.EXPIRY_DATE] as string) ||
    (formData[ORDER_FIELDS.EXPIRY_DATE] as string) ||
    "";

  const totalDays = Number(formData[ORDER_FIELDS.DAYS] || 0) || 0;

  let expiryDMY = currentExpiryDMY;
  if (!expiryDMY && registerDMY && totalDays > 0) {
    const computed = calculateExpirationDate(registerDMY, totalDays);
    if (computed && computed !== "N/A") {
      expiryDMY = computed;
    }
  }

  const normalizedRegister = convertDMYToYMD(registerDMY);
  const normalizedExpiry = expiryDMY ? convertDMYToYMD(expiryDMY) : normalizedRegister;

  const productName = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
  const matchedProduct = products.find((p) => (p.san_pham || "").trim() === productName.trim());
  const variantId = matchedProduct?.id;

  const orderTypePrefix = String(formData[ORDER_FIELDS.ID_ORDER] || "");
  const rawSelling = Number(formData[ORDER_FIELDS.PRICE]);
  const sellingPrice =
    orderTypePrefix === ORDER_CODE_PREFIXES.GIFT
      ? 0
      : Number.isFinite(rawSelling)
        ? Math.max(0, rawSelling)
        : 0;

  const customerName =
    sharedCustomer?.customer?.trim() || String(formData[ORDER_FIELDS.CUSTOMER] || "").trim();
  const contactValue =
    sharedCustomer?.contact !== undefined
      ? sharedCustomer.contact
      : formData[ORDER_FIELDS.CONTACT] || null;

  const dataToSave: Record<string, unknown> = {
    ...formData,
    [ORDER_FIELDS.CUSTOMER]: customerName,
    [ORDER_FIELDS.COST]: Number(formData[ORDER_FIELDS.COST]),
    [ORDER_FIELDS.PRICE]: sellingPrice,
    [ORDER_FIELDS.ORDER_DATE]: normalizedRegister,
    [ORDER_FIELDS.EXPIRY_DATE]: normalizedExpiry,
    [ORDER_FIELDS.CONTACT]: contactValue,
    [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
    [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
  };

  if (selectedSupplyId != null) {
    dataToSave.supply_id = selectedSupplyId;
  }
  if (variantId != null && Number.isFinite(variantId)) {
    dataToSave.variant_id = variantId;
    dataToSave.id_product = variantId;
  }

  if (
    orderTypePrefix !== ORDER_CODE_PREFIXES.GIFT &&
    orderTypePrefix !== ORDER_CODE_PREFIXES.IMPORT &&
    paymentMethod === "usdt"
  ) {
    dataToSave.payment_method = "usdt";
  }

  if (prefillContext?.creditNoteId) {
    dataToSave.refund_credit_note_id = Number(prefillContext.creditNoteId);
    dataToSave.refund_credit_apply_amount = Number(prefillContext.creditApplyAmount || 0);
    dataToSave.refund_credit_source_order_id = Number(prefillContext.creditSourceOrderId || 0);
    dataToSave.refund_credit_source_order_code = prefillContext.creditSourceOrderCode || "";
    if (prefillContext.reservedOrderCode) {
      dataToSave.reserved_order_code = prefillContext.reservedOrderCode;
    }
    dataToSave.__credit_avail_snapshot = Math.max(
      0,
      Number(prefillContext.creditAvailableAmount) || 0
    );
  } else if (creditOrderSelection?.id) {
    dataToSave.refund_credit_note_id = creditOrderSelection.id;
    dataToSave.refund_credit_source_order_code = creditOrderSelection.sourceOrderCode || "";
    dataToSave.refund_credit_source_order_id = Number(creditOrderSelection.sourceOrderId || 0);
    dataToSave.refund_credit_code = creditOrderSelection.creditCode || "";
    const cap = Math.max(0, creditOrderSelection.availableAmount);
    const apply = orderTypePrefix === ORDER_CODE_PREFIXES.GIFT ? 0 : Math.min(cap, sellingPrice);
    dataToSave.refund_credit_apply_amount = apply;
    dataToSave.__credit_avail_snapshot = cap;
  }

  return { ok: true, payload: dataToSave };
};

export const buildQueueItemSummary = (payload: Record<string, unknown>): string => {
  const product = String(payload[ORDER_FIELDS.ID_PRODUCT] || "—");
  const info = String(payload[ORDER_FIELDS.INFORMATION_ORDER] || "").trim();
  const price = Number(payload[ORDER_FIELDS.PRICE]) || 0;
  const infoShort = info.length > 40 ? `${info.slice(0, 40)}…` : info;
  return infoShort
    ? `${product} · ${infoShort} · ${formatCurrency(price)}`
    : `${product} · ${formatCurrency(price)}`;
};
