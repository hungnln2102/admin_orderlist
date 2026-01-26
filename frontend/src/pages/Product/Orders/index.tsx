import { useCallback, useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  ORDER_DATASET_CONFIG,
  ORDER_DATASET_SEQUENCE,
  ORDER_FIELDS,
  ORDER_STATUSES,
  Order,
  OrderDatasetKey,
} from "../../../constants";
import GradientButton from "../../../components/ui/GradientButton";
import StatCard from "../../../components/ui/StatCard";
import ConfirmModal from "../../../components/modals/ConfirmModal/ConfirmModal";
import ViewOrderModal from "../../../components/modals/ViewOrderModal/ViewOrderModal";
import EditOrderModal from "../../../components/modals/EditOrderModal/EditOrderModal";
import CreateOrderModal from "../../../components/modals/CreateOrderModal/CreateOrderModal";
import { useOrdersData, EditableOrder } from "./hooks/useOrdersData";
import { OrderRow } from "./components/OrderRow";
import { OrderCard } from "./components/OrderCard";
import { ResponsiveTable, TableCard } from "../../../components/ui/ResponsiveTable";
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
  const showActionButtons = true; // Luôn hiện nút thao tác cho mọi tap (theo yêu cầu)
  const isCanceled = datasetKey === "canceled";
  const remainingLabel = isCanceled ? "Giá Trị Còn Lại" : "Còn Lại";
  const totalColumns = showRemainingColumn ? 7 : 6;

  return (
    <div className="space-y-4">
      {fetchError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="font-medium">{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={reloadOrders}
            className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-100 transition hover:bg-rose-500/30 active:scale-95"
          >
            Thử Lại
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Quản Lý <span className="text-indigo-400">Đơn Hàng</span></h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Control and monitor all customer transactions
          </p>
        </div>
      </div>

      <div className="rounded-[32px] glass-panel-dark p-4 shadow-2xl border border-white/5">
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
                className={`flex items-center justify-between rounded-2xl px-6 py-4 text-left transition-all duration-300 border ${
                  isActive
                    ? "bg-gradient-to-br from-indigo-500/80 to-purple-600/80 text-white border-white/20 shadow-[0_12px_40px_-12px_rgba(99,102,241,0.5)] scale-[1.02]"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 border-white/5 hover:text-slate-200"
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

      <div className="rounded-[24px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search Input Group - Now Flexible */}
          <div className="relative w-full lg:flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng, khách hàng..."
              className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              style={{ paddingLeft: '3.25rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Group */}
          <div className="flex w-full lg:w-auto gap-3 items-center">
            {/* Divider (Desktop Only) */}
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>

            <div className="relative w-full lg:w-[170px]">
              <select
                className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
                style={{ 
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")', 
                  backgroundPosition: 'right 1rem center', 
                  backgroundRepeat: 'no-repeat', 
                  backgroundSize: '1.1rem', 
                  paddingRight: '2.5rem' 
                }}
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
              >
                {SEARCH_FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full lg:w-[220px]">
              <select
                className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
                style={{ 
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")', 
                  backgroundPosition: 'right 1rem center', 
                  backgroundRepeat: 'no-repeat', 
                  backgroundSize: '1.1rem', 
                  paddingRight: '2.5rem' 
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all" className="bg-slate-900 text-white">Tất cả trạng thái</option>
                <option value={ORDER_STATUSES.DA_THANH_TOAN} className="bg-slate-900 text-white">Đã thanh toán</option>
                <option value={ORDER_STATUSES.CHUA_THANH_TOAN} className="bg-slate-900 text-white">Chưa thanh toán</option>
                <option value={ORDER_STATUSES.DANG_XU_LY} className="bg-slate-900 text-white">Đang xử lý</option>
                <option value={ORDER_STATUSES.CAN_GIA_HAN} className="bg-slate-900 text-white">Cần gia hạn</option>
                <option value={ORDER_STATUSES.ORDER_EXPIRED} className="bg-slate-900 text-white">Hết hạn</option>
              </select>
            </div>
          </div>

          {/* Action Group */}
          <div className="w-full lg:w-auto">
            {isActiveDataset && (
              <GradientButton icon={PlusIcon} onClick={openCreateModal}>
                Tạo Đơn Hàng Mới
              </GradientButton>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable
          showCardOnMobile={true}
          cardView={
            currentOrders.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-white/70 text-lg mb-2">
                  Không tìm thấy đơn hàng
                </div>
                <div className="text-white/60">
                  Thử thay đổi bộ lọc tìm kiếm
                </div>
              </div>
            ) : (
              <TableCard
                data={currentOrders}
                renderCard={(order) => (
                  <OrderCard
                    order={order as Order}
                    showRemainingColumn={showRemainingColumn}
                    showActionButtons={showActionButtons}
                    isCanceled={isCanceled}
                    renewingOrderCode={renewingOrderCode}
                    onView={handleViewOrder}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                    onConfirmRefund={handleConfirmRefund}
                    onMarkPaid={handleMarkPaid}
                    onRenew={handleRenewOrder}
                  />
                )}
                className="p-2"
              />
            )
          }
        >
          <table className="min-w-full border-separate border-spacing-y-4 text-white">
            <thead>
              <tr className="[&>th]:px-5 [&>th]:pb-2 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.2em] [&>th]:text-indigo-300/70 [&>th]:text-center">
                <th className="w-[150px]">ORDER / SẢN PHẨM</th>
                <th className="w-[140px]">THÔNG TIN ĐƠN</th>
                <th className="w-[150px]">KHÁCH HÀNG</th>
                <th className="w-[150px]">LỊCH TRÌNH</th>
                {showRemainingColumn && (
                  <th className="w-[100px] whitespace-nowrap">{remainingLabel}</th>
                )}
                <th className="w-[120px]">TRẠNG THÁI</th>
                <th className="w-[100px] text-right pr-8">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="">
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
        </ResponsiveTable>

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
