import { useCallback, useEffect, useState } from "react";
import { type OrderDatasetKey } from "@/constants";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import ViewOrderModal from "@/components/modals/ViewOrderModal/ViewOrderModal";
import EditOrderModal from "@/components/modals/EditOrderModal/EditOrderModal";
import CreateOrderModal from "@/components/modals/CreateOrderModal/CreateOrderModal";
import { useOrdersData, type EditableOrder } from "./hooks/useOrdersData";
import { formatCurrency } from "./utils/ordersHelpers";
import { OrdersPageHeader } from "./components/OrdersPageHeader";
import { OrdersDatasetTabs } from "./components/OrdersDatasetTabs";
import { OrdersStatsSection } from "./components/OrdersStatsSection";
import { OrdersFiltersBar } from "./components/OrdersFiltersBar";
import { OrdersTableSection } from "./components/OrdersTableSection";
import type { DashboardDateRangeValue } from "@/features/dashboard/components/DashboardDateRangeFilter";

export default function Orders() {
  const [datasetKey, setDatasetKey] = useState<OrderDatasetKey>("active");
  const [datasetCounts, setDatasetCounts] = useState<
    Record<OrderDatasetKey, number>
  >({
    active: 0,
    import: 0,
    expired: 0,
    canceled: 0,
  });
  const [orderDurationRange, setOrderDurationRange] =
    useState<DashboardDateRangeValue | null>(null);
  const {
    currentOrders,
    totalPages,
    updatedStats,
    filteredOrders,
    paginationPages,
    searchTerm,
    setSearchTerm,
    searchField,
    setSearchField,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    isModalOpen,
    isViewModalOpen,
    viewModalSource,
    isEditModalOpen,
    isCreateModalOpen,
    orderToView,
    orderToDelete,
    orderToEdit,
    createPrefill,
    openCreateModal,
    closeCreateModal,
    closeViewModal,
    closeEditModal,
    closeModal,
    handleViewOrder,
    handleEditOrder,
    handleDeleteOrder,
    handleSaveNewOrder,
    handleSaveEdit,
    handleConfirmRefund,
    handleCreateTopupOrderFromRefund,
    handleMarkPaid,
    handleRenewOrder,
    confirmDelete,
    fetchError,
    reloadOrders,
    totalRecords,
    renewingOrderCode,
  } = useOrdersData(datasetKey, { durationRange: orderDurationRange });

  useEffect(() => {
    setDatasetCounts((prev) => {
      if (prev[datasetKey] === totalRecords) {
        return prev;
      }
      return { ...prev, [datasetKey]: totalRecords };
    });
  }, [datasetKey, totalRecords]);

  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const handleToggleDetails = useCallback((orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  }, []);

  const isActiveDataset = datasetKey === "active" || datasetKey === "import";
  const showRemainingColumn = datasetKey !== "expired";
  const showActionButtons = true;
  const isCanceled = datasetKey === "canceled";
  const canEditOrder = datasetKey === "active" || datasetKey === "import";
  const canRenewOrder = datasetKey === "active" || datasetKey === "import";
  const remainingLabel = isCanceled ? "Giá Trị Còn Lại" : "Còn Lại";
  const showSupplierRefundColumn = isCanceled;
  const totalColumns = !showRemainingColumn
    ? 6
    : showSupplierRefundColumn
      ? 8
      : 7;
  const isExpiredDataset = datasetKey === "expired";

  return (
    <div className="space-y-4">
      <OrdersPageHeader fetchError={fetchError} onRetry={reloadOrders} />

      <OrdersDatasetTabs
        datasetKey={datasetKey}
        datasetCounts={datasetCounts}
        onSelectDataset={(nextDatasetKey) => {
          setDatasetKey(nextDatasetKey);
          setStatusFilter("all");
        }}
      />

      <OrdersStatsSection
        isExpiredDataset={isExpiredDataset}
        totalRecords={totalRecords}
        isCanceled={isCanceled}
        updatedStats={updatedStats}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <OrdersFiltersBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchField={searchField}
        setSearchField={setSearchField}
        isActiveDataset={isActiveDataset}
        openCreateModal={openCreateModal}
        durationRange={orderDurationRange}
        onDurationRangeChange={setOrderDurationRange}
      />

      <OrdersTableSection
        currentOrders={currentOrders}
        filteredOrdersLength={filteredOrders.length}
        expandedOrderId={expandedOrderId}
        showRemainingColumn={showRemainingColumn}
        showSupplierRefundColumn={showSupplierRefundColumn}
        showActionButtons={showActionButtons}
        isCanceled={isCanceled}
        canEditOrder={canEditOrder}
        canRenewOrder={canRenewOrder}
        totalColumns={totalColumns}
        remainingLabel={remainingLabel}
        renewingOrderCode={renewingOrderCode}
        totalPages={totalPages}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        paginationPages={paginationPages}
        onToggleDetails={handleToggleDetails}
        onView={handleViewOrder}
        onEdit={handleEditOrder}
        onDelete={handleDeleteOrder}
        onConfirmRefund={handleConfirmRefund}
        onCreateTopupOrderFromRefund={handleCreateTopupOrderFromRefund}
        onMarkPaid={handleMarkPaid}
        onRenew={handleRenewOrder}
        setCurrentPage={setCurrentPage}
        setRowsPerPage={setRowsPerPage}
      />

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa đơn hàng: ${orderToDelete?.id_order}?`}
      />
      <ViewOrderModal
        isOpen={isViewModalOpen}
        onClose={closeViewModal}
        order={orderToView}
        formatCurrency={formatCurrency}
        keepOrderPrice={viewModalSource === "create"}
      />
      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        order={orderToEdit}
        onSave={(data) => handleSaveEdit(data as EditableOrder)}
      />
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        prefillContext={createPrefill}
        orderCreationKind={datasetKey === "import" ? "import" : "sales"}
        onSave={(data) => {
          void handleSaveNewOrder(data);
        }}
      />
    </div>
  );
}
