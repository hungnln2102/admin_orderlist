import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/shared/api/client";
import {
  fetchSupplyOrderCosts,
  type SupplyOrderCostAggregates,
} from "@/lib/suppliesApi";
import ExternalImportLogModal from "./ExternalImportLogModal";
import EditTraceCodeModal from "./EditTraceCodeModal";
import type { Supply } from "../types";
import { showAppNotification } from "@/lib/notifications";
import SupplyCostFilters from "./supply-order-costs-panel/SupplyCostFilters";
import SupplyCostTabs from "./supply-order-costs-panel/SupplyCostTabs";
import SupplyCostTable from "./supply-order-costs-panel/SupplyCostTable";
import type {
  ActiveSupplyTab,
  ExternalImportLogItem,
} from "./supply-order-costs-panel/types";
import {
  EMPTY_AGG,
  formatCurrency,
  formatUpdateDate,
  PAGE_SIZE,
} from "./supply-order-costs-panel/utils";

type Props = {
  supplies: Supply[];
  onAggregatesChange?: (aggregates: SupplyOrderCostAggregates) => void;
};

const SupplyOrderCostsPanel: React.FC<Props> = ({ supplies, onAggregatesChange }) => {
  const onAggregatesRef = useRef(onAggregatesChange);
  onAggregatesRef.current = onAggregatesChange;
  const [activeTab, setActiveTab] = useState<ActiveSupplyTab>("nccCosts");

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
  const [editTraceTarget, setEditTraceTarget] =
    useState<ExternalImportLogItem | null>(null);

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
      const payload = await apiGet<Record<string, unknown>>(
        "/api/store-profit-expenses?expense_type=external_import,mavn_import"
      );
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setExternalLogs(
        items.map((item) => ({
          id: Number(item.id || 0),
          amount: Number(item.amount || 0),
          reason: String(item.reason || ""),
          linkedOrderCode: item.linkedOrderCode ? String(item.linkedOrderCode) : null,
          expenseDate: item.expenseDate || null,
          createdAt: item.createdAt || null,
          expenseType: String(item.expenseType || "external_import"),
          traceCode: item.traceCode ? String(item.traceCode) : null,
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
      <SupplyCostTabs activeTab={activeTab} onChange={setActiveTab} />

      <SupplyCostFilters
        activeTab={activeTab}
        supplies={supplies}
        supplyId={supplyId}
        q={q}
        onSupplyIdChange={(value) => {
          setSupplyId(value);
          setOffset(0);
        }}
        onQueryChange={setQ}
        onSearch={onSearch}
        onReset={() => {
          setQ("");
          setQApplied("");
          setSupplyId("");
          setOffset(0);
        }}
        onOpenCreateLog={() => setCreateLogOpen(true)}
      />

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

      <EditTraceCodeModal
        isOpen={Boolean(editTraceTarget)}
        expenseId={editTraceTarget?.id ?? 0}
        initialTraceCode={editTraceTarget?.traceCode ?? ""}
        initialReason={editTraceTarget?.reason ?? ""}
        onClose={() => setEditTraceTarget(null)}
        onSaved={() => {
          setEditTraceTarget(null);
          void loadExternalLogs();
          showAppNotification({
            type: "success",
            title: "Đã lưu mã trace",
            message: "Mã trace cho log nhập hàng đã được cập nhật.",
          });
        }}
      />

      <div className="glass-panel-dark border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl">
        <SupplyCostTable
          activeTab={activeTab}
          loading={loading}
          rows={rows}
          offset={offset}
          externalLoading={externalLoading}
          externalError={externalError}
          externalLogs={externalLogs}
          formatCurrency={formatCurrency}
          formatUpdateDate={formatUpdateDate}
          onEditTrace={setEditTraceTarget}
        />
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
