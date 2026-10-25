import React, { useState, useEffect, useMemo } from "react";
import { Package, Plus } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  PackageItem,
  CategorySummary,
  PackageFormData,
  PackageCategory,
  PackageCategoryCards,
  PackageFilterBar,
  PackageTable,
  PackageCreateEditModal,
  CategoryModal,
  CategoryDeleteModal,
  PackageDetailModal,
} from "./index";

export const PackageManagementPage: React.FC = () => {
  const notify = useNotification();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<PackageCategory[]>([]);
  const [catalogNames, setCatalogNames] = useState<string[]>([]);
  const [warehouseAccounts, setWarehouseAccounts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [categoryRequiresStorage, setCategoryRequiresStorage] = useState<boolean>(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PackageItem | null>(null);
  const [viewingItem, setViewingItem] = useState<PackageItem | null>(null);

  // Package Data List (fetched & live state)
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);

  // Item Form State
  const [itemFormData, setItemFormData] = useState<PackageFormData>({
    name: "",
    category: "",
    accountInfo: "",
    storageAccountInfo: "",
    storageTotal: "",
    totalSlots: 2,
    supplier: "Mavryk",
    costPrice: 95000,
    expiredAt: "2026-12-31",
    note: "",
    matchRule: "information",
  });

  // Load Data from Backend APIs (trực tiếp từ warehouse.product_names và warehouse.package_products)
  const fetchPackageData = async () => {
    setLoading(true);
    try {
      const [pkgRes, catRes, catalogRes, whRes] = await Promise.all([
        fetch("/api/products/packages"),
        fetch("/api/products/packages/categories"),
        fetch("/api/products/packages/catalog-names"),
        fetch("/api/warehouse"),
      ]);

      const pkgJson = await pkgRes.json().catch(() => ({ data: [] }));
      const catJson = await catRes.json().catch(() => ({ data: [] }));
      const catalogJson = await catalogRes.json().catch(() => ({ data: [] }));
      const whJson = await whRes.json().catch(() => []);

      const list: PackageItem[] = pkgJson.data || [];
      const dbCategories: PackageCategory[] = catJson.data || [];
      const allMasterProducts: { id: number; name: string }[] = catalogJson.data || [];
      const rawWhList = Array.isArray(whJson) ? whJson : (whJson.data || []);
      const whAccounts: string[] = rawWhList.map((w: any) => w.account).filter(Boolean);

      // Extract unique categories from dbCategories (primary từ warehouse.product_names)
      const catNames = dbCategories.map((c) => c.name);
      list.forEach((item) => {
        if (item.category && !catNames.includes(item.category)) {
          catNames.push(item.category);
        }
      });

      // Combine accounts for auto-suggestions
      const combinedAccounts = Array.from(
        new Set([
          ...whAccounts,
          ...list.map((i) => i.accountInfo).filter(Boolean),
          ...list.map((i) => i.storageAccountInfo).filter(Boolean) as string[],
        ])
      );

      const allNames = allMasterProducts.map((p) => p.name);
      setCatalogNames(allNames);
      setCategories(catNames);
      setCategoriesList(dbCategories);
      setWarehouseAccounts(combinedAccounts);
      setSelectedCategory((prev) => (catNames.includes(prev) ? prev : ""));
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
      const catObj = categoriesList.find((c) => c.name.toLowerCase() === cat.toLowerCase());
      return { name: cat, total, low, out, requiresStorage: catObj?.requiresStorage };
    });
  }, [categories, categoriesList, packageItems]);

  // Filtered items for current active category & search/status
  const filteredItems = useMemo(() => {
    return packageItems.filter((item) => {
      const matchCat =
        !selectedCategory ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.accountInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.storageAccountInfo && item.storageAccountInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = item.status === "active";
      else if (statusFilter === "warning") matchStatus = item.status === "warning";
      else if (statusFilter === "expired") matchStatus = item.status === "expired";

      return matchCat && matchSearch && matchStatus;
    });
  }, [packageItems, selectedCategory, searchQuery, statusFilter]);

  // Handlers
  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    try {
      if (editingCategoryName && editingCategoryName.toLowerCase() !== name.toLowerCase()) {
        const res = await fetch("/api/products/packages/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldName: editingCategoryName,
            newName: name,
            requiresStorage: categoryRequiresStorage,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không thể cập nhật loại gói");
        notify.success(`Đã đổi tên loại gói thành: ${name}`, "Cập Nhật Loại Gói");
      } else {
        const res = await fetch("/api/products/packages/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            requiresStorage: categoryRequiresStorage,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không thể tạo loại gói");
        notify.success(`Đã lưu loại gói: ${name}`, "Lưu Loại Gói");
      }
      setNewCategoryName("");
      setEditingCategoryName(null);
      setCategoryRequiresStorage(false);
      setIsCategoryModalOpen(false);
      await fetchPackageData();
      setSelectedCategory(name);
    } catch (err: any) {
      console.error("Lỗi lưu loại gói:", err);
      notify.error(err.message || "Lưu loại gói thất bại", "Lỗi");
    }
  };

  const handleDeleteCategory = (categoryName: string) => {
    setDeletingCategory(categoryName);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    const catNameToDelete = deletingCategory;
    setIsDeletingCategory(true);
    try {
      const res = await fetch(`/api/products/packages/categories/${encodeURIComponent(catNameToDelete)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Không thể xóa loại gói");
      }
      notify.success(`Đã xóa loại gói "${catNameToDelete}" khỏi kho`, "Xóa Loại Gói");
      setDeletingCategory(null);
      await fetchPackageData();
      if (selectedCategory.toLowerCase() === catNameToDelete.toLowerCase()) {
        const remaining = categories.filter((c) => c.toLowerCase() !== catNameToDelete.toLowerCase());
        setSelectedCategory(remaining[0] || "");
      }
    } catch (err: any) {
      console.error("Lỗi xóa loại gói:", err);
      notify.error(err.message || "Xóa loại gói thất bại", "Lỗi");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    const targetCat = selectedCategory || (categoriesList[0]?.name || "Adobe");
    const matchedCat = categoriesList.find((c) => c.name.toLowerCase() === targetCat.toLowerCase());

    setItemFormData({
      name: targetCat,
      category: targetCat,
      accountInfo: "",
      storageAccountInfo: "",
      storageTotal: matchedCat?.requiresStorage ? "2000 GB" : "",
      totalSlots: 2,
      supplier: "Mavryk",
      costPrice: 95000,
      expiredAt: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      note: "",
      matchRule: "information",
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: PackageItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      category: item.category,
      accountInfo: item.accountInfo,
      storageAccountInfo: item.storageAccountInfo || "",
      storageTotal: item.storageTotal || "",
      totalSlots: item.totalSlots,
      supplier: item.supplier,
      costPrice: item.costPrice,
      expiredAt: item.expiredAt,
      note: item.note,
      matchRule: item.matchRule || "information",
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: itemFormData.name,
        category: itemFormData.category || selectedCategory || (categoriesList[0]?.name || ""),
        accountInfo: itemFormData.accountInfo,
        accountUsername: itemFormData.accountInfo,
        storageAccountInfo: itemFormData.storageAccountInfo,
        storageAccountUsername: itemFormData.storageAccountInfo,
        storageTotal: itemFormData.storageTotal,
        totalSlots: itemFormData.totalSlots,
        supplier: itemFormData.supplier,
        costPrice: itemFormData.costPrice,
        expiredAt: itemFormData.expiredAt,
        note: itemFormData.note,
        matchRule: itemFormData.matchRule || "information",
      };

      if (editingItem) {
        const res = await fetch(`/api/products/packages/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không thể cập nhật gói sản phẩm");
        notify.success("Đã cập nhật thông tin gói thành công!", "Cập Nhật");
      } else {
        const res = await fetch("/api/products/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không thể thêm gói sản phẩm mới");
        notify.success("Đã thêm gói sản phẩm mới vào kho!", "Thêm Gói Mới");
      }

      setIsItemModalOpen(false);
      await fetchPackageData();
    } catch (err: any) {
      console.error("Lỗi lưu gói sản phẩm:", err);
      notify.error(err.message || "Lưu gói thất bại", "Lỗi");
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const res = await fetch(`/api/products/packages/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể xóa gói");
      notify.success("Đã xóa gói khỏi kho thành công!", "Xóa Gói");
      await fetchPackageData();
    } catch (err: any) {
      console.error("Lỗi xóa gói:", err);
      notify.error(err.message || "Xóa gói thất bại", "Lỗi");
    }
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
          onClick={() => {
            setEditingCategoryName(null);
            setNewCategoryName("");
            setCategoryRequiresStorage(false);
            setIsCategoryModalOpen(true);
          }}
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
        onSelectCategory={(name) => {
          setSelectedCategory((prev) => (prev.toLowerCase() === name.toLowerCase() ? "" : name));
        }}
        onEditCategory={(name) => {
          const matchedCat = categoriesList.find((c) => c.name.toLowerCase() === name.toLowerCase());
          setEditingCategoryName(name);
          setNewCategoryName(name);
          setCategoryRequiresStorage(Boolean(matchedCat?.requiresStorage));
          setIsCategoryModalOpen(true);
        }}
        onDeleteCategory={handleDeleteCategory}
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
        {selectedCategory ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
            <span>{selectedCategory}</span>
            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              className="text-cyan-400/60 hover:text-cyan-200 transition-colors cursor-pointer text-sm font-bold leading-none"
              title="Bỏ chọn để xem tất cả gói"
            >
              ×
            </button>
          </span>
        ) : (
          <span className="font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
            Tất cả loại gói
          </span>
        )}
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
        catalogNames={catalogNames}
        isEditing={Boolean(editingCategoryName)}
        requiresStorage={categoryRequiresStorage}
        onRequiresStorageChange={setCategoryRequiresStorage}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategoryName(null);
          setCategoryRequiresStorage(false);
        }}
        onNameChange={setNewCategoryName}
        onSubmit={handleSaveCategory}
      />

      {/* ── Modal 1.1: Confirm Delete Category ── */}
      <CategoryDeleteModal
        categoryName={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirmDelete={handleConfirmDeleteCategory}
        submitting={isDeletingCategory}
      />

      {/* ── Modal 2: Create/Edit Package Item ── */}
      <PackageCreateEditModal
        open={isItemModalOpen}
        editingItem={editingItem}
        selectedCategory={selectedCategory}
        categoriesList={categoriesList}
        warehouseAccounts={warehouseAccounts}
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
