import React, { useState, useEffect, useMemo } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Check,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

// Interfaces
interface SlotAssignment {
  slotNumber: number;
  orderCode?: string;
  customerName?: string;
  customerContact?: string;
  slotLabel?: string;
}

interface PackageItem {
  id: number;
  category: string;
  name: string;
  accountInfo: string;
  usedSlots: number;
  totalSlots: number;
  supplier: string;
  costPrice: number;
  expiredAt: string;
  note: string;
  status: "active" | "warning" | "expired";
  slotAssignments?: SlotAssignment[];
}


interface CategorySummary {
  name: string;
  total: number;
  low: number;
  out: number;
}

const CATEGORY_ACCENTS = [
  { border: "border-sky-500/30", glow: "bg-sky-500/20", text: "text-sky-400", bg: "bg-sky-500/10" },
  { border: "border-purple-500/30", glow: "bg-purple-500/20", text: "text-purple-400", bg: "bg-purple-500/10" },
  { border: "border-emerald-500/30", glow: "bg-emerald-500/20", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  { border: "border-amber-500/30", glow: "bg-amber-500/20", text: "text-amber-400", bg: "bg-amber-500/10" },
  { border: "border-cyan-500/30", glow: "bg-cyan-500/20", text: "text-cyan-400", bg: "bg-cyan-500/10" },
  { border: "border-rose-500/30", glow: "bg-rose-500/20", text: "text-rose-400", bg: "bg-rose-500/10" },
];

export const PackageManagementPage: React.FC = () => {
  const notify = useNotification();
  const [categories, setCategories] = useState<string[]>(["Adobe", "Canva", "Gemini", "GoogleOne", "Netflix", "Youtube"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Adobe");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);


  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PackageItem | null>(null);
  const [viewingItem, setViewingItem] = useState<PackageItem | null>(null);

  // Package Data List (fetched & live state)
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);

  // Item Form State
  const [itemFormData, setItemFormData] = useState({
    name: "",
    accountInfo: "",
    usedSlots: 1,
    totalSlots: 2,
    supplier: "Mavryk",
    costPrice: 95000,
    expiredAt: "2026-12-31",
    note: "",
  });

  // Load Data from Backend APIs (trực tiếp từ product.package_product)
  const fetchPackageData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/packages");
      const json = await res.json().catch(() => ({ data: [] }));
      const list: PackageItem[] = json.data || [];

      // Extract unique categories from actual package_product items (Adobe, Canva, Gemini, GoogleOne, Netflix, Youtube...)
      const catSet = new Set<string>();
      list.forEach((item) => {
        if (item.category) catSet.add(item.category);
      });

      const catList = Array.from(catSet);
      if (catList.length > 0) {
        setCategories(catList);
        if (!catList.includes(selectedCategory)) {
          setSelectedCategory(catList[0]);
        }
      }

      setPackageItems(list);
    } catch (err) {
      console.error("Lỗi nạp dữ liệu kho gói:", err);
      notify.error("Không thể kết nối máy chủ nạp kho gói", "Lỗi Nạp Dữ Liệu");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPackageData();
  }, []);

  // Compute Category Summaries
  const categorySummaries: CategorySummary[] = useMemo(() => {
    return categories.map((cat) => {
      const catItems = packageItems.filter((item) => item.category.toLowerCase() === cat.toLowerCase());
      const total = catItems.length;
      const low = catItems.filter((i) => i.status === "warning" || (i.totalSlots - i.usedSlots) <= 1).length;
      const out = catItems.filter((i) => i.status === "expired" || i.usedSlots >= i.totalSlots).length;
      return { name: cat, total, low, out };
    });
  }, [categories, packageItems]);

  // Filtered items for current active category & search/status
  const filteredItems = useMemo(() => {
    return packageItems.filter((item) => {
      const matchCat = item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.accountInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = item.status === "active";
      else if (statusFilter === "warning") matchStatus = item.status === "warning";
      else if (statusFilter === "expired") matchStatus = item.status === "expired";

      return matchCat && matchSearch && matchStatus;
    });
  }, [packageItems, selectedCategory, searchQuery, statusFilter]);

  // Handlers
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    if (!categories.includes(name)) {
      setCategories([...categories, name]);
      setSelectedCategory(name);
      notify.success(`Đã tạo loại gói mới: ${name}`, "Tạo Loại Gói");
    }
    setNewCategoryName("");
    setIsCategoryModalOpen(false);
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemFormData({
      name: selectedCategory,
      accountInfo: "",
      usedSlots: 0,
      totalSlots: 2,
      supplier: "Mavryk",
      costPrice: 95000,
      expiredAt: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      note: "",
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: PackageItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      accountInfo: item.accountInfo,
      usedSlots: item.usedSlots,
      totalSlots: item.totalSlots,
      supplier: item.supplier,
      costPrice: item.costPrice,
      expiredAt: item.expiredAt,
      note: item.note,
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setPackageItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                ...itemFormData,
                category: selectedCategory,
                status: itemFormData.usedSlots >= itemFormData.totalSlots ? "expired" : "active",
              }
            : i
        )
      );
      notify.success("Đã cập nhật thông tin gói!", "Cập Nhật");
    } else {
      const newItem: PackageItem = {
        id: Date.now(),
        category: selectedCategory,
        name: itemFormData.name || selectedCategory,
        accountInfo: itemFormData.accountInfo || "user@gmail.com",
        usedSlots: itemFormData.usedSlots,
        totalSlots: itemFormData.totalSlots,
        supplier: itemFormData.supplier,
        costPrice: itemFormData.costPrice,
        expiredAt: itemFormData.expiredAt,
        note: itemFormData.note,
        status: itemFormData.usedSlots >= itemFormData.totalSlots ? "expired" : "active",
      };
      setPackageItems((prev) => [newItem, ...prev]);
      notify.success("Đã thêm gói sản phẩm mới vào kho!", "Thêm Gói Mới");
    }
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (id: number) => {
    setPackageItems((prev) => prev.filter((i) => i.id !== id));
    notify.success("Đã xóa gói khỏi danh sách", "Xóa Gói");
  };

  const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">Tổng quan các loại gói</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-9">Manage and organize your product categories & slot inventory</p>
        </div>
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Loại Gói</span>
        </button>
      </div>

      {/* ── Category Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {categorySummaries.map((cat, idx) => {
          const isSelected = cat.name.toLowerCase() === selectedCategory.toLowerCase();
          const accent = CATEGORY_ACCENTS[idx % CATEGORY_ACCENTS.length];

          return (
            <div
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`relative group rounded-2xl border transition-all duration-300 p-5 cursor-pointer backdrop-blur-xl overflow-hidden ${
                isSelected
                  ? `bg-slate-900/90 ${accent.border} ring-2 ring-cyan-500/40 shadow-xl shadow-cyan-950/40`
                  : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700"
              }`}
            >
              {/* Background Ambient Glow */}
              <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-20 ${accent.glow}`} />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">LOẠI GÓI</span>
                  <h3 className="text-lg font-bold text-white tracking-wide mt-0.5">{cat.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory(cat.name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Xem danh sách"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCategoryModalOpen(true);
                      setNewCategoryName(cat.name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Chỉnh sửa loại gói"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3 Stats Indicators */}
              <div className="grid grid-cols-3 gap-2 relative z-10">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">SỐ GÓI</div>
                  <div className="text-base font-black text-white mt-0.5">{cat.total}</div>
                </div>
                <div className="bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/15 text-center">
                  <div className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider">SẮP HẾT</div>
                  <div className="text-base font-black text-amber-400 mt-0.5">{cat.low}</div>
                </div>
                <div className="bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/15 text-center">
                  <div className="text-[9px] font-bold text-rose-500/70 uppercase tracking-wider">HẾT</div>
                  <div className="text-base font-black text-rose-400 mt-0.5">{cat.out}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar & Filters ── */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full lg:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Tìm kiếm trong các gói của ${selectedCategory}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Dropdown & Actions */}
        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto custom-scrollbar">
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none pr-8"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Còn sẵn slot</option>
              <option value="warning">Sắp hết slot</option>
              <option value="expired">Đã hết / Khóa</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleOpenAddItem}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950/40 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Gói</span>
          </button>

          <button
            onClick={() => notify.success("Đã xuất danh sách dữ liệu gói thành công!", "Xuất Excel")}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-slate-700/50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Active Indicator */}
      <div className="text-xs text-slate-400 px-1 flex items-center gap-2">
        <span>Đang xem:</span>
        <span className="font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
          {selectedCategory}
        </span>
        <span className="text-slate-600">({filteredItems.length} gói)</span>
      </div>

      {/* ── Main Data Table ── */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="hidden sm:block overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-36">TÊN GÓI</th>
                <th className="py-3.5 px-4 min-w-[200px]">THÔNG TIN GÓI</th>
                <th className="py-3.5 px-4 w-44">SỐ LƯỢNG</th>
                <th className="py-3.5 px-4 w-28">NCC</th>
                <th className="py-3.5 px-4 w-32 text-right">GIÁ NHẬP</th>
                <th className="py-3.5 px-4 w-36 text-center">NGÀY HẾT HẠN</th>
                <th className="py-3.5 px-4 min-w-[120px]">GHI CHÚ</th>
                <th className="py-3.5 px-4 w-28 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải danh sách kho gói...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-9 h-9 text-slate-600 stroke-[1.5]" />
                      <span className="text-sm font-medium">Không tìm thấy gói nào thuộc loại "{selectedCategory}"</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const availSlots = Math.max(0, item.totalSlots - item.usedSlots);
                  const percentUsed = Math.min(100, Math.round((item.usedSlots / item.totalSlots) * 100));
                  const isExpanded = expandedRowId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                        className={`hover:bg-slate-800/60 transition-colors group cursor-pointer select-none ${
                          isExpanded ? "bg-slate-800/50" : ""
                        }`}
                      >
                        {/* Tên gói */}
                        <td className="py-3.5 px-4 font-bold text-white group-hover:text-cyan-300 transition-colors">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                            )}
                            <span>{item.name}</span>
                          </div>
                        </td>

                        {/* Thông tin gói / Email */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {item.accountInfo}
                        </td>

                        {/* Số lượng + Slot Progress bar */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-white font-mono">
                                {item.usedSlots} / {item.totalSlots} Vị trí
                              </span>
                              <span className={`text-[10px] uppercase font-bold ${availSlots === 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                TRỐNG: {availSlots}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  percentUsed >= 100
                                    ? "bg-rose-500"
                                    : percentUsed >= 50
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* NCC */}
                        <td className="py-3.5 px-4 font-semibold text-purple-300">
                          {item.supplier}
                        </td>

                        {/* Giá nhập */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                          {fmt(item.costPrice)} <span className="text-[10px] font-normal text-slate-500">VND</span>
                        </td>

                        {/* Ngày hết hạn */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                          {item.expiredAt}
                        </td>

                        {/* Ghi chú */}
                        <td className="py-3.5 px-4 text-slate-400 truncate max-w-[150px]">
                          {item.note || "—"}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEditItem(item)}
                              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Sửa thông tin gói"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Xóa gói"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expandable Slot Grid ── */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-b border-cyan-500/20">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-xl">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                                    Chi Tiết Các Vị Trí ({item.name})
                                  </h4>
                                  <p className="text-xs font-mono text-slate-400 mt-0.5">{item.accountInfo}</p>
                                </div>
                                <div className="px-3.5 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-extrabold tracking-wider uppercase text-cyan-300">
                                  {item.usedSlots} DÙNG / {availSlots} TRỐNG
                                </div>
                              </div>

                              {/* Slot Grid Cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {Array.from({ length: item.totalSlots }, (_, idx) => {
                                  const slotNum = idx + 1;
                                  const assignment = item.slotAssignments?.[idx];
                                  const isUsed = Boolean(assignment) || slotNum <= item.usedSlots;

                                  return (
                                    <div
                                      key={slotNum}
                                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.03] ${
                                        isUsed
                                          ? "bg-amber-500/10 border-amber-500/20 text-amber-200 shadow-lg shadow-amber-950/20"
                                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-950/20"
                                      }`}
                                    >
                                      <div className={`p-2 rounded-lg mb-1.5 ${isUsed ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                        <Zap className="w-4 h-4" />
                                      </div>

                                      <div className="text-xs font-bold text-white truncate max-w-full" title={assignment?.customerContact || assignment?.customerName || `Slot ${slotNum}`}>
                                        {assignment?.customerContact || assignment?.customerName || `Slot ${slotNum}`}
                                      </div>

                                      {assignment?.orderCode && (
                                        <div className="text-[10px] font-bold text-amber-400/90 tracking-wide mt-0.5 truncate max-w-full">
                                          ĐƠN: {assignment.orderCode}
                                        </div>
                                      )}

                                      {assignment?.customerName && (
                                        <div className="text-[10px] text-slate-400 truncate max-w-full">
                                          {assignment.customerName}
                                        </div>
                                      )}

                                      {!assignment && isUsed && (
                                        <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mt-1">
                                          ĐÃ DÙNG
                                        </div>
                                      )}

                                      {!isUsed && (
                                        <div className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-widest mt-1">
                                          AVAILABLE
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })

              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Data List ── */}
        <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách kho gói...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Package className="w-9 h-9 text-slate-600 stroke-[1.5]" />
              <span className="text-sm font-medium">Không tìm thấy gói nào thuộc loại "{selectedCategory}"</span>
            </div>
          ) : (
            filteredItems.map((item) => {
              const availSlots = Math.max(0, item.totalSlots - item.usedSlots);
              const percentUsed = Math.min(100, Math.round((item.usedSlots / item.totalSlots) * 100));

              return (
                <div key={item.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md mt-3 first:mt-0 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer bg-slate-800/50"
                        title="Sửa thông tin gói"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer bg-slate-800/50"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="font-mono text-slate-300 text-xs">
                    {item.accountInfo}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-white font-mono">
                        {item.usedSlots} / {item.totalSlots} Vị trí
                      </span>
                      <span className={`text-[10px] uppercase font-bold ${availSlots === 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        TRỐNG: {availSlots}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentUsed >= 100
                            ? "bg-rose-500"
                            : percentUsed >= 50
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-500 block">NCC</span>
                      <span className="text-purple-300 font-semibold block">{item.supplier}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Ngày hết hạn</span>
                      <span className="text-slate-300 font-mono block">{item.expiredAt}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-2">
                     <span className="text-slate-500 block text-xs">Giá nhập</span>
                     <span className="text-slate-200 font-mono font-bold text-sm block">{fmt(item.costPrice)} <span className="text-[10px] font-normal text-slate-500">VND</span></span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Modal 1: Create/Edit Category ── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0a1225] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Tạo / Sửa Loại Gói
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1 font-medium">Tên Loại Gói Mới *</label>
              <input
                type="text"
                placeholder="Ví dụ: Microsoft 365, Spotify..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
              >
                Lưu Loại Gói
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Create/Edit Package Item ── */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0a1225] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                {editingItem ? "Chỉnh Sửa Gói Sản Phẩm" : `Thêm Gói Mới vào loại ${selectedCategory}`}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tên Gói *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Adobe 1PC Cố Định"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Thông Tin Gói / Tài Khoản *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: user@domain.com | pass123"
                  value={itemFormData.accountInfo}
                  onChange={(e) => setItemFormData({ ...itemFormData, accountInfo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Số Slot Đã Dùng</label>
                  <input
                    type="number"
                    min={0}
                    value={itemFormData.usedSlots}
                    onChange={(e) => setItemFormData({ ...itemFormData, usedSlots: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tổng Số Slot (Vị Trí)</label>
                  <input
                    type="number"
                    min={1}
                    value={itemFormData.totalSlots}
                    onChange={(e) => setItemFormData({ ...itemFormData, totalSlots: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nhà Cung Cấp (NCC)</label>
                  <input
                    type="text"
                    value={itemFormData.supplier}
                    onChange={(e) => setItemFormData({ ...itemFormData, supplier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Giá Nhập (₫)</label>
                  <input
                    type="number"
                    value={itemFormData.costPrice}
                    onChange={(e) => setItemFormData({ ...itemFormData, costPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Ngày Hết Hạn</label>
                <input
                  type="date"
                  value={itemFormData.expiredAt}
                  onChange={(e) => setItemFormData({ ...itemFormData, expiredAt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                >
                  Lưu Gói Sản Phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: View Package Details ── */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0a1225] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" /> Chi Tiết Gói #{viewingItem.id}
              </h3>
              <button onClick={() => setViewingItem(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div>
                <span className="text-slate-500">Tên gói: </span>
                <span className="font-bold text-white">{viewingItem.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Loại gói: </span>
                <span className="font-bold text-cyan-400">{viewingItem.category}</span>
              </div>
              <div>
                <span className="text-slate-500">Thông tin tài khoản: </span>
                <span className="font-mono text-slate-200 font-bold">{viewingItem.accountInfo}</span>
              </div>
              <div>
                <span className="text-slate-500">Dung lượng Slot: </span>
                <span className="font-mono font-bold text-white">{viewingItem.usedSlots} / {viewingItem.totalSlots} Vị trí</span>
              </div>
              <div>
                <span className="text-slate-500">Nhà cung cấp: </span>
                <span className="font-bold text-purple-300">{viewingItem.supplier}</span>
              </div>
              <div>
                <span className="text-slate-500">Giá nhập: </span>
                <span className="font-mono font-bold text-emerald-400">{fmt(viewingItem.costPrice)} ₫</span>
              </div>
              <div>
                <span className="text-slate-500">Ngày hết hạn: </span>
                <span className="font-mono font-bold text-amber-400">{viewingItem.expiredAt}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
