const UNDERPAY_TOLERANCE_VND = 5000;

const normalizeMoney = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numeric = Number.parseFloat(cleaned || "0");
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

const maxAcceptedShortfall = () => Math.max(0, UNDERPAY_TOLERANCE_VND - 1);

const requiredMinForSuccessfulPayment = (orderPrice) => {
  const price = normalizeMoney(orderPrice);
  if (price <= 0) return 0;
  return Math.max(0, price - maxAcceptedShortfall());
};

const isSuccessfulPaymentAmount = (orderPrice, effectiveReceived) => {
  const price = normalizeMoney(orderPrice);
  if (price <= 0) return true;
  const received = normalizeMoney(effectiveReceived);
  const shortfall = Math.max(0, price - received);
  return shortfall === 0 || shortfall < UNDERPAY_TOLERANCE_VND;
};

/**
 * Central dashboard posting policy for one receipt matched to one order.
 *
 * Rules:
 * - Shortfall strictly below 5,000 VND can still complete the order.
 * - Revenue/profit only use the amount belonging to the remaining sale price.
 * - Transfer surplus goes to off-flow and must be audited with the order_code.
 * - Incomplete receipts do not post revenue/profit; wait for top-up.
 */
const computeDashboardPaymentDecision = ({
  orderPrice,
  currentAmount,
  accumulatedAmount,
  creditAppliedAmount,
}) => {
  const normalizedPrice = normalizeMoney(orderPrice);
  const receivedCurrent = Math.max(0, normalizeMoney(currentAmount));
  const receivedAccumulated = Math.max(0, normalizeMoney(accumulatedAmount));
  const creditedAmount = Math.max(0, normalizeMoney(creditAppliedAmount));
  const effectiveReceivedCurrent = normalizeMoney(receivedCurrent + creditedAmount);
  const effectiveReceivedAccumulated = normalizeMoney(
    receivedAccumulated + creditedAmount
  );
  const requiredMin = requiredMinForSuccessfulPayment(normalizedPrice);
  const currentShortfall = Math.max(0, normalizedPrice - effectiveReceivedCurrent);
  const accumulatedShortfall = Math.max(
    0,
    normalizedPrice - effectiveReceivedAccumulated
  );
  const meetsCurrent = isSuccessfulPaymentAmount(
    normalizedPrice,
    effectiveReceivedCurrent
  );
  const meetsAccumulated = isSuccessfulPaymentAmount(
    normalizedPrice,
    effectiveReceivedAccumulated
  );
  const priorReceived = Math.max(0, receivedAccumulated - receivedCurrent);
  const bankPayableForOrder = Math.max(0, normalizedPrice - creditedAmount);
  const receivedForOrder = Math.max(receivedAccumulated, receivedCurrent);
  const priorBankRevenueForOrder = Math.min(priorReceived, bankPayableForOrder);
  const remainingBankRevenueForOrder = Math.max(
    0,
    bankPayableForOrder - priorBankRevenueForOrder
  );
  const complete = meetsCurrent || meetsAccumulated;
  const recognizedRevenueCurrent = complete
    ? Math.min(receivedCurrent, remainingBankRevenueForOrder)
    : 0;
  const recognizedRevenueForOrder = complete
    ? Math.min(receivedForOrder, bankPayableForOrder)
    : 0;
  const offFlowCurrent = complete
    ? Math.max(0, receivedCurrent - recognizedRevenueCurrent)
    : 0;
  const offFlowForOrder = complete
    ? Math.max(0, receivedForOrder - bankPayableForOrder)
    : 0;
  const acceptedShortfall = complete
    ? Math.max(
        0,
        normalizedPrice -
          (priorReceived + recognizedRevenueCurrent + creditedAmount)
      )
    : Math.max(0, normalizedPrice - effectiveReceivedAccumulated);
  const overpaidCurrent = offFlowCurrent > 0;

  let branch = "SHORTFALL_WAIT_TOPUP";
  let webhookAmountFlow = "AWAITING_TOPUP";
  if (complete) {
    if (overpaidCurrent) {
      branch = "OVERPAID_SPLIT_COMPLETE";
      webhookAmountFlow = "OVERPAID_SPLIT_OFF_FLOW";
    } else if (acceptedShortfall > 0) {
      branch = "UNDERPAY_LT_5K_COMPLETE";
      webhookAmountFlow = "UNDERPAY_LT_5K";
    } else if (meetsAccumulated && !meetsCurrent) {
      branch = "ACCUMULATED_COMPLETE";
      webhookAmountFlow = "ACCUMULATED";
    } else {
      branch = "EXACT_OR_FULL_COMPLETE";
      webhookAmountFlow = "ORDER_PRICE_COVERED";
    }
  }

  return {
    complete,
    waitTopup: !complete,
    useAccumulated: complete && meetsAccumulated && !meetsCurrent,
    branch,
    orderPriceAtWebhook: normalizedPrice,
    requiredMin,
    receivedCurrent,
    receivedAccumulated,
    creditedAmount,
    effectiveReceivedCurrent,
    effectiveReceivedAccumulated,
    shortfallAmount: complete ? acceptedShortfall : accumulatedShortfall,
    currentShortfall,
    accumulatedShortfall,
    maxAcceptedShortfall: maxAcceptedShortfall(),
    webhookAmountFlow,
    recognizedRevenueCurrent,
    recognizedRevenueForOrder,
    offFlowCurrent,
    offFlowForOrder,
    postedAmount: recognizedRevenueCurrent,
    bankPayableForOrder,
    priorBankRevenueForOrder,
  };
};

module.exports = {
  UNDERPAY_TOLERANCE_VND,
  computeDashboardPaymentDecision,
  isSuccessfulPaymentAmount,
  normalizeMoney,
  requiredMinForSuccessfulPayment,
};
