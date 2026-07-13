const { ORDERS_SCHEMA } = require("../../../../../config/dbSchema");
const { STATUS } = require("../../constants");
const { SLOT_KIND, openPaymentSlot } = require("../../../../payment-slots");
const { resolveDefaultShopBankAccount } = require("../../../../../services/shopBankAccountResolver");
const { resolveDefaultUsdtWallet } = require("../../../../../services/usdtWalletResolver");
const {
  getUsdtVndRate,
  convertVndToUsd,
} = require("../../../../usdt-wallets/services/binanceExchangeRateService");
const { normalizeMoney } = require("../../finance/refundCredits");

const CREDIT_BALANCE_TOLERANCE_VND = 5000;

const resolveRefundCreditAllocation = async ({
  trx,
  payload,
  creditNoteForOrder,
  requestedCreditApplyAmount,
  isGiftOrderCreate,
  isMavnCreate,
}) => {
  const cols = ORDERS_SCHEMA.ORDER_LIST.COLS;
  const priceCol = cols.PRICE;
  const grossSellingPriceCol = cols.GROSS_SELLING_PRICE;
  const rawPriceBeforeCredit = normalizeMoney(payload[priceCol]);
  payload[priceCol] = rawPriceBeforeCredit;

  let appliedCreditAmount = 0;
  if (creditNoteForOrder) {
    const noteAvailable = normalizeMoney(creditNoteForOrder.available_amount);
    let effectiveApplyRequest = requestedCreditApplyAmount;
    if (!Number.isFinite(effectiveApplyRequest) || effectiveApplyRequest <= 0) {
      effectiveApplyRequest = Math.min(noteAvailable, rawPriceBeforeCredit);
    }
    appliedCreditAmount = Math.min(effectiveApplyRequest, rawPriceBeforeCredit, noteAvailable);
  }

  const remainingToPay = Math.max(0, rawPriceBeforeCredit - appliedCreditAmount);
  payload[priceCol] = remainingToPay;
  if (appliedCreditAmount > 0) {
    payload[grossSellingPriceCol] = rawPriceBeforeCredit;
  }

  if (!isGiftOrderCreate && !isMavnCreate) {
    if (appliedCreditAmount > 0 && remainingToPay <= CREDIT_BALANCE_TOLERANCE_VND) {
      payload.status = STATUS.PAID;
      payload[priceCol] = 0;
    } else {
      payload.status = STATUS.UNPAID;
    }
  }

  return { rawPriceBeforeCredit, appliedCreditAmount, remainingToPay };
};

const allocateCreateOrderPayment = async ({
  trx,
  payload,
  isUsdtPayment,
  idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER,
}) => {
  const cols = ORDERS_SCHEMA.ORDER_LIST.COLS;
  const priceCol = cols.PRICE;
  const paymentMethodCol = cols.PAYMENT_METHOD;
  const usdtAmountUsdCol = cols.USDT_AMOUNT_USD;
  const usdtExchangeRateCol = cols.USDT_EXCHANGE_RATE;
  const usdtWalletIdCol = cols.USDT_WALLET_ID;
  const unpaidAmount = Number(payload[priceCol]) || 0;

  const requiresPaymentSlot = !isUsdtPayment && payload.status === STATUS.UNPAID && unpaidAmount > 0;

  if (isUsdtPayment && payload.status === STATUS.UNPAID && unpaidAmount > 0) {
    payload[paymentMethodCol] = "usdt";
    const rateInfo = await getUsdtVndRate();
    const vndPerUsdt = Number(rateInfo?.vndPerUsdt);
    payload[usdtAmountUsdCol] = convertVndToUsd(unpaidAmount, vndPerUsdt);
    payload[usdtExchangeRateCol] = vndPerUsdt;
    const defaultUsdtWallet = await resolveDefaultUsdtWallet();
    if (!defaultUsdtWallet?.id) {
      throw new Error(
        `Chưa cấu hình ví USDT mặc định — không thể tạo đơn ${payload[idOrderCol]} thanh toán USDT`
      );
    }
    payload[usdtWalletIdCol] = Number(defaultUsdtWallet.id);
    return { paymentMethod: "usdt", slot: null, requiresPaymentSlot: false };
  }

  if (!isUsdtPayment) {
    payload[paymentMethodCol] = "bank";
  }

  if (!requiresPaymentSlot) {
    return { paymentMethod: payload[paymentMethodCol] || null, slot: null, requiresPaymentSlot: false };
  }

  const defaultBank = await resolveDefaultShopBankAccount();
  const receiverAccount = String(defaultBank?.accountNumber || "").trim();
  if (!receiverAccount) {
    throw new Error(
      `Chưa cấu hình STK shop mặc định — không thể mở payment slot cho đơn ${payload[idOrderCol]}`
    );
  }
  const slot = await openPaymentSlot(trx, {
    orderCode: payload[idOrderCol],
    receiverAccount,
    baseAmount: unpaidAmount,
    slotKind: SLOT_KIND.NEW,
  });
  payload[priceCol] = Number(slot.expected_amount);

  return { paymentMethod: "bank", slot, requiresPaymentSlot: true };
};

module.exports = {
  CREDIT_BALANCE_TOLERANCE_VND,
  resolveRefundCreditAllocation,
  allocateCreateOrderPayment,
};
