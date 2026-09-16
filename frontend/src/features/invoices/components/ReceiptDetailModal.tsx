import { formatDateToDMY } from "@/shared/date";
import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { PaymentReceipt, formatCurrencyVnd, resolveSender } from "../helpers";
import { apiFetch } from "@/shared/api/client";

type ReceiptDetailModalProps = {
  open: boolean;
  receipt: PaymentReceipt | null;
  onClose: () => void;
};

type CreditHistoryItem = {
  id: number;
  targetOrderCode: string;
  orderCustomer: string;
  orderStatus: string;
  appliedAmount: number;
  appliedAt: string;
  appliedBy: string;
  note: string;
};

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  open,
  receipt,
  onClose,
}) => {
  const [historyData, setHistoryData] = useState<{
    totalAmount: number;
    availableAmount: number;
    usedAmount: number;
    history: CreditHistoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && receipt) {
      setLoading(true);
      apiFetch(`/api/payment-receipts/${receipt.id}/credit-history`)
        .then(res => res.json())
        .then(data => {
          setHistoryData(data);
        })
        .catch(err => console.error("Error fetching credit history", err))
        .finally(() => setLoading(false));
    } else {
      setHistoryData(null);
    }
  }, [open, receipt]);

  if (!open || !receipt) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl relative z-[100] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chi tiết biên nhận</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Mã đơn</p>
              <p className="font-semibold text-gray-900">
                {receipt.orderCode || "--"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Ngày Thanh Toán</p>
              <p className="font-semibold text-gray-900">
                {receipt.paidAt ? formatDateToDMY(receipt.paidAt) : "--"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Người Gửi</p>
              <p className="font-semibold text-gray-900">
                {resolveSender(receipt) || "--"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Người Nhận</p>
              <p className="font-semibold text-gray-900">
                {receipt.receiver || "--"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Số Tiền</p>
              <p className="font-semibold text-gray-900">
                {formatCurrencyVnd(receipt.amount)}
              </p>
            </div>
            {receipt.creditCode && (
              <div>
                <p className="text-gray-500 mb-1">Credit liên kết</p>
                <p className="font-semibold text-amber-600">
                  💳 {receipt.creditCode}
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-gray-500 mb-1 text-sm">Nội Dung Chuyển Khoản</p>
            <div className="p-3 rounded-lg border border-gray-200 text-sm text-gray-800 bg-gray-50 min-h-[60px]">
              {receipt.note || "Không có ghi chú"}
            </div>
          </div>

          {/* Credit Usage History Section */}
          {(loading || (historyData && historyData.totalAmount > 0)) && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Lịch sử phân bổ & sử dụng Credit</h3>
              {loading ? (
                <div className="text-sm text-gray-500 py-4 text-center">Đang tải lịch sử...</div>
              ) : historyData ? (
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex-1">
                      <p className="text-gray-500">Tổng tiền ban đầu</p>
                      <p className="font-bold text-gray-900">{formatCurrencyVnd(historyData.totalAmount)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-500">Đã sử dụng</p>
                      <p className="font-bold text-rose-600">{formatCurrencyVnd(historyData.usedAmount)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-500">Số dư khả dụng</p>
                      <p className="font-bold text-emerald-600">{formatCurrencyVnd(historyData.availableAmount)}</p>
                    </div>
                  </div>

                  {historyData.history.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Đơn Hàng</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-500">Số Tiền</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Ngày Dùng</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Người Thực Hiện</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {historyData.history.map((app) => (
                            <tr key={app.id}>
                              <td className="px-3 py-2 font-medium text-gray-900">{app.targetOrderCode || "--"}</td>
                              <td className="px-3 py-2 text-right font-semibold text-rose-600">-{formatCurrencyVnd(app.appliedAmount)}</td>
                              <td className="px-3 py-2 text-gray-500">{formatDateToDMY(app.appliedAt)}</td>
                              <td className="px-3 py-2 text-gray-500">{app.appliedBy || "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic py-2 text-center">Chưa có lịch sử sử dụng.</div>
                  )}
                </div>
              ) : null}
            </div>
          )}

        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
