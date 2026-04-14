import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as Helpers from "@/lib/helpers";
import { apiFetch } from "@/lib/api";
import { type WalletRow } from "../../hooks/useWalletBalances";
import WalletBalancesHeader from "./WalletBalancesHeader";
import WalletBalancesTable from "./WalletBalancesTable";
import WalletWithdrawTable from "./WalletWithdrawTable";
import WithdrawMoneyModal from "./WithdrawMoneyModal";
import { WalletTypesManagerModal } from "./WalletTypesManagerModal";
import {
  type DisplayColumn,
  type WalletBalancesCardProps,
  type WalletBalancesHeaderLabels,
  type WalletBalancesTableLabels,
} from "./types";
import {
  buildAssetCodeByField,
  buildDisplayColumns,
  formatDate,
  formatValue as formatValueUtil,
  resolveValue as resolveValueUtil,
} from "./utils";

const HEADER_LABELS: WalletBalancesHeaderLabels = {
  title: "Dòng tiền theo ngày",
  totalWallet5Label: "Tổng ID 5:",
  addLabel: "Thêm",
  closeLabel: "Đóng",
  manageColumnsLabel: "Cột",
};

const TABLE_LABELS: WalletBalancesTableLabels = {
  dateHeader: "Ngày",
  saveLabel: "Lưu",
  cancelLabel: "Hủy",
  loadingText: "Đang tải dữ liệu...",
  emptyText: "Chưa có dữ liệu dòng tiền.",
};

type WalletCardTab = "daily_flow" | "withdraw";

type WithdrawItem = {
  id: number;
  amount: number;
  reason: string;
  expenseDate: string | null;
};


