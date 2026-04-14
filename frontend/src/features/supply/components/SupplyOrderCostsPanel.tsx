import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Helpers from "@/lib/helpers";
import { apiFetch } from "@/lib/api";
import {
  fetchSupplyOrderCosts,
  type SupplyOrderCostAggregates,
  type SupplyOrderCostRow,
} from "@/lib/suppliesApi";
import ExternalImportLogModal from "./ExternalImportLogModal";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import type { Supply } from "../types";
import { showAppNotification } from "@/lib/notifications";

const formatCurrency = Helpers.formatCurrency;
const formatUpdateDate = (row: SupplyOrderCostRow) => {
  const raw = row.canceledAt || row.orderDate;
  if (!raw) return "--";
  return Helpers.formatDateToDMY(raw) || String(raw);
};

const PAGE_SIZE = 80;

const EMPTY_AGG: SupplyOrderCostAggregates = {
  orderCount: 0,
  totalCost: 0,
  totalRefund: 0,
};

type Props = {
  supplies: Supply[];
  onAggregatesChange?: (aggregates: SupplyOrderCostAggregates) => void;
};

type ExternalImportLogItem = {
  id: number;
  amount: number;
  reason: string;
  expenseDate: string | null;
  createdAt: string | null;
};

const SupplyOrderCostsPanel: React.FC<Props> = ({ supplies, onAggregatesChange }) => {
  const onAggregatesRef = useRef(onAggregatesChange);
  onAggregatesRef.current = onAggregatesChange;
  const [activeTab, setActiveTab] = useState<"nccCosts" | "externalImport">("nccCosts");

  const [supplyId, setSupplyId] = useState<string>("");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<SupplyOrderCostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createLogOpen, setCreateLogOpen] = useState(false);
  const [externalLogs, setExternalLogs] = useState<ExternalImportLogItem[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sid =
        supplyId !== "" && supplyId !== "all"
          ? Number.parseInt(supplyId, 10)
          : null;
      const data = await fetchSupplyOrderCosts({
        limit: PAGE_SIZE,
        offset,
        supplyId: sid != null && Number.isFinite(sid) ? sid : null,
        q: qApplied,
      });
      setRows(data.rows || []);
      setTotal(Number(data.total) || 0);
      onAggregatesRef.current?.(data.aggregates ?? EMPTY_AGG);
    } catch (e) {
      showAppNotification({
        type: "error",
        title: "Lỗi tải dữ liệu",
        message: e instanceof Error ? e.message : "Không thể tải danh sách chi phí NCC.",
      });
      setRows([]);
      setTotal(0);
      onAggregatesRef.current?.(EMPTY_AGG);
    } finally {
      setLoading(false);
    }
  }, [offset, qApplied, supplyId]);

  useEffect(() => {
    if (activeTab !== "nccCosts") return;
    void load();
  }, [activeTab, load]);

  const loadExternalLogs = useCallback(async () => {
    setExternalLoading(true);
    setExternalError(null);
    try {
      const response = await apiFetch(
        "/api/store-profit-expenses?expense_type=external_import"
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setExternalLogs(
        items.map((item) => ({
          id: Number(item.id || 0),
          amount: Number(item.amount || 0),
          reason: String(item.reason || ""),
          expenseDate: item.expenseDate || null,
          createdAt: item.createdAt || null,
        }))
      );
    } catch (error) {
      console.error("Failed to load external import logs:", error);
      setExternalLogs([]);
      setExternalError("Không thể tải log nhập hàng ngoài luồng.");
    } finally {
      setExternalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "externalImport") return;
    void loadExternalLogs();
  }, [activeTab, loadExternalLogs]);

  const onSearch = () => {
    setOffset(0);
    setQApplied(q.trim());
  };

  const canPrev = offset > 0;
  const canNext = offset + rows.length < total;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/25 p-2 backdrop-blur-xl">
        <div className="grid min-h-[2.75rem] grid-cols-2 gap-2">
          {(
            [
              { key: "nccCosts" as const, label: "Chi phí NCC theo đơn" },
              { key: "externalImport" as const, label: "Nhập hàng ngoài luồng" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all sm:text-sm ${
                  isActive
                    ? "border border-indigo-300/40 bg-gradient-to-br from-indigo-500/85 via-indigo-600/55 to-violet-700/45 text-white shadow-[0_10px_28px_-6px_rgba(99,102,241,0.45)]"
                    : "border border-transparent text-indigo-200/65 hover:border-indigo-500/25 hover:bg-indigo-900/25 hover:text-indigo-100/95"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {activeTab === "nccCosts" ? (
          <>
            <label className="flex min-w-[200px] flex-col gap-1 text-xs text-white/50">
              Nhà cung cấp
              <select
                value={supplyId === "" ? "all" : supplyId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSupplyId(v === "all" ? "" : v);
                  setOffset(0);
                }}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-indigo-400/60 focus:outline-none"
              >
                <option value="all">Tất cả NCC</option>
                {supplies.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.sourceName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-white/50">
              Mã đơn
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
                placeholder="Tìm theo mã đơn..."
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-400/60 focus:outline-none"
              />
            </label>
          </>
        ) : (
          <div className="min-w-[280px] flex-1 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-white/70">
            Danh sách log nhập hàng ngoài luồng (expense_type = external_import)
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateLogOpen(true)}
            className="rounded-xl border border-emerald-400/40 bg-emerald-600/25 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500/40"
          >
            Tạo log nhập hàng
          </button>
          {activeTab === "nccCosts" ? (
            <>
              <button
                type="button"
                onClick={onSearch}
                className="rounded-xl border border-indigo-400/40 bg-indigo-600/40 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500/50"
              >
                Tìm
              </button>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setQApplied("");
                  setSupplyId("");
                  setOffset(0);
                }}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Xóa lọc
              </button>
            </>
          ) : null}
        </div>
      </div>

      <ExternalImportLogModal
        isOpen={createLogOpen}
        onClose={() => setCreateLogOpen(false)}
        onSuccess={() => {
          setCreateLogOpen(false);
          if (activeTab === "externalImport") {
            void loadExternalLogs();
          }
          showAppNotification({
            type: "success",
            title: "Đã tạo log nhập hàng",
            message: "Log chi phí ngoài luồng đã được ghi nhận.",
          });
        }}
      />

      <div className="glass-panel-dark border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl">
        <ResponsiveTable className="supply-order-costs__inner" showCardOnMobile={false}>
          <table className="w-full text-left">
            {activeTab === "nccCosts" ? (
              <>
                <thead className="bg-white/5 text-[10px] uppercase text-indigo-300/40 font-bold tracking-[0.2em]">
                  <tr>
                    <th className="px-4 py-3 w-14">STT</th>
                    <th className="px-4 py-3">NCC</th>
                    <th className="px-4 py-3">Đơn</th>
                    <th className="px-4 py-3">Tiền nhập</th>
                    <th className="px-4 py-3">Tiền hoàn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-white/50">
                        Đang tải...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-white/50">
                        Không có dòng nào.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={row.orderPk || `${row.idOrder}-${idx}`} className="text-sm text-white/90">
                        <td className="px-4 py-3 text-white/50">{offset + idx + 1}</td>
                        <td className="px-4 py-3">{row.supplierName || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.idOrder || "—"}</td>
                        <td className="px-4 py-3 text-emerald-300/90">{formatCurrency(row.cost)}</td>
                        <td className="px-4 py-3 text-amber-200/90">{formatCurrency(row.refund)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              String(row.nccPaymentStatus || "").includes("Đã")
                                ? "rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-200"
                                : "rounded-lg bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-100/90"
                            }
                          >
                            {row.nccPaymentStatus || "Chưa Thanh Toán"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/70">{formatUpdateDate(row)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead className="bg-white/5 text-[10px] uppercase text-indigo-300/40 font-bold tracking-[0.2em]">
                  <tr>
                    <th className="px-4 py-3 w-14">STT</th>
                    <th className="px-4 py-3">Ngày tạo</th>
                    <th className="px-4 py-3">Số tiền nhập</th>
                    <th className="px-4 py-3">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {externalLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-white/50">
                        Đang tải log nhập hàng...
                      </td>
                    </tr>
                  ) : externalError ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-rose-200">
                        {externalError}
                      </td>
                    </tr>
                  ) : externalLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-white/50">
                        Chưa có log nhập hàng ngoài luồng.
                      </td>
                    </tr>
                  ) : (
                    externalLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="text-sm text-white/90">
                        <td className="px-4 py-3 text-white/50">{idx + 1}</td>
                        <td className="px-4 py-3 text-white/70">
                          {Helpers.formatDateToDMY(log.expenseDate || log.createdAt || "") || "—"}
                        </td>
                        <td className="px-4 py-3 text-emerald-300/90">
                          {formatCurrency(log.amount)}
                        </td>
                        <td className="px-4 py-3">{log.reason || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
        </ResponsiveTable>
        {activeTab === "nccCosts" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3 text-xs text-white/50">
            <span>
              {total > 0 ? (
                <>
                  Hiển thị {offset + 1}–{offset + rows.length} / {total}
                </>
              ) : (
                <>Không có bản ghi</>
              )}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev || loading}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-white/80 enabled:hover:bg-white/5 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={!canNext || loading}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-white/80 enabled:hover:bg-white/5 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-white/5 px-4 py-3 text-xs text-white/50">
            Tổng log ngoài luồng: {externalLogs.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyOrderCostsPanel;
