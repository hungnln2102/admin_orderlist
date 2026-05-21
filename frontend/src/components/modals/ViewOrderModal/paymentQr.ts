import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "@/constants";
import * as Helpers from "@/shared/utils";
import { buildSepayQrUrl } from "@/shared/utils/sepay";
import { EMPTY_SHOP_BANK_QR_CONFIG } from "@/features/shop-bank-accounts/helpers/shopBankQrDefaults";

export type ShopBankQrOverride = {
  accountNumber: string;
  accountHolder: string;
  bankCode: string;
  bankDisplayName: string;
  qrNotePrefix: string;
};

export type ViewOrderPaymentQrBuildInput = {
  order: Record<string, unknown>;
  keepOrderPrice: boolean;
  calculatedPrice: number | null;
  isGift: boolean;
  overrideCustomerQrAmount?: number | null;
  shopBank?: ShopBankQrOverride | null;
  /** Mã CK (transaction) — đã ensure từ API nếu đơn cũ chưa có. */
  transferCodeOverride?: string | null;
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
  shopBank = null,
  transferCodeOverride = null,
}: ViewOrderPaymentQrBuildInput): ViewOrderPaymentQrPayload => {
  const idOrder = String(order[ORDER_FIELDS.ID_ORDER] ?? "");
  const transferCode = String(
    transferCodeOverride ?? order[ORDER_FIELDS.TRANSACTION] ?? ""
  )
    .trim()
    .toUpperCase();
  const accountNo = shopBank?.accountNumber || EMPTY_SHOP_BANK_QR_CONFIG.accountNumber;
  const accountName = shopBank?.accountHolder || EMPTY_SHOP_BANK_QR_CONFIG.accountHolder;
  const bankCode = shopBank?.bankCode || EMPTY_SHOP_BANK_QR_CONFIG.bankCode;
  const bankDisplay =
    shopBank?.bankDisplayName ||
    EMPTY_SHOP_BANK_QR_CONFIG.bankDisplayName ||
    bankCode;
  const qrPrefix = shopBank?.qrNotePrefix ?? EMPTY_SHOP_BANK_QR_CONFIG.qrNotePrefix;
  /** Nội dung CK shop: prefix + mã transaction (đơn mới); fallback id_order nếu chưa có. */
  const notePrefix = String(qrPrefix || "")
    .replace(/\bTHANH[\s_]*TOAN\b/gi, " ")
    .replace(/\bTT\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const shopTransferContent = [notePrefix, transferCode]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  const qrMessage = shopTransferContent;
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
        qrMessage: idOrder,
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
        description: idOrder,
        accountName: holderLabel || undefined,
      }),
      effectiveQrAmount,
      qrMessage: idOrder,
      bankDisplay: `Mã VietQR: ${supplierBin}`,
      accountNoDisplay: supplierAccount,
      holderDisplay: holderLabel || "—",
      isSupplierPayout: true,
      missingSupplierBank: false,
    };
  }

  const effectiveQrAmount = Helpers.roundGiaBanValue(displayPriceAmount);
  const canBuildShopQr = Boolean(transferCode && accountNo && bankCode);
  return {
    qrCodeImageUrl: canBuildShopQr
      ? buildSepayQrUrl({
          accountNumber: accountNo,
          bankCode,
          amount: effectiveQrAmount,
          description: qrMessage,
          accountName,
        })
      : "",
    effectiveQrAmount,
    qrMessage,
    bankDisplay,
    accountNoDisplay: accountNo,
    holderDisplay: accountName,
    isSupplierPayout: false,
    missingSupplierBank: false,
  };
};
