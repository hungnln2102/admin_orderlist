import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteSupplyById,
  fetchSupplyOrderCosts,
  type SupplyOrderCostAggregates,
} from "@/lib/suppliesApi";
import SupplyStatsCards from "./components/SupplyStatsCards";
import SupplyOrderCostsPanel from "./components/SupplyOrderCostsPanel";
import SupplyList from "./components/SupplyList";
import SupplierDetailModal from "./components/SupplierDetailModal";
import { AddSupplierModal } from "./components/AddSupplierModal";
import { EditSupplierModal } from "./components/EditSupplierModal";
import { DeleteSupplyModal } from "./components/DeleteSupplyModal";
import { SupplyFiltersBar } from "./components/SupplyFiltersBar";
import { useSupplyList } from "./hooks/useSupplyList";
import { useBanks } from "./hooks/useBanks";
import { useFilteredSupplies } from "./hooks/useFilteredSupplies";
import type { Supply } from "./types";
import { showAppNotification } from "@/lib/notifications";

const EMPTY_ORDER_COST_AGG: SupplyOrderCostAggregates = {
  orderCount: 0,
  totalCost: 0,
  totalRefund: 0,
};

export default function Sources() {
  const { supplies, loading, fetchSupplies, toggleStatus } = useSupplyList();
  const { banks } = useBanks();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [deleteSupply, setDeleteSupply] = useState<Supply | null>(null);
  const [viewTab, setViewTab] = useState<"summary" | "orderCosts">("summary");
  const [orderCostTotals, setOrderCostTotals] =
    useState<SupplyOrderCostAggregates>(EMPTY_ORDER_COST_AGG);
  const [orderCostTotalsLoading, setOrderCostTotalsLoading] = useState(true);
  const orderCostTotalsRequestId = useRef(0);

  const loadGlobalOrderCostTotals = useCallback(async () => {
    const reqId = ++orderCostTotalsRequestId.current;
    setOrderCostTotalsLoading(true);
    try {
      const data = await fetchSupplyOrderCosts({
        limit: 1,
        offset: 0,
        supplyId: null,
        q: "",
      });
      if (reqId !== orderCostTotalsRequestId.current) {
        return;
      }
      setOrderCostTotals(data.aggregates ?? EMPTY_ORDER_COST_AGG);
    } catch {
      if (reqId !== orderCostTotalsRequestId.current) {
        return;
      }
      setOrderCostTotals(EMPTY_ORDER_COST_AGG);
    } finally {
      if (reqId === orderCostTotalsRequestId.current) {
        setOrderCostTotalsLoading(false);
      }
    }
  }, []);

  const filteredSupplies = useFilteredSupplies({
    supplies,
    searchTerm,
    statusFilter,
  });

  useEffect(() => {
    void fetchSupplies();
  }, [fetchSupplies]);

  useEffect(() => {
    if (viewTab === "summary") {
      void loadGlobalOrderCostTotals();
    } else {
      orderCostTotalsRequestId.current += 1;
    }
  }, [viewTab, loadGlobalOrderCostTotals]);

  const handleDelete = async () => {
    if (!deleteSupply) {
      return;
    }

    const response = await deleteSupplyById(deleteSupply.id);
    if (response.success) {
      await fetchSupplies();
      setDeleteSupply(null);
      return;
    }

    showAppNotification({
      type: "error",
      title: "Lỗi xóa nhà cung cấp",
      message: response.message || "Không thể xóa nhà cung cấp.",
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Quản Lý Nguồn Hàng</h1>
        <p className="text-white/60 text-sm">
          Theo dõi công nợ và chu kỳ thanh toán từ các đối tác cung cấp.
        </p>
      </div>

      <SupplyStatsCards
        orderCount={orderCostTotals.orderCount}
        totalCost={orderCostTotals.totalCost}
        totalRefund={orderCostTotals.totalRefund}
        loading={orderCostTotalsLoading && viewTab === "summary"}
      />

      <div className="w-full flex p-2 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.2)] backdrop-blur-xl transition-all duration-300">
        <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-2.5 min-h-[2.875rem]">
          {(
            [
              { key: "summary" as const, label: "Bảng tổng" },
              { key: "orderCosts" as const, label: "Danh sách chi phí NCC" },
            ] as const
          ).map((tab) => {
            const isActive = viewTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewTab(tab.key)}
                className={`w-full rounded-xl px-3 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-sm font-bold uppercase tracking-[0.08em] sm:tracking-[0.12em] transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? "text-white shadow-[0_10px_28px_-6px_rgba(99,102,241,0.45)] bg-gradient-to-br from-indigo-500/85 via-indigo-600/55 to-violet-700/45 border border-indigo-300/40 ring-1 ring-white/10"
                    : "text-indigo-200/55 hover:text-indigo-100/95 hover:bg-indigo-900/25 border border-transparent hover:border-indigo-500/25"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {viewTab === "summary" ? (
        <>
          <SupplyFiltersBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onAddSupplier={() => setAddModal(true)}
          />

          <SupplyList
            supplies={filteredSupplies}
            loading={loading}
            expandedId={expandedId}
            onToggle={(id: number) =>
              setExpandedId((prev) => (prev === id ? null : id))
            }
            onEdit={setEditSupply}
            onDelete={setDeleteSupply}
            onView={(supply: Supply) => setViewId(supply.id)}
            onToggleStatus={(supply: Supply) =>
              toggleStatus(supply.id, supply.isActive)
            }
            onRefreshSupplies={fetchSupplies}
          />
        </>
      ) : (
        <SupplyOrderCostsPanel
          supplies={supplies}
          onAggregatesChange={setOrderCostTotals}
        />
      )}

      <AddSupplierModal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        onSuccess={fetchSupplies}
        banks={banks}
      />
      <EditSupplierModal
        isOpen={!!editSupply}
        onClose={() => setEditSupply(null)}
        onSuccess={fetchSupplies}
        supply={editSupply}
        banks={banks}
      />
      <DeleteSupplyModal
        isOpen={!!deleteSupply}
        onClose={() => setDeleteSupply(null)}
        onConfirm={handleDelete}
        supply={deleteSupply}
      />
      <SupplierDetailModal
        isOpen={!!viewId}
        onClose={() => setViewId(null)}
        supplyId={viewId}
        banks={banks}
        onRefreshList={fetchSupplies}
      />
    </div>
  );
}
