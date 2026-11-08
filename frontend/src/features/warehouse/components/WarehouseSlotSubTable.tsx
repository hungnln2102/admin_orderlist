import React from "react";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  PlusCircle,
  Clock,
  AlertTriangle,
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
import { CopyableField } from "./WarehouseCopyableField";

export interface WarehouseSlotSubTableProps {
  account: WarehouseAccountItem;
  showPasswordMap: Record<number, boolean>;
  copiedKeyMap: Record<string, boolean>;
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

export const WarehouseSlotSubTable: React.FC<WarehouseSlotSubTableProps> = ({
  account,
  showPasswordMap,
  copiedKeyMap,
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
  const services = account.services || [];
  const categorySummary =
    services
      .map((s) => s.display_name || s.category)
      .filter(Boolean)
      .join(", ") || "—";

  return (
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

      {/* SUB-TABLE (8 COLUMNS) */}
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
                        <span className={`w-2 h-2 rounded-full ${brand.dotClass}`} />
                        <span className="tracking-wide">
                          {srv.display_name || srv.category}
                        </span>
                        {(srv.variant_tag || (srv.category !== srv.display_name ? srv.category : "")) && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/10 text-indigo-200 border border-white/15 tracking-normal">
                            [{srv.variant_tag || srv.category}]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. MẬT KHẨU */}
                    <td className="px-4 py-3.5">
                      <CopyableField
                        value={srv.password}
                        isMono
                        isPassword
                        showPassword={isPassVisible}
                        onToggleShowPassword={() => onToggleShowPassword(srv.id)}
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

                    {/* 5. HẠN SỬ DỤNG */}
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
                                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                              ) : (
                                <LogIn className="w-3.5 h-3.5 text-blue-300" />
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

