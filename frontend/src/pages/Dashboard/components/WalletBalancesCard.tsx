import React, { useMemo, useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import * as Helpers from "../../../lib/helpers";
import { apiFetch } from "../../../lib/api";
import { type WalletColumn, type WalletRow } from "../hooks/useWalletBalances";

type WalletBalancesCardProps = {
  columns: WalletColumn[];
  rows: WalletRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  currencyFormatter: Intl.NumberFormat;
  goldPrice: number | null;
};

const formatDate = (value: string) => {
  const parsed = Helpers.formatDateToDMY(new Date(value));
  return parsed || value;
};

type DisplayColumn = WalletColumn & { sourceFields?: string[]; assetCode?: string };

const buildDisplayColumns = (columns: WalletColumn[]): DisplayColumn[] => {
  const normalize = (val: string) =>
    (val || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const goldCols = columns.filter((col) => {
    const name = normalize(col.name || col.field || "");
    return name.includes("hana") || name.includes("gold") || name.includes("vang");
  });
  const nonGoldCols = columns.filter((col) => !goldCols.includes(col));

  if (!goldCols.length) return columns;

  const goldAssetCodes = Array.from(new Set(goldCols.map((c) => (c.assetCode || "").toUpperCase()).filter(Boolean)));

  return [
    ...nonGoldCols,
    {
      id: 0,
      field: "wallet_gold_combined",
      name: "HanaGold / Vang",
      assetCode: goldAssetCodes.length === 1 ? goldAssetCodes[0] : undefined,
      sourceFields: goldCols.map((c) => c.field),
    },
  ];
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
  const assetCodeByField = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    columns.forEach((col) => {
      map[col.field] = col.assetCode;
    });
    return map;
  }, [columns]);

  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const wallet5Field = useMemo(() => columns.find((c) => c.id === 5)?.field || null, [columns]);
  const totalWallet5 = useMemo(
    () =>
      wallet5Field
        ? rows.reduce((sum, row) => sum + (Number(row.values[wallet5Field] || 0) || 0), 0)
        : null,
    [rows, wallet5Field]
  );

  const goldField = useMemo(() => {
    const byId = columns.find((c) => c.id === 7);
    if (byId) return byId.field;
    const nonVnd = columns.find((c) => (c.assetCode || "").toUpperCase() !== "VND");
    return nonVnd ? nonVnd.field : null;
  }, [columns]);

  const totalGoldAmount = useMemo(() => {
    if (!rows.length || !goldField) return 0;
    return rows.reduce((sum, row) => sum + (Number(row.values[goldField] || 0) || 0), 0);
  }, [rows, goldField]);

  const goldPricePerChi = useMemo(() => {
    if (!goldPrice) return null;
    return goldPrice / 10; // API price is per luong, divide to get chi
  }, [goldPrice]);

  const totalGoldValue = useMemo(() => {
    if (!goldPricePerChi || !totalGoldAmount) return null;
    return totalGoldAmount * goldPricePerChi;
  }, [goldPricePerChi, totalGoldAmount]);

  const formatNonVnd = (val: number) => {
    const [intPart, decPart] = String(val).split(".");
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decPart ? `${intFormatted}.${decPart}` : intFormatted;
  };

  const formatValue = (val: number, assetCode?: string) => {
    if (!val) return "-";
    const code = (assetCode || "").toUpperCase();
    if (code === "VND") return currencyFormatter.format(val);
    return formatNonVnd(val);
  };

  const resolveValue = (row: WalletRow, col: DisplayColumn) => {
    if (col.sourceFields && col.sourceFields.length) {
      return col.sourceFields.map((field) => ({
        field,
        value: Number(row.values[field] || 0) || 0,
        assetCode: assetCodeByField[field],
      }));
    }
    return Number(row.values[col.field] || 0);
  };

  const handleChangeValue = (field: string, value: string) => {
    setNewValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setAdding(false);
    setNewDate("");
    setNewValues({});
  };

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

  const toggleAdd = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setNewDate(`${yyyy}-${mm}-${dd}`);
    setAdding((v) => !v);
  };

  return (
    <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/60 to-slate-900/65 p-5 shadow-[0_20px_55px_-32px_rgba(0,0,0,0.7)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Dòng tiền theo ngày</p>
          {totalWallet5 !== null && (
            <p className="text-xs text-white/70">Tổng ID 5: {currencyFormatter.format(totalWallet5)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          {adding ? <XMarkIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
          {adding ? "Đóng" : "Thêm"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-amber-300/50 bg-amber-50/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-white/10 text-xs uppercase tracking-[0.08em] text-white/80">
            <tr>
              <th className="px-3 py-2 text-center">Ngày</th>
              {displayColumns.map((col) => (
                <th key={col.field} className="px-3 py-2 text-center">
                  {col.name || col.field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {adding && (
              <>
                <tr className="bg-white/5">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="date"
                      className="w-full rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-400"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </td>
                  {displayColumns.map((col) => {
                    if (col.sourceFields && col.sourceFields.length) {
                      return (
                        <td key={col.field} className="px-3 py-2 text-center whitespace-pre-line">
                          <div className="flex flex-col gap-1">
                            {col.sourceFields.map((field) => (
                              <input
                                key={field}
                                className="w-full rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs text-slate-900 text-center focus:ring-2 focus:ring-indigo-400"
                                placeholder={field}
                                value={newValues[field] || ""}
                                onChange={(e) => handleChangeValue(field, e.target.value)}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={col.field} className="px-3 py-2 text-center">
                        <input
                          className="w-full rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs text-slate-900 text-center focus:ring-2 focus:ring-indigo-400"
                          placeholder="0"
                          value={newValues[col.field] || ""}
                          onChange={(e) => handleChangeValue(col.field, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-white/5">
                  <td className="px-3 py-2 text-center" colSpan={displayColumns.length + 1}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                        onClick={handleSave}
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                        onClick={handleCancel}
                      >
                        Hủy
                      </button>
                    </div>
                  </td>
                </tr>
              </>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-3 text-center text-white/70" colSpan={displayColumns.length + 1}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-white/70" colSpan={displayColumns.length + 1}>
                  Chưa có dữ liệu dòng tiền.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, idx) => (
                <tr key={`${row.recordDate}-${idx}`} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-center font-semibold">{formatDate(row.recordDate)}</td>
                  {displayColumns.map((col) => {
                    const resolved = resolveValue(row, col);
                    if (Array.isArray(resolved)) {
                      const parts = resolved
                        .map((item) =>
                          item.value ? formatValue(item.value, item.assetCode || col.assetCode) : null
                        )
                        .filter(Boolean);
                      const text = parts.length ? parts.join("\n") : "-";
                      return (
                        <td key={col.field} className="px-3 py-2 text-center text-white/90 whitespace-pre-line">
                          {text}
                        </td>
                      );
                    }
                    return (
                      <td key={col.field} className="px-3 py-2 text-center text-white/90">
                        {formatValue(resolved as number, col.assetCode)}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WalletBalancesCard;

