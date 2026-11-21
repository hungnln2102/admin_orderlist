import { SlotProviderControls } from "./SlotProviderControls";
import React, { useState, useEffect, useMemo } from "react";
import {
  Pencil,
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  KeyRound,
  Mail,
  ShieldCheck,
  FileText,
  Loader2,
  Sparkles,
  Tag,
  Clock,
  Plus,
} from "lucide-react";
import {
  ServiceNameCategoryItem,
  SystemProduct,
  WarehouseAccountItem,
  WarehouseServiceSlot,
  WarehouseSlotEditFormData,
  WarehouseSlotStatus,
} from "../types";
import { AVAILABLE_OTP_PROVIDERS } from "../providerConstants";
import { format2FAChunks, getServiceBrandStyle } from "./warehouseRowUtils";

interface WarehouseEditSlotModalProps {
  open: boolean;
  account: WarehouseAccountItem | null;
  slot: WarehouseServiceSlot | null;
  catalogItems?: ServiceNameCategoryItem[];
  systemProducts?: SystemProduct[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (formData: WarehouseSlotEditFormData) => Promise<void>;
}

export const WarehouseEditSlotModal: React.FC<WarehouseEditSlotModalProps> = ({
  open,
  account,
  slot,
  catalogItems = [],
  systemProducts = [],
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<WarehouseSlotEditFormData>({
    accountUsername: "",
    serviceName: "",
    variantTag: "",
    password: "",
    backupEmail: "",
    twoFa: "",
    otpType: "",
    providerKey: "",
    expiresAt: "",
    status: "AVAILABLE",
    note: "",
    saveTagToCatalog: false,
  });

  const [saveTagToCatalog, setSaveTagToCatalog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [apiMapping, setApiMapping] = useState<{
    byDisplayName: Record<string, any[]>;
    byPackageName: Record<string, any[]>;
    allApis: any[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/system/product-apis/mapping")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setApiMapping(data);
      })
      .catch((err) => console.error("[WarehouseEditSlotModal] Lỗi nạp mapping API:", err));
  }, [open]);

  useEffect(() => {
    if (open && slot && account) {
      // Determine initial date: prefer raw_expires_at (YYYY-MM-DD), fallback to parsing expires_at
      let initialExpires = slot.raw_expires_at || "";
      if (!initialExpires && slot.expires_at) {
        const parts = slot.expires_at.split("/");
        if (parts.length === 3) {
          initialExpires = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      setFormData({
        accountUsername: account.account || "",
        serviceName: slot.display_name || slot.category || "Dịch vụ",
        variantTag: slot.variant_tag || "",
        password: slot.password || "",
        backupEmail: slot.backup_email || "",
        twoFa: slot.two_fa || "",
        otpType: slot.provider_key || slot.otp_type || "",
        providerKey: slot.provider_key || slot.otp_type || "",
        otpEnabled: slot.otp_enabled ?? undefined,
        statusCheckEnabled: slot.status_check_enabled ?? undefined,
        statusProviderKey: slot.status_provider_key || "",
        expiresAt: initialExpires,
        status: slot.status || "AVAILABLE",
        note: slot.note || "",
        saveTagToCatalog: false,
      });
      setSaveTagToCatalog(false);
      setShowPassword(false);
    }
  }, [open, account, slot]);

  // Tìm dịch vụ kho tương ứng trong catalog
  const matchingCatalog = useMemo(() => {
    if (!slot || !catalogItems?.length) return null;
    const slotName = String(slot.display_name || slot.category || "").trim().toLowerCase();
    return (
      catalogItems.find(
        (c) =>
          c.name.trim().toLowerCase() === slotName ||
          (slot.category && c.category.trim().toLowerCase() === slot.category.trim().toLowerCase())
      ) || null
    );
  }, [slot, catalogItems]);

  // Tìm sản phẩm hệ thống tương ứng nếu có
  const matchingSystemProduct = useMemo(() => {
    if (!matchingCatalog?.productId || !systemProducts?.length) return null;
    return systemProducts.find((p) => p.id === matchingCatalog.productId) || null;
  }, [matchingCatalog, systemProducts]);

  // Tổng hợp danh sách tag có sẵn của sản phẩm này
  const availableServiceTags = useMemo(() => {
    const set = new Set<string>();

    if (matchingCatalog?.availableTags) {
      matchingCatalog.availableTags.forEach((t) => {
        const trimmed = String(t || "").trim();
        if (trimmed) set.add(trimmed);
      });
    }

    if (matchingCatalog?.variants) {
      matchingCatalog.variants.forEach((v) => {
        const trimmed = String(v.tag || "").trim();
        if (trimmed) set.add(trimmed);
      });
    }

    if (matchingCatalog?.category) {
      const trimmed = String(matchingCatalog.category || "").trim();
      if (trimmed) set.add(trimmed);
    }

    if (matchingSystemProduct?.tags) {
      matchingSystemProduct.tags.forEach((t) => {
        const trimmed = String(t || "").trim();
        if (trimmed) set.add(trimmed);
      });
    }

    if (slot?.variant_tag) {
      const trimmed = String(slot.variant_tag || "").trim();
      if (trimmed) set.add(trimmed);
    }

    return Array.from(set);
  }, [matchingCatalog, matchingSystemProduct, slot]);

  // Kiểm tra tag đang gõ có phải là tag mới chưa từng có hay không
  const trimmedCurrentTag = formData.variantTag.trim();
  const isCustomNewTag = useMemo(() => {
    if (!trimmedCurrentTag) return false;
    return !availableServiceTags.some(
      (t) => t.toLowerCase() === trimmedCurrentTag.toLowerCase()
    );
  }, [trimmedCurrentTag, availableServiceTags]);

  const availableOtpApis = useMemo(() => {
    if (!apiMapping || !slot) return [];
    const name = String(slot.display_name || slot.category || "").trim().toLowerCase();
    if (name && apiMapping.byDisplayName?.[name]?.length) {
      return apiMapping.byDisplayName[name];
    }
    for (const [pkgName, apis] of Object.entries(apiMapping.byPackageName || {})) {
      if (apis.length > 0 && name.includes(pkgName)) {
        return apis;
      }
    }
    return apiMapping.allApis || [];
  }, [apiMapping, slot]);

  const combinedProviders = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    availableOtpApis.forEach((api: any) => {
      const key = api.service_key || api.key;
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ value: key, label: `${api.service_name || key} (${key})` });
      }
    });

