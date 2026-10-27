import React, { useState, useMemo } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { FixedCost, FixedCostCategory } from "../types";
import {
  CheckCircle2,
  DollarSign,
  Edit2,
  Filter,
  Home,
  Plus,
  Power,
  Server,
  Sparkles,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { FixedCostModal } from "./FixedCostModal";
import { FixedCostPaymentModal } from "./FixedCostPaymentModal";
import { CreditCard } from "lucide-react";

interface Props {
  items: FixedCost[];
  onAdd: (payload: any) => Promise<void>;
  onEdit: (id: number, payload: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh?: () => void;
}

export const FixedCostList: React.FC<Props> = ({
  items,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const notify = useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedCost | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<FixedCost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | FixedCostCategory>("ALL");

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FixedCost) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (payload: any) => {
    try {
      if (editingItem) {
        await onEdit(editingItem.id, payload);
        notify.success(`Đã cập nhật chi phí "${payload.name || editingItem.name}"`);
      } else {
        await onAdd(payload);
        notify.success(`Đã thêm chi phí "${payload.name}"`);
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi lưu chi phí");
    }
  };

  const handleToggleActive = async (item: FixedCost) => {
    try {
      await onEdit(item.id, { isActive: !item.isActive });
      notify.info(
        `Đã ${!item.isActive ? "bật" : "tắt"} chi phí "${item.name}" trong tính toán hòa vốn`
      );
    } catch (err: any) {
      notify.error(err.message || "Lỗi cập nhật trạng thái");
    }
  };

  const confirmDelete = (item: FixedCost) => {
    notify.confirm({
      title: "Xác Nhận Xóa Chi Phí Cố Định",
      message: `Bạn có chắc muốn xóa chi phí "${item.name}" (${formatVND(item.amount)}/tháng)? Thao tác này sẽ cập nhật lại điểm hòa vốn.`,
      confirmText: "Xóa Ngay",
      cancelText: "Hủy",
      onConfirm: async () => {
        try {
          await onDelete(item.id);
          notify.success(`Đã xóa chi phí "${item.name}"`);
        } catch (err: any) {
          notify.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  const totalActive = useMemo(() => {
    return items
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + i.amount, 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "ALL") return items;
    return items.filter((i) => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const categoryBadgeMap: Record<FixedCostCategory, { label: string; color: string }> = {
    LIVING: { label: "Sinh hoạt gia đình", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
    SHOP_OPERATIONS: { label: "Vận hành Shop", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
    SOFTWARE: { label: "Phần mềm / Dịch vụ", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
    OTHER: { label: "Khoản chi khác", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  };

  return (
    <div className="space-y-4">
      {/* 1. Contextual Stat Cards for Fixed Costs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <GlassCard className="!p-4 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Chi Phí Cố Định / Tháng</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1 block">{formatVND(totalActive)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Trừ trực tiếp vào điểm hòa vốn tháng</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border-blue-500/20 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khoản Chi Đang Áp Dụng</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1 block">
              {items.filter(i => i.isActive).length} / {items.length} khoản
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Sinh hoạt, Vận hành, Phần mềm</span>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            Thêm Chi Phí
          </button>
        </GlassCard>
      </div>

      {/* 2. Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === "ALL"
              ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900/60"
          }`}
        >
          Tất cả ({items.length})
        </button>
        <button
          onClick={() => setSelectedCategory("LIVING")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === "LIVING"
              ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900/60"
          }`}
        >
          Sinh hoạt ({items.filter((i) => i.category === "LIVING").length})
        </button>
        <button
          onClick={() => setSelectedCategory("SHOP_OPERATIONS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === "SHOP_OPERATIONS"
              ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900/60"
          }`}
        >
          Vận hành Shop ({items.filter((i) => i.category === "SHOP_OPERATIONS").length})
        </button>
        <button
          onClick={() => setSelectedCategory("SOFTWARE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === "SOFTWARE"
              ? "bg-blue-500/20 text-blue-200 border border-blue-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900/60"
          }`}
        >
          Phần mềm ({items.filter((i) => i.category === "SOFTWARE").length})
        </button>
      </div>

      {/* 3. Items List / Table */}
      {filteredItems.length === 0 ? (
        <GlassCard className="!p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3 bg-slate-950/40">
          <Home className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-300">
            Không có khoản chi phí cố định nào
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bấm "Thêm Chi Phí" để khai báo các khoản chi định kỳ lặp lại mỗi tháng nhằm tự động trừ vào lợi nhuận shop.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="!p-0 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Khoản Chi</th>
                  <th className="py-3.5 px-4">Phân Loại</th>
                  <th className="py-3.5 px-4 text-right">Số Tiền / Tháng</th>
                  <th className="py-3.5 px-4 text-center">Thanh Toán Tháng Này</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái Tính Hòa Vốn</th>
                  <th className="py-3.5 px-4">Ghi Chú</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => {
                  const categoryMeta = categoryBadgeMap[item.category] || categoryBadgeMap.OTHER;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !item.isActive ? "opacity-50" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {!item.isActive && (
                            <span className="text-[10px] font-normal text-slate-500">(Tạm bỏ qua)</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${categoryMeta.color}`}>
                          {categoryMeta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-300 text-sm">
                        {formatVND(item.amount)}
                      </td>

                      {/* Thanh toán tháng này */}
                      <td className="py-3.5 px-4 text-center">
                        {item.isPaidThisMonth ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Đã trả {item.paidDate ? `(ngày ${item.paidDate.split("-")[2]})` : ""}</span>
                          </div>
                        ) : item.isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingItem(item);
                              setPayModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <CreditCard className="w-3 h-3 text-amber-400" />
                            <span>Chưa trả • Thanh toán</span>
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm ${
                            item.isActive
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          <Power className={`w-3 h-3 ${item.isActive ? "text-emerald-400" : "text-slate-500"}`} />
                          {item.isActive ? "ĐANG ÁP DỤNG" : "ĐÃ TẮT"}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-[200px]">
                        {item.note || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Sửa chi phí"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xóa chi phí"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Modal Add/Edit */}
      <FixedCostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
      />

      <FixedCostPaymentModal
        isOpen={payModalOpen}
        onClose={() => {
          setPayModalOpen(false);
          setPayingItem(null);
        }}
        fixedCost={payingItem}
        onSuccess={() => {
          notify.success(`Đã xác nhận thanh toán chi phí "${payingItem?.name}"`);
          if (onRefresh) onRefresh();
          else window.location.reload();
        }}
      />
    </div>
  );
};
