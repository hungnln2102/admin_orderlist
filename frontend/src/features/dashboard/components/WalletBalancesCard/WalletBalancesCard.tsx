import React, { useCallback, useMemo, useState } from "react";
import * as Helpers from "@/lib/helpers";
import { apiFetch } from "@/lib/api";
import { type WalletRow } from "../../hooks/useWalletBalances";
import WalletBalancesHeader from "./WalletBalancesHeader";
import WalletBalancesTable from "./WalletBalancesTable";
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

  return (
    <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-950/50 via-slate-900/60 to-slate-950/50 p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <WalletBalancesHeader
        labels={HEADER_LABELS}
        totalWallet5={totalWallet5}
        currencyFormatter={currencyFormatter}
        adding={adding}
        onToggleAdd={toggleAdd}
        onOpenManageColumns={() => setManageColumnsOpen(true)}
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

      {error && (
        <div className="mb-3 rounded-lg border border-amber-300/50 bg-amber-50/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

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
    </div>
  );
};

export default WalletBalancesCard;
