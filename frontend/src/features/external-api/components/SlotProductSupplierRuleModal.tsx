import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers, Sliders, X } from "lucide-react";
import { BaseModal, CustomSelect, ToggleSwitch } from "@/shared/components";
import type {
  PortalSlotItem,
  PortalSlotRoutingRule,
  SupplierOption,
  SupplierVariantOption,
} from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";
import { useNotification } from "@/shared/context/NotificationContext";

const PROVIDER_KEY_ALIASES: Record<string, string> = {
  fix_ades: "ades",
};

const canonicalProviderKey = (providerKey: string) => PROVIDER_KEY_ALIASES[providerKey] || providerKey;

const ADOBE_ACCOUNT_SLOT: PortalSlotItem = {
  slot_key: "adobe_account",
  name: "Adobe — Lấy tài khoản (Yuna)",
  category: "adobe",
  assigned_services: ["yuna_2fa"],
  enabled: true,
};

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
  onDeleteSupplierVariant?: (supplierCostId: number) => Promise<boolean>;
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
  onDeleteSupplierVariant,
}) => {
  const notification = useNotification();
  const [slotKey, setSlotKey] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [providerKey, setProviderKey] = useState("");
  const [variantIds, setVariantIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mappingSlots = useMemo(() => slots.some((slot) => slot.slot_key === ADOBE_ACCOUNT_SLOT.slot_key)
    ? slots
    : [...slots, ADOBE_ACCOUNT_SLOT], [slots]);
  const selectedSlot = mappingSlots.find((slot) => slot.slot_key === slotKey);
  const slotOptions = useMemo(() => mappingSlots
    .filter((slot) => slot.slot_key === editingRule?.slot_key || slot.enabled !== false)
    .map((slot) => ({
      value: slot.slot_key,
      label: slot.slot_key === "adobe_check"
        ? "Adobe — Kiểm tra tài khoản (Ades)"
        : slot.slot_key === ADOBE_ACCOUNT_SLOT.slot_key
          ? ADOBE_ACCOUNT_SLOT.name
          : `${slot.name} (${slot.slot_key})`,
    })), [editingRule?.slot_key, mappingSlots]);
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
    return [...catalog.values()].filter((provider) => selectedSlot?.slot_key === ADOBE_ACCOUNT_SLOT.slot_key
      ? provider.key === "yuna_2fa"
      : assignedKeys.has(provider.key));
  }, [availableApis, providers, selectedSlot]);

  // Lọc danh sách NCC theo Ô Input: chỉ hiển thị các NCC có sản phẩm tương ứng với slot
  const filteredSuppliers = useMemo(() => {
    if (!selectedSlot) return suppliers.map((s) => ({ ...s, variantCount: 0 }));
    const slotIdentifier = `${selectedSlot.slot_key} ${selectedSlot.name} ${selectedSlot.category || ""}`.toLowerCase();

    const relevantVariants = supplierVariants.filter((v) => {
      const pName = (v.product_name || "").toLowerCase();
      const vName = (v.variant_display_name || "").toLowerCase();
      if (slotIdentifier.includes("adobe")) {
        return pName.includes("adobe") || vName.includes("adobe");
      }
      if (slotIdentifier.includes("netflix")) {
        return pName.includes("netflix") || vName.includes("netflix");
      }
      if (slotIdentifier.includes("gpt") || slotIdentifier.includes("openai") || slotIdentifier.includes("chatgpt")) {
        return pName.includes("gpt") || vName.includes("gpt") || pName.includes("openai") || vName.includes("openai");
      }
      return true;
    });

    const variantCountBySupplier = new Map<number, number>();
    relevantVariants.forEach((v) => {
      variantCountBySupplier.set(v.supplier_id, (variantCountBySupplier.get(v.supplier_id) || 0) + 1);
    });

    return suppliers
      .filter((supplier) => variantCountBySupplier.has(supplier.id))
      .map((supplier) => ({
        ...supplier,
        variantCount: variantCountBySupplier.get(supplier.id) || 0,
      }));
  }, [selectedSlot, supplierVariants, suppliers]);

  const selectedVariants = useMemo(() => {
    const list = supplierVariants.filter((variant) => variant.supplier_id === Number(supplierId));
    if (!selectedSlot) return list;
    const slotIdentifier = `${selectedSlot.slot_key} ${selectedSlot.name} ${selectedSlot.category || ""}`.toLowerCase();
    if (slotIdentifier.includes("adobe")) {
      return list.filter((v) => (v.product_name || "").toLowerCase().includes("adobe") || (v.variant_display_name || "").toLowerCase().includes("adobe"));
    }
    if (slotIdentifier.includes("netflix")) {
      return list.filter((v) => (v.product_name || "").toLowerCase().includes("netflix") || (v.variant_display_name || "").toLowerCase().includes("netflix"));
    }
    if (slotIdentifier.includes("gpt") || slotIdentifier.includes("openai") || slotIdentifier.includes("chatgpt")) {
      return list.filter((v) => {
        const pName = (v.product_name || "").toLowerCase();
        const vName = (v.variant_display_name || "").toLowerCase();
        return pName.includes("gpt") || vName.includes("gpt") || pName.includes("openai") || vName.includes("openai");
      });
    }
    return list;
  }, [selectedSlot, supplierId, supplierVariants]);
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
      setSlotKey(slotOptions[0]?.value || "");
      setSupplierId("");
      setProviderKey("");
      setVariantIds([]);
      setIsActive(true);
    }
    setError("");
  }, [editingRule, isOpen, routingRules, slotOptions]);

  useEffect(() => {
    if (!slotKey || editingRule) return;
    setProviderKey(providerOptions[0]?.key || "");
    setVariantIds([]);
    if (supplierId && !filteredSuppliers.some((s) => s.id === Number(supplierId))) {
      setSupplierId("");
    }
  }, [editingRule, filteredSuppliers, providerOptions, slotKey, supplierId]);

  if (!isOpen) return null;

  const toggleVariant = (variantId: number) => {
    setVariantIds((current) => current.includes(variantId)
      ? current.filter((id) => id !== variantId)
      : [...current, variantId]);
  };

  const removeVariant = (variantId: number) => {
    setVariantIds((current) => current.filter((id) => id !== variantId));
  };

  const handleDeleteSupplierVariant = (variant: SupplierVariantOption) => {
    if (!variant.supplier_cost_id || !onDeleteSupplierVariant) return;
    notification.confirm({
      title: "Xác Nhận Xóa Variant Khỏi NCC",
      message: `Bạn có chắc chắn muốn xóa variant "${variant.variant_display_name}" khỏi danh mục cung cấp của NCC này không?`,
      confirmText: "Xóa Variant",
      cancelText: "Hủy Bỏ",
      onConfirm: async () => {
        try {
          const success = await onDeleteSupplierVariant(variant.supplier_cost_id!);
          if (success) {
            setVariantIds((prev) => prev.filter((id) => id !== variant.variant_id));
            notification.success(`Variant "${variant.variant_display_name}" đã được xóa khỏi NCC thành công.`, "Đã Xóa Variant");
          }
        } catch (delError: any) {
          notification.error(delError?.message || "Không thể xóa variant khỏi NCC.", "Lỗi Xóa Variant");
        }
      },
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!slotKey || !supplierId || !providerKey || variantIds.length === 0) {
      setError("Hãy chọn Ô Input, NCC, Provider và ít nhất một variant.");
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      borderClassName="border-slate-700/80 shadow-cyan-950/40"
      title={editingRule ? "Chỉnh Sửa Liên Kết Variant" : "Tạo Liên Kết OTP Theo Variant"}
      subtitle="Ô Input Web → NCC cung cấp → Provider → Variant"
      icon={
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
          <Sliders className="w-5 h-5" />
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="slot-product-supplier-rule-form"
            disabled={submitting || isSharedTwoFactor}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all hover:brightness-110 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? "Đang lưu..." : "Lưu Liên Kết Variant"}
          </button>
        </>
      }
    >
      <form id="slot-product-supplier-rule-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200">{error}</div>}

        {/* Hàng 1: 1. Ô Input & 2. NCC (Lọc theo ô input) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">1. Ô Input trên Web OTP Portal</label>
            <CustomSelect
              value={slotKey}
              onChange={(val) => {
                setSlotKey(val);
                setSupplierId("");
                setProviderKey("");
                setVariantIds([]);
              }}
              disabled={Boolean(editingRule)}
              size="sm"
              accent="cyan"
              placeholder="-- Chọn ô input --"
              className="bg-slate-950"
              options={slotOptions}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">2. Nhà Cung Cấp (NCC)</label>
              {slotKey && (
                <span className="text-[11px] text-cyan-400 font-normal">
                  {filteredSuppliers.length} NCC cung cấp
                </span>
              )}
            </div>
            <CustomSelect
              value={supplierId ? String(supplierId) : ""}
              onChange={(val) => {
                setSupplierId(val ? Number(val) : "");
                setVariantIds([]);
              }}
              disabled={Boolean(editingRule) || isSharedTwoFactor || !slotKey}
              size="sm"
              accent="cyan"
              placeholder={
                !slotKey
                  ? "-- Chọn ô input trước --"
                  : filteredSuppliers.length === 0
                  ? "-- Không có NCC nào cung cấp sản phẩm này --"
                  : `-- Chọn NCC (${filteredSuppliers.length} NCC) --`
              }
              className="bg-slate-950"
              options={filteredSuppliers.map((supplier) => ({
                value: String(supplier.id),
                label: `${supplier.supplier_name} (${supplier.variantCount} variant)`,
              }))}
            />
          </div>
        </div>

        {/* Hàng 2: 3. Provider của ô input đã chọn */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">3. Provider của ô input đã chọn</label>
          <CustomSelect
            value={providerKey}
            onChange={(val) => setProviderKey(val)}
            disabled={Boolean(editingRule) || providerOptions.length === 0}
            size="sm"
            accent="cyan"
            searchable={false}
            placeholder={providerOptions.length ? "-- Chọn provider --" : "Ô input chưa có provider --"}
            className="bg-slate-950"
            options={providerOptions.map((provider) => ({
              value: provider.key,
              label: `${provider.name} (${provider.key})`,
            }))}
          />
        </div>

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
                  const isVariantActive = variant.is_active !== false;
                  return (
                    <div
                      key={variant.variant_id}
                      className={`group inline-flex items-center rounded-lg border text-xs transition-all overflow-hidden ${
                        selected
                          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-sm shadow-cyan-950/30"
                          : isVariantActive
                          ? "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleVariant(variant.variant_id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer text-left"
                      >
                        <Layers className={`w-3 h-3 shrink-0 ${isVariantActive ? "text-cyan-400" : "text-slate-500"}`} />
                        <span>{variant.variant_display_name}</span>
                        {!isVariantActive && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            Tắt
                          </span>
                        )}
                      </button>
                      {onDeleteSupplierVariant && variant.supplier_cost_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSupplierVariant(variant);
                          }}
                          title={`Xóa variant "${variant.variant_display_name}" khỏi NCC`}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-r-lg transition-colors border-l border-slate-800/80 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
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
          <ToggleSwitch
            checked={isActive}
            onChange={setIsActive}
            variant="cyan"
            size="md"
          />
        </div>
      </form>
    </BaseModal>
  );
};
