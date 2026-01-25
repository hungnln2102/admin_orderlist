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
        body: JSON.stringify({
          supplier_name: form.sourceName,
          number_bank: form.numberBank,
          bin_bank: form.bankBin,
          status: form.status,
        }),
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
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-md p-8 border border-white/10 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">Thêm Nhà Cung Cấp Mới</h3>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 mb-2 ml-1">Tên Nhà Cung Cấp</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-white/20"
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
                  {b.name || b.bin}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors">
              Hủy
            </button>
            <GradientButton type="submit" disabled={loading} className="!py-2.5 !px-8 text-sm">
              {loading ? "Đang xử lý..." : "Thêm Mới"}
            </GradientButton>
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
        body: JSON.stringify({
          supplier_name: form.sourceName,
          number_bank: form.numberBank,
          bin_bank: form.bankBin,
        }),
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
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="glass-panel-dark rounded-[32px] shadow-2xl w-full max-w-lg p-8 border border-white/10 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">Chỉnh Sửa Thông Tin</h3>
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
                  {b.name || b.bin}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors">
              Hủy
            </button>
            <GradientButton type="submit" disabled={loading} className="!py-2.5 !px-8 text-sm">
              Lưu Thay Đổi
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, supplyName }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="glass-panel-dark rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-rose-500/20 animate-in zoom-in-95 duration-300">
        <h3 className="text-2xl font-bold text-rose-500 mb-2 tracking-tight">Xóa Nhà Cung Cấp?</h3>
        <p className="text-white/60 mb-8 leading-relaxed">
          Bạn có chắc muốn xóa <b>{supplyName}</b>? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-white/40 hover:text-white transition-colors">
            Hủy
          </button>
          <button onClick={onConfirm} className="px-6 py-2.5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20">
            Xóa Vĩnh Viễn
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Sources() {
  const { supplies, stats, loading, fetchSupplies, toggleStatus } = useSupplyList();
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
        if (Array.isArray(data))
          setBanks(
            data.map((b: any) => ({
              bin: b.bin,
              name: b.bank_name || b.bankName || b.name || b.bank || b.bin,
            }))
          );
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
      const posA = debtA > 0;
      const posB = debtB > 0;
      if (posA !== posB) return posA ? -1 : 1; // ưu tiên dương

      const negA = debtA < 0;
      const negB = debtB < 0;
      if (negA !== negB) return negA ? -1 : 1; // sau dương, ưu tiên âm trước zero

      if ((posA || negA) && debtA !== debtB) return debtB - debtA;

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
        await fetchSupplies();
        setDeleteSupply(null);
      } else {
        alert(res.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white">Quản Lý Nguồn Hàng</h1>
          <p className="text-white/60 text-sm">Theo dõi công nợ và chu kỳ thanh toán từ các đối tác cung cấp.</p>
        </div>

      <SupplyStatsCards stats={stats} />

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search Group */}
          <div className="relative w-full lg:flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
            <input
              type="text"
              placeholder="Tìm kiếm nhà cung cấp..."
              className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              style={{ paddingLeft: '3.25rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Group */}
          <div className="flex w-full lg:w-auto gap-3 items-center">
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
            <div className="relative w-full lg:w-[180px]">
              <select
                className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
                style={{ 
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")', 
                  backgroundPosition: 'right 1rem center', 
                  backgroundRepeat: 'no-repeat', 
                  backgroundSize: '1.1rem', 
                  paddingRight: '2.5rem' 
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all" className="bg-slate-900 text-white">Tất cả trạng thái</option>
                <option value="active" className="bg-slate-900 text-white">Đang hoạt động</option>
                <option value="inactive" className="bg-slate-900 text-white">Tạm dừng</option>
              </select>
            </div>
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
            <GradientButton icon={PlusIcon} onClick={() => setAddModal(true)} className="!py-2.5 !px-5 text-sm">
              Thêm NCC
            </GradientButton>
          </div>
        </div>
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
        onRefreshSupplies={fetchSupplies}
      />

      <AddSupplierModal isOpen={addModal} onClose={() => setAddModal(false)} onSuccess={fetchSupplies} banks={banks} />
      <EditSupplierModal isOpen={!!editSupply} onClose={() => setEditSupply(null)} onSuccess={fetchSupplies} supply={editSupply} banks={banks} />
      <DeleteConfirmModal isOpen={!!deleteSupply} onClose={() => setDeleteSupply(null)} onConfirm={handleDelete} supplyName={deleteSupply?.sourceName} />
      <SupplierDetailModal isOpen={!!viewId} onClose={() => setViewId(null)} supplyId={viewId} banks={banks} onRefreshList={fetchSupplies} />
    </div>
  );
}
