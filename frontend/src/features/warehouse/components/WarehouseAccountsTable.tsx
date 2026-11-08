import { TablePagination } from "@/shared/components/TablePagination";
import React, { useState, useEffect, useMemo } from "react";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { WarehouseAccountItem, WarehouseServiceSlot } from "../types";
import { getServiceBrandStyle } from "./warehouseRowUtils";
import { WarehouseSlotSubTable } from "./WarehouseSlotSubTable";
import { WarehouseMobileAccountCard } from "./WarehouseMobileAccountCard";

export interface WarehouseAccountsTableProps {
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

  // Sorted accounts by primary service name, then variant tag, then secondary by account email
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const getServiceInfo = (item: WarehouseAccountItem) => {
        if (!item.services || item.services.length === 0) return { name: "", tag: "" };
        const srvNames = item.services
          .map((s) => s.display_name || s.category)
          .filter(Boolean)
          .join(", ")
          .trim()
          .toLowerCase();
        const srvTags = item.services
          .map((s) => s.variant_tag || (s.category !== s.display_name ? s.category : ""))
          .filter(Boolean)
          .join(", ")
          .trim()
          .toLowerCase();
        return { name: srvNames, tag: srvTags };
      };

      const srvA = getServiceInfo(a);
      const srvB = getServiceInfo(b);

      const cmpName = srvA.name.localeCompare(srvB.name);
      if (cmpName !== 0) {
        return sortOrder === "asc" ? cmpName : -cmpName;
      }

      const cmpTag = srvA.tag.localeCompare(srvB.tag, undefined, { numeric: true });
      if (cmpTag !== 0) {
        return sortOrder === "asc" ? cmpTag : -cmpTag;
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
                            const tag = srv.variant_tag || (srv.category !== srv.display_name ? srv.category : "");
                            return (
                              <span
                                key={srv.id || idx}
                                className={`inline-flex items-center gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${brand.badgeClass}`}
                                title={`${srv.display_name || srv.category}${tag ? ` [${tag}]` : ""} - ${
                                  isAvailable ? "Tồn kho" : "Đang sử dụng"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${brand.dotClass}`} />
                                <span>{srv.display_name || srv.category}</span>
                                {tag && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/15 text-white border border-white/15 tracking-normal">
                                    {tag}
                                  </span>
                                )}
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
                        <WarehouseSlotSubTable
                          account={account}
                          showPasswordMap={showPasswordMap}
                          copiedKeyMap={copiedKeyMap}
                          onToggleShowPassword={onToggleShowPassword}
                          onCopy={onCopy}
                          onAddService={onAddService}
                          onEditAccount={onEditAccount}
                          onEditSlot={onEditSlot}
                          onDeleteSlot={onDeleteSlot}
                          onDeleteAccount={onDeleteAccount}
                          onOpenBrowser={onOpenBrowser}
                          loggedSlotsMap={loggedSlotsMap}
                          onVerifySession={onVerifySession}
                          openingSlotId={openingSlotId}
                        />
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

          return (
            <WarehouseMobileAccountCard
              key={account.id}
              account={account}
              isExpanded={isExpanded}
              copiedKeyMap={copiedKeyMap}
              onToggleExpand={onToggleExpand}
              onCopy={onCopy}
              onAddService={onAddService}
              onEditAccount={onEditAccount}
              onEditSlot={onEditSlot}
              onDeleteSlot={onDeleteSlot}
              onDeleteAccount={onDeleteAccount}
              onOpenBrowser={onOpenBrowser}
              loggedSlotsMap={loggedSlotsMap}
              onVerifySession={onVerifySession}
              openingSlotId={openingSlotId}
            />
          );
        })}
      </div>

      {/* 3. PAGINATION CONTROLS */}
      {accounts.length > 0 && (
        <div className="pt-2">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize: number) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
};
