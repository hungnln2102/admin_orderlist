import React, { useState } from "react";
import {
  Archive,
  X,
  RefreshCw,
  CheckCircle2,
  Boxes,
  Link2,
  HardDrive,
  UserCheck,
} from "lucide-react";
import {
  WarehouseAccountFormData,
  ServiceNameCategoryItem,
  WarehouseAccountItem,
} from "../types";
import { useNotification } from "@/shared/context/NotificationContext";

interface WarehouseCreateModalProps {
  open: boolean;
  formData: WarehouseAccountFormData;
  catalogItems?: ServiceNameCategoryItem[];
  existingAccounts?: WarehouseAccountItem[];
  onClose: () => void;
  onFormChange: (data: WarehouseAccountFormData) => void;
  onSubmit: () => void;
}

export const WarehouseCreateModal: React.FC<WarehouseCreateModalProps> = ({
  open,
  formData,
  catalogItems = [],
  existingAccounts = [],
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const notify = useNotification();
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);

  if (!open) return null;

  // 1. Đồng bộ ngày hết hạn từ đơn nhập MAVN theo email (TUYỆT ĐỐI KHÔNG LƯU id_order)
  const handleSyncOrderDate = async () => {
    const emailToSearch = String(formData.account || "").trim();
    if (!emailToSearch) {
      notify.warning("Vui lòng nhập Email tài khoản kho trước khi đồng bộ!", "Thiếu Email");
      return;
    }

    try {
      setSyncing(true);
      setSyncInfo(null);
      const res = await fetch(`/api/warehouse/sync-order-date?email=${encodeURIComponent(emailToSearch)}`);
      const json = await res.json();

      if (!res.ok || !json.found) {
        notify.warning(json.message || "Không tìm thấy đơn hàng nhập MAVN nào chứa email này.", "Chưa Khớp Đơn");
        return;
      }

      // Tự động điền ngày hết hạn
      if (json.expiredAt) {
        onFormChange({
          ...formData,
          expiresAt: json.expiredAt,
        });
        setSyncInfo(`Đã tìm thấy đơn nhập #${json.orderCode} (Hạn: ${json.expiredAt})`);
        notify.success(`Đã tự động điền ngày hết hạn: ${json.expiredAt}`, "Đồng Bộ Thành Công");
      }
    } catch (err: any) {
      console.error("[WarehouseCreateModal] Lỗi đồng bộ ngày:", err);
      notify.error(err.message || "Lỗi máy chủ khi tra cứu ngày đơn nhập", "Thất Bại");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-400" />
            <span>Thêm Tài Khoản Kho Mới</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          {/* Ô Email Tài Khoản Kho & Nút Đồng Bộ Đơn Nhập */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Email Tài Khoản Kho (*)
              </label>
              {syncInfo && (
                <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{syncInfo}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ví dụ: fs.context.5381@colegiomontealto.us"
                value={formData.account}
                onChange={(e) => {
                  onFormChange({ ...formData, account: e.target.value });
                  if (syncInfo) setSyncInfo(null);
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleSyncOrderDate}
                disabled={syncing || !String(formData.account || "").trim()}
                className="px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-amber-900/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Dò tìm đơn hàng nhập MAVN trong hệ thống để tự động điền ngày hết hạn"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Đang dò..." : "Đồng Bộ Đơn Nhập"}</span>
              </button>
            </div>
          </div>

          {/* Loại Dịch Vụ */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Loại Dịch Vụ (*)
            </label>
            <select
              value={formData.serviceName}
              onChange={(e) => {
                const selectedName = e.target.value;
                const foundCat = catalogItems.find((c) => c.name === selectedName);
                // Nếu dịch vụ này có bật tạo gói kho (isPackage: true), tự động bật createPackage
                const shouldCreatePkg = Boolean(foundCat?.isPackage);
                onFormChange({
                  ...formData,
                  serviceName: selectedName,
                  category: foundCat ? foundCat.category : selectedName,
                  createPackage: shouldCreatePkg ? true : formData.createPackage,
                });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
            >
              {catalogItems.length > 0 ? (
                catalogItems.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name} {item.category ? `(${item.category})` : ""} {item.isPackage ? "[Gói Kho]" : ""}
                  </option>
                ))
              ) : (
                <>
                  <option value="Adobe (1PC Cố Định)">Adobe (1PC Cố Định)</option>
                  <option value="Youtube Premium">Youtube Premium</option>
                  <option value="Netflix Premium 4K">Netflix Premium 4K</option>
                  <option value="ChatGPT Plus">ChatGPT Plus</option>
                </>
              )}
            </select>
          </div>

          {/* Mật khẩu & Mã 2FA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu</label>
              <input
                type="text"
                placeholder="Nhập mật khẩu..."
                value={formData.password}
                onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mã 2FA Secret Key</label>
              <input
                type="text"
                placeholder="Mã 2FA (nếu có)..."
                value={formData.twoFa}
                onChange={(e) => onFormChange({ ...formData, twoFa: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* Email Backup & Ngày Hết Hạn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Backup</label>
              <input
                type="text"
                placeholder="Email khôi phục..."
                value={formData.backupEmail}
                onChange={(e) => onFormChange({ ...formData, backupEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ngày Hết Hạn</label>
              <input
                type="text"
                placeholder="Ví dụ: 2026-12-31 hoặc 31/12/2026"
                value={formData.expiresAt}
                onChange={(e) => onFormChange({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* ── KHU VỰC TẠO GÓI KHO & TÀI KHOẢN LIÊN KẾT ── */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            {/* Toggle 1-Click: Tạo Gói Kho Cho Tài Khoản Này */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Tạo Gói Kho Cho Tài Khoản Này</span>
                  <span className="text-[10px] text-slate-400 block">
                    Tự động đưa tài khoản vào Kho Gói Sản Phẩm với các slot tương ứng
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onFormChange({ ...formData, createPackage: !formData.createPackage })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formData.createPackage ? "bg-cyan-500 shadow-md shadow-cyan-500/30" : "bg-slate-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    formData.createPackage ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Nếu bật Tạo Gói Kho: Cho phép cấu hình tài khoản liên kết */}
            {formData.createPackage && (
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-cyan-300 block">
                        Cần tài khoản liên kết cùng gói này không?
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Áp dụng cho gói cần gắn thêm tài khoản dung lượng hoặc tài khoản chính
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onFormChange({
                        ...formData,
                        hasLinkedAccount: !formData.hasLinkedAccount,
                        linkedAccountRole: formData.linkedAccountRole || "storage",
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      formData.hasLinkedAccount ? "bg-cyan-500 shadow-md shadow-cyan-500/30" : "bg-slate-800"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                        formData.hasLinkedAccount ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Nếu chọn CÓ tài khoản liên kết */}
                {formData.hasLinkedAccount && (
                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    {/* BƯỚC 1: Chọn VAI TRÒ của tài khoản liên kết (Chỉ đạo của Master: Không mặc định là dung lượng!) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Vai Trò Của Tài Khoản Liên Kết (*)
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onFormChange({ ...formData, linkedAccountRole: "storage" })}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            formData.linkedAccountRole !== "main"
                              ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-bold">TK Dung Lượng</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            Tài khoản mới tạo là TK chính; TK liên kết là dung lượng
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onFormChange({ ...formData, linkedAccountRole: "main" })}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            formData.linkedAccountRole === "main"
                              ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-bold">TK Chính</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            TK liên kết từ kho là TK chính; TK mới tạo là dung lượng/phụ
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* BƯỚC 2: Dropdown chọn tài khoản từ kho tồn */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Chọn Tài Khoản Từ Kho Tồn (*)
                      </label>
                      <select
                        value={formData.linkedAccountId || ""}
                        onChange={(e) =>
                          onFormChange({
                            ...formData,
                            linkedAccountId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="">-- Bấm để chọn tài khoản tồn kho --</option>
                        {existingAccounts
                          .filter((acc) => acc.account.toLowerCase() !== String(formData.account || "").toLowerCase().trim())
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account} ({acc.services.map((s) => s.display_name).join(", ") || "Chưa có DV"})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* BƯỚC 3: Dung lượng (Tùy chọn) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Dung Lượng / Thông Tin Bổ Sung
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 2TB, 100GB, Family storage..."
                        value={formData.storageTotal || ""}
                        onChange={(e) => onFormChange({ ...formData, storageTotal: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onSubmit}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
          >
            Lưu Tài Khoản
          </button>
        </div>
      </div>
    </div>
  );
};
