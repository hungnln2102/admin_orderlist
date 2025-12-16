import React from "react";
import { PowerIcon, EyeIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import * as Helpers from "../../../../lib/helpers";
import { Supply } from "../types";
import PaymentHistoryTable from "./PaymentHistoryTable";

const formatCurrency = Helpers.formatCurrency;
const formatDate = (date: string | null) => (date ? Helpers.formatDateToDMY(date) : "--");

interface Props {
  supplies: Supply[];
  loading: boolean;
  expandedId: number | null;
  onToggle: (id: number) => void;
  onEdit: (supply: Supply) => void;
  onDelete: (supply: Supply) => void;
  onView: (supply: Supply) => void;
  onToggleStatus: (supply: Supply) => void;
}

const SupplyList: React.FC<Props> = ({
  supplies,
  loading,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-black/20 text-xs uppercase text-white/60 font-semibold">
            <tr>
              <th className="px-4 py-3">Nhà cung cấp</th>
              <th className="px-4 py-3">Tài khoản</th>
              <th className="px-4 py-3">Tháng này</th>
              <th className="px-4 py-3">Lần cuối</th>
              <th className="px-4 py-3">Đã trả</th>
              <th className="px-4 py-3">Cần nợ</th>
              <th className="px-4 py-3 text-center">TT</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-white/50">
                  Đang tải...
                </td>
              </tr>
            ) : (
              supplies.map((supply) => (
                <SupplyRow
                  key={supply.id}
                  supply={supply}
                  isExpanded={expandedId === supply.id}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  onToggleStatus={onToggleStatus}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SupplyRow = ({
  supply,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}: {
  supply: Supply;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  onEdit: (supply: Supply) => void;
  onDelete: (supply: Supply) => void;
  onView: (supply: Supply) => void;
  onToggleStatus: (supply: Supply) => void;
}) => {
  return (
    <>
      <tr
        className="bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-indigo-950/70 hover:bg-white/5 cursor-pointer transition border-b border-white/5"
        onClick={() => onToggle(supply.id)}
      >
        <td className="px-4 py-4">
          <div className="font-medium text-white">{supply.sourceName || "Không Tên"}</div>
          <div className="text-xs text-white/60">Tổng đơn: {supply.totalOrders}</div>
        </td>
        <td className="px-4 py-4 text-white/80 text-sm">
          <div>{supply.numberBank || "--"}</div>
          <div className="text-xs text-white/50">{supply.bankName}</div>
        </td>
        <td className="px-4 py-4 text-white/80 text-sm">
          <div>{supply.monthlyOrders} Đơn</div>
          <div className="text-xs text-emerald-400">{formatCurrency(supply.monthlyImportValue)}</div>
        </td>
        <td className="px-4 py-4 text-white/80 text-sm">{formatDate(supply.lastOrderDate)}</td>
        <td className="px-4 py-4 text-white/80 text-sm">{formatCurrency(supply.totalPaidImport)}</td>
        <td className="px-4 py-4 font-bold text-orange-400 text-sm">{formatCurrency(supply.totalUnpaidImport)}</td>
        <td className="px-4 py-4 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(supply);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              supply.isActive ? "bg-emerald-500 text-white" : "bg-gray-600 text-gray-300"
            }`}
          >
            <PowerIcon className="h-4 w-4" />
          </button>
        </td>
        <td className="px-4 py-4 text-right">
          <div className="flex justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(supply);
              }}
              className="p-1 text-blue-400 hover:text-blue-300"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(supply);
              }}
              className="p-1 text-green-400 hover:text-green-300"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(supply);
              }}
              className="p-1 text-rose-400 hover:text-rose-300"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-0 pb-4 pt-0 bg-indigo-950/30">
            <div className="p-4 border-b border-white/10 shadow-inner">
              <PaymentHistoryTable supplyId={supply.id} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default SupplyList;
