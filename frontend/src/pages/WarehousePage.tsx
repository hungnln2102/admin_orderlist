import { WarehouseProviderCatalog } from "@/features/warehouse/components/WarehouseProviderCatalog";
import React, { useState, lazy, Suspense } from "react";
import {
  RefreshCw,
  Plus,
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
import {
  WarehouseAccountItem,
  WarehouseServiceSlot,
  ServiceNameCategoryItem,
  WarehouseAccountFormData,
  CatalogFormData,
  WarehouseFilterBar,
  WarehouseAccountsTable,
} from "@/features/warehouse";
import {
  useWarehouseData,
  INITIAL_ACCOUNT_FORM,
  INITIAL_CATALOG_FORM,
} from "@/features/warehouse/hooks/useWarehouseData";

// Lazy-load Tab 2 & toàn bộ 7 Modals (FE-08 / FE-10) để giảm mạnh JS tải ban đầu
const WarehouseCatalogGrid = lazy(() =>
  import("@/features/warehouse/components/WarehouseCatalogGrid").then((m) => ({
    default: m.WarehouseCatalogGrid,
  }))
);
const WarehouseCreateModal = lazy(() =>
  import("@/features/warehouse/components/WarehouseCreateModal").then((m) => ({
    default: m.WarehouseCreateModal,
  }))
);
const WarehouseAddServiceModal = lazy(() =>
  import("@/features/warehouse/components/WarehouseAddServiceModal").then((m) => ({
    default: m.WarehouseAddServiceModal,
  }))
);
const WarehouseEditSlotModal = lazy(() =>
  import("@/features/warehouse/components/WarehouseEditSlotModal").then((m) => ({
    default: m.WarehouseEditSlotModal,
  }))
);
const WarehouseEditAccountModal = lazy(() =>
  import("@/features/warehouse/components/WarehouseEditAccountModal").then((m) => ({
    default: m.WarehouseEditAccountModal,
  }))
);
const CatalogCreateModal = lazy(() =>
  import("@/features/warehouse/components/CatalogCreateModal").then((m) => ({
    default: m.CatalogCreateModal,
  }))
);
const CatalogDeleteModal = lazy(() =>
  import("@/features/warehouse/components/CatalogDeleteModal").then((m) => ({
    default: m.CatalogDeleteModal,
  }))
);
const CatalogEditModal = lazy(() =>
  import("@/features/warehouse/components/CatalogEditModal").then((m) => ({
    default: m.CatalogEditModal,
  }))
);

export const WarehousePage: React.FC = () => {
  const notification = useNotification();

  const {
    accounts,
    catalog,
    systemProducts,
    loading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    expandedAccountIds,
    showPasswordMap,
    copiedKeyMap,
    loggedSlotsMap,
    openingSlotId,
    filteredAccounts,
    availableCategories,
    stats,
    loadWarehouseData,
    ensureSystemProducts,
    invalidateAndReload,
    toggleExpand,
    toggleShowPassword,
    copyToClipboard,
    createAccount,
    updateAccount,
    deleteAccount,
    addServiceToAccount,
    updateSlot,
    deleteSlot,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    toggleCatalogPackage,
    openBrowserForUrl,
    openBrowserForSlot,
  } = useWarehouseData();

  const [activeTab, setActiveTab] = useState<"accounts" | "catalog">("accounts");

  // Modal open states
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

  const [accountForm, setAccountForm] = useState<WarehouseAccountFormData>(INITIAL_ACCOUNT_FORM);
  const [catalogForm, setCatalogForm] = useState<CatalogFormData>(INITIAL_CATALOG_FORM);

  const handleTabChange = (tab: "accounts" | "catalog") => {
    setActiveTab(tab);
    if (tab === "catalog") {
      void ensureSystemProducts();
    }
  };

  const handleOpenCreateCatalog = () => {
    void ensureSystemProducts();
    setIsCatalogModalOpen(true);
  };

  const handleOpenEditCatalog = (cat: ServiceNameCategoryItem) => {
    void ensureSystemProducts();
    setEditingCatalogItem(cat);
  };

  const handleOpenEditSlot = (acc: WarehouseAccountItem, srv: WarehouseServiceSlot) => {
    void ensureSystemProducts();
    setEditingSlotData({ account: acc, slot: srv });
  };

  return (
    <WarehouseProviderCatalog><div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
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
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">TỔNG TÀI KHOẢN GỐC</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{stats.totalAccounts}</span>
            <span className="text-xs text-slate-400">tài khoản</span>
          </div>
          <div className="mt-2 text-xs text-cyan-400/80 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đang lưu trữ an toàn</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLOT SẴN SÀNG (TỒN KHO)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-emerald-400 tracking-tight">{stats.totalAvailableSlots}</span>
            <span className="text-xs text-slate-400">slot trống</span>
          </div>
          <div className="mt-2 text-xs text-emerald-300/80 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sẵn sàng gán cho khách</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLOT ĐANG SỬ DỤNG</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-indigo-400 tracking-tight">{stats.totalReservedSlots}</span>
            <span className="text-xs text-slate-400">slot</span>
          </div>
          <div className="mt-2 text-xs text-indigo-300/80 font-medium flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Đang gắn vào đơn mua</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">CẢNH BÁO HẾT HẠN</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-amber-400 tracking-tight">{stats.totalExpiredSlots}</span>
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
        onTabChange={handleTabChange}
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
          onAddService={(acc) => setAddingServiceAccount(acc)}
          onEditAccount={(acc) => setEditingAccount(acc)}
          onEditSlot={handleOpenEditSlot}
          onDeleteSlot={(acc, srv) =>
            notification.confirm({
              title: "Xóa dịch vụ kho?",
              message: `Bạn có chắc muốn xóa dịch vụ "${srv.display_name || srv.category}" khỏi tài khoản ${acc.account}?`,
              onConfirm: async () => {
                try {
                  await deleteSlot(srv);
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
                  await deleteAccount(acc);
                } catch (err: any) {
                  notification.error(err.message || "Không thể xóa tài khoản");
                }
              },
            })
          }
          onOpenBrowser={openBrowserForSlot}
          loggedSlotsMap={loggedSlotsMap}
          onVerifySession={openBrowserForSlot}
          openingSlotId={openingSlotId}
        />
      )}

      {/* TAB 2 & MODALS (Lazy-loaded) */}
      <Suspense fallback={null}>
        {activeTab === "catalog" && (
          <WarehouseCatalogGrid
            catalogItems={catalog}
            onOpenCreateCatalog={handleOpenCreateCatalog}
            onEditCatalog={handleOpenEditCatalog}
            onDeleteCatalog={(cat) => setDeletingCatalogItem(cat)}
            onOpenBrowserWithUrl={openBrowserForUrl}
            onTogglePackage={toggleCatalogPackage}
          />
        )}

        {isAccountModalOpen && (
          <WarehouseCreateModal
            open={isAccountModalOpen}
            formData={accountForm}
            catalogItems={catalog}
            existingAccounts={accounts}
            onClose={() => setIsAccountModalOpen(false)}
            onFormChange={setAccountForm}
            onSubmit={async () => {
              try {
                await createAccount(accountForm);
                setIsAccountModalOpen(false);
                setAccountForm(INITIAL_ACCOUNT_FORM);
              } catch (err: any) {
                notification.error(err.message || "Tạo tài khoản kho thất bại");
              }
            }}
          />
        )}

        {isCatalogModalOpen && (
          <CatalogCreateModal
            open={isCatalogModalOpen}
            formData={catalogForm}
            systemProducts={systemProducts}
            onClose={() => setIsCatalogModalOpen(false)}
            onFormChange={setCatalogForm}
            onSubmit={async () => {
              try {
                await createCatalogItem(catalogForm);
                setIsCatalogModalOpen(false);
              } catch (err: any) {
                notification.error(err.message || "Tạo dịch vụ thất bại");
              }
            }}
          />
        )}

        {addingServiceAccount && (
          <WarehouseAddServiceModal
            open={!!addingServiceAccount}
            account={addingServiceAccount}
            catalogItems={catalog}
            isSubmitting={isAddingService}
            onClose={() => setAddingServiceAccount(null)}
            onSubmit={async (formData) => {
              setIsAddingService(true);
              try {
                await addServiceToAccount(addingServiceAccount, formData);
                setAddingServiceAccount(null);
              } catch (err: any) {
                console.error("Lỗi thêm dịch vụ kho:", err);
                notification.error(err.message || "Không thể thêm dịch vụ vào tài khoản");
              } finally {
                setIsAddingService(false);
              }
            }}
          />
        )}

        {deletingCatalogItem && (
          <CatalogDeleteModal
            item={deletingCatalogItem}
            onClose={() => setDeletingCatalogItem(null)}
            onConfirmDelete={async () => {
              setIsDeletingCatalog(true);
              try {
                await deleteCatalogItem(deletingCatalogItem);
                setDeletingCatalogItem(null);
              } catch (err: any) {
                console.error("Lỗi xóa dịch vụ kho:", err);
                notification.error(err.message || "Xóa dịch vụ kho thất bại", "Lỗi Xóa Dịch Vụ");
              } finally {
                setIsDeletingCatalog(false);
              }
            }}
            submitting={isDeletingCatalog}
          />
        )}

        {editingSlotData && (
          <WarehouseEditSlotModal
            open={!!editingSlotData}
            account={editingSlotData.account}
            slot={editingSlotData.slot}
            catalogItems={catalog}
            isSubmitting={isUpdatingSlot}
            onClose={() => setEditingSlotData(null)}
            onSubmit={async (formData) => {
              setIsUpdatingSlot(true);
              try {
                await updateSlot(editingSlotData.slot.id, formData);
                setEditingSlotData(null);
              } catch (err: any) {
                console.error("Lỗi cập nhật slot:", err);
                notification.error(err.message || "Lỗi cập nhật slot");
              } finally {
                setIsUpdatingSlot(false);
              }
            }}
          />
        )}

        {editingAccount && (
          <WarehouseEditAccountModal
            open={!!editingAccount}
            account={editingAccount}
            onClose={() => setEditingAccount(null)}
            onSubmit={async (accountId, newAccountName) => {
              try {
                await updateAccount(accountId, newAccountName);
                setEditingAccount(null);
              } catch (err: any) {
                console.error("Lỗi cập nhật tài khoản kho:", err);
                notification.error(err.message || "Cập nhật tài khoản kho thất bại");
                throw err;
              }
            }}
          />
        )}

        {editingCatalogItem && (
          <CatalogEditModal
            open={!!editingCatalogItem}
            item={editingCatalogItem}
            systemProducts={systemProducts}
            isSubmitting={isUpdatingCatalog}
            onClose={() => setEditingCatalogItem(null)}
            onSubmit={async (data) => {
              setIsUpdatingCatalog(true);
              try {
                await updateCatalogItem(data);
                setEditingCatalogItem(null);
              } catch (err: any) {
                console.error("Lỗi cập nhật catalog item:", err);
                notification.error(err.message || "Cập nhật dịch vụ thất bại");
              } finally {
                setIsUpdatingCatalog(false);
              }
            }}
            onTagChanged={invalidateAndReload}
          />
        )}
      </Suspense>
    </div></WarehouseProviderCatalog>
  );
};

export default WarehousePage;
