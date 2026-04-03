import { useState } from "react";
import type { PromoCodeItem } from "./types";
import { PromoTabSwitch } from "./components/PromoTabSwitch";
import { PromoCodesListSection } from "./components/PromoCodesListSection";
import { PromoUsageHistorySection } from "./components/PromoUsageHistorySection";
import { usePromoCodeList } from "./hooks/usePromoCodeList";
import { usePromoUsageHistory } from "./hooks/usePromoUsageHistory";

type PromoTab = "list" | "history";

export default function PromoCodes() {
  const [activeTab, setActiveTab] = useState<PromoTab>("list");
  const promoList = usePromoCodeList();
  const promoHistory = usePromoUsageHistory();

  const handleView = (item: PromoCodeItem) => {
    console.log("View", item);
  };

  const handleEdit = (item: PromoCodeItem) => {
    console.log("Edit", item);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Mã <span className="text-indigo-400">khuyến mãi</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Quản lý mã giảm giá, chiết khấu và điều kiện áp dụng
          </p>
        </div>
      </div>

      <PromoTabSwitch
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === "list") {
            promoList.setCurrentPage(1);
            return;
          }
          promoHistory.setCurrentPage(1);
        }}
      />

      {activeTab === "list" ? (
        <PromoCodesListSection
          searchTerm={promoList.searchTerm}
          setSearchTerm={promoList.setSearchTerm}
          statusFilter={promoList.statusFilter}
          setStatusFilter={promoList.setStatusFilter}
          loading={promoList.loading}
          error={promoList.error}
          items={promoList.items}
          currentRows={promoList.currentRows}
          totalItems={promoList.totalItems}
          start={promoList.start}
          currentPage={promoList.currentPage}
          pageSize={promoList.pageSize}
          onPageChange={promoList.setCurrentPage}
          onView={handleView}
          onEdit={handleEdit}
        />
      ) : (
        <PromoUsageHistorySection
          searchTerm={promoHistory.searchTerm}
          setSearchTerm={promoHistory.setSearchTerm}
          currentRows={promoHistory.currentRows}
          totalItems={promoHistory.totalItems}
          start={promoHistory.start}
          currentPage={promoHistory.currentPage}
          pageSize={promoHistory.pageSize}
          onPageChange={promoHistory.setCurrentPage}
        />
      )}
    </div>
  );
}
