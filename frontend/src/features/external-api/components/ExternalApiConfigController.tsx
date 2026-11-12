import React, { useState } from "react";
import { Loader2, Radio, Package, Layers } from "lucide-react";
import { useExternalApiConfig } from "@/features/external-api/hooks/useExternalApiConfig";
import { ExternalApiHeader } from "@/features/external-api/components/ExternalApiHeader";
import { ProviderCatalogTab } from "@/features/external-api/components/ProviderCatalogTab";
import { ProductApiMappingTab } from "@/features/external-api/components/ProductApiMappingTab";
import { OtpPortalSlotsTab } from "@/features/external-api/components/OtpPortalSlotsTab";

type ActiveTab = "providers" | "products" | "slots";

export const ExternalApiConfigController: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("providers");

  const {
    providers,
    filteredProviders,
    configuredCount,
    unconfiguredCount,
    categories,
    selectedCategory,
    setSelectedCategory,
    providerSearch,
    setProviderSearch,
    testInputs,
    setInput,
    testProvider,

    products,
    filteredProducts,
    productSearch,
    setProductSearch,
    productFilter,
    setProductFilter,
    availableApis,
    assignProvider,
    removeMapping,

    slots,
    addServiceToSlot,
    removeServiceFromSlot,
    moveServiceInSlot,
    toggleSlotEnabled,
    saveSlots,
    savingSlots,

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
        refreshing={refreshing}
        onRefresh={() => void load(true)}
      />

      {/* Modern Navigation Tabs */}
      <div className="border-b border-slate-800/80">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px scrollbar-none" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("providers")}
            className={`group inline-flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "providers"
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Radio className={`w-4 h-4 ${activeTab === "providers" ? "text-cyan-400 animate-pulse" : "text-slate-500 group-hover:text-slate-400"}`} />
            <span>Cổng Dịch Vụ & Thử Nghiệm</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                activeTab === "providers"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {providers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`group inline-flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "products"
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Package className={`w-4 h-4 ${activeTab === "products" ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"}`} />
            <span>Liên Kết Sản Phẩm</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                activeTab === "products"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`group inline-flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "slots"
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === "slots" ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"}`} />
            <span>Cấu Hình Ô Input Cổng OTP</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                activeTab === "slots"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {slots.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <main className="transition-all duration-200">
        {activeTab === "providers" && (
          <ProviderCatalogTab
            providers={providers}
            filteredProviders={filteredProviders}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={providerSearch}
            onSearchChange={setProviderSearch}
            testInputs={testInputs}
            onInputChange={setInput}
            onTestProvider={testProvider}
          />
        )}

        {activeTab === "products" && (
          <ProductApiMappingTab
            products={products}
            filteredProducts={filteredProducts}
            availableApis={availableApis}
            searchQuery={productSearch}
            onSearchChange={setProductSearch}
            productFilter={productFilter}
            onFilterChange={setProductFilter}
            onAssignProvider={assignProvider}
            onRemoveMapping={removeMapping}
          />
        )}

        {activeTab === "slots" && (
          <OtpPortalSlotsTab
            slots={slots}
            providers={providers}
            savingSlots={savingSlots}
            onAddService={addServiceToSlot}
            onRemoveService={removeServiceFromSlot}
            onMoveService={moveServiceInSlot}
            onToggleEnabled={toggleSlotEnabled}
            onSaveSlots={() => void saveSlots()}
          />
        )}
      </main>
    </div>
  );
};

export default ExternalApiConfigController;
