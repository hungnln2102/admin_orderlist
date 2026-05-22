import { useCallback, useEffect, useMemo, useState } from "react";
import { BanknotesIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import GradientButton from "@/components/ui/GradientButton";
import { showAppNotification } from "@/lib/notifications";
import {
  createShopBankAccount,
  deleteShopBankAccount,
  fetchShopBankAccounts,
  fetchShopBankAccountBalances,
  setDefaultShopBankAccount,
  updateShopBankAccount,
  updateShopBankAccountWithdrawn,
} from "../api/shopBankAccountApi";
import { DeleteShopBankAccountModal } from "../components/DeleteShopBankAccountModal";
import { ShopBankBalanceTable } from "../components/ShopBankBalanceTable";
import { ShopBankAccountFormModal } from "../components/ShopBankAccountFormModal";
import { ShopBankAccountTable } from "../components/ShopBankAccountTable";
import {
  formatShopBankMoneyInput,
  parseShopBankMoneyInput,
} from "../helpers/formatShopBankMoney";
import type { ShopBankAccountBalanceItem, ShopBankAccountItem, ShopBankAccountPayload } from "../types";

const PAGE_SIZE = 10;

export function ShopBankAccountsPage() {
  const [items, setItems] = useState<ShopBankAccountItem[]>([]);
  const [balanceItems, setBalanceItems] = useState<ShopBankAccountBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [balancesRefreshing, setBalancesRefreshing] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<ShopBankAccountItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ShopBankAccountItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [savingWithdrawnId, setSavingWithdrawnId] = useState<number | null>(null);
  const [withdrawnDrafts, setWithdrawnDrafts] = useState<Record<number, string>>({});

  const loadBalances = useCallback(async (options?: { refreshOnly?: boolean }) => {
    const refreshOnly = options?.refreshOnly === true;
    try {
      if (refreshOnly) {
        setBalancesRefreshing(true);
      } else {
        setBalancesLoading(true);
      }
      setBalanceError(null);
      const rows = await fetchShopBankAccountBalances();
      setBalanceItems(rows);
      setWithdrawnDrafts(() => {
        const next: Record<number, string> = {};
        for (const row of rows) {
          next[row.id] = formatShopBankMoneyInput(row.totalWithdrawn);
        }
        return next;
      });
    } catch (err) {
      setBalanceItems([]);
      setBalanceError(
        err instanceof Error ? err.message : "Không thể tải số dư STK."
      );
    } finally {
      if (refreshOnly) {
        setBalancesRefreshing(false);
      } else {
        setBalancesLoading(false);
      }
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await fetchShopBankAccounts());
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Không thể tải danh sách STK.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
    void loadBalances();
  }, [loadItems, loadBalances]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.accountNumber,
        item.accountHolder,
        item.label,
        item.bankDisplayName,
        item.bankBin,
        item.bankShortCode,
      ]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q))
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openCreate = () => {
    setFormMode("create");
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: ShopBankAccountItem) => {
    setFormMode("edit");
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: ShopBankAccountPayload) => {
    setSubmitting(true);
    try {
      if (formMode === "create") {
        await createShopBankAccount(payload);
        showAppNotification({ type: "success", message: "Đã thêm STK." });
      } else if (editingItem) {
        await updateShopBankAccount(editingItem.id, payload);
        showAppNotification({ type: "success", message: "Đã cập nhật STK." });
      }
      setFormOpen(false);
      await Promise.all([loadItems(), loadBalances()]);
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể lưu STK.",
      });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (item: ShopBankAccountItem) => {
    setSettingDefaultId(item.id);
    try {
      await setDefaultShopBankAccount(item.id);
      showAppNotification({ type: "success", message: "Đã đặt STK mặc định." });
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

  const handleWithdrawnDraftChange = (id: number, value: string) => {
    setWithdrawnDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveWithdrawn = async (item: ShopBankAccountBalanceItem) => {
    const amount = parseShopBankMoneyInput(withdrawnDrafts[item.id] ?? "");
    setSavingWithdrawnId(item.id);
    try {
      const updated = await updateShopBankAccountWithdrawn(item.id, amount);
      setBalanceItems((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row))
      );
      setWithdrawnDrafts((prev) => ({
        ...prev,
        [item.id]: formatShopBankMoneyInput(updated.totalWithdrawn),
      }));
      showAppNotification({ type: "success", message: "Đã cập nhật số tiền đã rút." });
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể lưu số tiền đã rút.",
      });
    } finally {
      setSavingWithdrawnId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteShopBankAccount(deleteItem.id);
      showAppNotification({ type: "success", message: "Đã xóa STK." });
      setDeleteItem(null);
      await Promise.all([loadItems(), loadBalances()]);
    } catch (err) {
      showAppNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể xóa STK.",
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
            <BanknotesIcon className="h-8 w-8 text-emerald-300" />
            <h1 className="text-2xl font-bold text-white">Quản lý STK</h1>
          </div>
          <p className="mt-2 text-sm text-white/55">
            Tài khoản ngân hàng shop nhận CK đơn hàng (VietQR, Telegram). Một STK được đánh dấu mặc định.
          </p>
        </div>
        <GradientButton onClick={openCreate} className="!rounded-2xl shrink-0">
          <PlusIcon className="mr-2 h-5 w-5 inline" />
          Thêm STK
        </GradientButton>
      </div>

      <ShopBankBalanceTable
        items={balanceItems}
        loading={balancesLoading}
        error={balanceError}
        savingId={savingWithdrawnId}
        draftWithdrawn={withdrawnDrafts}
        onWithdrawnDraftChange={handleWithdrawnDraftChange}
        onSaveWithdrawn={handleSaveWithdrawn}
        onRefresh={() => void loadBalances({ refreshOnly: true })}
        refreshing={balancesRefreshing}
      />

      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm STK, tên chủ, ngân hàng..."
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
          <ShopBankAccountTable
            items={pageItems}
            startIndex={(currentPage - 1) * PAGE_SIZE}
            onEdit={openEdit}
            onDelete={setDeleteItem}
            onSetDefault={handleSetDefault}
            settingDefaultId={settingDefaultId}
          />
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <ShopBankAccountFormModal
        isOpen={formOpen}
        mode={formMode}
        item={editingItem}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <DeleteShopBankAccountModal
        open={!!deleteItem}
        item={deleteItem}
        submitting={deleting}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
