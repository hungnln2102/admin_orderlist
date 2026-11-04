import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { PersonalSpendingCategory } from "../types";
import {
  X,
  Plus,
  Trash2,
  Check,
  Edit2,
  Tag,
  Palette,
  Sparkles,
  Utensils,
  Coffee,
  ShoppingBag,
  Car,
  Home,
  HeartPulse,
  Laptop,
  Film,
  Banknote,
  Send,
  Gift,
  Briefcase,
  Cat,
  Zap,
  Search,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Maximize2,
  HelpCircle,
} from "lucide-react";

export const ICON_OPTIONS: { name: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { name: "Utensils", label: "Ăn uống", icon: Utensils },
  { name: "Coffee", label: "Cà phê", icon: Coffee },
  { name: "ShoppingBag", label: "Mua sắm", icon: ShoppingBag },
  { name: "Car", label: "Đi lại/Xe", icon: Car },
  { name: "Home", label: "Nhà cửa", icon: Home },
  { name: "HeartPulse", label: "Sức khỏe", icon: HeartPulse },
  { name: "Laptop", label: "Dịch vụ số/Tech", icon: Laptop },
  { name: "Film", label: "Giải trí", icon: Film },
  { name: "Banknote", label: "Tiền mặt", icon: Banknote },
  { name: "Send", label: "Chuyển khoản", icon: Send },
  { name: "Cat", label: "Thú cưng", icon: Cat },
  { name: "Gift", label: "Quà tặng", icon: Gift },
  { name: "Briefcase", label: "Công việc", icon: Briefcase },
  { name: "Zap", label: "Hóa đơn/Điện nước", icon: Zap },
];

