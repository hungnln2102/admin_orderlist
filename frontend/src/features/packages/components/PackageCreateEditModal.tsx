import React, { useState, useEffect } from "react";
import {
  Package,
  X,
  Database,
  HardDrive,
  Layers,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Check,
  Link2,
  Hash,
  Layers as LayersIcon,
} from "lucide-react";
import { CustomSelect, DateInputVN, SearchableCombobox, ToggleSwitch } from "@/shared/components";
import { PackageItem, PackageFormData, PackageCategory } from "../types";

interface PackageCreateEditModalProps {
  open: boolean;
  editingItem: PackageItem | null;
  selectedCategory: string;
  categoriesList?: PackageCategory[];
  warehouseAccounts?: string[];
  formData: PackageFormData;
  onClose: () => void;
  onFormChange: (data: PackageFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const PackageCreateEditModal: React.FC<PackageCreateEditModalProps> = ({
  open,
  editingItem,
  selectedCategory,
  categoriesList = [],
  warehouseAccounts = [],
  formData,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [hasStorageAccount, setHasStorageAccount] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const initialCat = formData.category || selectedCategory || (categoriesList[0]?.name || "");
      setCurrentCategory(initialCat);

      const matchedCat = categoriesList.find(
        (c) => c.name.toLowerCase() === initialCat.toLowerCase()
      );
      const isReq = Boolean(matchedCat?.requiresStorage || formData.storageAccountInfo);
      setHasStorageAccount(isReq);
    }
  }, [open, selectedCategory, categoriesList, formData.category, formData.storageAccountInfo]);

