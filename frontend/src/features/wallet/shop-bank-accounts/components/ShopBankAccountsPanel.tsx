import { useCallback, useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import GradientButton from "@/components/ui/GradientButton";
import { showAppNotification } from "@/lib/notifications";
import {
  createShopBankAccount,
  deleteShopBankAccount,
  fetchShopBankAccounts,
  fetchShopBankAccountBalances,
  recordShopBankAccountWithdrawal,
  setDefaultShopBankAccount,
  updateShopBankAccount,
} from "../api/shopBankAccountApi";
import { DeleteShopBankAccountModal } from "./DeleteShopBankAccountModal";
import { ShopBankBalanceTable } from "./ShopBankBalanceTable";
import { ShopBankWithdrawModal } from "./ShopBankWithdrawModal";
import { ShopBankAccountFormModal } from "./ShopBankAccountFormModal";
import { ShopBankAccountTable } from "./ShopBankAccountTable";
import type {
  ShopBankAccountBalanceItem,
  ShopBankAccountItem,
  ShopBankAccountPayload,
} from "../types";

const PAGE_SIZE = 10;

export function ShopBankAccountsPanel() {
  const [items, setItems] = useState<ShopBankAccountItem[]>([]);
  const [balanceItems, setBalanceItems] = useState<ShopBankAccountBalanceItem[]>([]);
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
  const [editingItem, setEditingItem] = useState<ShopBankAccountItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ShopBankAccountItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

  const loadBalances = useCallback(async () => {
    try {
      setBalancesLoading(true);
      setBalanceError(null);
      setBalanceItems(await fetchShopBankAccountBalances());
    } catch (err) {
      setBalanceItems([]);
      setBalanceError(err instanceof Error ? err.message : "Không thể tải số dư STK.");
    } finally {
      setBalancesLoading(false);
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

  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  const handleWithdraw = async (accountId: number, amount: number) => {
    setWithdrawing(true);
    try {
      await recordShopBankAccountWithdrawal(accountId, amount);
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
        <p className="text-sm text-white/55">
          Tài khoản ngân hàng shop nhận CK đơn hàng (VietQR, Telegram). Một STK được đánh dấu mặc
          định.
        </p>
        <GradientButton onClick={openCreate} className="!rounded-2xl shrink-0">
          <PlusIcon className="mr-2 h-5 w-5 inline" />
          Thêm STK
        </GradientButton>
      </div>

      <ShopBankBalanceTable
        items={balanceItems}
        loading={balancesLoading}
        error={balanceError}
        onOpenWithdraw={() => setWithdrawOpen(true)}
        onEdit={openEdit}
        onDelete={setDeleteItem}
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
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
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

      <ShopBankWithdrawModal
        open={withdrawOpen}
        items={balanceItems}
        submitting={withdrawing}
        onClose={() => setWithdrawOpen(false)}
        onSubmit={handleWithdraw}
      />
    </div>
  );
}
