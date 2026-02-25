import { useMemo, useState, useEffect } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import GradientButton from "@/components/ui/GradientButton";
import { showAppNotification } from "@/lib/notifications";
import type { CoinHistoryItem } from "./types";
import {
  MOCK_COIN_HISTORY,
  formatCoinAmount,
  formatCoinDate,
} from "./constants";

const PAGE_SIZE = 10;

function AddCoinModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: CoinHistoryItem) => void;
}) {
  const [account, setAccount] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccount("");
      setAmountStr("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const acc = account.trim();
    if (!acc) {
      setError("Vui lòng nhập tài khoản.");
      return;
    }
    const amount = amountStr === "" ? 0 : parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) {
      setError("Số xu phải lớn hơn 0.");
      return;
    }
    const newItem: CoinHistoryItem = {
      id: String(Date.now()),
      account: acc,
      type: "add",
      amount,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    onSuccess(newItem);
    onClose();
    showAppNotification({
      type: "success",
      message: `Đã nạp ${formatCoinAmount(amount)} cho tài khoản ${acc}.`,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountStr(e.target.value.replace(/\D/g, ""));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-md p-8 border border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-coin-title"
      >
        <h3 id="add-coin-title" className="text-2xl font-bold text-white mb-6 tracking-tight">
          Add coin
        </h3>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              Tài khoản
            </label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30"
              placeholder="Nhập tài khoản..."
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              Số xu
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30 tabular-nums"
              placeholder="Nhập số xu..."
              value={amountStr}
              onChange={handleAmountChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">
              Mô tả
            </label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30 resize-none"
              placeholder="Mô tả (tùy chọn)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <GradientButton type="submit" className="!py-2.5 !px-8 text-sm">
              Xác nhận
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddMcoin() {
  const [history, setHistory] = useState<CoinHistoryItem[]>(MOCK_COIN_HISTORY);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const q = searchTerm.trim().toLowerCase();
    return history.filter(
      (item) =>
        item.account.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [history, searchTerm]);

  const totalItems = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(start, start + PAGE_SIZE);

  const handleAddSuccess = (newItem: CoinHistoryItem) => {
    setHistory((prev) => [newItem, ...prev]);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Add <span className="text-indigo-400">Mcoin</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Lịch sử nạp và tiêu coin của khách hàng
          </p>
        </div>
        <GradientButton
          icon={PlusIcon}
          onClick={() => setModalOpen(true)}
          className="shrink-0"
        >
          Add coin
        </GradientButton>
      </div>

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tài khoản, mô tả..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable
          showCardOnMobile
          cardView={
            currentRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg mb-2">Chưa có giao dịch nào</p>
                <p className="text-white/60 text-sm">Thử thay đổi từ khóa hoặc thêm giao dịch</p>
              </div>
            ) : (
              <TableCard
                data={currentRows}
                renderCard={(item, idx) => {
                  const row = item as CoinHistoryItem;
                  const isAdd = row.type === "add";
                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 shadow-lg backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-indigo-300/70 tabular-nums">
                          #{start + idx + 1}
                        </span>
                        <span className="text-sm font-medium text-white">{row.account}</span>
                        <span
                          className={
                            isAdd
                              ? "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }
                        >
                          {isAdd ? "Nạp" : "Tiêu"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        <div className="text-white/60">Số xu</div>
                        <div
                          className={`tabular-nums text-right font-medium ${isAdd ? "text-emerald-300" : "text-rose-300"}`}
                        >
                          {isAdd ? "+" : "-"}
                          {formatCoinAmount(row.amount)}
                        </div>
                        <div className="text-white/60">Mô tả</div>
                        <div className="text-white/90 text-right truncate">{row.description || "—"}</div>
                        <div className="text-white/60">Thời gian</div>
                        <div className="text-white/80 text-right text-xs">{formatCoinDate(row.createdAt)}</div>
                      </div>
                    </div>
                  );
                }}
                className="p-4"
              />
            )
          }
        >
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="w-12 text-center">STT</th>
                <th className="min-w-[100px]">TÀI KHOẢN</th>
                <th className="w-24 text-center">LOẠI</th>
                <th className="w-28 text-right">SỐ XU</th>
                <th className="min-w-[140px]">MÔ TẢ</th>
                <th className="min-w-[120px]">THỜI GIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/70">
                    <p className="text-lg mb-2">Chưa có giao dịch nào</p>
                    <p className="text-sm text-white/60">Thử thay đổi từ khóa hoặc thêm giao dịch</p>
                  </td>
                </tr>
              ) : (
                currentRows.map((row, i) => {
                  const isAdd = row.type === "add";
                  return (
                    <tr
                      key={row.id}
                      className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-2 py-3 sm:px-4 text-center text-sm text-white/80 tabular-nums whitespace-nowrap">
                        {start + i + 1}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 whitespace-nowrap">
                        {row.account}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-center whitespace-nowrap">
                        <span
                          className={
                            isAdd
                              ? "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }
                        >
                          {isAdd ? "Nạp" : "Tiêu"}
                        </span>
                      </td>
                      <td
                        className={`px-2 py-3 sm:px-4 text-right text-sm tabular-nums whitespace-nowrap ${isAdd ? "text-emerald-300" : "text-rose-300"}`}
                      >
                        {isAdd ? "+" : "-"}
                        {formatCoinAmount(row.amount)}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-sm text-white/80 whitespace-nowrap max-w-[200px] truncate" title={row.description}>
                        {row.description || "—"}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-sm text-white/70 whitespace-nowrap">
                        {formatCoinDate(row.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveTable>

        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <AddCoinModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
