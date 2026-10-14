import React, { useState } from "react";
import { FixedCost } from "../types";
import { formatVND } from "@/shared/utils";
import { Plus, Edit2, Trash2, Home, CheckCircle2, XCircle } from "lucide-react";
import { FixedCostModal } from "./FixedCostModal";

interface Props {
  items: FixedCost[];
  onAdd: (payload: any) => Promise<void>;
  onEdit: (id: number, payload: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const FixedCostList: React.FC<Props> = ({
  items,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedCost | null>(null);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FixedCost) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (payload: any) => {
    if (editingItem) {
      await onEdit(editingItem.id, payload);
    } else {
      await onAdd(payload);
    }
  };

  const handleToggleActive = async (item: FixedCost) => {
    await onEdit(item.id, { isActive: !item.isActive });
  };

  const totalActive = items
    .filter((i) => i.isActive)
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Home className="w-4 h-4 text-rose-400" />
          Chi Phí Cố Định Hàng Tháng
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Tổng áp dụng tháng
            </span>
            <span className="text-sm font-mono font-extrabold text-rose-300">
              {formatVND(totalActive)}
            </span>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Chi Phí
          </button>
        </div>
      </div>

      {/* Table / List */}
      {items.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3 bg-slate-900/40">
          <Home className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-400">
            Chưa có chi phí cố định nào
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bấm "Thêm Chi Phí" để khai báo tiền thuê nhà, ăn ở, internet nhằm tự động tính vào điểm hòa vốn tháng.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Khoản Chi</th>
                  <th className="py-3.5 px-4">Phân Loại</th>
                  <th className="py-3.5 px-4 text-right">Số Tiền / Tháng</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4">Ghi Chú</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      !item.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-white">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-purple-300">
                      {item.category === "LIVING"
                        ? "Sinh hoạt gia đình"
                        : item.category === "SHOP_OPERATIONS"
                        ? "Vận hành Shop"
                        : item.category === "SOFTWARE"
                        ? "Phần mềm / Dịch vụ"
                        : "Khác"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-300">
                      {formatVND(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border transition-all cursor-pointer ${
                          item.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {item.isActive ? "Đang áp dụng" : "Đang tắt"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-[200px]">
                      {item.note || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Sửa chi phí"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa chi phí "${item.name}"?`)) {
                              onDelete(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Xóa chi phí"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      <FixedCostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
      />
    </div>
  );
};
