import React from "react";
import { Eye, X } from "lucide-react";
import { PackageItem } from "../types";

interface PackageDetailModalProps {
  item: PackageItem | null;
  onClose: () => void;
}

const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

export const PackageDetailModal: React.FC<PackageDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" /> Chi Tiết Gói #{item.id}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-xs text-slate-300">
          <div>
            <span className="text-slate-500">Tên gói: </span>
            <span className="font-bold text-white">{item.name}</span>
          </div>
          <div>
            <span className="text-slate-500">Loại gói: </span>
            <span className="font-bold text-cyan-400">{item.category}</span>
          </div>
          <div>
            <span className="text-slate-500">Thông tin tài khoản: </span>
            <span className="font-mono text-slate-200 font-bold">{item.accountInfo}</span>
          </div>
          <div>
            <span className="text-slate-500">Dung lượng Slot: </span>
            <span className="font-mono font-bold text-white">{item.usedSlots} / {item.totalSlots} Vị trí</span>
          </div>
          <div>
            <span className="text-slate-500">Nhà cung cấp: </span>
            <span className="font-bold text-purple-300">{item.supplier}</span>
          </div>
          <div>
            <span className="text-slate-500">Giá nhập: </span>
            <span className="font-mono font-bold text-emerald-400">{fmt(item.costPrice)} ₫</span>
          </div>
          <div>
            <span className="text-slate-500">Ngày hết hạn: </span>
            <span className="font-mono font-bold text-amber-400">{item.expiredAt}</span>
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
