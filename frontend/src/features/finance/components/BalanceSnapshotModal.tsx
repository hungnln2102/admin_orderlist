import React from "react";
import { Landmark, Loader2, Plus, Trash2, Wallet, XCircle } from "lucide-react";
import { formatVND } from "@/shared/utils";

export interface BalanceSnapshotFormItem {
  id?: string;
  name: string;
  amountStr: string;
  type?: string;
  bankAccountId?: number;
  assetId?: number;
}

interface BalanceSnapshotModalProps {
  isOpen: boolean;
  formDate: string;
  formItems: BalanceSnapshotFormItem[];
  formAutoSync: boolean;
  formLivePersonalTotal: number;
  formGrandTotal: number;
  shopBalanceTotal: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onFormDateChange: (value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (index: number, field: "name" | "amountStr", value: string) => void;
  onAutoSyncChange: (value: boolean) => void;
}

export const BalanceSnapshotModal: React.FC<BalanceSnapshotModalProps> = ({
  isOpen,
  formDate,
  formItems,
  formAutoSync,
  formLivePersonalTotal,
  formGrandTotal,
  shopBalanceTotal,
  submitting,
  onClose,
  onSubmit,
  onFormDateChange,
  onAddItem,
  onRemoveItem,
  onItemChange,
  onAutoSyncChange,
}) => {
  if (!isOpen) return null;

  return (        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>Chốt Tài Chính</span>
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Ngày chốt */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ngày Chốt
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => onFormDateChange(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Danh sách các tài khoản / nguồn tài chính cá nhân */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Các Nguồn Tài Sản Cá Nhân (Hanagold, Momo, TK Cá Nhân...)
                  </label>
                  <button
                    type="button"
                    onClick={onAddItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Kênh Khác</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Tên tài khoản / ví (VD: Hanagold, Momo)"
                        value={item.name}
                        onChange={(e) => onItemChange(idx, "name", e.target.value)}
                        required
                        className="flex-1 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />

                      <div className="relative w-44">
                        <input
                          type="text"
                          placeholder="0 ₫"
                          value={item.amountStr}
                          onChange={(e) => onItemChange(idx, "amountStr", e.target.value)}
                          required
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-lg pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-emerald-300 text-right focus:outline-none focus:border-cyan-500"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-500 font-bold">₫</span>
                      </div>

                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotal cá nhân */}
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Tổng Tài Sản Cá Nhân:</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {formatVND(formLivePersonalTotal)}
                  </span>
                </div>
              </div>

              {/* 2. Tài sản Shop tự động */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">2. Tài Sản Shop (Tự Động)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      TỰ ĐỘNG SHOP
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Hệ thống tự động cộng dồn số dư các ví Shop Bank & USDT hiện tại
                  </span>
                </div>
                <span className="font-mono font-black text-base text-cyan-300">
                  {formatVND(shopBalanceTotal || 0)}
                </span>
              </div>

              {/* Tạm tính Tổng Tài Sản Toàn Diện */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">TỔNG TÀI SẢN TOÀN DIỆN:</span>
                  <span className="text-[11px] text-slate-400 block">
                    Cá nhân ({formatVND(formLivePersonalTotal)}) + Shop ({formatVND(shopBalanceTotal || 0)})
                  </span>
                </div>
                <span className="font-mono font-black text-xl text-white">
                  {formatVND(formGrandTotal)}
                </span>
              </div>

              {/* Checkbox Đồng bộ 2 chiều cho tài sản cá nhân */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoSync}
                    onChange={(e) => onAutoSyncChange(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Tự động đồng bộ vào số dư hiện thời
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Cập nhật luôn số dư hiện tại trong danh mục tài sản cá nhân và chỉ số Net Worth.
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Chốt Tài Chính</span>
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
