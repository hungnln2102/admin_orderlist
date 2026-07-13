import { buildDateColumns, buildMonthColumns, isDateInColumns, PeriodColumn } from "@/shared/date/dateRanges";
import { getAllocatedAmount, toMoneyNumber } from "@/shared/utils/financialMath";
import type { TaxOrder } from "../api/taxApi";
import type { TaxViewMode } from "../components/TaxDailyFormTable";

const normalizeYmd = (value: string | null | undefined) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : String(value);
};

const isRefundedStatus = (status: string | null | undefined) => {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "đã hoàn" || normalized === "da hoan" || normalized === "refunded";
};

const toTermDays = (days: TaxOrder["days"]) => {
  const value = Number(days);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export function computeTaxAggregates(
  orders: TaxOrder[],
  viewMode: TaxViewMode = "day"
) {
  const columns = viewMode === "day" ? buildDateColumns() : buildMonthColumns();
  let revenue = 0;
  let costSum = 0;
  let refundSum = 0;

  for (const order of orders) {
    const startDate = normalizeYmd(order.registration_date || order.order_date);
    const termDays = toTermDays(order.days);

    revenue += getAllocatedAmount(
      toMoneyNumber(order.price),
      startDate,
      termDays,
      columns
    );
    costSum += getAllocatedAmount(
      toMoneyNumber(order.cost),
      startDate,
      termDays,
      columns
    );
    const refundDate = normalizeYmd(order.canceled_at);
    if (
      isRefundedStatus(order.status) &&
      toMoneyNumber(order.refund) > 0 &&
      isDateInColumns(refundDate, columns)
    ) {
      refundSum += toMoneyNumber(order.refund);
    }
  }

  return {
    revenue,
    cost: costSum,
    refund: refundSum,
    profit: revenue - costSum,
  };
}
