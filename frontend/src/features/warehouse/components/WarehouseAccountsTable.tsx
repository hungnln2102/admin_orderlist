import React, { useState, useEffect, useMemo } from "react";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  PlusCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  LogIn,
  UserCheck,
  Loader2,
} from "lucide-react";
import { WarehouseAccountItem, WarehouseServiceSlot } from "../types";
import {
  format2FAChunks,
  formatWarehouseAccountForCopy,
  getServiceBrandStyle,
  getExpiryStatus,
} from "./warehouseRowUtils";

interface WarehouseAccountsTableProps {
  accounts: WarehouseAccountItem[];
  expandedAccountIds: number[];
  showPasswordMap: Record<number, boolean>;
  copiedKeyMap: Record<string, boolean>;
  onToggleExpand: (id: number) => void;
  onToggleShowPassword: (serviceId: number) => void;
  onCopy: (text: string, label: string, keyId: string) => void;
  onAddService?: (acc: WarehouseAccountItem) => void;
  onEditAccount: (acc: WarehouseAccountItem) => void;
  onEditSlot?: (account: WarehouseAccountItem, slot: WarehouseServiceSlot) => void;
  onDeleteSlot?: (account: WarehouseAccountItem, slot: WarehouseServiceSlot) => void;
  onDeleteAccount: (acc: WarehouseAccountItem) => void;
  onOpenBrowser?: (account: WarehouseAccountItem, service: WarehouseServiceSlot) => void;
  loggedSlotsMap?: Record<number, boolean>;
  onVerifySession?: (account: WarehouseAccountItem, service: WarehouseServiceSlot) => void;
  openingSlotId?: number | null;
}

interface CopyableFieldProps {
  value?: string | null;
  copyValue?: string | null;
  isMono?: boolean;
  isCopied?: boolean;
  onCopy?: () => void;
  placeholder?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onToggleShowPassword?: () => void;
}

const CopyableField: React.FC<CopyableFieldProps> = ({
  value,
  copyValue,
  isMono = false,
  isCopied = false,
  onCopy,
  placeholder = "—",
  isPassword = false,
  showPassword = false,
  onToggleShowPassword,
}) => {
  const displayVal = (value || "").trim();
  const textToCopy = copyValue || displayVal;

  if (!displayVal || displayVal === "—") {
    return <span className="text-slate-500 select-none">{placeholder}</span>;
  }

  const maskedVal = isPassword && !showPassword ? "••••••••" : displayVal;

  return (
    <div className="group/copy inline-flex items-center gap-1.5 max-w-full">
      <span
        className={`truncate ${
          isMono
            ? "font-mono text-[13px] text-indigo-100/90 tracking-wide"
            : "text-slate-200 text-xs"
        }`}
        title={displayVal}
      >
        {maskedVal}
      </span>

      {/* Toggle Password Visibility */}
      {isPassword && onToggleShowPassword && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleShowPassword();
          }}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {showPassword ? (
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      )}

      {/* Copy Button */}
      {onCopy && textToCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isCopied ? "Đã sao chép" : "Sao chép"}
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
};

