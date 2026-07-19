import type React from "react";

import { ORDER_FIELDS, VIRTUAL_FIELDS, ORDER_STATUSES, Order } from "@/constants";

type OrderThemeClasses = {
  expandablePanelClass: string;
  detailItemClass: string;
  detailLabelClass: string;
};

type OrderRowExpandedProps = {
  isExpanded: boolean;
  totalColumns: number;
  order: Order;
  orderTheme: OrderThemeClasses;
  showActionButtons: boolean;
  canStartProcessing: boolean;
  canMarkPaid: boolean;
  canRenew: boolean;
  isCompleting: boolean;
  isRenewing: boolean;
  showSupplierRefundColumn: boolean;
  costValue: number;
  priceValue: number;
  giaTriConLaiForCanceled: number;
  webhookDeltaClass: string;
  webhookDeltaDisplay: string;
  hoanTuNccDisplay: string;
  formatCurrency: (value: number) => string;
  stopPropagation: (
    action: (targetOrder: Order) => void
  ) => (event: React.MouseEvent) => void;
  onMarkPaid: (order: Order) => void;
  onPayWithCredit?: (order: Order) => void;
  onRenew: (order: Order) => void;
};

const OrderRowExpanded: React.FC<OrderRowExpandedProps> = ({
  isExpanded,
  totalColumns,
  order,
  orderTheme,
  showActionButtons,
  canStartProcessing,
  canMarkPaid,
  canRenew,
  isCompleting,
  isRenewing,
  showSupplierRefundColumn,
  costValue,
  priceValue,
  giaTriConLaiForCanceled,
  webhookDeltaClass,
  webhookDeltaDisplay,
  hoanTuNccDisplay,
  formatCurrency,
  stopPropagation,
  onMarkPaid,
  onPayWithCredit,
  onRenew,
}) => {
  if (!isExpanded) return null;

  const totalCreditApplied = Number.isFinite(Number(order[VIRTUAL_FIELDS.TOTAL_CREDIT_APPLIED]))
    ? Number(order[VIRTUAL_FIELDS.TOTAL_CREDIT_APPLIED])
    : 0;

  const status = order[ORDER_FIELDS.STATUS];
  const missingAmount = (totalCreditApplied > 0 && status !== ORDER_STATUSES.DA_THANH_TOAN)
    ? priceValue - totalCreditApplied
    : null;

  return (
    <tr className="order-row__expandable animate-in fade-in slide-in-from-top-2 duration-300">
      <td colSpan={totalColumns} className="order-row__expandable-cell px-6 pb-8 pt-2">
        <div
          className={`order-row__expandable-content rounded-[32px] glass-panel-light p-6 shadow-2xl border ${orderTheme.expandablePanelClass}`}
        >
          <div className="order-row__expandable-header mb-4 flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-indigo-50">Chi tiết đơn hàng</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                #{order[ORDER_FIELDS.ID_ORDER] || ""}
              </p>
            </div>
            {showActionButtons && (
              <div className="ml-4 flex items-center gap-2">
                {canStartProcessing && onPayWithCredit && (
                  <button
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 shadow-md shadow-cyan-900/40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPayWithCredit(order);
                    }}
                  >
                    Thanh Toán bằng Credit
                  </button>
                )}
                {canStartProcessing && (
                  <button
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-900/40"
                    onClick={stopPropagation(onMarkPaid)}
                  >
                    Thanh Toán
                  </button>
                )}
                {canMarkPaid && (
                  <button
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md shadow-amber-900/40"
                    disabled={isCompleting}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isCompleting) {
                        onMarkPaid(order);
                      }
                    }}
                  >
                    {isCompleting ? "Đang Hoàn Thành..." : "Hoàn Thành"}
                  </button>
                )}
                {canRenew && (
                  <button
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-indigo-900/40 disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isRenewing}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isRenewing) {
                        onRenew(order);
                      }
                    }}
                  >
                    {isRenewing ? "Đang Gia Hạn..." : "Gia Hạn"}
                  </button>
                )}
              </div>
            )}
          </div>
          <div
            className={`order-row__detail-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${showSupplierRefundColumn ? "xl:grid-cols-7" : "xl:grid-cols-6"
              }`}
          >
            <div
              className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Nguồn
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {order[ORDER_FIELDS.SUPPLY] || "N/A"}
              </p>
            </div>
            <div
              className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Giá nhập
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(costValue)}
              </p>
            </div>
            <div
              className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Giá bán
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(priceValue)}
              </p>
            </div>
            <div
              className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Giá trị còn lại
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(giaTriConLaiForCanceled)}
              </p>
            </div>
            <div
              className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Webhook
              </p>
              <p className={`mt-1 text-sm font-semibold ${webhookDeltaClass}`}>
                {webhookDeltaDisplay}
              </p>
              {missingAmount !== null && missingAmount > 0 && (
                <p className="mt-1 text-[11px] font-medium text-amber-400">
                  (Đã trả {formatCurrency(totalCreditApplied)}, còn thiếu {formatCurrency(missingAmount)})
                </p>
              )}
            </div>
            {showSupplierRefundColumn && (
              <div
                className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
              >
                <p
                  className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
                >
                  Hoàn từ NCC
                </p>
                <p className="mt-1 text-sm font-semibold text-violet-200">
                  {hoanTuNccDisplay}
                </p>
              </div>
            )}
            <div
              className={`order-row__detail-item rounded-xl border p-3 text-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Số ngày
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {order[ORDER_FIELDS.DAYS] || 0}
              </p>
            </div>
            <div
              className={`order-row__detail-item order-row__detail-item--note rounded-xl border p-3 text-center sm:col-span-2 ${showSupplierRefundColumn ? "xl:col-span-7" : "xl:col-span-6"
                } flex flex-col items-center justify-center ${orderTheme.detailItemClass}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${orderTheme.detailLabelClass}`}
              >
                Ghi chú
              </p>
              <p className="mt-1 text-sm text-indigo-50 text-center">
                {order[ORDER_FIELDS.NOTE] || "Không có ghi chú."}
              </p>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default OrderRowExpanded;
