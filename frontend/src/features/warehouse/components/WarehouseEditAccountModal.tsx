import React, { useState, useEffect } from "react";
import { Key, X, Save, AlertCircle } from "lucide-react";
import { WarehouseAccountItem } from "../types";

interface WarehouseEditAccountModalProps {
  open: boolean;
  account: WarehouseAccountItem | null;
  onClose: () => void;
  onSubmit: (accountId: number, newAccountName: string) => Promise<void>;
}

export const WarehouseEditAccountModal: React.FC<WarehouseEditAccountModalProps> = ({
  open,
  account,
  onClose,
  onSubmit,
}) => {
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setAccountName(account.account || "");
      setError(null);
    }
  }, [account]);

  if (!open || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = accountName.trim();
    if (!trimmed) {
      setError("Email / Tên tài khoản kho không được để trống!");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(account.id, trimmed);
      onClose();
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật tài khoản kho");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-150 backdrop-blur-xl">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-inner">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Chỉnh Sửa Tài Khoản Gốc
              </h3>
              <p className="text-[11px] text-slate-400">
                Mã tài khoản: <span className="font-mono text-amber-300 font-semibold">#{account.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Tài Khoản Email / Username (*)
            </label>
            <input
              type="text"
              autoFocus
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="ví dụ: team_adobe_01@mavrykstore.com"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/80 transition-all shadow-inner"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Thay đổi này sẽ cập nhật trực tiếp tên tài khoản mẹ cho toàn bộ các slot dịch vụ bên trong.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-3.5 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Số slot dịch vụ trực thuộc:</span>
              <span className="font-semibold text-indigo-300">{account.services?.length || 0} slot</span>
            </div>
            <div className="flex justify-between">
              <span>Ngày tạo:</span>
              <span className="font-mono text-slate-300">{account.created_at || "—"}</span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
