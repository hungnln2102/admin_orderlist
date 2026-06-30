import { roundGiaBanValue } from "@/shared/money";
import { ORDER_FIELDS, VIRTUAL_FIELDS, type Order } from "@/constants";
import { isGiftOrderCode } from "./ordersHelpers";

export type OrderFinancialStats = {
  totalSellingPrice: number;
  totalCostPrice: number;
  totalRemainingValue: number;
  totalSupplierRemainingValue: number;
};

/** Tính tổng tiền từ danh sách đã lọc để đồng bộ với search/status/date filters. */
export function computeOrderFinancialStats(
  orders: Order[]
): OrderFinancialStats {
  return orders.reduce<OrderFinancialStats>(
    (totals, order) => {
      const orderCode = order[ORDER_FIELDS.ID_ORDER];
      const isGiftOrder = isGiftOrderCode(orderCode);
      const sellingPrice = isGiftOrder
        ? 0
        : roundGiaBanValue(
            Number.parseFloat(String(order[ORDER_FIELDS.PRICE] ?? 0)) || 0
          );
      const costPrice = roundGiaBanValue(
        Number.parseFloat(String(order[ORDER_FIELDS.COST] ?? 0)) || 0
      );
      const remainingValue = Number(order[VIRTUAL_FIELDS.GIA_TRI_CON_LAI] ?? 0);
      const supplierRemainingValue = Number(
        order[VIRTUAL_FIELDS.HOAN_TU_NCC] ?? 0
      );

      totals.totalSellingPrice += Number.isFinite(sellingPrice) ? sellingPrice : 0;
      totals.totalCostPrice += Number.isFinite(costPrice) ? costPrice : 0;
      totals.totalRemainingValue += Number.isFinite(remainingValue)
        ? remainingValue
        : 0;
      totals.totalSupplierRemainingValue += Number.isFinite(
        supplierRemainingValue
      )
        ? supplierRemainingValue
        : 0;

      return totals;
    },
    {
      totalSellingPrice: 0,
      totalCostPrice: 0,
      totalRemainingValue: 0,
      totalSupplierRemainingValue: 0,
    }
  );
}
