import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import * as Helpers from "../../../../lib/helpers";
import { PaymentReceipt, formatCurrencyVnd, resolveSender } from "../helpers";

type ReceiptDetailModalProps = {
  open: boolean;
  receipt: PaymentReceipt | null;
  onClose: () => void;
};

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  open,
  receipt,
  onClose,
}) => {
  if (!open || !receipt) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl relative z-[100]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chi tiet bien nhan</h2>
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
                {receipt.paidAt ? Helpers.formatDateToDMY(receipt.paidAt) : "--"}
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
          </div>
          <div>
            <p className="text-gray-500 mb-1 text-sm">Nội Dung Chuyển Khoản</p>
            <div className="p-3 rounded-lg border border-gray-200 text-sm text-gray-800 bg-gray-50 min-h-[80px]">
              {receipt.note || "Không có ghi chú"}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-indigo-500/10 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