export const COLOR_OPTIONS: { name: string; bg: string; text: string; border: string; hex: string; ring: string }[] = [
  { name: "amber", bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", hex: "#f59e0b", ring: "ring-amber-400" },
  { name: "emerald", bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30", hex: "#10b981", ring: "ring-emerald-400" },
  { name: "cyan", bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/30", hex: "#06b6d4", ring: "ring-cyan-400" },
  { name: "blue", bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30", hex: "#3b82f6", ring: "ring-blue-400" },
  { name: "indigo", bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/30", hex: "#6366f1", ring: "ring-indigo-400" },
  { name: "purple", bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30", hex: "#a855f7", ring: "ring-purple-400" },
  { name: "pink", bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/30", hex: "#ec4899", ring: "ring-pink-400" },
  { name: "rose", bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/30", hex: "#f43f5e", ring: "ring-rose-400" },
  { name: "orange", bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30", hex: "#f97316", ring: "ring-orange-400" },
];

export const renderCategoryIcon = (iconName?: string | null, className = "w-3.5 h-3.5") => {
  const match = ICON_OPTIONS.find((i) => i.name.toLowerCase() === (iconName || "").toLowerCase());
  if (match) {
    const IconComponent = match.icon;
    return <IconComponent className={className} />;
  }
  return <Tag className={className} />;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: PersonalSpendingCategory[];
  onSaveCategories: (updatedList: PersonalSpendingCategory[]) => Promise<boolean>;
}

export const PersonalCategoryManageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
}) => {
  const notify = useNotification();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [icon, setIcon] = useState("Utensils");
  const [color, setColor] = useState("amber");
  const [monthlyBudgetStr, setMonthlyBudgetStr] = useState("");
  const [keywordsStr, setKeywordsStr] = useState("");

  // Search & Filter states for right column
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Phím tắt ESC để đóng nhanh form
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setIcon("Utensils");
    setColor("amber");
    setMonthlyBudgetStr("");
    setKeywordsStr("");
  };

  const handleStartEdit = (cat: PersonalSpendingCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setCode(cat.code);
    setIcon(cat.icon || "Utensils");
    setColor(cat.color || "amber");
    setMonthlyBudgetStr(cat.monthlyBudget ? String(cat.monthlyBudget) : "");
    setKeywordsStr((cat.keywords || []).join(", "));
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      notify.error("Vui lòng nhập tên danh mục");
      return;
    }

    const cleanCode = code.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const budgetNum = Number(monthlyBudgetStr.replace(/\D/g, "")) || null;
    const keywordsArr = keywordsStr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (editingId) {
      // Cập nhật danh mục
      const updated = categories.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: cleanName,
              code: cleanCode,
              icon,
              color,
              monthlyBudget: budgetNum,
              keywords: keywordsArr,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      if (!await onSaveCategories(updated)) return;
      notify.success(`Đã cập nhật danh mục "${cleanName}"`);
    } else {
      // Thêm mới danh mục động
      const newCat: PersonalSpendingCategory = {
        id: Date.now(),
        name: cleanName,
        code: cleanCode,
        icon,
        color,
        monthlyBudget: budgetNum,
        isActive: true,
        sortOrder: categories.length + 1,
        keywords: keywordsArr,
        createdAt: new Date().toISOString(),
      };
      if (!await onSaveCategories([...categories, newCat])) return;
      notify.success(`Đã tạo danh mục "${cleanName}" thành công!`);
    }

    resetForm();
  };

  const handleToggleActive = async (id: number) => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    await onSaveCategories(updated);
  };

  const handleDelete = async (id: number, catName: string) => {
    if (window.confirm(`Master có chắc muốn xóa danh mục "${catName}" không?`)) {
      const updated = categories.filter((c) => c.id !== id);
      if (!await onSaveCategories(updated)) return;
      notify.success(`Đã xóa danh mục "${catName}"`);
      if (editingId === id) resetForm();
    }
  };

  // Tính toán tóm tắt & lọc danh sách
  const activeCount = categories.filter((c) => c.isActive).length;
  const inactiveCount = categories.length - activeCount;
  const totalBudget = categories
    .filter((c) => c.isActive && c.monthlyBudget)
    .reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);

  const filteredCategories = categories.filter((cat) => {
    const matchStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? cat.isActive
        : !cat.isActive;

    if (!matchStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = cat.name.toLowerCase().includes(q);
    const matchCode = cat.code.toLowerCase().includes(q);
    const matchKeywords = (cat.keywords || []).some((k) => k.toLowerCase().includes(q));

    return matchName || matchCode || matchKeywords;
  });

  const currentColorObj = COLOR_OPTIONS.find((c) => c.name === color) || COLOR_OPTIONS[0];
  const parsedKeywordsPreview = keywordsStr
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 animate-in fade-in duration-200">
      {/* 1. TOP HEADER TOÀN MÀN HÌNH */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Trung Tâm Quản Lý Danh Mục Thu / Chi Cá Nhân
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Động · Không Hardcode
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hidden md:inline">
                IMAP Rules Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự do cấu hình danh mục, icon, màu sắc và từ khóa nhận diện Email ngân hàng VPBank
            </p>
          </div>
        </div>

        {/* Nút đóng to rõ & phím ESC */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <span>Tổng danh mục: <strong className="text-white font-mono">{categories.length}</strong></span>
            <span>·</span>
            <span>Đang bật: <strong className="text-emerald-400 font-mono">{activeCount}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Đóng (Phím ESC)"
          >
            <span className="hidden sm:inline text-xs font-semibold">Đóng</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 rounded border border-slate-700 text-slate-400">
              ESC
            </kbd>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN BODY: 2 CỘT FULL-SCREEN RỘNG RÃI */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-950">
        
        {/* CỘT TRÁI (LG: 5 CỘT): FORM THÊM / CHỈNH SỬA DANH MỤC */}
        <div className="lg:col-span-5 h-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingId ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}</span>
            </span>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hủy sửa</span>
              </button>
            )}
          </div>

          {/* Form Content Cuộn Mượt */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Tên & Mã Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  placeholder="VD: Nuôi thú cưng, Cafe..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId && !code) {
                      setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Mã Code (Slug)
                </label>
                <input
                  type="text"
                  placeholder="VD: PET_CARE, CAFE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Hạn mức ngân sách tháng */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Ngân sách chi tiêu tháng (VND)</span>
                <span className="text-[10px] text-slate-400 font-normal">Tùy chọn</span>
              </label>
              <input
                type="text"
                placeholder="VD: 2.000.000 đ"
                value={monthlyBudgetStr ? Number(monthlyBudgetStr.replace(/\D/g, "")).toLocaleString("vi-VN") : ""}
                onChange={(e) => setMonthlyBudgetStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-emerald-300 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Chọn Icon */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chọn Icon đại diện ({ICON_OPTIONS.length}):</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Đang chọn: {icon}</span>
              </label>
              <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                {ICON_OPTIONS.map((item) => {
                  const IconC = item.icon;
                  const isSelected = icon.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setIcon(item.name)}
                      title={item.label}
                      className={`p-2.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30 scale-105"
                          : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <IconC className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chọn Màu Sắc Badge */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-pink-400" />
                  <span>Chọn Màu Sắc Badge:</span>
                </span>
                <span className="text-[10px] text-pink-400 font-mono">Màu: {color}</span>
              </label>
              <div className="flex flex-wrap gap-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 items-center">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = color === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColor(c.name)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                        isSelected
                          ? "ring-2 ring-white scale-110 border-white shadow-lg"
                          : "border-transparent opacity-75 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {isSelected && <Check className="w-4 h-4 text-slate-950 font-black stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Từ khóa nhận diện tự động từ Email IMAP */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Từ khóa nhận diện Email IMAP (Cách nhau bởi dấu phẩy):</span>
                <span className="text-[10px] text-slate-400">Không phân biệt hoa/thường</span>
              </label>
              <textarea
                rows={2}
                placeholder="VD: highlands, phở thìn, grabfood, shopeefood, circle k"
                value={keywordsStr}
                onChange={(e) => setKeywordsStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
              {/* Preview các từ khóa dưới dạng tags */}
              {parsedKeywordsPreview.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parsedKeywordsPreview.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1"
                    >
                      <span>{kw}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview Box */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Xem Trước Hiển Thị (Live Preview):
              </span>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${currentColorObj.bg} ${currentColorObj.text} ${currentColorObj.border}`}>
                  {renderCategoryIcon(icon, "w-4 h-4")}
                  <span>{name.trim() || "Tên danh mục mẫu"}</span>
                </span>
                <span className="font-mono text-xs text-slate-400">
                  #{code.trim() || "CODE_MAU"}
                </span>
                {monthlyBudgetStr && (
                  <span className="text-xs font-mono font-bold text-emerald-400 ml-auto">
                    {formatVND(Number(monthlyBudgetStr.replace(/\D/g, "")) || 0)}/tháng
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nút Submit Form */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Làm lại form
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{editingId ? "Cập Nhật Danh Mục" : "Thêm Danh Mục Mới"}</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI (LG: 7 CỘT): KHO QUẢN TRỊ DANH MỤC & GIÁM SÁT TOÀN DIỆN */}
        <div className="lg:col-span-7 h-full flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header & Toolbar Cột Phải */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Kho Danh Mục Của Master</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {filteredCategories.length} / {categories.length}
                  </span>
                </h4>
              </div>

              {totalBudget > 0 && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Tổng hạn mức tháng:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {formatVND(totalBudget)}
                  </span>
                </div>
              )}
            </div>

            {/* Toolbar: Tìm kiếm + Lọc trạng thái */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên danh mục, mã slug, từ khóa IMAP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 self-stretch sm:self-auto text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Tất cả ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    statusFilter === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-emerald-300"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Bật ({activeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("INACTIVE")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    statusFilter === "INACTIVE"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-rose-300"
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Ẩn ({inactiveCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Danh Sách Danh Mục Hiển Thị Tràn Viền Cuộn Dọc */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredCategories.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                <Tag className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-400 text-sm">Không tìm thấy danh mục nào phù hợp.</p>
                <p className="text-xs">Hãy thử đổi từ khóa tìm kiếm hoặc dùng form bên trái để tạo danh mục mới.</p>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const colorObj =
                  COLOR_OPTIONS.find((c) => c.name === cat.color) || COLOR_OPTIONS[0];

                return (
                  <div
                    key={cat.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      cat.isActive
                        ? "bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950"
                        : "bg-slate-950/30 border-slate-800/40 opacity-55 hover:opacity-75"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {/* Badge Icon & Name */}
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}
                      >
                        {renderCategoryIcon(cat.icon, "w-4 h-4")}
                        <span className="truncate max-w-[150px]">{cat.name}</span>
                      </span>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 block truncate">
                            #{cat.code}
                          </span>
                          {cat.monthlyBudget ? (
                            <span className="text-[11px] text-emerald-400 font-mono font-semibold block">
                              · Hạn mức: {formatVND(cat.monthlyBudget)}
                            </span>
                          ) : null}
                        </div>

                        {/* Keyword list preview */}
                        {cat.keywords && cat.keywords.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-500">Từ khóa:</span>
                            {cat.keywords.slice(0, 4).map((kw, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-slate-900 text-slate-300 border border-slate-800"
                              >
                                {kw}
                              </span>
                            ))}
                            {cat.keywords.length > 4 && (
                              <span className="text-[9.5px] text-slate-500 font-mono">
                                +{cat.keywords.length - 4} khác
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleToggleActive(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          cat.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                        title={cat.isActive ? "Đang bật (Click để ẩn)" : "Đang ẩn (Click để bật)"}
                      >
                        {cat.isActive ? "Đang Bật" : "Đã Ẩn"}
                      </button>

                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Sửa danh mục này"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Xóa danh mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM FOOTER STATUS */}
      <div className="h-12 px-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Các từ khóa IMAP sẽ tự động gán vào giao dịch VPBank khi webhook / email parser nhận diện nội dung biến động.
          </span>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          Hoàn tất & Đóng
        </button>
      </div>
    </div>
  );
};