export const WarehouseAccountsTable: React.FC<WarehouseAccountsTableProps> = ({
  accounts,
  expandedAccountIds,
  showPasswordMap,
  copiedKeyMap,
  onToggleExpand,
  onToggleShowPassword,
  onCopy,
  onAddService,
  onEditAccount,
  onEditSlot,
  onDeleteSlot,
  onDeleteAccount,
  onOpenBrowser,
  loggedSlotsMap,
  onVerifySession,
  openingSlotId,
}) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorted accounts by primary service name, then secondary by account email
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const getPrimaryService = (item: WarehouseAccountItem) => {
        if (!item.services || item.services.length === 0) return "";
        return item.services
          .map((s) => s.display_name || s.category)
          .filter(Boolean)
          .join(", ")
          .trim()
          .toLowerCase();
      };

      const srvA = getPrimaryService(a);
      const srvB = getPrimaryService(b);

      const cmp = srvA.localeCompare(srvB);
      if (cmp !== 0) {
        return sortOrder === "asc" ? cmp : -cmp;
      }

      // Secondary sort: by account email A-Z
      const emailA = (a.account || "").toLowerCase();
      const emailB = (b.account || "").toLowerCase();
      return emailA.localeCompare(emailB);
    });
  }, [accounts, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / pageSize));

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [sortedAccounts.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedAccounts.length);
  const displayedAccounts = sortedAccounts.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }
    return pages;
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-12 text-center text-slate-400 shadow-xl backdrop-blur-xl">
        Không có tài khoản kho nào phù hợp với bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* 1. Desktop & Tablet View */}
      <div className="hidden sm:block overflow-x-auto w-full">
        <table className="w-full table-fixed border-separate border-spacing-y-3.5 text-white">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[42%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="[&>th]:px-4 [&>th]:pb-2 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-indigo-300/80">
              <th className="text-center">
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group/th select-none"
                  title={`Sắp xếp theo tên sản phẩm: ${
                    sortOrder === "asc" ? "A → Z (bấm để đảo Z → A)" : "Z → A (bấm để đảo A → Z)"
                  }`}
                >
                  <span>Sản phẩm & Dịch vụ</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 group-hover/th:text-white transition-colors" />
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    {sortOrder === "asc" ? "A-Z" : "Z-A"}
                  </span>
                </button>
              </th>
              <th className="text-center">Tài khoản Email</th>
              <th className="text-right pr-6">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {displayedAccounts.map((account) => {
              const isExpanded = expandedAccountIds
                .map(Number)
                .includes(Number(account.id));
              const services = account.services || [];
              const availableCount = services.filter(
                (s) => s.status === "AVAILABLE"
              ).length;
              const categorySummary =
                services
                  .map((s) => s.display_name || s.category)
                  .filter(Boolean)
                  .join(", ") || "—";

              return (
                <React.Fragment key={account.id}>
                  {/* MASTER ROW */}
                  <tr
                    onClick={() => onToggleExpand(Number(account.id))}
                    className={`group/row cursor-pointer transition-all duration-200 select-none ${
                      isExpanded
                        ? "shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30"
                        : "hover:shadow-md hover:border-slate-700/60"
                    }`}
                  >
                    {/* COL 1: PRODUCT SERVICES PILLS */}
                    <td
                      className={`px-4 py-3.5 border-y border-l first:rounded-l-2xl transition-colors ${
                        isExpanded
                          ? "bg-gradient-to-r from-indigo-950/60 to-slate-900/90 border-indigo-500/30"
                          : "bg-slate-900/80 border-white/5 group-hover/row:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {services.length > 0 ? (
                          services.map((srv, idx) => {
                            const isAvailable = srv.status === "AVAILABLE";
                            const brand = getServiceBrandStyle(
                              srv.display_name || srv.category,
                              isAvailable
                            );
                            return (
                              <span
                                key={srv.id || idx}
                                className={`inline-flex items-center gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${brand.badgeClass}`}
                                title={`${srv.display_name || srv.category} - ${
                                  isAvailable ? "Tồn kho" : "Đang sử dụng"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${brand.dotClass}`}
                                />
                                <span>{srv.display_name || srv.category}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </div>
                    </td>

                    {/* COL 2: ACCOUNT EMAIL WITH 1-CLICK COPY */}
                    <td
                      className={`px-4 py-3.5 border-y transition-colors text-center ${
                        isExpanded
                          ? "bg-slate-900/90 border-indigo-500/30"
                          : "bg-slate-900/80 border-white/5 group-hover/row:bg-slate-800/60"
                      }`}
                    >
                      <div className="inline-flex items-center gap-2 max-w-full">
                        <span className="font-mono text-xs sm:text-[13px] tracking-wide text-slate-200 group-hover/row:text-white transition-colors truncate">
                          {account.account}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopy(
                              account.account,
                              "Email tài khoản",
                              `acc_${account.id}`
                            );
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Sao chép email"
                        >
                          {copiedKeyMap[`acc_${account.id}`] ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* COL 3: ACTIONS & EXPAND */}
                    <td
                      className={`px-4 py-3.5 border-y border-r last:rounded-r-2xl pr-5 text-right transition-colors ${
                        isExpanded
                          ? "bg-slate-900/90 border-indigo-500/30"
                          : "bg-slate-900/80 border-white/5 group-hover/row:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        {/* NÚT SỬA TÀI KHOẢN GỐC */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAccount(account);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/25 hover:border-amber-500/40 hover:text-amber-300 transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-950/30"
                          title="Chỉnh sửa tài khoản gốc"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* NÚT XÓA TÀI KHOẢN GỐC */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAccount(account);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/40 hover:text-rose-300 transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-950/30"
                          title="Xóa tài khoản gốc khỏi kho"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        {/* CHEVRON TOGGLE */}
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-indigo-400 bg-indigo-500/10 border-indigo-500/20" : "group-hover/row:text-white group-hover/row:bg-white/10"
                          }`}
                          title={isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED SECTION */}
                  {isExpanded && (
                    <tr className="animate-in fade-in duration-200">
                      <td colSpan={3} className="px-1 pb-4 pt-1">
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-[24px] border border-indigo-500/20 bg-slate-950/85 p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
                        >
                          {/* DETAIL HEADER */}
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white tracking-tight">
                                  Chi tiết tài khoản kho
                                </h4>
                              </div>
                              <p
                                className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-1"
                                title={`${categorySummary} · ${account.account}`}
                              >
                                {categorySummary} · <span className="font-mono text-indigo-300">{account.account}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* NÚT THÊM DỊCH VỤ VÀO TÀI KHOẢN */}
                              {onAddService && (
                                <button
                                  type="button"
                                  onClick={() => onAddService(account)}
                                  className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm shadow-indigo-500/10"
                                  title="Thêm một slot dịch vụ mới vào tài khoản này"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                  <span>Thêm dịch vụ</span>
                                </button>
                              )}

                              {/* NÚT SỬA TÀI KHOẢN GỐC */}
                              <button
                                type="button"
                                onClick={() => onEditAccount(account)}
                                className="rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                                title="Chỉnh sửa tài khoản gốc"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Sửa tài khoản</span>
                              </button>

                              {/* NÚT XÓA TÀI KHOẢN GỐC */}
                              <button
                                type="button"
                                onClick={() => onDeleteAccount(account)}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                                title="Xóa tài khoản gốc khỏi kho"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Xóa tài khoản</span>
                              </button>

                              {/* SAO CHÉP TẤT CẢ BUTTON */}
                              <button
                                type="button"
                                onClick={() =>
                                  onCopy(
                                    formatWarehouseAccountForCopy(account),
                                    "Toàn bộ thông tin tài khoản",
                                    `all_${account.id}`
                                  )
                                }
                                className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                {copiedKeyMap[`all_${account.id}`] ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-white" />
                                    <span>✓ Đã sao chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-white" />
                                    <span>Sao chép tất cả</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* SUB-TABLE (7 COLUMNS) */}
                          <div className="overflow-x-auto w-full rounded-2xl border border-white/10 bg-slate-950/60 shadow-inner">
                            <table className="w-full text-left text-xs text-slate-300 border-collapse">
                              <thead>
                                <tr className="bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-indigo-300/80 border-b border-white/10">
                                  <th className="px-4 py-3 font-semibold">Dịch vụ</th>
                                  <th className="px-4 py-3 font-semibold">Mật khẩu</th>
                                  <th className="px-4 py-3 font-semibold">Mail Backup</th>
                                  <th className="px-4 py-3 font-semibold">2FA Secret</th>
                                  <th className="px-4 py-3 font-semibold">Hạn sử dụng</th>
                                  <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                                  <th className="px-4 py-3 font-semibold">Ghi chú</th>
                                  <th className="px-4 py-3 font-semibold text-center">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 font-medium">
                                {services.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                                        <p className="text-sm font-semibold text-slate-200">
                                          Tài khoản này chưa có slot dịch vụ nào
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          Master có thể chỉnh sửa tên/email tài khoản gốc hoặc xóa tài khoản này khỏi kho hàng.
                                        </p>
                                        <div className="flex items-center gap-2.5 mt-2">
                                          {onAddService && (
                                            <button
                                              type="button"
                                              onClick={() => onAddService(account)}
                                              className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-500/10"
                                            >
                                              <PlusCircle className="h-3.5 w-3.5" />
                                              <span>Thêm dịch vụ</span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => onEditAccount(account)}
                                            className="px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                            <span>Sửa tài khoản</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onDeleteAccount(account)}
                                            className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Xóa tài khoản</span>
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  services.map((srv, idx) => {
                                  const isAvailable = srv.status === "AVAILABLE";
                                  const brand = getServiceBrandStyle(
                                    srv.display_name || srv.category,
                                    isAvailable
                                  );
                                  const expiry = getExpiryStatus(srv.expires_at);
                                  const isPassVisible = !!showPasswordMap[srv.id];

                                  return (
                                    <tr
                                      key={srv.id || idx}
                                      className="hover:bg-white/[0.03] transition-colors"
                                    >
                                      {/* 1. DỊCH VỤ */}
                                      <td className="px-4 py-3.5 font-bold text-white text-xs">
                                        <div className="inline-flex items-center gap-1.5">
                                          <span
                                            className={`w-2 h-2 rounded-full ${brand.dotClass}`}
                                          />
                                          <span className="tracking-wide">
                                            {srv.display_name || srv.category}
                                          </span>
                                        </div>
                                      </td>

                                      {/* 2. MẬT KHẨU */}
                                      <td className="px-4 py-3.5">
                                        <CopyableField
                                          value={srv.password}
                                          isMono
                                          isPassword
                                          showPassword={isPassVisible}
                                          onToggleShowPassword={() =>
                                            onToggleShowPassword(srv.id)
                                          }
                                          isCopied={copiedKeyMap[`pass_${srv.id}`]}
                                          onCopy={() =>
                                            onCopy(
                                              srv.password!,
                                              "Mật khẩu",
                                              `pass_${srv.id}`
                                            )
                                          }
                                        />
                                      </td>

                                      {/* 3. MAIL BACKUP */}
                                      <td className="px-4 py-3.5">
                                        <CopyableField
                                          value={srv.backup_email}
                                          isCopied={copiedKeyMap[`mail_${srv.id}`]}
                                          onCopy={() =>
                                            onCopy(
                                              srv.backup_email!,
                                              "Mail Backup",
                                              `mail_${srv.id}`
                                            )
                                          }
                                        />
                                      </td>

                                      {/* 4. 2FA */}
                                      <td className="px-4 py-3.5">
                                        {srv.two_fa ? (
                                          <div className="group/copy inline-flex items-center gap-1.5 max-w-full">
                                            <span className="font-mono text-xs text-indigo-200 tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-white/10 select-all">
                                              {format2FAChunks(srv.two_fa)}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onCopy(
                                                  srv.two_fa!,
                                                  "Mã 2FA",
                                                  `2fa_${srv.id}`
                                                );
                                              }}
                                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                              title={
                                                copiedKeyMap[`2fa_${srv.id}`]
                                                  ? "Đã sao chép"
                                                  : "Sao chép 2FA"
                                              }
                                            >
                                              {copiedKeyMap[`2fa_${srv.id}`] ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-slate-500">—</span>
                                        )}
                                      </td>

                                      {/* 5. HẠN SỬ DỤNG VỚI SMART BADGE */}
                                      <td className="px-4 py-3.5">
                                        {expiry.status === "none" ? (
                                          <span className="text-slate-500 text-xs">—</span>
                                        ) : (
                                          <div className="inline-flex items-center gap-1.5">
                                            {expiry.status === "expired" && (
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${expiry.badgeClass}`}
                                                title={`Hết hạn vào ${expiry.formattedDate}`}
                                              >
                                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                                <span>{expiry.badgeText}</span>
                                              </span>
                                            )}
                                            {expiry.status === "warning" && (
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${expiry.badgeClass}`}
                                                title={`Hạn dùng: ${expiry.formattedDate}`}
                                              >
                                                <Clock className="w-3 h-3 text-amber-300" />
                                                <span>{expiry.badgeText}</span>
                                              </span>
                                            )}
                                            {expiry.status === "valid" && (
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${expiry.badgeClass}`}
                                                title={`Hạn dùng: ${expiry.formattedDate}`}
                                              >
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                <span>{expiry.formattedDate}</span>
                                                <span className="text-[10px] text-emerald-400 font-medium">
                                                  ({expiry.badgeText})
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      {/* 6. TRẠNG THÁI */}
                                      <td className="px-4 py-3.5 text-center">
                                        <span
                                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                            isAvailable
                                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.12)]"
                                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                          }`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                              isAvailable
                                                ? "bg-emerald-400 animate-pulse"
                                                : "bg-rose-400"
                                            }`}
                                          />
                                          <span>{isAvailable ? "TỒN KHO" : "ĐANG SỬ DỤNG"}</span>
                                        </span>
                                      </td>

                                      {/* 7. GHI CHÚ */}
                                      <td
                                        className="px-4 py-3.5 text-xs text-slate-400 max-w-[180px] truncate"
                                        title={srv.note || ""}
                                      >
                                        {srv.note || "—"}
                                      </td>

                                      {/* 8. THAO TÁC */}
                                      <td className="px-4 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          {onOpenBrowser && (() => {
                                            const isLoggedIn = loggedSlotsMap ? loggedSlotsMap[srv.id] : false;
                                            const isOpening = openingSlotId === srv.id;
                                            return (
                                              <button
                                                type="button"
                                                disabled={isOpening}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (isOpening) return;
                                                  if (onVerifySession) {
                                                    onVerifySession(account, srv);
                                                  } else {
                                                    onOpenBrowser(account, srv);
                                                  }
                                                }}
                                                className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-all ${
                                                  isOpening
                                                    ? "border-blue-500/30 bg-blue-600/10 text-blue-300 opacity-60 cursor-not-allowed"
                                                    : isLoggedIn
                                                    ? "border-emerald-500/30 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500/50 cursor-pointer"
                                                    : "border-blue-500/30 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 cursor-pointer"
                                                } group/btn`}
                                                title={
                                                  isOpening
                                                    ? "Đang mở trình duyệt và kiểm tra phiên..."
                                                    : isLoggedIn
                                                    ? "Phiên đăng nhập đã được xác minh (bấm để kiểm tra lại)"
                                                    : `Mở profile và kiểm tra phiên đăng nhập ${srv.display_name || srv.category}`
                                                }
                                              >
                                                {isOpening ? (
                                                  <Loader2 className="w-3.5 h-3.5 text-blue-300 animate-spin" />
                                                ) : isLoggedIn ? (
                                                  <UserCheck className="w-3.5 h-3.5 text-emerald-300 group-hover/btn:scale-110 transition-transform" />
                                                ) : (
                                                  <LogIn className="w-3.5 h-3.5 text-blue-300 group-hover/btn:scale-110 transition-transform" />
                                                )}
                                              </button>
                                            );
                                          })()}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (onEditSlot) {
                                                onEditSlot(account, srv);
                                              } else {
                                                onEditAccount(account);
                                              }
                                            }}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-90 transition-all cursor-pointer"
                                            title="Chỉnh sửa thông tin tài khoản"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (onDeleteSlot) {
                                                onDeleteSlot(account, srv);
                                              } else {
                                                onDeleteAccount(account);
                                              }
                                            }}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-90 transition-all cursor-pointer"
                                            title="Xóa dịch vụ này khỏi tài khoản"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Responsive Card View (< 640px) */}
      <div className="block sm:hidden space-y-3">
        {/* Mobile Quick Sort Toggle */}
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-[11px] text-slate-400">Thứ tự dịch vụ:</span>
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-semibold text-indigo-300 hover:text-white"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{sortOrder === "asc" ? "Tên A → Z" : "Tên Z → A"}</span>
          </button>
        </div>

        {displayedAccounts.map((account) => {
          const isExpanded = expandedAccountIds
            .map(Number)
            .includes(Number(account.id));
          const services = account.services || [];
          const availableCount = services.filter(
            (s) => s.status === "AVAILABLE"
          ).length;

          return (
            <div
              key={account.id}
              className={`rounded-2xl border transition-all p-4 space-y-3 shadow-lg ${
                isExpanded
                  ? "border-indigo-500/40 bg-slate-900/90 ring-1 ring-indigo-500/20"
                  : "border-white/10 bg-slate-900/80"
              }`}
            >
              {/* Mobile Header Row */}
              <div
                onClick={() => onToggleExpand(Number(account.id))}
                className="cursor-pointer space-y-2 border-b border-white/5 pb-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {services.map((srv, idx) => {
                      const isAvailable = srv.status === "AVAILABLE";
                      const brand = getServiceBrandStyle(
                        srv.display_name || srv.category,
                        isAvailable
                      );
                      return (
                        <span
                          key={srv.id || idx}
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${brand.badgeClass}`}
                        >
                          {srv.display_name || srv.category}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-indigo-400 bg-indigo-500/10 border-indigo-500/20" : ""
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between font-mono text-xs text-slate-300">
                  <span className="truncate max-w-[220px]">{account.account}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(
                        account.account,
                        "Email",
                        `mob_acc_${account.id}`
                      );
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {copiedKeyMap[`mob_acc_${account.id}`] ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Expanded Details */}
              {isExpanded && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        Chi tiết
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onAddService && (
                        <button
                          type="button"
                          onClick={() => onAddService(account)}
                          className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-300"
                        >
                          + Dịch vụ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onCopy(
                            formatWarehouseAccountForCopy(account),
                            "Toàn bộ thông tin",
                            `mob_all_${account.id}`
                          )
                        }
                        className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                      >
                        {copiedKeyMap[`mob_all_${account.id}`]
                          ? "✓ Đã copy"
                          : "Sao chép tất cả"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {services.map((srv, idx) => {
                      const isAvailable = srv.status === "AVAILABLE";
                      const brand = getServiceBrandStyle(
                        srv.display_name || srv.category,
                        isAvailable
                      );
                      const expiry = getExpiryStatus(srv.expires_at);

                      return (
                        <div
                          key={srv.id || idx}
                          className="rounded-xl border border-white/5 bg-slate-950/70 p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${brand.dotClass}`}
                              />
                              <span className="truncate">{srv.display_name || srv.category}</span>
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                  isAvailable
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {isAvailable ? "TỒN KHO" : "ĐANG SỬ DỤNG"}
                              </span>
                              {onOpenBrowser && (() => {
                                const isLoggedIn = loggedSlotsMap ? loggedSlotsMap[srv.id] : false;
                                const isOpening = openingSlotId === srv.id;
                                return (
                                  <button
                                    type="button"
                                    disabled={isOpening}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isOpening) return;
                                      if (onVerifySession) {
                                        onVerifySession(account, srv);
                                      } else {
                                        onOpenBrowser(account, srv);
                                      }
                                    }}
                                    className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                                      isOpening
                                        ? "border-blue-500/30 bg-blue-600/10 text-blue-300 opacity-60 cursor-not-allowed"
                                        : isLoggedIn
                                        ? "border-emerald-500/30 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 cursor-pointer"
                                        : "border-blue-500/30 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 cursor-pointer"
                                    }`}
                                    title={
                                      isOpening
                                        ? "Đang mở trình duyệt..."
                                        : isLoggedIn
                                        ? "Phiên đăng nhập đã được xác minh (bấm để kiểm tra lại)"
                                        : `Mở profile và kiểm tra phiên đăng nhập ${srv.display_name || srv.category}`
                                    }
                                  >
                                    {isOpening ? (
                                      <Loader2 className="w-3 h-3 text-blue-300 animate-spin" />
                                    ) : isLoggedIn ? (
                                      <UserCheck className="w-3 h-3 text-emerald-300" />
                                    ) : (
                                      <LogIn className="w-3 h-3 text-blue-300" />
                                    )}
                                  </button>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEditSlot) {
                                    onEditSlot(account, srv);
                                  } else {
                                    onEditAccount(account);
                                  }
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-90 transition-all cursor-pointer"
                                title="Chỉnh sửa tài khoản"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDeleteSlot) {
                                    onDeleteSlot(account, srv);
                                  } else {
                                    onDeleteAccount(account);
                                  }
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-90 transition-all cursor-pointer"
                                title="Xóa dịch vụ này khỏi tài khoản"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {srv.password && (
                            <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                              <span>Pass: {srv.password}</span>
                              <button
                                onClick={() =>
                                  onCopy(
                                    srv.password!,
                                    "Mật khẩu",
                                    `mob_pass_${srv.id}`
                                  )
                                }
                                className="text-slate-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {srv.backup_email && (
                            <div className="flex items-center justify-between text-slate-400 text-[11px]">
                              <span className="truncate max-w-[200px]">
                                Backup: {srv.backup_email}
                              </span>
                              <button
                                onClick={() =>
                                  onCopy(
                                    srv.backup_email!,
                                    "Mail Backup",
                                    `mob_mail_${srv.id}`
                                  )
                                }
                                className="text-slate-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {srv.two_fa && (
                            <div className="flex items-center justify-between text-indigo-200 font-mono text-[11px]">
                              <span className="truncate max-w-[200px]">
                                2FA: {format2FAChunks(srv.two_fa)}
                              </span>
                              <button
                                onClick={() =>
                                  onCopy(
                                    srv.two_fa!,
                                    "2FA",
                                    `mob_2fa_${srv.id}`
                                  )
                                }
                                className="text-slate-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {expiry.status !== "none" && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span>Hạn SD: {expiry.formattedDate}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${expiry.badgeClass}`}
                              >
                                {expiry.badgeText}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. PAGINATION CONTROLS */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-2 px-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          {/* Items info & Page size selector */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Hiển thị{" "}
              <strong className="text-white font-semibold">
                {accounts.length === 0 ? 0 : startIndex + 1} - {endIndex}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="text-indigo-300 font-semibold">{accounts.length}</strong>{" "}
              tài khoản
            </span>

            <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-3">
              <span className="text-[11px] text-slate-400">Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
          </div>

          {/* Page buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/5 bg-slate-900/90 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trước</span>
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === "...") {
                    return (
                      <span
                        key={`ellipsis_${idx}`}
                        className="px-2 text-slate-500 text-xs select-none"
                      >
                        ...
                      </span>
                    );
                  }
                  const num = pageNum as number;
                  const isActive = num === currentPage;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className={`min-w-[32px] h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 scale-105"
                          : "bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border-white/5"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/5 bg-slate-900/90 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Trang tiếp"
              >
                <span className="hidden sm:inline">Tiếp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
