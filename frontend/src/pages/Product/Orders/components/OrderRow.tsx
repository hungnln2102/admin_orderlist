import React, { useCallback } from "react";
import {
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import {
  formatCurrency,
  normalizeStatusValue,
} from "../utils/ordersHelpers";
import {
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type OrderRowProps = {
  order: Order;
  index: number;
  isExpanded: boolean;
  showRemainingColumn: boolean;
  showActionButtons: boolean;
  isActiveDataset: boolean;
  isCanceled: boolean;
  totalColumns: number;
  renewingOrderCode: string | null;
  onToggleDetails: (orderId: number) => void;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onConfirmRefund: (order: Order) => void;
  onMarkPaid: (order: Order) => void;
  onRenew: (order: Order) => void;
};

export const OrderRow = React.memo(function OrderRow({
  order,
  index,
  isExpanded,
  showRemainingColumn,
  showActionButtons,
  isActiveDataset,
  isCanceled,
  totalColumns,
  renewingOrderCode,
  onToggleDetails,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
  onMarkPaid,
  onRenew,
}: OrderRowProps) {
  const {
    [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: soNgayConLai,
    [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
    [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
    [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: check_flag_status,
  } = order;

  const costValue = Number.isFinite(Number(order[ORDER_FIELDS.COST]))
    ? Number(order[ORDER_FIELDS.COST])
    : 0;
  const priceValue = Number.isFinite(Number(order[ORDER_FIELDS.PRICE]))
    ? Number(order[ORDER_FIELDS.PRICE])
    : 0;
  const giaTriConLaiSafe = Number.isFinite(Number(giaTriConLai))
    ? Number(giaTriConLai)
    : 0;
  const refundFromRow = Number.isFinite(Number(order.can_hoan))
    ? Number(order.can_hoan)
    : null;
  const giaTriConLaiForCanceled = isCanceled
    ? Math.max(
        0,
        refundFromRow !== null && Number.isFinite(giaTriConLaiSafe)
          ? Math.min(refundFromRow, giaTriConLaiSafe)
          : refundFromRow ?? giaTriConLaiSafe
      )
    : giaTriConLaiSafe;

  const normalizedStatus = normalizeStatusValue(String(trangThaiText || ""));
  const canConfirmRefund = isCanceled && normalizedStatus.includes("chua hoan");

  const orderDateDisplay = order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] || "";
  const expiryDateDisplay = order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] || "";
  const orderCodeText = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
  const isRenewing = renewingOrderCode === orderCodeText;

  const remainingValue = Number.isFinite(Number(soNgayConLai))
    ? Number(soNgayConLai)
    : 0;
  const remainingClass = isCanceled
    ? "text-indigo-600"
    : remainingValue <= 0
    ? "text-red-600"
    : remainingValue <= 4
    ? "text-orange-500"
    : "text-green-500";
  const remainingDisplay = isCanceled
    ? formatCurrency(giaTriConLaiForCanceled)
    : remainingValue;

  const handleToggle = useCallback(() => {
    if (order.id !== undefined && order.id !== null) {
      onToggleDetails(order.id);
    }
  }, [onToggleDetails, order.id]);

  const stopPropagation =
    (action: (targetOrder: Order) => void) =>
    (event: React.MouseEvent) => {
      event.stopPropagation();
      action(order);
    };

  return (
    <React.Fragment>
      <tr
        onClick={handleToggle}
        className={`cursor-pointer transition ${
          index % 2 === 0 ? "bg-slate-900/55" : "bg-indigo-950/40"
        } ${isExpanded ? "bg-indigo-700/25" : ""} hover:bg-indigo-600/25`}
      >
        {/* 1. GỘP ORDER + PRODUCT */}
        <td className="px-4 py-4 text-sm font-medium text-white w-[150px] text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold whitespace-nowrap truncate max-w-[150px]">
              {order[ORDER_FIELDS.ID_ORDER] || ""}
            </span>
            <span className="text-white/70 text-xs mt-0.5 whitespace-nowrap truncate max-w-[150px]">
              {order[ORDER_FIELDS.ID_PRODUCT] || ""}
            </span>
          </div>
        </td>

        {/* INFORMATION + SLOT (text-center) */}
        <td className="px-4 py-4 whitespace-nowrap text-sm text-white w-[140px] text-center">
          <div className="flex flex-col items-center">
            <span className="text-white/80 text-xs whitespace-nowrap truncate max-w-[150px]">
              {order[ORDER_FIELDS.INFORMATION_ORDER] || ""}
            </span>
            {order[ORDER_FIELDS.SLOT] ? (
              <span className="text-white/70 text-xs mt-0.5 whitespace-nowrap truncate max-w-[150px]">
                {order[ORDER_FIELDS.SLOT]}
              </span>
            ) : null}
          </div>
        </td>

        {/* 2. GỘP CUSTOMER + CONTACT */}
        <td className="px-4 py-4 text-sm text-white w-[150px] text-center">
          <div className="flex flex-col items-center">
            <span className="font-medium whitespace-nowrap truncate max-w-[150px]">
              {order[ORDER_FIELDS.CUSTOMER] || ""}
            </span>
            <span
              className="text-white/70 text-xs mt-0.5 whitespace-nowrap truncate max-w-[150px]"
              title={String(order[ORDER_FIELDS.CONTACT] || "")}
            >
              {order[ORDER_FIELDS.CONTACT] || ""}
            </span>
          </div>
        </td>

        {/* ORDER RANGE (text-center) */}
        <td className="px-4 py-4 whitespace-nowrap truncate text-sm text-white w-[150px] text-center">
          {orderDateDisplay && expiryDateDisplay
            ? `${orderDateDisplay} - ${expiryDateDisplay}`
            : orderDateDisplay || expiryDateDisplay || ""}
        </td>
        {showRemainingColumn && (
          <td className="px-4 py-4 whitespace-nowrap truncate text-sm font-bold w-[60px] text-center">
            <span className={remainingClass}>{remainingDisplay}</span>
          </td>
        )}

        {/* STATUS (text-center) */}
        <td className="px-4 py-4 whitespace-nowrap truncate w-[90px] text-center">
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${Helpers.getStatusColor(
              String(trangThaiText || "")
            )}`}
          >
            {String(trangThaiText || "")}
          </span>
        </td>
        {/* ACTION (text-right) */}
        <td className="px-4 py-4 whitespace-nowrap truncate text-right text-sm font-medium w-[90px]">
          <div className="flex space-x-2 justify-end">
            <button
              onClick={stopPropagation(onView)}
              className="text-blue-600 hover:text-blue-900 p-1 rounded"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {canConfirmRefund && (
              <button
                onClick={stopPropagation(onConfirmRefund)}
                className="text-emerald-600 hover:text-emerald-800 p-1 rounded"
                title="Xác nhận đã giải/hoàn tiền"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            )}
            {isActiveDataset && (
              <>
                <button
                  onClick={stopPropagation(onEdit)}
                  className="text-green-600 hover:text-green-900 p-1 rounded"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={stopPropagation(onDelete)}
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                  title="Xoa don hang"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-indigo-900/40">
          <td colSpan={totalColumns} className="px-6 pb-6 pt-0">
            <div className="rounded-2xl border border-dashed border-indigo-200/60 bg-indigo-600/20 p-5 shadow-lg shadow-indigo-900/30">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold text-indigo-50">
                    Chi tiết đơn hàng
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                    #{order[ORDER_FIELDS.ID_ORDER] || ""}
                  </p>
                </div>
                {showActionButtons && (
                  <div className="ml-4 flex items-center gap-2">
                    {!(
                      (order[ORDER_FIELDS.STATUS] === ORDER_STATUSES.DA_THANH_TOAN &&
                        order[ORDER_FIELDS.CHECK_FLAG] === true) ||
                      normalizedStatus === "can gia han"
                    ) && (
                      <button
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-900/40"
                        onClick={stopPropagation(onMarkPaid)}
                      >
                        Đã Thanh Toán
                      </button>
                    )}
                    <button
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-indigo-900/40 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isRenewing}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isRenewing) {
                          onRenew(order);
                        }
                      }}
                    >
                      {isRenewing ? "Đang Gia Hạn..." : "Gia Hạn"}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Nguồn
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {order[ORDER_FIELDS.SUPPLY] || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Giá nhập
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(costValue)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Giá bán
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(priceValue)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Giá trị còn lại
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(giaTriConLaiForCanceled)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Số ngày
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {order[ORDER_FIELDS.DAYS] || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center sm:col-span-2 lg:col-span-5 flex flex-col items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Ghi chú
                  </p>
                  <p className="mt-1 text-sm text-indigo-50 text-center">
                    {order[ORDER_FIELDS.NOTE] || "Không có ghi chú."}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center sm:col-span-2 lg:col-span-5 flex flex-col items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Kiểm tra
                  </p>
                  {check_flag_status === null ? (
                    <div className="mt-3 h-5" />
                  ) : (
                    <div className="mt-3 flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={Boolean(check_flag_status)}
                        readOnly
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

OrderRow.displayName = "OrderRow";
