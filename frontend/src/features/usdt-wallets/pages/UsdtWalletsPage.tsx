import { useCallback, useEffect, useMemo, useState } from "react";
import { CurrencyDollarIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import GradientButton from "@/components/ui/GradientButton";
import { showAppNotification } from "@/lib/notifications";
import {
  createUsdtWallet,
  deleteUsdtWallet,
  fetchUsdtExchangeRate,
  fetchUsdtWalletBalances,
  fetchUsdtWallets,
  recordUsdtWalletWithdrawal,
  setDefaultUsdtWallet,
  updateUsdtWallet,
} from "../api/usdtWalletApi";
import { DeleteUsdtWalletModal } from "../components/DeleteUsdtWalletModal";
import { UsdtWalletBalanceTable } from "../components/UsdtWalletBalanceTable";
import { UsdtWalletFormModal } from "../components/UsdtWalletFormModal";
import { UsdtWalletTable } from "../components/UsdtWalletTable";
import { UsdtWalletWithdrawModal } from "../components/UsdtWalletWithdrawModal";
import type { UsdtWalletBalanceItem, UsdtWalletItem, UsdtWalletPayload } from "../types";

const PAGE_SIZE = 10;

export function UsdtWalletsPage() {
  const [items, setItems] = useState<UsdtWalletItem[]>([]);
  const [balanceItems, setBalanceItems] = useState<UsdtWalletBalanceItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<UsdtWalletItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<UsdtWalletItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

  const loadExchangeRate = useCallback(async () => {
    try {
      const rate = await fetchUsdtExchangeRate();
      setExchangeRate(rate.vndPerUsdt > 0 ? rate.vndPerUsdt : null);
    } catch {
      setExchangeRate(null);
    }
  }, []);

  const loadBalances = useCallback(async () => {
    try {
      setBalancesLoading(true);
      setBalanceError(null);
      setBalanceItems(await fetchUsdtWalletBalances());
    } catch (err) {
      setBalanceItems([]);
      setBalanceError(err instanceof Error ? err.message : "Không thể tải số dư ví USDT.");
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await fetchUsdtWallets());
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Không thể tải danh sách ví USDT.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
    void loadBalances();
    void loadExchangeRate();
  }, [loadItems, loadBalances, loadExchangeRate]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.walletAddress, item.label, item.network]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q))
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSubmit = async (payload: UsdtWalletPayload) => {
    setSubmitting(true);
    try {
      if (formMode === "create") {
        await createUsdtWallet(payload);
        showAppNotification({ type: "success", message: "Đã thêm ví USDT." });
      } else if (editingItem) {
        await updateUsdtWallet(editingItem.id, payload);
        showAppNotification({ type: "success", message: "Đã cập nhật ví USDT." });
      }
      setFormOpen(false);
      await Promise.all([loadItems(), loadBalances()]);
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể lưu ví USDT.",
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (item: UsdtWalletItem) => {
    setSettingDefaultId(item.id);
    try {
      await setDefaultUsdtWallet(item.id);
      showAppNotification({ type: "success", message: "Đã đặt ví mặc định." });
      await Promise.all([loadItems(), loadBalances()]);
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể đặt mặc định.",
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleWithdraw = async (walletId: number, amount: number) => {
    setWithdrawing(true);
    try {
      await recordUsdtWalletWithdrawal(walletId, amount);
      showAppNotification({ type: "success", message: "Đã ghi nhận rút tiền." });
      setWithdrawOpen(false);
      await loadBalances();
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể ghi nhận rút tiền.",
      });
      throw err;
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteUsdtWallet(deleteItem.id);
      showAppNotification({ type: "success", message: "Đã xóa ví USDT." });
      setDeleteItem(null);
      await Promise.all([loadItems(), loadBalances()]);
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể xóa ví.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-8 w-8 text-cyan-300" />
            <h1 className="text-2xl font-bold text-white">Quản lý ví USDT</h1>
          </div>
          <p className="mt-2 text-sm text-white/55">
            Ví USDT shop nhận thanh toán đơn hàng thủ công. Số dư theo USD, quy đổi tỷ giá Binance.
          </p>
        </div>
        <GradientButton onClick={() => { setFormMode("create"); setEditingItem(null); setFormOpen(true); }} className="!rounded-2xl shrink-0">
          <PlusIcon className="mr-2 h-5 w-5 inline" />
          Thêm ví
        </GradientButton>
      </div>

      <UsdtWalletBalanceTable
        items={balanceItems}
        loading={balancesLoading}
        error={balanceError}
        exchangeRate={exchangeRate}
        onOpenWithdraw={() => setWithdrawOpen(true)}
      />

      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm địa chỉ ví, nhãn, mạng lưới..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 py-3 pl-12 pr-4 text-sm text-white"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-[28px] border border-white/10 bg-slate-900/40 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-white/60">Đang tải...</p>
        ) : (
          <UsdtWalletTable
            items={pageItems}
            startIndex={(currentPage - 1) * PAGE_SIZE}
            onEdit={(item) => { setFormMode("edit"); setEditingItem(item); setFormOpen(true); }}
            onDelete={setDeleteItem}
            onSetDefault={handleSetDefault}
            settingDefaultId={settingDefaultId}
          />
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      <UsdtWalletFormModal
        isOpen={formOpen}
        mode={formMode}
        item={editingItem}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <DeleteUsdtWalletModal
        open={!!deleteItem}
        item={deleteItem}
        submitting={deleting}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />

      <UsdtWalletWithdrawModal
        open={withdrawOpen}
        items={balanceItems}
        submitting={withdrawing}
        onClose={() => setWithdrawOpen(false)}
        onSubmit={handleWithdraw}
      />
    </div>
  );
}
