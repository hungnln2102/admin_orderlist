import React, { useMemo, useState } from "react";
import { CustomSelect, ToggleSwitch } from "@/shared/components";
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  Building2,
  Zap,
  Layers,
  Radio,
  X,
} from "lucide-react";
import type {
  PortalSlotItem,
  PortalSlotRoutingRule,
  SupplierOption,
  SupplierVariantOption,
} from "@/features/external-api/types";
import type { Provider } from "@/features/external-api/hooks/useExternalApiConfig";
import { useNotification } from "@/shared/context/NotificationContext";
import { SlotProductSupplierRuleModal } from "@/features/external-api/components/SlotProductSupplierRuleModal";

interface ProductApiMappingTabProps {
  slots?: PortalSlotItem[];
  routingRules?: PortalSlotRoutingRule[];
  suppliers?: SupplierOption[];
  supplierVariants?: SupplierVariantOption[];
  providers?: Provider[];
  availableApis?: any[];
  onCreateRoutingRule?: (data: any) => Promise<boolean>;
  onUpdateRoutingRule?: (id: number, data: any) => Promise<boolean>;
  onDeleteRoutingRule?: (id: number) => Promise<boolean>;
  onToggleRoutingRuleActive?: (id: number, currentActive: boolean) => Promise<boolean>;
  onDeleteSupplierVariant?: (supplierCostId: number) => Promise<boolean>;
}

interface GroupedRoutingRule {
  groupKey: string;
  slot_key: string;
  slotLabel: string;
  supplier_id: number;
  supplier_name: string;
  provider_key: string;
  provider_name: string;
  is_active: boolean;
  rules: PortalSlotRoutingRule[];
  representativeRule: PortalSlotRoutingRule;
}

