import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "@/constants";
import * as Helpers from "@/lib/helpers";
import { buildSepayQrUrl } from "@/shared/utils/sepay";
import { ACCOUNT_NAME, ACCOUNT_NO, BANK_SHORT_CODE } from "./constants";

export type ViewOrderPaymentQrBuildInput = {
  order: Record<string, unknown>;
  keepOrderPrice: boolean;
  calculatedPrice: number | null;
  isGift: boolean;
  overrideCustomerQrAmount?: number | null;
};

export type ViewOrderPaymentQrPayload = {
  qrCodeImageUrl: string;
  effectiveQrAmount: number;
  qrMessage: string;
  bankDisplay: string;
  accountNoDisplay: string;
  holderDisplay: string;
  /** Đơn MAVN + đủ STK/mã NH — QR là tài khoản NCC, số tiền = giá nhập */
  isSupplierPayout: boolean;
  /** MAVN nhưng thiếu STK hoặc mã NH VietQR trên hồ sơ NCC */
  missingSupplierBank: boolean;
};

const readSupplierBank = (row: Record<string, unknown>) => {
  const num = String(row.supplier_number_bank ?? "").trim();
  const bin = String(row.supplier_bin_bank ?? "").trim();
  return { num, bin };
};

export const isImportOrderId = (orderId: unknown): boolean => {
  const id = String(orderId || "")
    .trim()
    .toUpperCase();
  return id.startsWith(ORDER_CODE_PREFIXES.IMPORT);
};

export const buildViewOrderPaymentQrPayload = ({
  order,
  keepOrderPrice,
  calculatedPrice,
  isGift,
  overrideCustomerQrAmount = null,
}: ViewOrderPaymentQrBuildInput): ViewOrderPaymentQrPayload => {
  const idOrder = String(order[ORDER_FIELDS.ID_ORDER] ?? "");
  const qrMessage = idOrder;
  const supplyName = String(order[ORDER_FIELDS.SUPPLY] ?? order.supply ?? "").trim();
  const accountHolder = String(order.supplier_account_holder ?? "").trim();
  const holderLabel = accountHolder || supplyName;

  const orderAmountPrice = isGift ? 0 : Math.max(0, Number(order[ORDER_FIELDS.PRICE]) || 0);
  const orderAmountCost = isGift ? 0 : Math.max(0, Number(order[ORDER_FIELDS.COST]) || 0);

  const displayPriceAmount =
    overrideCustomerQrAmount !== null && Number.isFinite(Number(overrideCustomerQrAmount))
      ? Math.max(0, Number(overrideCustomerQrAmount) || 0)
      : keepOrderPrice
        ? orderAmountPrice
        : (calculatedPrice ?? orderAmountPrice);

  const importOrder = isImportOrderId(idOrder);
  const { num: supplierAccount, bin: supplierBin } = readSupplierBank(order);

  if (importOrder) {
    if (!supplierAccount || !supplierBin) {
      return {
        qrCodeImageUrl: "",
        effectiveQrAmount: Helpers.roundGiaBanValue(orderAmountCost),
        qrMessage,
        bankDisplay: "—",
        accountNoDisplay: "—",
        holderDisplay: holderLabel || "—",
        isSupplierPayout: false,
        missingSupplierBank: true,
      };
    }
    const effectiveQrAmount = Helpers.roundGiaBanValue(orderAmountCost);
    return {
      qrCodeImageUrl: buildSepayQrUrl({
        accountNumber: supplierAccount,
        bankCode: supplierBin,
        amount: effectiveQrAmount,
        description: qrMessage,
        accountName: holderLabel || undefined,
      }),
      effectiveQrAmount,
      qrMessage,
      bankDisplay: `Mã VietQR: ${supplierBin}`,
      accountNoDisplay: supplierAccount,
      holderDisplay: holderLabel || "—",
      isSupplierPayout: true,
      missingSupplierBank: false,
    };
  }

  const effectiveQrAmount = Helpers.roundGiaBanValue(displayPriceAmount);
  return {
    qrCodeImageUrl: buildSepayQrUrl({
      accountNumber: ACCOUNT_NO,
      bankCode: BANK_SHORT_CODE,
      amount: effectiveQrAmount,
      description: qrMessage,
      accountName: ACCOUNT_NAME,
    }),
    effectiveQrAmount,
    qrMessage,
    bankDisplay: "VP Bank",
    accountNoDisplay: ACCOUNT_NO,
    holderDisplay: ACCOUNT_NAME,
    isSupplierPayout: false,
    missingSupplierBank: false,
  };
};
