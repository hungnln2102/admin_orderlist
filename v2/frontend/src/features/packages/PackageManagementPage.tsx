import React, { useState, useEffect, useMemo } from "react";
import { Package, Plus } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  PackageItem,
  CategorySummary,
  PackageFormData,
  PackageCategoryCards,
  PackageFilterBar,
  PackageTable,
  PackageCreateEditModal,
  CategoryModal,
  PackageDetailModal,
} from "./index";

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
  const [itemFormData, setItemFormData] = useState<PackageFormData>({
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

      // Extract unique categories from actual package_product items
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
      <PackageCategoryCards
        categorySummaries={categorySummaries}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onEditCategory={(name) => {
          setIsCategoryModalOpen(true);
          setNewCategoryName(name);
        }}
      />

      {/* ── Toolbar & Filters ── */}
      <PackageFilterBar
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenAddItem={handleOpenAddItem}
        onExportExcel={() => notify.success("Đã xuất danh sách dữ liệu gói thành công!", "Xuất Excel")}
      />

      {/* Active Indicator */}
      <div className="text-xs text-slate-400 px-1 flex items-center gap-2">
        <span>Đang xem:</span>
        <span className="font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
          {selectedCategory}
        </span>
        <span className="text-slate-600">({filteredItems.length} gói)</span>
      </div>

      {/* ── Main Data Table ── */}
      <PackageTable
        loading={loading}
        filteredItems={filteredItems}
        selectedCategory={selectedCategory}
        expandedRowId={expandedRowId}
        onToggleExpandRow={(id) => setExpandedRowId(expandedRowId === id ? null : id)}
        onEditItem={handleOpenEditItem}
        onViewItem={setViewingItem}
        onDeleteItem={handleDeleteItem}
      />

      {/* ── Modal 1: Create/Edit Category ── */}
      <CategoryModal
        open={isCategoryModalOpen}
        categoryName={newCategoryName}
        onClose={() => setIsCategoryModalOpen(false)}
        onNameChange={setNewCategoryName}
        onSubmit={handleAddCategory}
      />

      {/* ── Modal 2: Create/Edit Package Item ── */}
      <PackageCreateEditModal
        open={isItemModalOpen}
        editingItem={editingItem}
        selectedCategory={selectedCategory}
        formData={itemFormData}
        onClose={() => setIsItemModalOpen(false)}
        onFormChange={setItemFormData}
        onSubmit={handleSaveItem}
      />

      {/* ── Modal 3: View Package Details ── */}
      <PackageDetailModal
        item={viewingItem}
        onClose={() => setViewingItem(null)}
      />
    </div>
  );
};
