import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  X,
  Copy,
  Check,
  Server,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  ShieldCheck,
  KeyRound,
  Mail,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { PackageItem } from "../types";

interface PackageDetailModalProps {
  item: PackageItem | null;
  onClose: () => void;
}

const fmt = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

export const PackageDetailModal: React.FC<PackageDetailModalProps> = ({ item, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showStoragePassword, setShowStoragePassword] = useState(false);

  if (!item) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const matchRuleLabel = {
    information: "Khớp theo Tài Khoản",
    slot: "Khớp theo Slot",
    both: "Khớp cả hai (Tài Khoản & Slot)",
  }[item.matchRule || "information"] || "Khớp theo Tài Khoản";

  const percentUsed = item.totalSlots > 0 ? Math.round((item.usedSlots / item.totalSlots) * 100) : 0;

  const statusBadge = (() => {
    if (item.status === "expired" || item.usedSlots >= item.totalSlots) {
      return (
        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          ĐÃ ĐẦY / HẾT HẠN
        </span>
      );
    }
    if (item.status === "warning" || percentUsed >= 75) {
      return (
        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          SẮP HẾT SLOT
        </span>
      );
    }
    return (
      <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        HOẠT ĐỘNG
      </span>
    );
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Eye className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Chi Tiết Gói: {item.name}
                </h3>
                <span className="text-xs font-mono text-slate-400 font-normal">#{item.id}</span>
              </div>
              <p className="text-xs text-slate-400">
                Danh mục: <span className="text-cyan-300 font-semibold">{item.category}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-xs">
          {/* KHỐI 1: THÔNG TIN TÀI KHOẢN & BẢO MẬT (TRỌNG TÂM) */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" /> Thông Tin Tài Khoản Đăng Nhập
            </h4>

            {/* 1.1 TÀI KHOẢN GỐC */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
              {/* Email / Username */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold tracking-wider shrink-0">
                    GỐC
                  </span>
                  <span className="font-mono text-slate-100 font-bold text-sm truncate select-all">
                    {item.accountInfo || "—"}
                  </span>
                </div>
                {item.accountInfo && (
                  <button
                    onClick={() => handleCopy(item.accountInfo, "accountInfo")}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors shrink-0 ml-2"
                    title="Sao chép tài khoản gốc"
                  >
                    {copiedKey === "accountInfo" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Mật khẩu, 2FA, Mail dự phòng của Tài khoản GỐC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                {/* Mật khẩu */}
                <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg px-2.5 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-slate-500 text-[10px]">MK:</span>
                    <span className="font-mono text-slate-200 font-semibold truncate select-all">
                      {item.password ? (showPassword ? item.password : "••••••••") : <span className="text-slate-600 font-normal italic">Chưa có</span>}
                    </span>
                  </div>
                  {item.password && (
                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleCopy(item.password!, "password")}
                        className="p-1 text-slate-400 hover:text-cyan-300 rounded"
                        title="Sao chép mật khẩu"
                      >
                        {copiedKey === "password" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mail dự phòng */}
                <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg px-2.5 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="text-slate-500 text-[10px]">Mail phụ:</span>
                    <span className="font-mono text-slate-300 truncate select-all">
                      {item.backupEmail || <span className="text-slate-600 font-normal italic">Chưa có</span>}
                    </span>
                  </div>
                  {item.backupEmail && (
                    <button
                      onClick={() => handleCopy(item.backupEmail!, "backupEmail")}
                      className="p-1 text-slate-400 hover:text-cyan-300 rounded shrink-0 ml-1.5"
                      title="Sao chép mail phụ"
                    >
                      {copiedKey === "backupEmail" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* 2FA (Nếu có) */}
                {item.twoFa && (
                  <div className="col-span-1 sm:col-span-2 bg-slate-950/70 border border-slate-800/60 rounded-lg px-2.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="text-slate-500 text-[10px]">2FA:</span>
                      <span className="font-mono text-emerald-300 tracking-wider truncate select-all font-semibold">
                        {item.twoFa}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(item.twoFa!, "twoFa")}
                      className="p-1 text-slate-400 hover:text-cyan-300 rounded shrink-0 ml-1.5"
                      title="Sao chép 2FA"
                    >
                      {copiedKey === "twoFa" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 1.2 TÀI KHOẢN LIÊN KẾT / DUNG LƯỢNG (Nếu có) */}
            {item.storageAccountInfo && (
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                {/* Email / Username & Dung lượng */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold tracking-wider shrink-0">
                      LIÊN KẾT
                    </span>
                    <span className="font-mono text-amber-200 font-bold text-sm truncate select-all">
                      {item.storageAccountInfo}
                    </span>
                    {item.storageTotal && (
                      <span className="text-[10px] text-cyan-300 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/25 shrink-0">
                        {item.storageTotal} GB
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(item.storageAccountInfo!, "storageAccount")}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors shrink-0 ml-2"
                    title="Sao chép tài khoản liên kết"
                  >
                    {copiedKey === "storageAccount" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Mật khẩu, 2FA, Mail dự phòng của Tài khoản LIÊN KẾT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                  {/* Mật khẩu */}
                  <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg px-2.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-slate-500 text-[10px]">MK:</span>
                      <span className="font-mono text-slate-200 font-semibold truncate select-all">
                        {item.storagePassword ? (
                          showStoragePassword ? (
                            item.storagePassword
                          ) : (
                            "••••••••"
                          )
                        ) : (
                          <span className="text-slate-600 font-normal italic">Chưa có</span>
                        )}
                      </span>
                    </div>
                    {item.storagePassword && (
                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        <button
                          onClick={() => setShowStoragePassword(!showStoragePassword)}
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title={showStoragePassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                          {showStoragePassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleCopy(item.storagePassword!, "storagePassword")}
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded"
                          title="Sao chép mật khẩu liên kết"
                        >
                          {copiedKey === "storagePassword" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mail dự phòng */}
                  <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg px-2.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="text-slate-500 text-[10px]">Mail phụ:</span>
                      <span className="font-mono text-slate-300 truncate select-all">
                        {item.storageBackupEmail || (
                          <span className="text-slate-600 font-normal italic">Chưa có</span>
                        )}
                      </span>
                    </div>
                    {item.storageBackupEmail && (
                      <button
                        onClick={() => handleCopy(item.storageBackupEmail!, "storageBackupEmail")}
                        className="p-1 text-slate-400 hover:text-cyan-300 rounded shrink-0 ml-1.5"
                        title="Sao chép mail phụ"
                      >
                        {copiedKey === "storageBackupEmail" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* 2FA (Nếu có) */}
                  {item.storageTwoFa && (
                    <div className="col-span-1 sm:col-span-2 bg-slate-950/70 border border-slate-800/60 rounded-lg px-2.5 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="text-slate-500 text-[10px]">2FA:</span>
                        <span className="font-mono text-emerald-300 tracking-wider truncate select-all font-semibold">
                          {item.storageTwoFa}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(item.storageTwoFa!, "storageTwoFa")}
                        className="p-1 text-slate-400 hover:text-cyan-300 rounded shrink-0 ml-1.5"
                        title="Sao chép 2FA"
                      >
                        {copiedKey === "storageTwoFa" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 2: THÔNG TIN VẬN HÀNH & TÀI CHÍNH */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                <Tag className="w-3 h-3 text-purple-400" /> Nhà cung cấp
              </span>
              <p className="font-bold text-purple-300 text-sm truncate">{item.supplier || "—"}</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Giá nhập
              </span>
              <p className="font-mono font-bold text-emerald-400 text-sm">{fmt(item.costPrice)} ₫</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-amber-400" /> Ngày hết hạn
              </span>
              <p className="font-mono font-bold text-amber-300 text-sm">{item.expiredAt || "—"}</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3 text-cyan-400" /> Dung lượng Slot
              </span>
              <p className="font-bold text-white text-sm">
                <span className="text-cyan-300 font-mono">{item.usedSlots}</span> / {item.totalSlots} Vị trí
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 col-span-2">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" /> Quy tắc khớp đơn
              </span>
              <p className="font-semibold text-cyan-300 text-xs">{matchRuleLabel}</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 col-span-2 sm:col-span-3">
              <span className="text-slate-500 text-[11px] flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-slate-400" /> Ghi chú gói
              </span>
              <p className="text-slate-300 text-xs italic break-words">{item.note || "Không có ghi chú"}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end items-center px-6 py-3.5 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
