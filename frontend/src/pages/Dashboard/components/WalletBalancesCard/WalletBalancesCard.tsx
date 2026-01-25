import React, { useCallback, useMemo, useState } from "react";
import * as Helpers from "../../../../lib/helpers";
import { apiFetch } from "../../../../lib/api";
import { type WalletRow } from "../../hooks/useWalletBalances";
import WalletBalancesHeader from "./WalletBalancesHeader";
import WalletBalancesTable from "./WalletBalancesTable";
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
    (row: WalletRow, col: DisplayColumn) =>
      resolveValueUtil(row, col, assetCodeByField),
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
    const payload: Record<string, number> = {};
    columns.forEach((col) => {
      const raw = newValues[col.field] || "";
      const isVnd = !col.assetCode || col.assetCode.toUpperCase() === "VND";
      
      // For VND, dots are thousand separators -> remove them
      // For others, dots are decimal points -> keep them
      const cleaned = isVnd ? raw.replace(/\./g, "") : raw;
      const num = Number(cleaned || 0);
      if (cleaned) payload[col.field] = Number.isFinite(num) ? num : 0;
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
    <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/60 to-slate-900/65 p-5 shadow-[0_20px_55px_-32px_rgba(0,0,0,0.7)]">
      <WalletBalancesHeader
        labels={HEADER_LABELS}
        totalWallet5={totalWallet5}
        currencyFormatter={currencyFormatter}
        adding={adding}
        onToggleAdd={toggleAdd}
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
