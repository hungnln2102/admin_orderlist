import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Download,
  Key,
  Package,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Info,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { fetchCachedJson, invalidateApiCache } from "@/shared/api/apiCache";
import { useUrlPagination } from "@/shared/hooks/useUrlPagination";
import {
  WarehouseAccountItem,
  WarehouseServiceSlot,
  WarehouseSlotEditFormData,
  ServiceNameCategoryItem,
  SystemProduct,
  WarehouseAccountFormData,
  WarehouseAddServiceFormData,
  CatalogFormData,
  WarehouseFilterBar,
  WarehouseAccountsTable,
  WarehouseCatalogGrid,
  WarehouseCreateModal,
  WarehouseAddServiceModal,
  WarehouseEditSlotModal,
  WarehouseEditAccountModal,
  CatalogCreateModal,
  CatalogDeleteModal,
  CatalogEditModal,
} from "@/features/warehouse";

export const WarehousePage: React.FC = () => {
  const notification = useNotification();

  const [activeTab, setActiveTab] = useState<"accounts" | "catalog">("accounts");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedAccountIds, setExpandedAccountIds] = useState<number[]>([]);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [copiedKeyMap, setCopiedKeyMap] = useState<Record<string, boolean>>({});
  const [loggedSlotsMap, setLoggedSlotsMap] = useState<Record<number, boolean>>({});
  const [openingSlotId, setOpeningSlotId] = useState<number | null>(null);

  // Dynamic state from PostgreSQL
  const [accounts, setAccounts] = useState<WarehouseAccountItem[]>([]);
  const [catalog, setCatalog] = useState<ServiceNameCategoryItem[]>([]);
  const [systemProducts, setSystemProducts] = useState<SystemProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [deletingCatalogItem, setDeletingCatalogItem] = useState<ServiceNameCategoryItem | null>(null);
  const [isDeletingCatalog, setIsDeletingCatalog] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<ServiceNameCategoryItem | null>(null);
  const [isUpdatingCatalog, setIsUpdatingCatalog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<WarehouseAccountItem | null>(null);
  const [addingServiceAccount, setAddingServiceAccount] = useState<WarehouseAccountItem | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingSlotData, setEditingSlotData] = useState<{
    account: WarehouseAccountItem;
    slot: WarehouseServiceSlot;
  } | null>(null);
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState<WarehouseAccountFormData>({
    account: "",
    serviceName: "Youtube Premium",
    category: "Youtube Premium",
    variantTag: "",
    password: "",
    backupEmail: "",
    twoFa: "",
    expiresAt: "",
    note: "",
  });

  const [catalogForm, setCatalogForm] = useState<CatalogFormData>({
    name: "",
    category: "Văn Phòng & Phần Mềm",
    productId: null,
    loginUrl: "",
  });

  const hasAutoExpandedRef = useRef(false);

  // Load live data from API
  const loadWarehouseData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, catalogResult, systemProductsResult] = await Promise.all([
        fetch("/api/warehouse", { credentials: "include" }),
        fetchCachedJson<ServiceNameCategoryItem[]>("/api/warehouse/catalog", { ttlMs: 5 * 60 * 1000, staleWhileRevalidateMs: 5 * 60 * 1000 }),
        fetchCachedJson<SystemProduct[]>("/api/warehouse/system-products", { ttlMs: 5 * 60 * 1000, staleWhileRevalidateMs: 5 * 60 * 1000 }),
      ]);

      if (!accRes.ok) throw new Error("Kh?ng th? t?i danh s?ch kho.");
      const accData: WarehouseAccountItem[] = await accRes.json();
      const nextAccounts = Array.isArray(accData) ? accData : [];
      setAccounts(nextAccounts);
      setLoggedSlotsMap(
        Object.fromEntries(
          nextAccounts.flatMap((account) =>
            account.services.map((service) => [service.id, service.is_authenticated === true])
          )
        )
      );
      setCatalog(Array.isArray(catalogResult.data) ? catalogResult.data : []);
      setSystemProducts(Array.isArray(systemProductsResult.data) ? systemProductsResult.data : []);

      void catalogResult.revalidate?.then((data) => setCatalog(Array.isArray(data) ? data : [])).catch(() => undefined);
      void systemProductsResult.revalidate?.then((data) => setSystemProducts(Array.isArray(data) ? data : [])).catch(() => undefined);
    } catch (err) {
      console.error("Error loading warehouse data:", err);
      notification.error("Không thể kết nối đến cơ sở dữ liệu kho hàng.");
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    loadWarehouseData();
  }, [loadWarehouseData]);

  const toggleExpand = (id: number) => {
    const numericId = Number(id);
    setExpandedAccountIds((prev) =>
      prev.map(Number).includes(numericId)
        ? prev.filter((i) => Number(i) !== numericId)
        : [...prev, numericId]
    );
  };

  const toggleShowPassword = (serviceId: number) => {
    setShowPasswordMap((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const copyToClipboard = (text: string, label: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyMap((prev) => ({ ...prev, [keyId]: true }));
    notification.success(`Đã sao chép ${label} vào bộ nhớ tạm!`, "Sao chép thành công");
    setTimeout(() => {
      setCopiedKeyMap((prev) => ({ ...prev, [keyId]: false }));
    }, 2000);
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch =
        searchTerm === "" ||
        acc.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.services.some(
          (s) =>
            s.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.note && s.note.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchCategory =
        categoryFilter === "all" ||
        acc.services.some((s) => s.category === categoryFilter || s.display_name === categoryFilter);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "AVAILABLE" && acc.services.some((s) => s.status === "AVAILABLE")) ||
        (statusFilter === "EXPIRED" && acc.services.some((s) => s.status === "EXPIRED" || s.status === "UNAVAILABLE")) ||
        (statusFilter === "RESERVED" && acc.services.some((s) => s.status === "IN_USE" || s.status === "RESERVED"));

      return matchSearch && matchCategory && matchStatus;
    });
  }, [accounts, searchTerm, categoryFilter, statusFilter]);

  const accountsPageSize = 20;
  const { page: accountsPage, setPage: setAccountsPage, resetPage: resetAccountsPage } = useUrlPagination(
    Math.ceil(filteredAccounts.length / accountsPageSize) || 1
  );
  const pagedAccounts = filteredAccounts.slice(
    (accountsPage - 1) * accountsPageSize,
    accountsPage * accountsPageSize
  );
  // Available categories list for filter
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    accounts.forEach((a) => {
      (a.services || []).forEach((s) => {
        if (s.display_name) set.add(s.display_name);
        else if (s.category) set.add(s.category);
      });
    });
    return Array.from(set).sort();
  }, [catalog, accounts]);

  // Statistics calculation from live database
  const totalAccounts = accounts.length;
  const totalAvailableSlots = accounts.reduce(
    (acc, item) => acc + item.services.filter((s) => s.status === "AVAILABLE").length,
    0
  );
  const totalReservedSlots = accounts.reduce(
    (acc, item) =>
      acc + item.services.filter((s) => s.status === "IN_USE" || s.status === "RESERVED").length,
    0
  );
  const totalExpiredSlots = accounts.reduce(
    (acc, item) =>
      acc + item.services.filter((s) => s.status === "EXPIRED" || s.status === "UNAVAILABLE").length,
    0
  );

  const handleUpdateCatalogSubmit = async (data: {
    id: number;
    name: string;
    category: string;
    loginUrl: string;
    productId: number | null;
  }) => {
    setIsUpdatingCatalog(true);
    try {
      const res = await fetch(`/api/warehouse/catalog/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Không thể cập nhật dịch vụ kho");
      }
      notification.success(
        `Đã cập nhật dịch vụ "${data.name}" thành công!`,
        "Cập Nhật Thành Công"
      );
      setEditingCatalogItem(null);
      invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
    } catch (err: any) {
      console.error("Lỗi cập nhật catalog item:", err);
      notification.error(err.message || "Cập nhật dịch vụ thất bại");
    } finally {
      setIsUpdatingCatalog(false);
    }
  };

  const handleOpenBrowserForUrl = (url: string, serviceName: string) => {
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;
    const browserWindow = window.open(
      targetUrl,
      "_blank",
      "noopener,noreferrer"
    );
    if (browserWindow) browserWindow.focus();
    notification.info(
      `Đang mở trang đăng nhập ${serviceName}: ${targetUrl}`,
      "Mở Trình Duyệt"
    );
  };

  const handleConfirmDeleteCatalog = async () => {
    if (!deletingCatalogItem) return;
    setIsDeletingCatalog(true);
    try {
      const res = await fetch(`/api/warehouse/catalog/${deletingCatalogItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa dịch vụ kho");
      }
      notification.success(
        data.message || `Đã xóa dịch vụ "${deletingCatalogItem.name}" khỏi danh mục kho thành công!`,
        "Xóa Dịch Vụ Kho"
      );
      setDeletingCatalogItem(null);
      invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
    } catch (err: any) {
      console.error("Lỗi xóa dịch vụ kho:", err);
      notification.error(err.message || "Xóa dịch vụ kho thất bại", "Lỗi Xóa Dịch Vụ");
    } finally {
      setIsDeletingCatalog(false);
    }
  };

  const handleOpenBrowser = async (account: WarehouseAccountItem, service: any) => {
    if (openingSlotId) return;
    setOpeningSlotId(service.id);
    try {
      // 1. Mở cửa sổ Trình duyệt Đám Mây trên Web cho Master thao tác trực quan
      const browserWindow = window.open(
        "/browser/",
        "MavrykCloudBrowser",
        "width=1280,height=820,menubar=no,toolbar=no,location=no,status=no,resizable=yes"
      );

      if (browserWindow) {
        browserWindow.focus();
      }

      notification.info(
        `Đã mở Trình duyệt Đám Mây cho tài khoản ${account.account}. Master hãy thao tác đăng nhập trực tiếp trên cửa sổ vừa mở; Profile sẽ được lưu tự động trên VPS.`,
        "Trình Duyệt Đám Mây"
      );

      // 2. Gửi request backend để xác minh hoặc lưu phiên
      const res = await fetch(`/api/warehouse/accounts/${account.id}/open-browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: service.display_name || service.category,
          slotId: service.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const hasAuthenticatedSession = data.data?.hasAuthenticatedSession === true;
        setLoggedSlotsMap((previous) => ({ ...previous, [service.id]: hasAuthenticatedSession }));
        if (hasAuthenticatedSession) {
          notification.success("Đã xác minh phiên đăng nhập của tài khoản này.", "Đã Đăng Nhập");
        }
      }
    } catch (err: any) {
      console.warn("Lưu ý probe session:", err);
    } finally {
      setOpeningSlotId(null);
    }
  };

  const handleUpdateSlot = async (formData: WarehouseSlotEditFormData) => {
    if (!editingSlotData) return;
    setIsUpdatingSlot(true);
    try {
      const res = await fetch(`/api/warehouse/services/${editingSlotData.slot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật slot dịch vụ");
      }
      notification.success("Cập nhật thông tin slot thành công!");
      setEditingSlotData(null);
      invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
    } catch (err: any) {
      console.error("Lỗi cập nhật slot:", err);
      notification.error(err.message || "Lỗi cập nhật slot");
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  const handleUpdateAccount = async (accountId: number, newAccountName: string) => {
    try {
      const res = await fetch(`/api/warehouse/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: newAccountName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật tài khoản kho");
      }
      notification.success(
        `Đã cập nhật tài khoản "${newAccountName}" thành công!`,
        "Cập Nhật Thành Công"
      );
      setEditingAccount(null);
      invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
    } catch (err: any) {
      console.error("Lỗi cập nhật tài khoản kho:", err);
      notification.error(err.message || "Cập nhật tài khoản kho thất bại");
      throw err;
    }
  };

  const handleAddServiceSubmit = async (formData: WarehouseAddServiceFormData) => {
    if (!addingServiceAccount) return;
    setIsAddingService(true);
    try {
      const res = await fetch(`/api/warehouse/accounts/${addingServiceAccount.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể thêm dịch vụ vào tài khoản");
      }
      notification.success(
        `Đã thêm dịch vụ "${formData.serviceName}" vào tài khoản ${addingServiceAccount.account} thành công!`,
        "Thêm dịch vụ kho"
      );
      setAddingServiceAccount(null);
      invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
    } catch (err: any) {
      console.error("Lỗi thêm dịch vụ kho:", err);
      notification.error(err.message || "Không thể thêm dịch vụ vào tài khoản");
    } finally {
      setIsAddingService(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-950/50">
              <Key className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              QUẢN TRỊ KHO TÀI KHOẢN & KEY BẢN QUYỀN
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Quản lý kho tài khoản Adobe, Canva, ChatGPT, Netflix... với cơ chế Isolated Chrome Profile tự động đăng nhập.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadWarehouseData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Làm Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tài Khoản Kho</span>
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">TỔNG TÀI KHOẢN GỐC</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{totalAccounts}</span>
            <span className="text-xs text-slate-400">tài khoản</span>
          </div>
          <div className="mt-2 text-xs text-cyan-400/80 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đang lưu trữ an toàn</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLOT SẴN SÀNG (TỒN KHO)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-emerald-400 tracking-tight">{totalAvailableSlots}</span>
            <span className="text-xs text-slate-400">slot trống</span>
          </div>
          <div className="mt-2 text-xs text-emerald-300/80 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sẵn sàng gán cho khách</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLOT ĐANG SỬ DỤNG</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-indigo-400 tracking-tight">{totalReservedSlots}</span>
            <span className="text-xs text-slate-400">slot</span>
          </div>
          <div className="mt-2 text-xs text-indigo-300/80 font-medium flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Đang gắn vào đơn mua</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">CẢNH BÁO HẾT HẠN</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-amber-400 tracking-tight">{totalExpiredSlots}</span>
            <span className="text-xs text-slate-400">Cần xử lý</span>
          </div>
          <div className="mt-2 text-xs text-amber-300/80 font-medium flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cần gia hạn / thay thế key</span>
          </div>
        </div>
      </div>

      {/* FILTER & TABS TOOLBAR */}
      <WarehouseFilterBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchTerm={searchTerm}
        onSearchChange={(value) => { setSearchTerm(value); resetAccountsPage(); }}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(value) => { setCategoryFilter(value); resetAccountsPage(); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => { setStatusFilter(value); resetAccountsPage(); }}
        accountCount={filteredAccounts.length}
        catalogCount={catalog.length}
        availableCategories={availableCategories}
      />

      {/* TAB 1: ACCOUNTS TABLE */}
      {activeTab === "accounts" && (
        <WarehouseAccountsTable
          accounts={pagedAccounts}
          expandedAccountIds={expandedAccountIds}
          showPasswordMap={showPasswordMap}
          copiedKeyMap={copiedKeyMap}
          onToggleExpand={toggleExpand}
          onToggleShowPassword={toggleShowPassword}
          onCopy={copyToClipboard}
          onAddService={(acc) => setAddingServiceAccount(acc)}
          onEditAccount={(acc) => setEditingAccount(acc)}
          onEditSlot={(acc, srv) => setEditingSlotData({ account: acc, slot: srv })}
          onDeleteSlot={(acc, srv) =>
            notification.confirm({
              title: "Xóa dịch vụ kho?",
              message: `Bạn có chắc muốn xóa dịch vụ "${srv.display_name || srv.category}" khỏi tài khoản ${acc.account}?`,
              onConfirm: async () => {
                try {
                  const res = await fetch(`/api/warehouse/services/${srv.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Lỗi xóa dịch vụ kho");
                  }
                  notification.success(`Đã xóa dịch vụ "${srv.display_name || srv.category}" thành công!`);
                  invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
                } catch (err: any) {
                  notification.error(err.message || "Không thể xóa dịch vụ kho");
                }
              },
            })
          }
          onDeleteAccount={(acc) =>
            notification.confirm({
              title: "Xóa tài khoản kho?",
              message: `Bạn có chắc muốn xóa tài khoản ${acc.account}? các slot bên trong sẽ bị gỡ bỏ!`,
              onConfirm: async () => {
                try {
                  const res = await fetch(`/api/warehouse/${acc.id}`, { method: "DELETE" });
                  if (!res.ok) throw new Error("Lỗi xóa tài khoản");
                  notification.success("Đã xóa tài khoản kho thành công!");
                  invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
                } catch (err: any) {
                  notification.error(err.message || "Không thể xóa tài khoản");
                }
              },
            })
          }
          onOpenBrowser={handleOpenBrowser}
          loggedSlotsMap={loggedSlotsMap}
          onVerifySession={handleOpenBrowser}
          openingSlotId={openingSlotId}
        />
      )}

        {filteredAccounts.length > accountsPageSize && (
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
            <span>Trang {accountsPage} / {Math.ceil(filteredAccounts.length / accountsPageSize)}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAccountsPage((current) => current - 1)} disabled={accountsPage <= 1} className="px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-40">Trước</button>
              <button type="button" onClick={() => setAccountsPage((current) => current + 1)} disabled={accountsPage >= Math.ceil(filteredAccounts.length / accountsPageSize)} className="px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      {/* TAB 2: CATALOG GRID */}
      {activeTab === "catalog" && (
        <WarehouseCatalogGrid
          catalogItems={catalog}
          onOpenCreateCatalog={() => setIsCatalogModalOpen(true)}
          onEditCatalog={(cat) => setEditingCatalogItem(cat)}
          onDeleteCatalog={(cat) => setDeletingCatalogItem(cat)}
          onOpenBrowserWithUrl={handleOpenBrowserForUrl}
        />
      )}

      {/* MODAL CREATE ACCOUNT */}
      <WarehouseCreateModal
        open={isAccountModalOpen}
        formData={accountForm}
        catalogItems={catalog}
        onClose={() => setIsAccountModalOpen(false)}
        onFormChange={setAccountForm}
        onSubmit={async () => {
          try {
            const res = await fetch("/api/warehouse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(accountForm),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Lỗi tạo tài khoản kho");
            }
            notification.success("Đã tạo mới tài khoản kho thành công!", "Tạo tài khoản");
            setIsAccountModalOpen(false);
            invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
          } catch (err: any) {
            notification.error(err.message || "Tạo tài khoản kho thất bại");
          }
        }}
      />

      {/* MODAL CREATE CATALOG */}
      <CatalogCreateModal
        open={isCatalogModalOpen}
        formData={catalogForm}
        systemProducts={systemProducts}
        onClose={() => setIsCatalogModalOpen(false)}
        onFormChange={setCatalogForm}
        onSubmit={async () => {
          try {
            const res = await fetch("/api/warehouse/catalog", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(catalogForm),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Lỗi tạo dịch vụ danh mục");
            }
            notification.success("Đã thêm dịch vụ vào danh mục thành công!", "Tạo dịch vụ");
            setIsCatalogModalOpen(false);
            invalidateApiCache(["/api/warehouse/catalog", "/api/warehouse/system-products"]);
            await loadWarehouseData();
          } catch (err: any) {
            notification.error(err.message || "Tạo dịch vụ thất bại");
          }
        }}
      />

      {/* MODAL ADD SERVICE TO ACCOUNT */}
      <WarehouseAddServiceModal
        open={!!addingServiceAccount}
        account={addingServiceAccount}
        catalogItems={catalog}
        isSubmitting={isAddingService}
        onClose={() => setAddingServiceAccount(null)}
        onSubmit={handleAddServiceSubmit}
      />

      {/* MODAL DELETE CATALOG */}
      <CatalogDeleteModal
        item={deletingCatalogItem}
        onClose={() => setDeletingCatalogItem(null)}
        onConfirmDelete={handleConfirmDeleteCatalog}
        submitting={isDeletingCatalog}
      />

      {/* MODAL EDIT SLOT */}
      <WarehouseEditSlotModal
        open={!!editingSlotData}
        account={editingSlotData?.account || null}
        slot={editingSlotData?.slot || null}
        isSubmitting={isUpdatingSlot}
        onClose={() => setEditingSlotData(null)}
        onSubmit={handleUpdateSlot}
      />

      {/* MODAL EDIT ACCOUNT (TÀI KHOẢN GỐC) */}
      <WarehouseEditAccountModal
        open={!!editingAccount}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSubmit={handleUpdateAccount}
      />

      {/* MODAL EDIT CATALOG (SỬA THÔNG TIN & CẤU HÌNH LINK) */}
      <CatalogEditModal
        open={!!editingCatalogItem}
        item={editingCatalogItem}
        systemProducts={systemProducts}
        isSubmitting={isUpdatingCatalog}
        onClose={() => setEditingCatalogItem(null)}
        onSubmit={handleUpdateCatalogSubmit}
      />
    </div>
  );
};

export default WarehousePage;
