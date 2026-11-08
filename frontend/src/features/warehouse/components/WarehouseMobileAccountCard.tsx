import React from "react";
import {
  Copy,
  Check,
  ChevronDown,
  Pencil,
  Trash2,
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

export interface WarehouseMobileAccountCardProps {
  account: WarehouseAccountItem;
  isExpanded: boolean;
  copiedKeyMap: Record<string, boolean>;
  onToggleExpand: (id: number) => void;
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

export const WarehouseMobileAccountCard: React.FC<WarehouseMobileAccountCardProps> = ({
  account,
  isExpanded,
  copiedKeyMap,
  onToggleExpand,
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

  return (
    <div
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
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 ${brand.badgeClass}`}
                >
                  <span>{srv.display_name || srv.category}</span>
                  {(srv.variant_tag || (srv.category !== srv.display_name ? srv.category : "")) && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-white/15 text-white border border-white/15">
                      {srv.variant_tag || srv.category}
                    </span>
                  )}
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
};