export const ProductApiMappingTab: React.FC<ProductApiMappingTabProps> = ({
  slots = [],
  routingRules = [],
  suppliers = [],
  supplierVariants = [],
  providers = [],
  availableApis = [],
  onCreateRoutingRule,
  onUpdateRoutingRule,
  onDeleteRoutingRule,
  onToggleRoutingRuleActive,
  onDeleteSupplierVariant,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PortalSlotRoutingRule | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>("ALL");

  const notification = useNotification();

  // Gom các routing rules có cùng (slot_key, supplier_id, provider_key) thành 1 nhóm
  const groupedRules = useMemo<GroupedRoutingRule[]>(() => {
    const map = new Map<string, GroupedRoutingRule>();

    for (const rule of routingRules) {
      const groupKey = `${rule.slot_key}__${rule.supplier_id}__${rule.provider_key}`;
      const slotItem = slots.find((s) => s.slot_key === rule.slot_key);
      const slotLabel = slotItem?.name || rule.slot_key;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          slot_key: rule.slot_key,
          slotLabel,
          supplier_id: rule.supplier_id,
          supplier_name: rule.supplier_name,
          provider_key: rule.provider_key,
          provider_name: rule.provider_name || rule.provider_key,
          is_active: rule.is_active,
          rules: [rule],
          representativeRule: rule,
        });
      } else {
        const group = map.get(groupKey)!;
        group.rules.push(rule);
        if (rule.is_active) {
          group.is_active = true;
        }
      }
    }

    return Array.from(map.values());
  }, [routingRules, slots]);

  const activeGroupCount = groupedRules.filter((g) => g.is_active).length;
  const inactiveGroupCount = groupedRules.length - activeGroupCount;

  // Lọc danh sách nhóm quy tắc điều phối
  const filteredGroups = useMemo(() => {
    return groupedRules.filter((group) => {
      // 1. Lọc theo trạng thái
      if (statusFilter === "ACTIVE" && !group.is_active) return false;
      if (statusFilter === "INACTIVE" && group.is_active) return false;

      // 2. Lọc theo Ô Input
      if (selectedSlotFilter !== "ALL" && group.slot_key !== selectedSlotFilter) return false;

      // 3. Tìm kiếm theo từ khóa
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchesSlot =
        group.slot_key.toLowerCase().includes(q) ||
        group.slotLabel.toLowerCase().includes(q);
      const matchesSupplier = (group.supplier_name || "").toLowerCase().includes(q);
      const matchesProvider =
        (group.provider_name || "").toLowerCase().includes(q) ||
        (group.provider_key || "").toLowerCase().includes(q);
      const matchesVariant = group.rules.some(
        (r) =>
          (r.variant_display_name || "").toLowerCase().includes(q) ||
          (r.variant_name || "").toLowerCase().includes(q)
      );

      return matchesSlot || matchesSupplier || matchesProvider || matchesVariant;
    });
  }, [groupedRules, statusFilter, selectedSlotFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: GroupedRoutingRule) => {
    setEditingRule(group.representativeRule);
    setIsModalOpen(true);
  };

  // Bật/Tắt toàn bộ variant trong nhóm
  const handleToggleGroupActive = async (group: GroupedRoutingRule) => {
    if (!onToggleRoutingRuleActive) return;
    try {
      await Promise.all(
        group.rules.map((rule) =>
          onToggleRoutingRuleActive(rule.id, group.is_active)
        )
      );
    } catch (err: any) {
      notification.error(err?.message || "Không thể cập nhật trạng thái nhóm quy tắc.", "Lỗi");
    }
  };

  // Xóa toàn bộ liên kết của NCC trên ô input đó
  const handleDeleteGroup = (group: GroupedRoutingRule) => {
    if (!onDeleteRoutingRule) return;
    notification.confirm({
      title: "Xác Nhận Xóa Liên Kết NCC",
      message: `Bạn có chắc muốn xóa liên kết cổng "${group.provider_name}" của NCC "${group.supplier_name}" trên ô input "${group.slotLabel}" (bao gồm ${group.rules.length} variant) không?`,
      confirmText: "Xóa Toàn Bộ",
      cancelText: "Hủy Bỏ",
      onConfirm: async () => {
        try {
          await Promise.all(group.rules.map((rule) => onDeleteRoutingRule(rule.id)));
          notification.success("Đã xóa liên kết điều phối của NCC thành công.", "Thành Công");
        } catch (err: any) {
          notification.error(err?.message || "Không thể xóa quy tắc.", "Lỗi Xóa Quy Tắc");
        }
      },
    });
  };

  // Xóa riêng 1 variant khỏi nhóm
  const handleDeleteSingleVariantRule = (rule: PortalSlotRoutingRule) => {
    if (!onDeleteRoutingRule) return;
    notification.confirm({
      title: "Xác Nhận Gỡ Variant",
      message: `Bạn có chắc muốn gỡ variant "${rule.variant_display_name}" khỏi liên kết cổng này không?`,
      confirmText: "Gỡ Variant",
      cancelText: "Hủy Bỏ",
      onConfirm: async () => {
        try {
          const success = await onDeleteRoutingRule(rule.id);
          if (success) {
            notification.success(`Đã gỡ variant "${rule.variant_display_name}".`, "Thành Công");
          }
        } catch (err: any) {
          notification.error(err?.message || "Không thể gỡ variant.", "Lỗi");
        }
      },
    });
  };

  const handleModalSubmit = async (data: any) => {
    // Dù tạo mới hay chỉnh sửa nhóm variant, gọi onCreateRoutingRule (saveRoutingRuleVariants) để đồng bộ trọn bộ danh sách variantIds
    if (onCreateRoutingRule) {
      return await onCreateRoutingRule(data);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Top Context Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/30 border border-slate-800/90 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Điều Phối Cổng OTP Theo Ô Input, NCC & Variant
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              portal_slot_routing_rules
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Hệ thống định tuyến chuẩn xác 4 yếu tố:{" "}
            <strong className="text-cyan-300">[Ô Input Web Portal]</strong> &rarr;{" "}
            <strong className="text-amber-300">[Nhà Cung Cấp]</strong> &rarr;{" "}
            <strong className="text-purple-300">[Variant của NCC]</strong> &rarr;{" "}
            <strong className="text-emerald-300">[Cổng Provider Đích]</strong>. Mỗi NCC được gom thành 1 dòng với các thẻ variant nhỏ gọn gàng.
          </p>
        </div>

        {/* Action Buttons & Summary Stats */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Liên Kết Ô Input & NCC</span>
          </button>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400">Tổng liên kết: </span>
            <strong className="text-white font-bold">{groupedRules.length} NCC</strong>
            <span className="text-slate-500 text-[11px]">({routingRules.length} variants)</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Ô Input, NCC, Variant hoặc Provider..."
            className="w-full pl-10 pr-12 py-2 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter theo Ô Input */}
          <div className="w-full sm:w-56">
            <CustomSelect
              value={selectedSlotFilter}
              onChange={setSelectedSlotFilter}
              size="sm"
              accent="cyan"
              className="bg-slate-950 font-semibold"
              options={[
                { value: "ALL", label: `Tất cả Ô Input (${slots.length})` },
                ...slots.map((slot) => ({
                  value: slot.slot_key,
                  label: `${slot.name} (${slot.slot_key})`,
                })),
              ]}
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Tất cả ({groupedRules.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Đang bật ({activeGroupCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === "INACTIVE"
                  ? "bg-rose-500 text-slate-950 shadow-md shadow-rose-500/25"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              Đang tắt ({inactiveGroupCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card: Grouped Routing Rules List */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-slate-950/30">
        <div className="overflow-x-auto">
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-3">
              <Sliders className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                {groupedRules.length === 0
                  ? "Chưa có quy tắc điều phối provider nào."
                  : "Không tìm thấy quy tắc điều phối nào phù hợp với bộ lọc."}
              </p>
              {groupedRules.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setSelectedSlotFilter("ALL");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-cyan-300 hover:bg-slate-700 cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-semibold w-16 text-center">STT</th>
                  <th className="px-4 py-3.5 font-semibold w-48">1. Ô Input Web Portal</th>
                  <th className="px-4 py-3.5 font-semibold w-36">2. Nhà Cung Cấp (NCC)</th>
                  <th className="px-4 py-3.5 font-semibold">3. Variant của NCC</th>
                  <th className="px-4 py-3.5 font-semibold w-44">4. Cổng Provider Đích</th>
                  <th className="px-4 py-3.5 font-semibold text-center w-28">Trạng Thái</th>
                  <th className="px-4 py-3.5 font-semibold text-right w-24">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredGroups.map((group, index) => {
                  return (
                    <tr
                      key={group.groupKey}
                      className={`transition-colors ${
                        group.is_active
                          ? "hover:bg-slate-800/40"
                          : "opacity-60 bg-slate-950/30 hover:bg-slate-800/30"
                      }`}
                    >
                      {/* STT */}
                      <td className="px-4 py-3.5 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>

                      {/* 1. Ô Input Web Portal */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-200">{group.slotLabel}</div>
                        <div className="text-[10px] font-mono text-cyan-400/80 mt-0.5">
                          {group.slot_key}
                        </div>
                      </td>

                      {/* 2. Nhà Cung Cấp */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 whitespace-nowrap">
                          <Building2 className="w-3.5 h-3.5" />
                          {group.supplier_name}
                        </span>
                      </td>

                      {/* 3. Variant của NCC (Gom thành các tag nhỏ) */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-2xl">
                          {group.rules.map((rule) => (
                            <span
                              key={rule.id}
                              className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                                rule.is_active
                                  ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/25 hover:border-cyan-400/50"
                                  : "bg-slate-800/60 text-slate-400 border-slate-700/60 line-through"
                              }`}
                              title={`Variant ID: ${rule.variant_id} - ${rule.variant_display_name} (${rule.is_active ? "Đang bật" : "Đang tắt"})`}
                            >
                              <Layers className={`w-3 h-3 shrink-0 ${rule.is_active ? "text-cyan-400" : "text-slate-500"}`} />
                              <span>{rule.variant_display_name}</span>
                              {onDeleteRoutingRule && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingleVariantRule(rule);
                                  }}
                                  title={`Gỡ variant "${rule.variant_display_name}" khỏi liên kết`}
                                  className="ml-0.5 p-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-500 font-mono ml-1">
                            ({group.rules.length} variant)
                          </span>
                        </div>
                      </td>

                      {/* 4. Cổng Provider Đích */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap">
                          <Radio className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{group.provider_name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 ml-5 block whitespace-nowrap">
                          key: {group.provider_key}
                        </span>
                      </td>

                      {/* Trạng thái On/Off Nhóm */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <ToggleSwitch
                            checked={group.is_active}
                            onChange={() => void handleToggleGroupActive(group)}
                            variant="cyan"
                            size="sm"
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              group.is_active ? "text-cyan-300" : "text-slate-500"
                            }`}
                          >
                            {group.is_active ? "Bật" : "Tắt"}
                          </span>
                        </div>
                      </td>

                      {/* Thao tác (Sửa / Xóa Nhóm) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(group)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Chỉnh sửa toàn bộ variant của NCC này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xóa liên kết của NCC này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Setup Rule */}
      <SlotProductSupplierRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingRule={editingRule}
        routingRules={routingRules}
        slots={slots}
        supplierVariants={supplierVariants}
        suppliers={suppliers}
        providers={providers}
        availableApis={availableApis}
        onDeleteSupplierVariant={onDeleteSupplierVariant}
      />
    </div>
  );
};
