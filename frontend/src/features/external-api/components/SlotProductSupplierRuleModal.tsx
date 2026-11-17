import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers, Sliders, X } from "lucide-react";
import type {
  PortalSlotItem,
  PortalSlotRoutingRule,
  SupplierOption,
  SupplierVariantOption,
} from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";

const PROVIDER_KEY_ALIASES: Record<string, string> = {
  fix_ades: "ades",
};

const canonicalProviderKey = (providerKey: string) => PROVIDER_KEY_ALIASES[providerKey] || providerKey;

interface SlotProductSupplierRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    slotKey: string;
    supplierId: number;
    providerKey: string;
    variantIds: number[];
    isActive?: boolean;
  }) => Promise<boolean>;
  editingRule?: PortalSlotRoutingRule | null;
  routingRules: PortalSlotRoutingRule[];
  slots: PortalSlotItem[];
  suppliers: SupplierOption[];
  supplierVariants: SupplierVariantOption[];
  providers: Provider[];
  availableApis: Array<Record<string, unknown>>;
}

export const SlotProductSupplierRuleModal: React.FC<SlotProductSupplierRuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingRule,
  routingRules,
  slots,
  suppliers,
  supplierVariants,
  providers,
  availableApis,
}) => {
  const [slotKey, setSlotKey] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [providerKey, setProviderKey] = useState("");
  const [variantIds, setVariantIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedSlot = slots.find((slot) => slot.slot_key === slotKey);
  const providerOptions = useMemo(() => {
    const assignedKeys = new Set(
      (selectedSlot?.assigned_services || [selectedSlot?.primary_service_key, selectedSlot?.fallback_service_key])
        .filter((key): key is string => Boolean(key))
        .map(canonicalProviderKey)
    );
    const catalog = new Map<string, { key: string; name: string; category: string }>();
    providers.forEach((provider) => catalog.set(provider.key, {
      key: provider.key,
      name: provider.name,
      category: provider.category,
    }));
    availableApis.forEach((api) => {
      const key = String(api.provider_key || api.service_key || "");
      if (!key || catalog.has(key)) return;
      catalog.set(key, {
        key,
        name: String(api.service_name || key),
        category: String(api.category || "OTP"),
      });
    });
    return [...catalog.values()].filter((provider) => assignedKeys.has(provider.key));
  }, [availableApis, providers, selectedSlot]);

  const selectedVariants = useMemo(
    () => supplierVariants.filter((variant) => variant.supplier_id === Number(supplierId)),
    [supplierId, supplierVariants]
  );
  const isSharedTwoFactor = selectedSlot?.slot_key === "two_factor_totp";

  useEffect(() => {
    if (!isOpen) return;
    if (editingRule) {
      const group = routingRules.filter((rule) =>
        rule.slot_key === editingRule.slot_key
        && rule.supplier_id === editingRule.supplier_id
        && canonicalProviderKey(rule.provider_key) === canonicalProviderKey(editingRule.provider_key)
      );
      setSlotKey(editingRule.slot_key);
      setSupplierId(editingRule.supplier_id);
      setProviderKey(canonicalProviderKey(editingRule.provider_key));
      setVariantIds(group.map((rule) => rule.variant_id));
      setIsActive(editingRule.is_active !== false);
    } else {
      const firstSlot = slots[0];
      setSlotKey(firstSlot?.slot_key || "");
      setSupplierId("");
      setProviderKey("");
      setVariantIds([]);
      setIsActive(true);
    }
    setError("");
  }, [editingRule, isOpen, routingRules, slots]);

  useEffect(() => {
    if (!slotKey || editingRule) return;
    setProviderKey(providerOptions[0]?.key || "");
    setVariantIds([]);
  }, [editingRule, providerOptions, slotKey]);

  if (!isOpen) return null;

  const toggleVariant = (variantId: number) => {
    setVariantIds((current) => current.includes(variantId)
      ? current.filter((id) => id !== variantId)
      : [...current, variantId]);
  };

  const removeVariant = (variantId: number) => {
    setVariantIds((current) => current.filter((id) => id !== variantId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!slotKey || !providerKey || !supplierId || variantIds.length === 0) {
      setError("Hãy chọn Ô Input, Provider, NCC và ít nhất một variant.");
      return;
    }
    if (isSharedTwoFactor) {
      setError("Cổng TOTP dùng chung, không cần tạo liên kết NCC và variant.");
      return;
    }

    setSubmitting(true);
    try {
      if (await onSubmit({ slotKey, supplierId: Number(supplierId), providerKey, variantIds, isActive })) {
        onClose();
      }
    } catch (submitError: any) {
      setError(submitError.message || "Không thể lưu liên kết variant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4.5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{editingRule ? "Chỉnh Sửa Liên Kết Variant" : "Tạo Liên Kết OTP Theo Variant"}</h3>
              <p className="text-xs text-slate-400">Ô Input Web → Provider đã cấu hình → NCC → Variant</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {error && <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">1. Ô Input trên Web OTP Portal</span>
              <select
                value={slotKey}
                onChange={(event) => {
                  setSlotKey(event.target.value);
                  setProviderKey("");
                  setVariantIds([]);
                }}
                disabled={Boolean(editingRule)}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2 text-slate-100 outline-none disabled:opacity-60"
              >
                <option value="">-- Chọn ô input --</option>
                {slots.filter((slot) => slot.enabled !== false).map((slot) => <option key={slot.slot_key} value={slot.slot_key}>{slot.name} ({slot.slot_key})</option>)}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">2. Provider của ô input đã chọn</span>
              <select
                value={providerKey}
                onChange={(event) => {
                  setProviderKey(event.target.value);
                  setVariantIds([]);
                }}
                disabled={Boolean(editingRule) || providerOptions.length === 0}
                className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2 text-slate-100 outline-none disabled:opacity-60"
              >
                <option value="">{providerOptions.length ? "-- Chọn provider --" : "Ô input chưa có provider --"}</option>
                {providerOptions.map((provider) => <option key={provider.key} value={provider.key}>{provider.name} ({provider.key})</option>)}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-300">3. Nhà Cung Cấp (NCC)</span>
            <select
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value ? Number(event.target.value) : "");
                setVariantIds([]);
              }}
              disabled={Boolean(editingRule) || isSharedTwoFactor}
              className="w-full text-xs font-medium bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2 text-slate-100 outline-none disabled:opacity-60"
            >
              <option value="">-- Chọn NCC --</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}
            </select>
          </label>

          {isSharedTwoFactor ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">Cổng TOTP dùng chung, không tạo điều phối theo NCC và variant.</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">4. Variant của NCC</span>
                <span className="text-[11px] text-cyan-300">Đã chọn: {variantIds.length}</span>
              </div>
              {supplierId && selectedVariants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-xs text-slate-400">NCC này chưa có variant đang hoạt động để gán.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedVariants.map((variant) => {
                    const selected = variantIds.includes(variant.variant_id);
                    return (
                      <button
                        key={variant.variant_id}
                        type="button"
                        onClick={() => toggleVariant(variant.variant_id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${selected ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200"}`}
                      >
                        <Layers className="w-3 h-3" />
                        {variant.variant_display_name}
                      </button>
                    );
                  })}
                </div>
              )}
              {variantIds.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  {selectedVariants.filter((variant) => variantIds.includes(variant.variant_id)).map((variant) => (
                    <span key={variant.variant_id} className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-1 text-[11px] text-cyan-100">
                      {variant.variant_display_name}
                      <button type="button" onClick={() => removeVariant(variant.variant_id)} title="Loại variant" className="rounded text-cyan-300 hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div><span className="text-xs font-bold text-slate-200">Kích hoạt các liên kết này</span><p className="text-[11px] text-slate-500">On/Off từng variant vẫn chỉnh được ở bảng sau khi lưu.</p></div>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 accent-cyan-400" />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">Hủy bỏ</button>
            <button type="submit" disabled={submitting || isSharedTwoFactor} className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />{submitting ? "Đang lưu..." : "Lưu Liên Kết Variant"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
