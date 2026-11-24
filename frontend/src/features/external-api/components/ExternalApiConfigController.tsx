import React, { useState } from "react";
import { Loader2, Radio, Layers, Zap } from "lucide-react";
import { useExternalApiConfig } from "@/features/external-api/hooks/useExternalApiConfig";
import { ExternalApiHeader } from "@/features/external-api/components/ExternalApiHeader";
import { ProductApiMappingTab } from "@/features/external-api/components/ProductApiMappingTab";
import { OtpPortalSlotsTab } from "@/features/external-api/components/OtpPortalSlotsTab";

type ActiveTab = "slots" | "products";

export const ExternalApiConfigController: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("slots");

  const {
    providers,
    configuredCount,
    unconfiguredCount,
    testInputs,
    setInput,
    testProvider,

    slots,
    addServiceToSlot,
    removeServiceFromSlot,
    toggleSlotEnabled,
    updatingSlot,
    removingSlotProvider,

    routingRules,
    suppliers,
    supplierVariants,
    availableApis,
    createRoutingRule,
    updateRoutingRule,
    deleteRoutingRule,
    deleteSupplierVariant,
    toggleRoutingRuleActive,

    loading,
    refreshing,
    load,
  } = useExternalApiConfig();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm font-medium animate-pulse">Đang nạp cấu hình cổng API và OTP Gateway...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Hero Stats */}
      <ExternalApiHeader
        totalProviders={providers.length}
        configuredCount={configuredCount}
        unconfiguredCount={unconfiguredCount}
        totalSlots={slots.length}
        refreshing={refreshing || updatingSlot || Boolean(removingSlotProvider)}
        onRefresh={() => void load(true)}
      />

      {/* Modern Navigation Tabs (Gom thành 2 tab tinh gọn) */}
      <div className="border-b border-slate-800/80">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px scrollbar-none" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`group inline-flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "slots"
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Radio className={`w-4 h-4 ${activeTab === "slots" ? "text-cyan-400 animate-pulse" : "text-slate-500 group-hover:text-slate-400"}`} />
            <span>Cổng Dịch Vụ & Ô Input OTP</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                activeTab === "slots"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {slots.length} Ô Input
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`group inline-flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "products"
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Zap className={`w-4 h-4 ${activeTab === "products" ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"}`} />
            <span>Điều Phối OTP Variant</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                activeTab === "products"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {routingRules.length} Quy tắc
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <main className="transition-all duration-200">
        {activeTab === "slots" && (
          <OtpPortalSlotsTab
            slots={slots}
            providers={providers}
            updatingSlot={updatingSlot}
            removingSlotProvider={removingSlotProvider}
            onAddService={addServiceToSlot}
            onRemoveService={removeServiceFromSlot}
            onToggleEnabled={toggleSlotEnabled}
            testInputs={testInputs}
            onInputChange={setInput}
            onTestProvider={testProvider}
          />
        )}

        {activeTab === "products" && (
          <ProductApiMappingTab
            slots={slots}
            routingRules={routingRules}
            suppliers={suppliers}
            supplierVariants={supplierVariants}
            providers={providers}
            availableApis={availableApis}
            onCreateRoutingRule={createRoutingRule}
            onUpdateRoutingRule={updateRoutingRule}
            onDeleteRoutingRule={deleteRoutingRule}
            onToggleRoutingRuleActive={toggleRoutingRuleActive}
            onDeleteSupplierVariant={deleteSupplierVariant}
          />
        )}
      </main>
    </div>
  );
};

export default ExternalApiConfigController;
