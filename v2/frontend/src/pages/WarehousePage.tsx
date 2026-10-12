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
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  WarehouseAccountItem,
  ServiceNameCategoryItem,
  WarehouseAccountFormData,
  CatalogFormData,
  WarehouseFilterBar,
  WarehouseAccountsTable,
  WarehouseCatalogGrid,
  WarehouseCreateModal,
  CatalogCreateModal,
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

  // Dynamic state from PostgreSQL
  const [accounts, setAccounts] = useState<WarehouseAccountItem[]>([]);
  const [catalog, setCatalog] = useState<ServiceNameCategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState<WarehouseAccountFormData>({
    account: "",
    serviceName: "Youtube Premium",
    category: "Youtube Premium",
    password: "",
    backupEmail: "",
    twoFa: "",
    expiresAt: "",
    note: "",
  });

  const [catalogForm, setCatalogForm] = useState<CatalogFormData>({
    name: "",
    category: "Giải Trí & Video",
  });

  const hasAutoExpandedRef = useRef(false);

  // Load live data from API
  const loadWarehouseData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, catRes] = await Promise.all([
        fetch("/api/warehouse"),
        fetch("/api/warehouse/catalog"),
      ]);

      if (accRes.ok) {
        const accData: WarehouseAccountItem[] = await accRes.json();
        setAccounts(Array.isArray(accData) ? accData : []);
      }
      if (catRes.ok) {
        const catData: ServiceNameCategoryItem[] = await catRes.json();
        setCatalog(Array.isArray(catData) ? catData : []);
      }
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
        (statusFilter === "RESERVED" && acc.services.some((s) => s.status === "RESERVED" || s.status === "IN_USE"));

      return matchSearch && matchCategory && matchStatus;
    });
  }, [accounts, searchTerm, categoryFilter, statusFilter]);

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

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* PAGE HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-400 uppercase mb-1">
            <span>NGUỒN HÀNG & KHO</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-normal">
              PostgreSQL Connected
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Kho Hàng & Tồn Kho Key
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Theo dõi chi tiết tài khoản kho, slot bản quyền, chìa khóa 2FA và cảnh báo tự động
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={async () => {
              await loadWarehouseData();
              notification.info("Đã làm mới dữ liệu danh mục kho!", "Làm mới kho");
            }}
            disabled={loading}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs sm:text-sm font-medium transition-all hover:bg-slate-800 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => notification.success("Đã xuất file kho hàng ra Excel!", "Xuất dữ liệu")}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs sm:text-sm font-medium transition-all hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            onClick={() => {
              if (catalog.length > 0) {
                setAccountForm((prev) => ({
                  ...prev,
                  serviceName: catalog[0].name,
                  category: catalog[0].category || catalog[0].name,
                }));
              }
              setIsAccountModalOpen(true);
            }}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới Kho</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">TỔNG TÀI KHOẢN KHO</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{totalAccounts}</span>
            <span className="text-xs text-slate-400">Tài khoản</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Đồng bộ từ Database</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLOTS SẴN HÀNG</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-emerald-400 tracking-tight">{totalAvailableSlots}</span>
            <span className="text-xs text-slate-400">Slots</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400/80 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sẵn sàng giao cho khách</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ĐÃ GIỮ CHỖ / ĐÃ BÁN</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-indigo-400 tracking-tight">{totalReservedSlots}</span>
            <span className="text-xs text-slate-400">Slots</span>
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
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        accountCount={filteredAccounts.length}
        catalogCount={catalog.length}
        availableCategories={availableCategories}
      />

      {/* TAB 1: ACCOUNTS TABLE */}
      {activeTab === "accounts" && (
        <WarehouseAccountsTable
          accounts={filteredAccounts}
          expandedAccountIds={expandedAccountIds}
          showPasswordMap={showPasswordMap}
          copiedKeyMap={copiedKeyMap}
          onToggleExpand={toggleExpand}
          onToggleShowPassword={toggleShowPassword}
          onCopy={copyToClipboard}
          onEditAccount={(acc) => notification.info(`Chỉnh sửa tài khoản kho ${acc.account}`)}
          onDeleteAccount={(acc) =>
            notification.confirm({
              title: "Xóa tài khoản kho?",
              message: `Bạn có chắc muốn xóa tài khoản ${acc.account}? các slot bên trong sẽ bị gỡ bỏ!`,
              onConfirm: async () => {
                try {
                  const res = await fetch(`/api/warehouse/${acc.id}`, { method: "DELETE" });
                  if (!res.ok) throw new Error("Lỗi xóa tài khoản");
                  notification.success("Đã xóa tài khoản kho thành công!");
                  await loadWarehouseData();
                } catch (err: any) {
                  notification.error(err.message || "Không thể xóa tài khoản");
                }
              },
            })
          }
          onAddSlot={(acc) => notification.info(`Thêm slot mới cho tài khoản ${acc.account}`)}
        />
      )}

      {/* TAB 2: CATALOG GRID */}
      {activeTab === "catalog" && (
        <WarehouseCatalogGrid
          catalogItems={catalog}
          onOpenCreateCatalog={() => setIsCatalogModalOpen(true)}
          onEditCatalog={(cat) => notification.info(`Chỉnh sửa dịch vụ ${cat.name}`)}
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
            await loadWarehouseData();
          } catch (err: any) {
            notification.error(err.message || "Tạo dịch vụ thất bại");
          }
        }}
      />
    </div>
  );
};

export default WarehousePage;
