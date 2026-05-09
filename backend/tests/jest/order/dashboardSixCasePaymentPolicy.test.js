/**
 * Bảng 6 case — đối chiếu `dashboardPaymentPostingPolicy` (cùng logic webhook Sepay).
 *
 * Giá đơn cố định 100.000 ₫; cost 50.000 ₫ chỉ để đối chiếu kỳ vọng lợi nhuận *sau khi* đơn chuyển Đã TT
 * (trên dashboard, lợi nhuận lúc post đủ tiền dùng `postWebhookPaymentForOrder` / cost đơn — không nằm trong policy này).
 *
 * Yêu cầu nghiệp vụ: thanh toán thiếu → **complete = false** → webhook **không** `UPDATE` trạng thái sang Đã Thanh Toán
 * (đoạn `!amountDecision.complete` trong `webhook/sepay/routes/webhook.js`).
 * Đồng thời không post doanh thu/lợi nhuận cho biên thiếu (`recognizedRevenueCurrent = 0`).
 *
 * Lưu ý: với thiếu **< 5.000 ₫** so với giá, `isSuccessfulPaymentAmount` vẫn coi là **đủ** (UNDERPAY_LT_5K) — Case 2 dùng thiếu đúng 5.000 ₫ nên không đủ.
 */
const {
  computeDashboardPaymentDecision,
} = require("../../../src/controllers/Order/finance/dashboardPaymentPostingPolicy");

describe("Dashboard 6-case payment policy (100k order)", () => {
  const PRICE = 100_000;
  const COST = 50_000;

  test("Case 1: một webhook 100k → đủ tiền, không off-flow", () => {
    const d = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 100_000,
      accumulatedAmount: 100_000,
      creditAppliedAmount: 0,
    });
    expect(d.complete).toBe(true);
    expect(d.recognizedRevenueCurrent).toBe(100_000);
    expect(d.offFlowCurrent).toBe(0);
    expect(d.branch).toBe("EXACT_OR_FULL_COMPLETE");
    // Lợi nhuận kỳ vọng sau post full (price - cost), không phải field của policy:
    expect(100_000 - COST).toBe(50_000);
  });

  test("Case 2: một webhook 95k → thiếu 5k, không coi là đủ → giữ Chưa Thanh Toán", () => {
    const d = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 95_000,
      accumulatedAmount: 95_000,
      creditAppliedAmount: 0,
    });
    expect(d.complete).toBe(false);
    expect(d.waitTopup).toBe(true);
    expect(d.branch).toBe("SHORTFALL_WAIT_TOPUP");
    expect(d.recognizedRevenueCurrent).toBe(0);
    expect(d.offFlowCurrent).toBe(0);
  });

  test("Case 3: một webhook 105k → đủ + off-flow 5k, doanh thu đơn 100k", () => {
    const d = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 105_000,
      accumulatedAmount: 105_000,
      creditAppliedAmount: 0,
    });
    expect(d.complete).toBe(true);
    expect(d.recognizedRevenueCurrent).toBe(100_000);
    expect(d.offFlowCurrent).toBe(5_000);
    expect(d.branch).toBe("OVERPAID_SPLIT_COMPLETE");
  });

  test("Case 4: webhook 45k rồi 55k → lần 2 đủ tổng, không off-flow", () => {
    const w1 = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 45_000,
      accumulatedAmount: 45_000,
      creditAppliedAmount: 0,
    });
    expect(w1.complete).toBe(false);

    const w2 = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 55_000,
      accumulatedAmount: 100_000,
      creditAppliedAmount: 0,
    });
    expect(w2.complete).toBe(true);
    expect(w2.recognizedRevenueCurrent).toBe(55_000);
    expect(w2.offFlowCurrent).toBe(0);
    expect(w2.branch).toBe("ACCUMULATED_COMPLETE");
    expect(45_000 + 55_000).toBe(PRICE);
  });

  test("Case 5: sau 100k đủ (2 webhook), lần 3 +50k — toàn bộ vào off-flow về mặt policy nếu coi tích luỹ 150k (phần doanh thu đơn đã khóa ở 100k)", () => {
    const afterSecond = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 55_000,
      accumulatedAmount: 100_000,
      creditAppliedAmount: 0,
    });
    expect(afterSecond.complete).toBe(true);

    // Giả lập: đã có đủ 100k cho đơn; lần chuyển hiện tại +50k, tổng biên lai 150k → phần còn lại không gán thêm doanh thu đơn.
    const thirdTransfer = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 50_000,
      accumulatedAmount: 150_000,
      creditAppliedAmount: 0,
    });
    expect(thirdTransfer.complete).toBe(true);
    expect(thirdTransfer.recognizedRevenueCurrent).toBe(0);
    expect(thirdTransfer.offFlowCurrent).toBe(50_000);
    // Trên production đơn đã PAID: webhook dùng nhánh POST_PAID_ADDITIONAL_OFF_FLOW, không dựa hết vào block này.
  });

  test("Case 6: hai webhook 30k+30k = 60k → chưa đủ → giữ Chưa Thanh Toán", () => {
    const w1 = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 30_000,
      accumulatedAmount: 30_000,
      creditAppliedAmount: 0,
    });
    expect(w1.complete).toBe(false);

    const w2 = computeDashboardPaymentDecision({
      orderPrice: PRICE,
      currentAmount: 30_000,
      accumulatedAmount: 60_000,
      creditAppliedAmount: 0,
    });
    expect(w2.complete).toBe(false);
    expect(w2.waitTopup).toBe(true);
    expect(w2.recognizedRevenueCurrent).toBe(0);
  });
});
