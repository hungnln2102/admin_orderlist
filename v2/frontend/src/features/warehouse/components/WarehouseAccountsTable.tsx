import React from "react";
import {
  ChevronDown,
  ChevronUp,
  Key,
  Copy,
  Check,
  Pencil,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { WarehouseAccountItem } from "../types";

interface WarehouseAccountsTableProps {
  accounts: WarehouseAccountItem[];
  expandedAccountIds: number[];
  showPasswordMap: Record<number, boolean>;
  copiedKeyMap: Record<string, boolean>;
  onToggleExpand: (id: number) => void;
  onToggleShowPassword: (serviceId: number) => void;
  onCopy: (text: string, label: string, keyId: string) => void;
  onEditAccount: (acc: WarehouseAccountItem) => void;
  onDeleteAccount: (acc: WarehouseAccountItem) => void;
  onAddSlot: (acc: WarehouseAccountItem) => void;
}

export const WarehouseAccountsTable: React.FC<WarehouseAccountsTableProps> = ({
  accounts,
  expandedAccountIds,
  showPasswordMap,
  copiedKeyMap,
  onToggleExpand,
  onToggleShowPassword,
  onCopy,
  onEditAccount,
  onDeleteAccount,
  onAddSlot,
}) => {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
      {/* 1. Desktop & Tablet View (Hidden on mobile < 640px) */}
      <div className="hidden sm:block overflow-x-auto custom-scrollbar flex-1 w-full">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4 w-10"></th>
              <th className="py-3.5 px-4">TÀI KHOẢN KHO</th>
              <th className="py-3.5 px-4">DANH MỤC SẢN PHẨM</th>
              <th className="py-3.5 px-4 text-center">SLOTS SẴN HÀNG</th>
              <th className="py-3.5 px-4">NGÀY TẠO / CẬP NHẬT</th>
              <th className="py-3.5 px-4 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {accounts.map((account) => {
              const isExpanded = expandedAccountIds.includes(account.id);
              const availableCount = account.services.filter((s) => s.status === "AVAILABLE").length;
              const totalSlots = account.services.length;

              return (
                <React.Fragment key={account.id}>
                  {/* MAIN PARENT ROW */}
                  <tr
                    onClick={() => onToggleExpand(account.id)}
                    className={`group transition-colors cursor-pointer ${
                      isExpanded ? "bg-slate-800/40" : "hover:bg-slate-800/20"
                    }`}
                  >
                    <td className="py-4 px-4 text-center">
                      <button className="text-slate-400 group-hover:text-white transition-colors cursor-pointer">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                          @
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                            <span>{account.account}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopy(account.account, "Email tài khoản", `acc_${account.id}`);
                              }}
                              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedKeyMap[`acc_${account.id}`] ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID Kho: #{account.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(account.services.map((s) => s.category))).map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          availableCount > 0
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {availableCount} / {totalSlots} Slots Sẵn
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-400">
                      <div>Tạo: {account.created_at}</div>
                      <div className="text-slate-500 mt-0.5">Sửa: {account.updated_at}</div>
                    </td>

                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditAccount(account)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sửa tài khoản"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteAccount(account)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED SUB-TABLE OF SLOTS */}
                  {isExpanded && (
                    <tr className="bg-slate-950/60">
                      <td colSpan={6} className="p-4 border-t border-b border-slate-800/80">
                        <div className="pl-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                              <Key className="w-3.5 h-3.5" />
                              <span>Danh Sách Slot Bản Quyền Tồn Kho</span>
                            </h4>
                            <button
                              onClick={() => onAddSlot(account)}
                              className="text-xs text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm Slot Mới</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {account.services.map((slot) => {
                              const isPassShown = showPasswordMap[slot.id] || false;

                              return (
                                <div
                                  key={slot.id}
                                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2.5 shadow-md"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="font-semibold text-white text-sm block">
                                        {slot.display_name}
                                      </span>
                                      <span className="text-xs text-slate-400 font-mono">
                                        Danh mục: {slot.category}
                                      </span>
                                    </div>

                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                        slot.status === "AVAILABLE"
                                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                          : slot.status === "IN_USE"
                                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                          : slot.status === "RESERVED"
                                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                                      }`}
                                    >
                                      {slot.status === "AVAILABLE"
                                        ? "Sẵn hàng"
                                        : slot.status === "IN_USE"
                                        ? "Đã giao"
                                        : slot.status === "RESERVED"
                                        ? "Giữ chỗ"
                                        : "Hết hạn"}
                                    </span>
                                  </div>

                                  {/* CREDENTIALS BLOCK */}
                                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                                    {slot.password && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400 flex items-center gap-1.5">
                                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                                          Mật khẩu:
                                        </span>
                                        <div className="flex items-center gap-2 font-mono">
                                          <span>
                                            {isPassShown ? slot.password : "••••••••••••"}
                                          </span>
                                          <button
                                            onClick={() => onToggleShowPassword(slot.id)}
                                            className="text-slate-400 hover:text-slate-200 cursor-pointer"
                                          >
                                            {isPassShown ? (
                                              <EyeOff className="w-3.5 h-3.5" />
                                            ) : (
                                              <Eye className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() =>
                                              onCopy(slot.password!, "Mật khẩu", `pass_${slot.id}`)
                                            }
                                            className="text-slate-400 hover:text-white cursor-pointer"
                                          >
                                            {copiedKeyMap[`pass_${slot.id}`] ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {slot.two_fa && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400 flex items-center gap-1.5">
                                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                          Mã 2FA Secret:
                                        </span>
                                        <div className="flex items-center gap-2 font-mono text-amber-300">
                                          <span>{slot.two_fa}</span>
                                          <button
                                            onClick={() =>
                                              onCopy(slot.two_fa!, "Mã 2FA", `2fa_${slot.id}`)
                                            }
                                            className="text-slate-400 hover:text-white cursor-pointer"
                                          >
                                            {copiedKeyMap[`2fa_${slot.id}`] ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {slot.expires_at && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400 flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                          Hạn sử dụng:
                                        </span>
                                        <span className="font-medium text-slate-200">
                                          {slot.expires_at}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {slot.note && (
                                    <div className="text-xs text-slate-400 italic">
                                      Ghi chú: {slot.note}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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

      {/* 2. Mobile Card List View (Visible ONLY on mobile screens < 640px) */}
      <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
        {accounts.map((account) => {
          const availableCount = account.services.filter((s) => s.status === "AVAILABLE").length;
          const totalSlots = account.services.length;

          return (
            <div
              key={account.id}
              className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="text-blue-400">@</span>
                  <span className="truncate max-w-[200px]">{account.account}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    availableCount > 0
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}
                >
                  {availableCount}/{totalSlots} Slots
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {account.services.map((slot) => (
                  <div key={slot.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{slot.display_name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{slot.status}</span>
                    </div>
                    {slot.password && (
                      <div className="text-slate-400 font-mono text-[11px] flex items-center justify-between">
                        <span>Pass: {slot.password}</span>
                        <button
                          onClick={() => onCopy(slot.password!, "Mật khẩu", `mob_pass_${slot.id}`)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => onEditAccount(account)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-medium cursor-pointer"
                >
                  Sửa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
