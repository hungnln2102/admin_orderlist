import React, { useState, useEffect } from "react";
import { X, Sparkles, Sliders, CheckCircle2, ShieldAlert, ArrowRight, Layers, Building2, Terminal } from "lucide-react";
import type { PortalSlotItem, ProductItem, SupplierOption, PortalSlotRoutingRule } from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";

interface SlotProductSupplierRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    slotKey: string;
    productNameId: number;
    supplierId?: number | null;
    providerKey: string;
    priority?: number;
    isActive?: boolean;
    note?: string;
  }) => Promise<boolean>;
  editingRule?: PortalSlotRoutingRule | null;
  slots: PortalSlotItem[];
  products: ProductItem[];
  suppliers: SupplierOption[];
  providers: Provider[];
  availableApis: any[];
}

export const SlotProductSupplierRuleModal: React.FC<SlotProductSupplierRuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingRule,
  slots,
  products,
  suppliers,
  providers,
  availableApis,
}) => {
  const [slotKey, setSlotKey] = useState<string>("");
  const [productNameId, setProductNameId] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [providerKey, setProviderKey] = useState<string>("");
  const [priority, setPriority] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (editingRule) {
      setSlotKey(editingRule.slot_key || "");
      setProductNameId(editingRule.product_name_id || "");
      setSupplierId(editingRule.supplier_id ?? "");
      setProviderKey(editingRule.provider_key || "");
      setPriority(editingRule.priority || 1);
      setIsActive(editingRule.is_active !== false);
      setNote(editingRule.note || "");
    } else {
      setSlotKey(slots[0]?.slot_key || "");
      setProductNameId(products[0]?.id || "");
      setSupplierId("");
      setProviderKey(providers[0]?.key || availableApis[0]?.service_key || "");
      setPriority(1);
      setIsActive(true);
      setNote("");
    }
    setError("");
  }, [editingRule, isOpen, slots, products, providers, availableApis]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!slotKey) {
      setError("Vui lòng chọn Ô Input trên Web.");
      return;
    }
    if (!productNameId) {
      setError("Vui lòng chọn Sản phẩm / Dịch vụ kho.");
      return;
    }
    if (!providerKey) {
      setError("Vui lòng chọn Cổng Provider cần gán.");
      return;
    }

    setSubmitting(true);
    try {
      const success = await onSubmit({
        slotKey,
        productNameId: Number(productNameId),
        supplierId: supplierId !== "" ? Number(supplierId) : null,
        providerKey,
        priority: Number(priority) || 1,
        isActive,
        note: note.trim(),
      });
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi lưu quy tắc.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSlot = slots.find((s) => s.slot_key === slotKey);
  const selectedProduct = products.find((p) => p.id === Number(productNameId));
  const selectedSupplier = suppliers.find((s) => s.id === Number(supplierId));
  const selectedProvider = providers.find((p) => p.key === providerKey) || availableApis.find((a) => (a.provider_key || a.service_key) === providerKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingRule ? "Chỉnh Sửa Quy Tắc Điều Phối" : "Tạo Quy Tắc Liên Kết Ô Input & NCC"}
              </h3>
              <p className="text-xs text-slate-400">
                Định tuyến chính xác: Ô Input Web + Sản Phẩm + NCC &rarr; Cổng Provider đích
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Flow Visual Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium truncate max-w-[150px]">
                {selectedSlot ? selectedSlot.name : "Chọn Ô Input"}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium truncate max-w-[140px]">
                {selectedProduct ? selectedProduct.package_name : "Chọn Sản Phẩm"}
              </span>
              <span className="text-slate-500 font-bold">+</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium truncate max-w-[130px]">
                {selectedSupplier ? selectedSupplier.supplier_name : "Mọi NCC"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-bold text-emerald-400">
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                {selectedProvider?.service_name || selectedProvider?.name || providerKey || "Provider"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Chọn Ô Input trên Web Portal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                1. Ô Input trên Web OTP Portal:
              </label>
              <select
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2 text-slate-100 outline-none transition-all"
                required
              >
                {slots.map((s) => (
                  <option key={s.slot_key} value={s.slot_key}>
                    {s.name} ({s.slot_key})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Ô nhập liệu mà khách hàng thao tác trên trang web.
              </p>
            </div>

            {/* 2. Chọn Sản Phẩm Kho Hàng */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                2. Sản Phẩm / Dịch Vụ Kho:
              </label>
              <select
                value={productNameId}
                onChange={(e) => setProductNameId(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-purple-500 rounded-xl px-3 py-2 text-slate-100 outline-none transition-all"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.package_name} (Kho #{p.id}) {p.category ? `• ${p.category}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Được đối chiếu từ mã sản phẩm trong đơn hàng của khách.
              </p>
            </div>

            {/* 3. Chọn Nhà Cung Cấp (NCC) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                3. Nhà Cung Cấp (NCC):
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-amber-500 rounded-xl px-3 py-2 text-slate-100 outline-none transition-all"
              >
                <option value="">✨ Áp dụng cho Mọi NCC (Quy tắc chung)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    NCC #{s.id} - {s.supplier_name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Nếu chọn NCC cụ thể, đơn mua từ NCC đó sẽ ưu tiên gọi riêng cổng này.
              </p>
            </div>

            {/* 4. Chọn Cổng Provider Đích */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                4. Cổng Provider Gọi Tương Ứng:
              </label>
              <select
                value={providerKey}
                onChange={(e) => setProviderKey(e.target.value)}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 outline-none transition-all"
                required
              >
                {providers.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.key}) • {p.category} {p.configured ? "✓" : "⚠️"}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Cổng API sẽ trực tiếp lấy OTP / kiểm tra bản quyền.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Độ ưu tiên (Priority):
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 1)}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
              />
              <p className="text-[10px] text-slate-500">Số nhỏ hơn sẽ được ưu tiên chạy trước (1 là cao nhất).</p>
            </div>

            {/* Ghi chú */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Ghi chú điều phối (Tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đơn Ades mua qua shop Ades, ưu tiên gọi Ades-otp..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Active switch */}
          <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200">Kích hoạt quy tắc này ngay lập tức</span>
              <p className="text-[11px] text-slate-500">
                Hệ thống sẽ lập tức định tuyến theo quy tắc này khi khách kiểm tra trên web.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
            </label>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>Đang lưu...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {editingRule ? "Lưu Thay Đổi" : "Tạo Quy Tắc Liên Kết"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
