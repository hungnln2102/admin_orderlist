import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupplyOrderCosts,
  type SupplyOrderCostAggregates,
  type SupplyOrderCostRow,
} from "@/lib/suppliesApi";
import type { Supply } from "../types";
import { showAppNotification } from "@/lib/notifications";
import SupplyCostFilters from "./supply-order-costs-panel/SupplyCostFilters";
import SupplyCostTable from "./supply-order-costs-panel/SupplyCostTable";
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

  const [supplyId, setSupplyId] = useState<string>("");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<SupplyOrderCostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

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
    void load();
  }, [load]);

  const onSearch = () => {
    setOffset(0);
    setQApplied(q.trim());
  };

  return (
    <div className="space-y-4">
      <SupplyCostFilters
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
      />

      <div className="rounded-3xl bg-slate-950/40 border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-2xl overflow-hidden">
        <SupplyCostTable
          loading={loading}
          rows={rows}
          offset={offset}
          formatCurrency={formatCurrency}
          formatUpdateDate={formatUpdateDate}
        />
        {total > PAGE_SIZE && (
          <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-200/60 bg-indigo-950/20">
            <span className="font-medium tracking-wide">
              Hiển thị {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} trên tổng số <span className="text-white font-bold">{total}</span> đơn
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1).map((p) => {
                const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setOffset((p - 1) * PAGE_SIZE)}
                    disabled={loading}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      p === currentPage
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400/30"
                        : "bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-200 text-white/60 border border-white/5 hover:border-indigo-500/30 active:scale-95"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyOrderCostsPanel;
