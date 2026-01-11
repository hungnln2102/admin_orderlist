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
  goldPrice,
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

  const goldField = useMemo(() => {
    const byId = columns.find((c) => c.id === 7);
    if (byId) return byId.field;
    const nonVnd = columns.find(
      (c) => (c.assetCode || "").toUpperCase() !== "VND"
    );
    return nonVnd ? nonVnd.field : null;
  }, [columns]);

  const totalGoldAmount = useMemo(() => {
    if (!rows.length || !goldField) return 0;
    return rows.reduce(
      (sum, row) => sum + (Number(row.values[goldField] || 0) || 0),
      0
    );
  }, [rows, goldField]);

  const goldPricePerChi = useMemo(() => {
    if (!goldPrice) return null;
    return goldPrice / 10; // API price is per luong, divide to get chi
  }, [goldPrice]);

  const totalGoldValue = useMemo(() => {
    if (!goldPricePerChi || !totalGoldAmount) return null;
    return totalGoldAmount * goldPricePerChi;
  }, [goldPricePerChi, totalGoldAmount]);

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
    setNewValues((prev) => ({ ...prev, [field]: value }));
  }, []);

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
      const cleaned = raw.replace(/[^\d.-]/g, "");
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