const WalletBalancesCard: React.FC<WalletBalancesCardProps> = ({
  columns,
  rows,
  loading,
  error,
  onRefresh,
  currencyFormatter,
}) => {
  const displayColumns = useMemo(() => buildDisplayColumns(columns), [columns]);
  const assetCodeByField = useMemo(
    () => buildAssetCodeByField(columns),
    [columns]
  );

  const [adding, setAdding] = useState(false);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<WalletCardTab>("daily_flow");
  const [withdrawRows, setWithdrawRows] = useState<WithdrawItem[]>([]);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const wallet5Field = useMemo(
    () => columns.find((c) => c.id === 5)?.field || null,
    [columns]
  );
  const totalWallet5 = useMemo(
    () =>
      wallet5Field
        ? rows.reduce(
            (sum, row) =>
              sum + (Number(row.values[wallet5Field] || 0) || 0),
            0
          )
        : null,
    [rows, wallet5Field]
  );



  const formatValue = useCallback(
    (val: number, assetCode?: string) =>
      formatValueUtil(val, assetCode, currencyFormatter),
    [currencyFormatter]
  );

  const resolveValue = useCallback(
    (row: WalletRow, col: DisplayColumn) => resolveValueUtil(row, col, assetCodeByField),
    [assetCodeByField]
  );

  const handleChangeValue = useCallback((field: string, value: string) => {
    const col = columns.find(c => c.field === field);
    const isVnd = !col?.assetCode || col.assetCode.toUpperCase() === "VND";
    
    setNewValues((prev) => ({ 
      ...prev, 
      [field]: isVnd ? Helpers.formatNumberOnTyping(value) : Helpers.formatDecimalOnTyping(value)
    }));
  }, [columns]);

  const handleCancel = useCallback(() => {
    setAdding(false);
    setNewDate("");
    setNewValues({});
  }, []);

  const handleSave = async () => {
    const recordDate = newDate || Helpers.formatDateToDMY(new Date()) || "";
    if (!recordDate) return;
    const sameDayRow = rows.find((r) => r.recordDate === recordDate);
    const payload: Record<string, number> = {};
    columns.forEach((col) => {
      const raw = newValues[col.field] || "";
      const isVnd = !col.assetCode || col.assetCode.toUpperCase() === "VND";

      // For VND, dots are thousand separators -> remove them
      // For others, dots are decimal points -> keep them
      const cleaned = isVnd ? raw.replace(/\./g, "") : raw;
      const num = Number(cleaned || 0);
      if (cleaned) {
        if (Number.isFinite(num)) payload[col.field] = num;
        return;
      }
      const fromSameDay = sameDayRow?.values[col.field];
      if (fromSameDay !== undefined && fromSameDay !== null && Number.isFinite(Number(fromSameDay))) {
        payload[col.field] = Number(fromSameDay);
      }
    });
    try {
      await apiFetch("/api/wallets/daily-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordDate, values: payload }),
      });
      handleCancel();
      onRefresh();
    } catch (err) {
      console.error("Failed to save wallet balances:", err);
    }
  };

  const toggleAdd = useCallback(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setNewDate(`${yyyy}-${mm}-${dd}`);
    setAdding((v) => !v);
  }, []);

  const loadWithdrawRows = useCallback(async () => {
    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      const response = await apiFetch(
        "/api/store-profit-expenses?expense_type=withdraw_profit"
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setWithdrawRows(
        items.map((item) => ({
          id: Number(item.id || 0),
          amount: Number(item.amount || 0),
          reason: String(item.reason || ""),
          expenseDate: item.expenseDate || null,
        }))
      );
    } catch (errorFetch) {
      console.error("Failed to fetch withdraw rows:", errorFetch);
      setWithdrawError("Không thể tải dữ liệu rút tiền.");
    } finally {
      setWithdrawLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "withdraw") return;
    void loadWithdrawRows();
  }, [activeTab, loadWithdrawRows]);

  const tabButtons = (
    <div className="inline-flex items-center rounded-lg border border-white/15 bg-slate-900/50 p-1">
      <button
        type="button"
        onClick={() => {
          setActiveTab("daily_flow");
        }}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          activeTab === "daily_flow"
            ? "bg-indigo-500/70 text-white"
            : "text-white/70 hover:text-white"
        }`}
      >
        Dòng tiền theo ngày
      </button>
      <button
        type="button"
        onClick={() => {
          setAdding(false);
          setActiveTab("withdraw");
        }}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          activeTab === "withdraw"
            ? "bg-indigo-500/70 text-white"
            : "text-white/70 hover:text-white"
        }`}
      >
        Rút tiền
      </button>
    </div>
  );
  const withdrawActionButton =
    activeTab === "withdraw" ? (
      <button
        type="button"
        onClick={() => setWithdrawModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500/30"
      >
        + Rút tiền
      </button>
    ) : null;

  return (
    <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <WalletBalancesHeader
        labels={{
          ...HEADER_LABELS,
          title: activeTab === "withdraw" ? "Rút tiền" : HEADER_LABELS.title,
        }}
        totalWallet5={totalWallet5}
        currencyFormatter={currencyFormatter}
        adding={adding}
        onToggleAdd={toggleAdd}
        onOpenManageColumns={() => setManageColumnsOpen(true)}
        centerSlot={tabButtons}
        showAddButton={activeTab === "daily_flow"}
        showManageButton={activeTab === "daily_flow"}
        rightSlot={withdrawActionButton}
      />

      <WalletTypesManagerModal
        isOpen={manageColumnsOpen}
        onClose={() => setManageColumnsOpen(false)}
        columns={columns}
        onSuccess={() => {
          setManageColumnsOpen(false);
          onRefresh();
        }}
      />
      <WithdrawMoneyModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onSuccess={() => {
          void loadWithdrawRows();
          setWithdrawModalOpen(false);
        }}
      />

      {error && (
        <div className="mb-3 rounded-lg border border-amber-300/50 bg-amber-50/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

      {activeTab === "daily_flow" ? (
        <WalletBalancesTable
          displayColumns={displayColumns}
          rows={rows}
          adding={adding}
          newDate={newDate}
          newValues={newValues}
          loading={loading}
          onDateChange={setNewDate}
          onValueChange={handleChangeValue}
          onSave={handleSave}
          onCancel={handleCancel}
          formatDate={formatDate}
          formatValue={formatValue}
          resolveValue={resolveValue}
          labels={TABLE_LABELS}
        />
      ) : (
        <WalletWithdrawTable
          items={withdrawRows}
          loading={withdrawLoading}
          error={withdrawError}
          currencyFormatter={currencyFormatter}
        />
      )}
    </div>
  );
};

export default WalletBalancesCard;