    AVAILABLE_OTP_PROVIDERS.forEach((prov) => {
      if (!seen.has(prov.value)) {
        seen.add(prov.value);
        list.push({ value: prov.value, label: prov.label });
      }
    });

    return list;
  }, [availableOtpApis]);

  if (!open || !slot || !account) return null;

  const brand = getServiceBrandStyle(
    slot.display_name || slot.category,
    formData.status === "AVAILABLE"
  );

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleAddDays = (days: number) => {
    const baseDate = formData.expiresAt ? new Date(formData.expiresAt) : new Date();
    const d = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, expiresAt: `${yyyy}-${mm}-${dd}` }));
  };

  const handleClearExpiry = () => {
    setFormData((prev) => ({ ...prev, expiresAt: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      saveTagToCatalog,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl xl:max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-amber-500/25 shadow-2xl shadow-amber-500/10 p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner shrink-0">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Chỉnh Sửa Dịch Vụ Kho
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${brand.badgeClass}`}
                >
                  {formData.serviceName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[280px] sm:max-w-md">
                Tài khoản gốc: <span className="text-slate-200 font-semibold">{account.account}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM - BỐ CỤC NGANG 2 CỘT */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* CỘT TRÁI (6/12): THÔNG TIN ĐĂNG NHẬP & BẢO MẬT 2FA / OTP */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* EMAIL TÀI KHOẢN MẸ */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Email (Username)</span>
                      </span>
                      {formData.accountUsername && (
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.accountUsername, "user")}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedField === "user" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.accountUsername}
                      onChange={(e) =>
                        setFormData({ ...formData, accountUsername: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="ví dụ: user@gmail.com"
                    />
                  </div>

                  {/* MẬT KHẨU */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mật Khẩu Dịch Vụ</span>
                      </span>
                      {formData.password && (
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.password, "pass")}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedField === "pass" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Đã copy</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        placeholder="Nhập mật khẩu..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: BẢO MẬT 2FA & CỔNG ĐIỀU PHỐI OTP */}
              <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-4 space-y-3.5 shadow-inner">
                {/* Header của khối Bảo Mật */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-cyan-200 tracking-wide uppercase">
                      Bảo Mật 2FA & Cổng Điều Phối OTP
                    </span>
                  </div>
                  {availableOtpApis.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-medium">
                      {availableOtpApis.length} cổng khả dụng
                    </span>
                  )}
                </div>

                {/* Hàng 1: Switch Lấy OTP & Switch Kiểm tra trạng thái (2 Cột Con Song Song) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SlotProviderControls
                    label="Lấy OTP"
                    enabled={formData.otpEnabled ?? true}
                    provider={formData.providerKey || ""}
                    providers={combinedProviders}
                    onToggle={(enabled) => setFormData({ ...formData, otpEnabled: enabled })}
                    onProviderChange={(key) => setFormData({ ...formData, providerKey: key })}
                  />
                  <SlotProviderControls
                    label="Kiểm tra trạng thái"
                    enabled={formData.statusCheckEnabled ?? true}
                    provider={formData.statusProviderKey || ""}
                    status
                    onToggle={(enabled) => setFormData({ ...formData, statusCheckEnabled: enabled })}
                    onProviderChange={(key) => setFormData({ ...formData, statusProviderKey: key })}
                  />
                </div>

                {/* Hàng 2: Email Backup Khôi Phục */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>Email Backup Khôi Phục</span>
                    </span>
                    {formData.backupEmail && (
                      <button
                        type="button"
                        onClick={() => handleCopy(formData.backupEmail, "backup")}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === "backup" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.backupEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, backupEmail: e.target.value })
                    }
                    placeholder="ví dụ: recovery@domain.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Hàng 3: Mã 2FA Secret Key (Base32) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Mã 2FA Secret Key (Base32)</span>
                    </span>
                    {formData.twoFa && (
                      <button
                        type="button"
                        onClick={() => handleCopy(formData.twoFa, "2fa")}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === "2fa" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Đã copy</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép mã 2FA</span>
                          </>
                        )}
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.twoFa}
                    onChange={(e) =>
                      setFormData({ ...formData, twoFa: e.target.value.replace(/\s+/g, "") })
                    }
                    placeholder="ví dụ: JBSWY3DPEHPK3PXP"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  {formData.twoFa && (
                    <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/20">
                      <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 tracking-wider overflow-x-auto py-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-normal shrink-0">
                          Định dạng khối:
                        </span>
                        <span className="font-semibold select-all">
                          {format2FAChunks(formData.twoFa)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (6/12): TAG GÓI, TRẠNG THÁI, HẠN DÙNG & GHI CHÚ */}
            <div className="lg:col-span-6 space-y-4">
              {/* KHỐI 3: QUẢN LÝ TAG BIẾN THỂ GÓI & TỰ ĐỘNG TẠO TAG MỚI */}
              <div className="rounded-2xl border border-amber-500/25 bg-slate-950/60 p-4 space-y-3.5 shadow-inner">
                {/* Header của khối Tag */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-amber-200 tracking-wide uppercase">
                      Tag Biến Thể Gói (Phân Loại Dịch Vụ)
                    </span>
                  </div>
                  {formData.variantTag && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        [{formData.variantTag}]
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, variantTag: "" });
                          setSaveTagToCatalog(false);
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                        title="Gỡ tag riêng của slot để dùng tag mặc định"
                      >
                        <X className="w-3 h-3" />
                        <span>Gỡ tag</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Input điền hoặc tạo tag mới */}
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.variantTag}
                      onChange={(e) =>
                        setFormData({ ...formData, variantTag: e.target.value })
                      }
                      placeholder="Chọn tag có sẵn bên dưới hoặc gõ để tạo tag mới..."
                      className="w-full pl-3.5 pr-20 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    {formData.variantTag && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, variantTag: "" });
                          setSaveTagToCatalog(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded cursor-pointer transition-colors"
                      >
                        Xóa trống
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách Tag có sẵn của sản phẩm này */}
                {availableServiceTags.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Tag có sẵn của sản phẩm này:
                      </span>
                      <span className="text-[10px] text-slate-500">(Bấm vào tag để chọn)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {availableServiceTags.map((tag) => {
                        const isSelected =
                          formData.variantTag.trim().toLowerCase() === tag.trim().toLowerCase();
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, variantTag: tag });
                              setSaveTagToCatalog(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                              isSelected
                                ? "bg-amber-500/25 border-amber-500 text-amber-200 shadow-sm shadow-amber-500/20 font-semibold"
                                : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Banner hiển thị khi tạo Tag mới */}
                {isCustomNewTag && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-amber-300">
                          Tự động tạo tag mới:{" "}
                          <span className="underline decoration-amber-400 font-bold font-mono">
                            {formData.variantTag.trim()}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tag này sẽ được gán cho slot này và tự động lưu vào danh mục biến thể sản phẩm trong hệ thống kho!
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 border-t border-amber-500/20 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveTagToCatalog}
                        onChange={(e) => setSaveTagToCatalog(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950 cursor-pointer"
                      />
                      <span>
                        Đồng bộ đặt làm Tag phân loại mặc định cho dịch vụ{" "}
                        <strong className="text-amber-300">{formData.serviceName}</strong> trong Danh Mục Kho
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* KHỐI 4: TRẠNG THÁI SLOT & HẠN DÙNG */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* TRẠNG THÁI SLOT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          formData.status === "AVAILABLE"
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                            : formData.status === "IN_USE"
                            ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                            : formData.status === "EXPIRED"
                            ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]"
                            : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        }`}
                      />
                      <span>Trạng Thái Slot</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as WarehouseSlotStatus,
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="AVAILABLE">TỒN KHO (Sẵn sàng bán)</option>
                      <option value="IN_USE">ĐANG SỬ DỤNG (Đã gán khách)</option>
                      <option value="EXPIRED">HẾT HẠN (Cần gia hạn/thay thế)</option>
                      <option value="RESERVED">GIỮ CHỖ (Đang xử lý)</option>
                    </select>
                  </div>

                  {/* NGÀY HẾT HẠN DỊCH VỤ */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ngày Hết Hạn Dịch Vụ</span>
                      </label>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleAddDays(30)}
                          className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 cursor-pointer transition-all active:scale-95"
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddDays(90)}
                          className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 cursor-pointer transition-all active:scale-95"
                        >
                          +90d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddDays(365)}
                          className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 cursor-pointer transition-all active:scale-95"
                        >
                          +1y
                        </button>
                        {formData.expiresAt && (
                          <button
                            type="button"
                            onClick={handleClearExpiry}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700 cursor-pointer transition-all active:scale-95"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) =>
                        setFormData({ ...formData, expiresAt: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 5: GHI CHÚ */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ghi Chú Dịch Vụ</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Nhập ghi chú cho tài khoản này..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-slate-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* ACTIONS FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
