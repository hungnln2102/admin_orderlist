import React, { useCallback, useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  ORDER_DATASET_CONFIG,
  ORDER_DATASET_SEQUENCE,
  ORDER_FIELDS,
  ORDER_STATUSES,
  OrderDatasetKey,
} from "../../../constants";
import GradientButton from "../../../components/ui/GradientButton";
import StatCard from "../../../components/ui/StatCard";
import ConfirmModal from "../../../components/modals/ConfirmModal";
import ViewOrderModal from "../../../components/modals/ViewOrderModal";
import EditOrderModal from "../../../components/modals/EditOrderModal";
import CreateOrderModal from "../../../components/modals/CreateOrderModal";
import { useOrdersData, EditableOrder } from "./hooks/useOrdersData";
import { OrderRow } from "./components/OrderRow";
import { formatCurrency } from "./utils/ordersHelpers";

const SEARCH_FIELD_OPTIONS = [
  { value: "all", label: "Tất cả cột" },
  { value: ORDER_FIELDS.ID_ORDER, label: "Mã Đơn Hàng" },
  { value: ORDER_FIELDS.ID_PRODUCT, label: "Sản Phẩm" },
  { value: ORDER_FIELDS.INFORMATION_ORDER, label: "Thông tin" },
  { value: ORDER_FIELDS.CUSTOMER, label: "Khách Hàng" },
  { value: ORDER_FIELDS.SLOT, label: "Slot" },
  { value: ORDER_FIELDS.SUPPLY, label: "Nguồn" },
] as const;

export default function Orders() {
  const [datasetKey, setDatasetKey] = useState<OrderDatasetKey>("active");
  const [datasetCounts, setDatasetCounts] = useState<
    Record<OrderDatasetKey, number>
  >({
    active: 0,
    expired: 0,
    canceled: 0,
  });
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
    isEditModalOpen,
    isCreateModalOpen,
    orderToView,
    orderToDelete,
    orderToEdit,
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
    handleMarkPaid,
    handleRenewOrder,
    confirmDelete,
    fetchError,
    reloadOrders,
    totalRecords,
    renewingOrderCode,
  } = useOrdersData(datasetKey);

  useEffect(() => {
    setDatasetCounts((prev) => {
      if (prev[datasetKey] === totalRecords) {
        return prev;
      }
      return { ...prev, [datasetKey]: totalRecords };
    });
  }, [datasetKey, totalRecords]);

  const isActiveDataset = datasetKey === "active";

  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const handleToggleDetails = useCallback((orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  }, []);

  const showRemainingColumn = datasetKey !== "expired";
  const showActionButtons = datasetKey !== "expired";
  const isCanceled = datasetKey === "canceled";
  const remainingLabel = isCanceled ? "Giá Trị Còn Lại" : "Còn Lại";
  const totalColumns = showRemainingColumn ? 7 : 6;

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={reloadOrders}
            className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100"
          >
            Thử Lại
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Đơn Hàng</h1>
          <p className="mt-1 text-sm text-gray-200">
            Quản lý và theo dõi tất cả các đơn hàng của khách hàng
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {isActiveDataset && (
            <GradientButton icon={PlusIcon} onClick={openCreateModal}>
              Tạo Đơn Hàng Mới
            </GradientButton>
          )}
        </div>
      </div>

      <div className="rounded-[28px] bg-gradient-to-r from-indigo-200/60 via-indigo-300/55 to-slate-200/45 p-4 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.5),0_14px_32px_-24px_rgba(255,255,255,0.25)] border border-white/20">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ORDER_DATASET_SEQUENCE.map((key) => {
            const datasetKeyValue = key as OrderDatasetKey;
            const config = ORDER_DATASET_CONFIG[datasetKeyValue];

            const isActive = datasetKey === datasetKeyValue;

            const count = datasetCounts[datasetKeyValue] ?? 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setDatasetKey(datasetKeyValue)}
                className={`flex items-center justify-between rounded-2xl px-5 py-4 text-left transition shadow-[0_12px_28px_-16px_rgba(0,0,0,0.65),0_8px_22px_-18px_rgba(255,255,255,0.12)] ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white ring-1 ring-white/25"
                    : "bg-indigo-700/70 text-indigo-100 hover:bg-indigo-600/80 ring-1 ring-white/10"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {config.label}
                  </p>

                  <p className="text-xs text-indigo-100/80">
                    {config.description}
                  </p>
                </div>

                <div className="text-2xl font-bold text-lime-200 drop-shadow">
                  {count.toLocaleString("vi-VN")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-6 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {updatedStats.map((stat) => (
            <StatCard
              key={stat.name}
              title={stat.name}
              value={stat.value}
              icon={stat.icon}
              accent={stat.accent}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng, khách hàng..."
              className="w-full pl-10 pr-44 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <select
                className="min-w-[140px] md:min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
              >
                {SEARCH_FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value={ORDER_STATUSES.DA_THANH_TOAN}>
                Đã thanh toán
              </option>
              <option value={ORDER_STATUSES.CHUA_THANH_TOAN}>
                Chưa thanh toán
              </option>
              <option value={ORDER_STATUSES.CAN_GIA_HAN}>Cần gia hạn</option>
              <option value={ORDER_STATUSES.ORDER_EXPIRED}>Hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 table-fixed text-white">
            <thead className="bg-slate-900/90">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  ORDER/SẢN PHẨM
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[140px] whitespace-nowrap truncate">
                  THÔNG TIN ĐƠN HÀNG
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  KHÁCH HÀNG
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  HẠN ĐƠN HÀNG
                </th>
                {showRemainingColumn && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[60px] whitespace-nowrap truncate">
                    {remainingLabel}
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[90px] whitespace-nowrap truncate">
                  TRẠNG THÁI
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-[90px] whitespace-nowrap truncate">
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={totalColumns} className="text-center py-12">
                    <div className="text-white/70 text-lg mb-2">
                      Không tìm thấy đơn hàng
                    </div>
                    <div className="text-white/60">
                      Thử thay đổi bộ lọc tìm kiếm
                    </div>
                  </td>
                </tr>
              ) : (
                currentOrders.map((order, index) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    index={index}
                    isExpanded={expandedOrderId === order.id}
                    showRemainingColumn={showRemainingColumn}
                    showActionButtons={showActionButtons}
                    isActiveDataset={isActiveDataset}
                    isCanceled={isCanceled}
                    totalColumns={totalColumns}
                    renewingOrderCode={renewingOrderCode}
                    onToggleDetails={handleToggleDetails}
                    onView={handleViewOrder}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                    onConfirmRefund={handleConfirmRefund}
                    onMarkPaid={handleMarkPaid}
                    onRenew={handleRenewOrder}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 text-white px-4 py-3 sm:px-6">
            <div className="flex items-center space-x-2 text-sm text-white/80">
              <span>Hiển thị</span>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rounded-md border border-white/20 bg-slate-900/70 py-1 pl-2 pr-7 text-white focus:border-indigo-400 focus:ring-indigo-400"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>dòng</span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang đầu"
              >
                {"<<"}
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang trước"
              >
                {"<"}
              </button>
              <div className="flex items-center gap-1">
                {paginationPages.map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-3 py-1 text-white/50"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      disabled={p === currentPage}
                      className={`h-9 min-w-[36px] rounded-lg px-3 text-sm font-semibold transition border ${
                        p === currentPage
                          ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40"
                          : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang sau"
              >
                {">"}
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang cuối"
              >
                {">>"}
              </button>
            </div>
          </div>
        )}
      </div>

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
        onSave={(data) => {
          void handleSaveNewOrder(data);
        }}
      />
    </div>
  );
}
