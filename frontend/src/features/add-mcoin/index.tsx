import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import type { CoinHistoryItem } from "./types";
import { AddCoinModal } from "./components/AddCoinModal";
import { AddMcoinHistoryTable } from "./components/AddMcoinHistoryTable";
import {
  MOCK_COIN_HISTORY,
} from "./constants";

const PAGE_SIZE = 10;

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

      <AddMcoinHistoryTable
        rows={currentRows}
        start={start}
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      <AddCoinModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