  const handleCategoryChange = (catName: string) => {
    setCurrentCategory(catName);
    const matchedCat = categoriesList.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );
    const isReq = Boolean(matchedCat?.requiresStorage);
    setHasStorageAccount(isReq);
    onFormChange({
      ...formData,
      category: catName,
      name: formData.name ? formData.name : catName,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-800 w-full max-w-xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            {editingItem
              ? "Chỉnh Sửa Gói Sản Phẩm"
              : `Thêm Gói Mới ${currentCategory ? `• ${currentCategory}` : ""}`}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-500 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          {/* Loại gói & Tên gói */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Loại Gói Sản Phẩm *
              </label>
              <CustomSelect
                value={currentCategory}
                onChange={handleCategoryChange}
                size="sm"
                accent="cyan"
                placeholder="Chọn loại gói sản phẩm..."
                className="bg-slate-950 border-slate-800"
                options={[
                  ...categoriesList.map((c) => ({
                    value: c.name,
                    label: `${c.name}${c.requiresStorage ? " ★ (Cần Storage)" : ""}`,
                  })),
                  ...(!categoriesList.some((c) => c.name.toLowerCase() === currentCategory.toLowerCase()) && currentCategory
                    ? [{ value: currentCategory, label: currentCategory }]
                    : []),
                ]}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                Tên Gói Hiển Thị *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Canva Pro 1 Năm, Adobe 1PC..."
                value={formData.name}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* ════ BLOCK 1: TÀI KHOẢN GỐC ════ */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-bold text-blue-400 flex items-center gap-1.5 text-xs">
                <Database className="w-3.5 h-3.5" />
                1. Tài Khoản Gốc (Stock Account) *
              </span>
              <span className="text-[11px] text-slate-500">Tài khoản chính trong kho</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Tài Khoản / Email Gốc *
              </label>
              <SearchableCombobox
                value={formData.accountInfo}
                onChange={(val) => onFormChange({ ...formData, accountInfo: val })}
                options={warehouseAccounts}
                placeholder="Chọn hoặc nhập username/email kho (VD: stock_canva@gmail.com)"
                required
                accent="blue"
                listHeaderLabel="Kho tài khoản"
                emptyText="Không tìm thấy tài khoản nào khớp trong kho"
                customValuePrefix="Dùng tài khoản nhập tay:"
                toggleTitle="Chọn từ kho tài khoản"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                  Nhà Cung Cấp (NCC)
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => onFormChange({ ...formData, supplier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-purple-300 font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  Giá Nhập (₫)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.costPrice}
                  onChange={(e) => onFormChange({ ...formData, costPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* ════ TOGGLE STORAGE ACCOUNT ════ */}
          <div className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Gói này có sử dụng Tài khoản dung lượng / liên kết (Storage Account)
            </span>
            <ToggleSwitch
              checked={hasStorageAccount}
              variant="amber"
              size="sm"
              onChange={(val) => {
                setHasStorageAccount(val);
                if (!val) {
                  onFormChange({
                    ...formData,
                    storageAccountInfo: "",
                    storageTotal: "",
                  });
                }
              }}
            />
          </div>

          {/* ════ BLOCK 2: TÀI KHOẢN LIÊN KẾT / DUNG LƯỢNG ════ */}
          {hasStorageAccount && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <HardDrive className="w-3.5 h-3.5" />
                  2. Tài Khoản Dung Lượng / Liên Kết (Storage Account)
                </span>
                <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Linked Account
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Tài Khoản Liên Kết *
                </label>
                <SearchableCombobox
                  value={formData.storageAccountInfo || ""}
                  onChange={(val) => onFormChange({ ...formData, storageAccountInfo: val })}
                  options={warehouseAccounts}
                  placeholder="Chọn hoặc nhập tài khoản dung lượng (VD: storage_google@gmail.com)"
                  required
                  accent="amber"
                  listHeaderLabel="Kho tài khoản"
                  emptyText="Không tìm thấy tài khoản nào khớp trong kho"
                  customValuePrefix="Dùng tài khoản nhập tay:"
                  toggleTitle="Chọn từ kho tài khoản"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Tổng Dung Lượng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 2000 GB, 2 TB, 100 GB..."
                  value={formData.storageTotal || ""}
                  onChange={(e) => onFormChange({ ...formData, storageTotal: e.target.value })}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-bold font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <p className="text-[11px] text-amber-300/80">
                💡 Tài khoản này sẽ được liên kết với tài khoản gốc để đồng bộ dung lượng và quản lý slot.
              </p>
            </div>
          )}

          {/* ════ CHẾ ĐỘ LIÊN KẾT ĐƠN HÀNG (MATCH RULE) ════ */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5 text-xs">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                Chế Độ Liên Kết Đơn Hàng (Match Rule) *
              </label>
              <span className="text-[10px] text-slate-500">
                Tự động gom đơn từ danh sách đơn hàng
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onFormChange({ ...formData, matchRule: "information" })}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  (formData.matchRule || "information") === "information"
                    ? "bg-cyan-950/40 border-cyan-500/60 shadow-sm shadow-cyan-900/20 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-cyan-300">
                    <FileText className="w-3 h-3" />
                    Khớp Info Đơn
                  </span>
                  {(formData.matchRule || "information") === "information" && (
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Khớp theo <span className="text-cyan-300 font-mono">information_order</span> (email/user).
                </p>
              </button>

              <button
                type="button"
                onClick={() => onFormChange({ ...formData, matchRule: "slot" })}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  formData.matchRule === "slot"
                    ? "bg-indigo-950/40 border-indigo-500/60 shadow-sm shadow-indigo-900/20 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-indigo-300">
                    <Hash className="w-3 h-3" />
                    Khớp Theo Slot
                  </span>
                  {formData.matchRule === "slot" && (
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Khớp theo chỉ số <span className="text-indigo-300 font-mono">slot</span> (vị trí đơn hàng).
                </p>
              </button>

              <button
                type="button"
                onClick={() => onFormChange({ ...formData, matchRule: "both" })}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  formData.matchRule === "both"
                    ? "bg-purple-950/40 border-purple-500/60 shadow-sm shadow-purple-900/20 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-purple-300">
                    <Link2 className="w-3 h-3" />
                    Cả Info & Slot
                  </span>
                  {formData.matchRule === "both" && (
                    <Check className="w-3.5 h-3.5 text-purple-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Liên kết nếu khớp <span className="text-purple-300">thông tin đơn</span> hoặc <span className="text-purple-300">slot</span>.
                </p>
              </button>
            </div>
          </div>

          {/* Slots & Dates - 2 Columns (Đã bỏ Slot Đã Dùng thủ công) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                Tổng Slot (Vị Trí) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.totalSlots}
                onChange={(e) => onFormChange({ ...formData, totalSlots: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                Ngày Hết Hạn
              </label>
              <DateInputVN
                value={formData.expiredAt}
                onChange={(iso) => onFormChange({ ...formData, expiredAt: iso })}
                placeholder="dd/mm/yyyy"
                focusBorderClass="focus:border-cyan-500"
                className="text-amber-400"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-400" />
              Ghi Chú Gói
            </label>
            <input
              type="text"
              placeholder="Ghi chú thêm về gói, quy tắc match hoặc lưu ý bảo hành..."
              value={formData.note}
              onChange={(e) => onFormChange({ ...formData, note: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-cyan-600/20"
            >
              Lưu Gói Sản Phẩm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

