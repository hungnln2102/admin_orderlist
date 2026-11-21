import { SlotProviderControls } from "./SlotProviderControls";
import { DateInputVN } from "@/shared/components/DateInputVN";
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
  ShieldCheck,
  PackageCheck,
  Mail,
  KeyRound,
  Calendar,
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

  const productNames = [...new Set(catalogItems.map((item) => item.name))];
  const availableTags = [...new Set(
    catalogItems
      .filter((item) => item.name === formData.serviceName)
      .flatMap((item) => item.availableTags ?? []),
  )];

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl xl:max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-inner shrink-0">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Thêm Tài Khoản Kho Mới</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập thông tin tài khoản kho, cấu hình cổng giải OTP và thiết lập gói liên kết tự động
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY - BỐ CỤC NGANG 2 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start text-xs sm:text-sm">
          {/* CỘT TRÁI (6/12): THÔNG TIN ĐĂNG NHẬP & BẢO MẬT OTP */}
          <div className="lg:col-span-6 space-y-4">
            {/* KHỐI 1: THÔNG TIN ĐĂNG NHẬP CƠ BẢN */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-indigo-200 tracking-wide uppercase">
                  Thông Tin Tài Khoản Kho
                </span>
              </div>

              {/* Ô Email Tài Khoản Kho & Nút Đồng Bộ Đơn Nhập */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Email Tài Khoản Kho (*)</span>
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
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSyncOrderDate}
                    disabled={syncing || !String(formData.account || "").trim()}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-amber-900/30 active:scale-95 disabled:opacity-50 cursor-pointer transition-all shrink-0"
                    title="Dò tìm đơn hàng nhập MAVN trong hệ thống để tự động điền ngày hết hạn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-white ${syncing ? "animate-spin" : ""}`} />
                    <span>{syncing ? "Đang dò..." : "Đồng Bộ Đơn Nhập"}</span>
                  </button>
                </div>
              </div>

              {/* Mật khẩu & Mã 2FA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mật Khẩu</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập mật khẩu..."
                    value={formData.password}
                    onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mã 2FA Secret Key</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Mã 2FA (nếu có)..."
                    value={formData.twoFa}
                    onChange={(e) => onFormChange({ ...formData, twoFa: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Email Backup & Ngày Hết Hạn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Email Backup</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Email khôi phục..."
                    value={formData.backupEmail}
                    onChange={(e) => onFormChange({ ...formData, backupEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ngày Hết Hạn</span>
                  </label>
                  <DateInputVN
                    placeholder="dd/mm/yyyy"
                    value={formData.expiresAt}
                    onChange={(expiresAt) => onFormChange({ ...formData, expiresAt })}
                  />
                </div>
              </div>
            </div>

            {/* KHỐI 2: BẢO MẬT 2FA & CỔNG ĐIỀU PHỐI OTP */}
            <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-cyan-200 tracking-wide uppercase">
                  Bảo Mật & Cổng Điều Phối OTP
                </span>
              </div>

              {/* Cổng Giải Mã OTP & Kiểm Tra Trạng Thái (2 Switch Trượt On/Off Song Song) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <SlotProviderControls
                  label="Lấy OTP"
                  enabled={formData.otpEnabled ?? false}
                  provider={formData.providerKey || ""}
                  onToggle={(enabled) => onFormChange({ ...formData, otpEnabled: enabled })}
                  onProviderChange={(key) => onFormChange({ ...formData, providerKey: key })}
                />
                <SlotProviderControls
                  label="Kiểm tra trạng thái"
                  enabled={formData.statusCheckEnabled ?? false}
                  provider={formData.statusProviderKey || ""}
                  status
                  onToggle={(enabled) => onFormChange({ ...formData, statusCheckEnabled: enabled })}
                  onProviderChange={(key) => onFormChange({ ...formData, statusProviderKey: key })}
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (6/12): SẢN PHẨM, TAG & TẠO GÓI KHO LIÊN KẾT */}
          <div className="lg:col-span-6 space-y-4">
            {/* KHỐI 3: PHÂN LOẠI SẢN PHẨM & TAG */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  <PackageCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-cyan-200 tracking-wide uppercase">
                  Phân Loại Sản Phẩm & Gói Dịch Vụ
                </span>
              </div>

              {/* Dropdown Sản Phẩm */}
              <div>
                <label htmlFor="warehouse-create-product" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sản phẩm (*)
                </label>
                <select
                  id="warehouse-create-product"
                  value={formData.serviceName}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const foundCat = catalogItems.find((c) => c.name === selectedName);
                    const shouldCreatePkg = Boolean(foundCat?.isPackage);
                    onFormChange({
                      ...formData,
                      serviceName: selectedName,
                      category: selectedName,
                      variantTag: "",
                      createPackage: shouldCreatePkg ? true : formData.createPackage,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs transition-colors cursor-pointer"
                >
                  <option value="" disabled>Chọn sản phẩm</option>
                  {productNames.length > 0 ? (
                    productNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Adobe">Adobe</option>
                      <option value="Youtube Premium">Youtube Premium</option>
                      <option value="Netflix Premium 4K">Netflix Premium 4K</option>
                      <option value="ChatGPT Plus">ChatGPT Plus</option>
                    </>
                  )}
                </select>
              </div>

              {/* Danh Sách Tag */}
              {availableTags.length > 0 && (
                <fieldset className="space-y-1.5">
                  <legend className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between w-full">
                    <span>Tag Biến Thể</span>
                    <span className="text-[10px] text-slate-500 font-normal">(Bấm để chọn / bỏ chọn)</span>
                  </legend>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                    {availableTags.map((tag) => {
                      const selected = formData.variantTag === tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onFormChange({ ...formData, variantTag: selected ? "" : tag })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none active:scale-95 ${
                            selected
                              ? "border-cyan-400 bg-cyan-400/20 text-cyan-100 font-bold shadow-sm shadow-cyan-500/20"
                              : "border-slate-700/80 bg-slate-900 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>

            {/* KHỐI 4: KHU VỰC TẠO GÓI KHO & TÀI KHOẢN LIÊN KẾT */}
            <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-4 space-y-3 shadow-inner">
              {/* Toggle 1-Click: Tạo Gói Kho Cho Tài Khoản Này */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
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
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 ${
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
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3.5 animate-in fade-in duration-200">
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
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 ${
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
                      {/* BƯỚC 1: Chọn VAI TRÒ của tài khoản liên kết */}
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
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors"
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
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer active:scale-95"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!formData.serviceName || (productNames.length > 0 && !productNames.includes(formData.serviceName))}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lưu Tài Khoản
          </button>
        </div>
      </div>
    </div>
  );
};
