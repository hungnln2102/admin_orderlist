import React, { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../components/ui/GradientButton";
import { apiFetch } from "../../../lib/api";
import { deleteSupplyById } from "../../../lib/suppliesApi";
import { BankOption, Supply } from "./types";
import SupplyStatsCards from "./components/SupplyStatsCards";
import SupplyList from "./components/SupplyList";
import SupplierDetailModal from "./components/SupplierDetailModal";
import { useSupplyList } from "./hooks/useSupplyList";
import { normalizeText } from "./utils/supplies";

const AddSupplierModal = ({
  isOpen,
  onClose,
  onSuccess,
  banks,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  banks: BankOption[];
}) => {
  const [form, setForm] = useState({ sourceName: "", numberBank: "", bankBin: "", status: "active" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && banks.length > 0 && !form.bankBin) setForm((prev) => ({ ...prev, bankBin: banks[0].bin }));
  }, [isOpen, banks, form.bankBin]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sourceName.trim()) return setError("Tên không được để trống");

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi khi tạo");
      onSuccess();
      onClose();
      setForm({ sourceName: "", numberBank: "", bankBin: banks[0]?.bin || "", status: "active" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo nhà cung cấp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Thêm Nhà Cung Cấp Mới</h3>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên Nhà Cung Cấp</label>
            <input
              className="w-full border rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500"
              value={form.sourceName}
              onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
              placeholder="Nhập tên..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Số Tài Khoản</label>
            <input
              className="w-full border rounded-lg p-2 mt-1"
              value={form.numberBank}
              onChange={(e) => setForm({ ...form, numberBank: e.target.value })}
              placeholder="STK..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ngân Hàng</label>
            <select className="w-full border rounded-lg p-2 mt-1" value={form.bankBin} onChange={(e) => setForm({ ...form, bankBin: e.target.value })}>
              {banks.map((b) => (
                <option key={b.bin} value={b.bin}>
                  {b.name || `BIN ${b.bin}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Đang xử lý..." : "Thêm Mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditSupplierModal = ({
  isOpen,
  onClose,
  onSuccess,
  supply,
  banks,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supply: Supply | null;
  banks: BankOption[];
}) => {
  const [form, setForm] = useState({ sourceName: "", numberBank: "", bankBin: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supply) {
      setForm({
        sourceName: supply.sourceName || "",
        numberBank: supply.numberBank || "",
        bankBin: supply.binBank || banks[0]?.bin || "",
      });
    }
  }, [supply, banks]);

  if (!isOpen || !supply) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/supplies/${supply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Chỉnh Sửa Thông Tin</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên Nhà Cung Cấp</label>
            <input className="w-full border rounded-lg p-2 mt-1" value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Số Tài Khoản</label>
            <input className="w-full border rounded-lg p-2 mt-1" value={form.numberBank} onChange={(e) => setForm({ ...form, numberBank: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ngân Hàng</label>
            <select className="w-full border rounded-lg p-2 mt-1" value={form.bankBin} onChange={(e) => setForm({ ...form, bankBin: e.target.value })}>
              {banks.map((b) => (
                <option key={b.bin} value={b.bin}>
                  {b.name || `BIN ${b.bin}`}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, supplyName }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold text-rose-600 mb-2">Xóa Nhà Cung Cấp?</h3>
        <p className="text-gray-600 mb-6">
          Bạn có chắc muốn xóa <b>{supplyName}</b>? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            Hủy
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
            Xóa Vĩnh Viễn
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Sources() {
  const { supplies, stats, loading, fetchSupplies, setSupplies, toggleStatus } = useSupplyList();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [deleteSupply, setDeleteSupply] = useState<Supply | null>(null);

  useEffect(() => {
    fetchSupplies();
    apiFetch("/api/banks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBanks(data.map((b: any) => ({ bin: b.bin, name: b.name })));
      })
      .catch(console.error);
  }, [fetchSupplies]);

  const filteredSupplies = useMemo(() => {
    const term = normalizeText(searchTerm);
    const parsed = supplies.filter((s) => {
      const matchSearch = !term || normalizeText(s.sourceName).includes(term);
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? s.isActive : !s.isActive);
      return matchSearch && matchStatus;
    });

    const getDateValue = (value: string | null) => {
      if (!value) return 0;
      const ts = new Date(value).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    return parsed.sort((a, b) => {
      const debtA = Number(a.totalUnpaidImport) || 0;
      const debtB = Number(b.totalUnpaidImport) || 0;
      const hasDebtA = debtA > 0;
      const hasDebtB = debtB > 0;
      if (hasDebtA !== hasDebtB) return hasDebtA ? -1 : 1;
      if (hasDebtA && hasDebtB && debtA !== debtB) return debtB - debtA;

      const lastA = getDateValue(a.lastOrderDate);
      const lastB = getDateValue(b.lastOrderDate);
      const hasDateA = lastA > 0;
      const hasDateB = lastB > 0;
      if (hasDateA !== hasDateB) return hasDateA ? -1 : 1;
      if (lastA !== lastB) return lastB - lastA;

      const ordersDiff = (b.totalOrders || 0) - (a.totalOrders || 0);
      if (ordersDiff !== 0) return ordersDiff;

      return a.sourceName.localeCompare(b.sourceName);
    });
  }, [supplies, searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (deleteSupply) {
      const res = await deleteSupplyById(deleteSupply.id);
      if (res.success) {
        setSupplies((prev) => prev.filter((s) => s.id !== deleteSupply.id));
        setDeleteSupply(null);
      } else {
        alert(res.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Nguồn Hàng</h1>
          <p className="text-white/60 text-sm">Theo dõi công nợ và chu kỳ thanh toán</p>
        </div>
        <GradientButton icon={PlusIcon} onClick={() => setAddModal(true)}>
          Thêm NCC
        </GradientButton>
      </div>

      <SupplyStatsCards stats={stats} />

      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 text-white focus:outline-none focus:border-indigo-500"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm dừng</option>
        </select>
      </div>

      <SupplyList
        supplies={filteredSupplies}
        loading={loading}
        expandedId={expandedId}
        onToggle={(id: number) => setExpandedId((prev) => (prev === id ? null : id))}
        onEdit={setEditSupply}
        onDelete={setDeleteSupply}
        onView={(s: Supply) => setViewId(s.id)}
        onToggleStatus={(s: Supply) => toggleStatus(s.id, s.isActive)}
      />

      <AddSupplierModal isOpen={addModal} onClose={() => setAddModal(false)} onSuccess={fetchSupplies} banks={banks} />
      <EditSupplierModal isOpen={!!editSupply} onClose={() => setEditSupply(null)} onSuccess={fetchSupplies} supply={editSupply} banks={banks} />
      <DeleteConfirmModal isOpen={!!deleteSupply} onClose={() => setDeleteSupply(null)} onConfirm={handleDelete} supplyName={deleteSupply?.sourceName} />
      <SupplierDetailModal isOpen={!!viewId} onClose={() => setViewId(null)} supplyId={viewId} banks={banks} onRefreshList={fetchSupplies} />
    </div>
  );
}
