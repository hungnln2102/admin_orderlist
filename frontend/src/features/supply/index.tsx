import { useEffect, useState } from "react";
import { deleteSupplyById } from "@/lib/suppliesApi";
import SupplyStatsCards from "./components/SupplyStatsCards";
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

export default function Sources() {
  const { supplies, stats, loading, fetchSupplies, toggleStatus } =
    useSupplyList();
  const { banks } = useBanks();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [deleteSupply, setDeleteSupply] = useState<Supply | null>(null);

  const filteredSupplies = useFilteredSupplies({
    supplies,
    searchTerm,
    statusFilter,
  });

  useEffect(() => {
    void fetchSupplies();
  }, [fetchSupplies]);

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

      <SupplyStatsCards stats={stats} />

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
