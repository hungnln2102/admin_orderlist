import { useMemo, useState } from "react";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import { RenewAdobeAccountsTable } from "@/features/renew-adobe/components/RenewAdobeAccountsTable";
import { AddUserByEmail } from "@/features/renew-adobe/components/AddUserByEmail";
import { AddAdminAccountModal } from "@/features/renew-adobe/components/AddAdminAccountModal";
import { RenewAdobeHeader } from "@/features/renew-adobe/components/RenewAdobeHeader";
import { RenewAdobeProgressPanel } from "@/features/renew-adobe/components/RenewAdobeProgressPanel";
import { UserOrdersTable } from "@/features/renew-adobe/components/UserOrdersTable";
import { useRenewAdobeAdmin } from "@/features/renew-adobe/hooks/useRenewAdobeAdmin";
import { RenewAdobeSystemManagement } from "@/features/renew-adobe/components/RenewAdobeSystemManagement";
import {
  ServerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const PAGE_SIZE = 10;

export default function RenewAdobeAdmin() {
  const [activeTab, setActiveTab] = useState<"admins" | "orders" | "system">("orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const {
    accounts,
    loading,
    error,
    checkingId,
    checkError,
    deletingAdminAccountId,
    adminAccountPendingDelete,
    closeDeleteAdminModal,
    confirmDeleteAdminAccount,
    deletingId,
    fixingId,
    fixAllProgress,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    cronTestLoading,
    cronTestBanner,
    loadAccounts,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleTestCronJob,
    handleDeleteUser,
    handleFixUser,
    handleFixAllUsers,
    handleSaveUrlAccess,
    handleCheck,
    openDeleteAdminModal,
  } = useRenewAdobeAdmin();

  const stats = useMemo(() => {
    const totalAdmins = accounts.length;
    const activeAdmins = accounts.filter(
      (a) => a.license_status === "paid" || a.license_status === "active"
    ).length;
    const expiredAdmins = accounts.filter(
      (a) => a.license_status === "expired" || a.license_status === "unknown"
    ).length;
    const usedSlots = accounts.reduce((sum, a) => sum + (a.tracking_user_count ?? 0), 0);
    const totalSlots = accounts.reduce((sum, a) => sum + (a.user_count ?? 0), 0);
    const slotRatio = totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;

    return {
      totalAdmins,
      activeAdmins,
      expiredAdmins,
      usedSlots,
      totalSlots,
      slotRatio,
    };
  }, [accounts]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const q = searchTerm.trim().toLowerCase();
    return accounts.filter(
      (item) =>
        item.email.toLowerCase().includes(q) ||
        (item.alias ?? "").toLowerCase().includes(q) ||
        (item.org_name ?? "").toLowerCase().includes(q) ||
        (item.id_product ?? "").toLowerCase().includes(q)
    );
  }, [accounts, searchTerm]);

  const totalItems = filtered.length;
  const currentRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Header chung */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Quản lý Adobe
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Hệ thống tích hợp quản lý tài khoản admin, kiểm tra bản quyền và theo dõi đơn hàng thành viên.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
            activeTab === "orders"
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.05)] scale-[1.01]"
              : "bg-slate-900/40 border-white/5 text-white/40 hover:bg-slate-900/60 hover:text-white/60"
          }`}
        >
          <UserGroupIcon className={`h-5 w-5 mb-1.5 ${activeTab === "orders" ? "text-indigo-300" : "text-white/30"}`} />
          <span className="font-semibold text-xs sm:text-sm">Đơn hàng & Fix lỗi</span>
          <span className="text-[11px] text-white/30 mt-0.5 hidden sm:inline text-center line-clamp-1">
            Quản lý đơn hàng, theo dõi hạn dùng thành viên và sửa lỗi tự động
          </span>
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
            activeTab === "system"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.05)] scale-[1.01]"
              : "bg-slate-900/40 border-white/5 text-white/40 hover:bg-slate-900/60 hover:text-white/60"
          }`}
        >
          <Cog6ToothIcon className={`h-5 w-5 mb-1.5 ${activeTab === "system" ? "text-cyan-300" : "text-white/30"}`} />
          <span className="font-semibold text-xs sm:text-sm">Quản lý hệ thống</span>
          <span className="text-[11px] text-white/30 mt-0.5 hidden sm:inline text-center line-clamp-1">
            Chạy API Fix/Renew Adobe và tổng hợp cách lấy OTP hệ thống
          </span>
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
            activeTab === "admins"
              ? "bg-violet-500/10 border-violet-500/30 text-violet-200 shadow-[0_0_20px_rgba(99,102,241,0.05)] scale-[1.01]"
              : "bg-slate-900/40 border-white/5 text-white/40 hover:bg-slate-900/60 hover:text-white/60"
          }`}
        >
          <ServerIcon className={`h-5 w-5 mb-1.5 ${activeTab === "admins" ? "text-violet-300" : "text-white/30"}`} />
          <span className="font-semibold text-xs sm:text-sm">Tài khoản Admin</span>
          <span className="text-[11px] text-white/30 mt-0.5 hidden sm:inline text-center line-clamp-1">
            Quản lý tài khoản Adobe Admin, kiểm tra slot và gia hạn gói
          </span>
        </button>
      </div>

      <AddAdminAccountModal
        open={addAdminOpen}
        onClose={() => setAddAdminOpen(false)}
        onCreated={loadAccounts}
      />

      {activeTab === "admins" ? (
        <div className="space-y-6">
          <RenewAdobeHeader
            isCheckingAll={isCheckingAll}
            loading={loading}
            accountCount={accounts.length}
            checkingId={checkingId}
            cronTestLoading={cronTestLoading}
            onCheckAll={handleCheckAll}
            onCancelCheckAll={handleCancelCheckAll}
            onTestCronJob={handleTestCronJob}
            onAddAdmin={() => setAddAdminOpen(true)}
          />

          {/* Stats Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Admins */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 via-slate-800/40 to-slate-950/50 border border-white/5 p-5 shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 tracking-wider uppercase">Tổng Admin</span>
                <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-300 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <ServerIcon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-white tracking-tight">{stats.totalAdmins}</h3>
                <p className="mt-1 text-xs text-white/40">Tài khoản admin hệ thống</p>
              </div>
            </div>

            {/* Card 2: Active Admins */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 via-slate-800/40 to-slate-950/50 border border-white/5 p-5 shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 tracking-wider uppercase">Đang Hoạt Động</span>
                <div className="relative rounded-xl bg-emerald-500/10 p-2 text-emerald-300 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-white tracking-tight">{stats.activeAdmins}</h3>
                <p className="mt-1 text-xs text-white/40">Tài khoản hoạt động tốt</p>
              </div>
            </div>

            {/* Card 3: Expired/Warning Admins */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 via-slate-800/40 to-slate-950/50 border border-white/5 p-5 shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-rose-500/5 blur-xl group-hover:bg-rose-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 tracking-wider uppercase">Gặp Lỗi / Hết Hạn</span>
                <div className={`relative rounded-xl ${stats.expiredAdmins > 0 ? "bg-rose-500/10 text-rose-300 border-rose-500/20" : "bg-slate-500/10 text-white/40 border-white/5"} p-2 group-hover:scale-110 transition-transform`}>
                  {stats.expiredAdmins > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-3xl font-extrabold tracking-tight ${stats.expiredAdmins > 0 ? "text-rose-400" : "text-white"}`}>{stats.expiredAdmins}</h3>
                <p className="mt-1 text-xs text-white/40">Cần gia hạn hoặc kiểm tra lỗi</p>
              </div>
            </div>

            {/* Card 4: Slot Usage */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 via-slate-800/40 to-slate-950/50 border border-white/5 p-5 shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-violet-500/5 blur-xl group-hover:bg-violet-500/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 tracking-wider uppercase">Tỷ Lệ Slot Thành Viên</span>
                <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300 border border-violet-500/20 group-hover:scale-110 transition-transform">
                  <UserGroupIcon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">{stats.usedSlots}/{stats.totalSlots}</h3>
                  <span className="text-xs font-semibold text-violet-300">{Math.round(stats.slotRatio)}%</span>
                </div>
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-slate-950/45 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.slotRatio, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {cronTestBanner && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/95">
              {cronTestBanner}
            </p>
          )}

          {checkAllProgress && checkAllProgress.total > 0 && (
            <RenewAdobeProgressPanel
              total={checkAllProgress.total}
              completed={checkAllProgress.completed}
              failed={checkAllProgress.failed}
              isCheckingAll={isCheckingAll}
              autoAssignPhase={autoAssignPhase}
              autoAssignResult={autoAssignResult}
              onClose={dismissCheckAllProgress}
            />
          )}

          <RenewAdobeAccountsTable
            accounts={accounts}
            currentRows={currentRows}
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            searchTerm={searchTerm}
            loading={loading}
            error={error}
            checkError={checkError}
            checkingId={checkingId}
            deletingAdminAccountId={deletingAdminAccountId}
            isCheckingAll={isCheckingAll}
            checkingIds={checkAllProgress?.checkingIds}
            onSearchTermChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            onPageChange={setCurrentPage}
            onCheck={handleCheck}
            onDeleteAdmin={openDeleteAdminModal}
            onSaveUrlAccess={handleSaveUrlAccess}
            onRefresh={loadAccounts}
          />
        </div>
      ) : activeTab === "system" ? (
        <RenewAdobeSystemManagement />
      ) : (
        <div className="space-y-6">
          <UserOrdersTable
            accountsRefreshDep={accounts
              .map(
                (a) =>
                  `${a.id}:${a.tracking_user_count ?? 0}:${a.user_count}:${a.license_status}`
              )
              .join("|")}
            onDeleteUser={handleDeleteUser}
            deletingId={deletingId}
            onFixUser={handleFixUser}
            fixingId={fixingId}
            onFixAllUsers={handleFixAllUsers}
            fixAllProgress={fixAllProgress}
          />
          <AddUserByEmail onAdded={loadAccounts} />
        </div>
      )}

      <ConfirmModal
        isOpen={adminAccountPendingDelete !== null}
        onClose={closeDeleteAdminModal}
        onConfirm={confirmDeleteAdminAccount}
        title="Xóa tài khoản admin?"
        message={
          adminAccountPendingDelete
            ? `Xóa tài khoản ${adminAccountPendingDelete.email} khỏi danh sách?`
            : ""
        }
        secondaryMessage="Gán user ↔ đơn hàng với account này sẽ được gỡ. (Không tự xóa user trên Adobe.)"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isSubmitting={deletingAdminAccountId !== null}
      />
    </div>
  );
}

