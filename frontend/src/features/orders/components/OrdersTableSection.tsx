import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import type { Order } from "@/constants";
import { OrderCard } from "./OrderCard";
import { OrderRow } from "./OrderRow";
import { OrdersPagination } from "./OrdersPagination";

type OrdersTableSectionProps = {
  currentOrders: Order[];
  filteredOrdersLength: number;
  expandedOrderId: number | null;
  showRemainingColumn: boolean;
  /** Chỉ tab Hoàn tiền — cột Hoàn từ NCC */
  showSupplierRefundColumn: boolean;
  showActionButtons: boolean;
  isCanceled: boolean;
  canEditOrder: boolean;
  canRenewOrder: boolean;
  totalColumns: number;
  remainingLabel: string;
  renewingOrderCode: string | null;
  completingOrderCode: string | null;
  totalPages: number;
  currentPage: number;
  rowsPerPage: number;
  paginationPages: Array<number | string>;
  onToggleDetails: (orderId: number) => void;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onConfirmRefund: (order: Order) => void;
  onCreateTopupOrderFromRefund: (order: Order) => void;
  onMarkPaid: (order: Order) => void;
  onRenew: (order: Order) => void;
  setCurrentPage: (value: number | ((prev: number) => number)) => void;
  setRowsPerPage: (value: number) => void;
};

function OrdersEmptyState() {
  return (
    <div className="p-4 text-center">
      <div className="text-white/70 text-lg mb-2">Không tìm thấy đơn hàng</div>
      <div className="text-white/60">Thử thay đổi bộ lọc tìm kiếm</div>
    </div>
  );
}

export function OrdersTableSection({
  currentOrders,
  filteredOrdersLength,
  expandedOrderId,
  showRemainingColumn,
  showSupplierRefundColumn,
  showActionButtons,
  isCanceled,
  canEditOrder,
  canRenewOrder,
  totalColumns,
  remainingLabel,
  renewingOrderCode,
  completingOrderCode,
  totalPages,
  currentPage,
  rowsPerPage,
  paginationPages,
  onToggleDetails,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
  onCreateTopupOrderFromRefund,
  onMarkPaid,
  onRenew,
  setCurrentPage,
  setRowsPerPage,
}: OrdersTableSectionProps) {
  return (
    <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
      <ResponsiveTable
        showCardOnMobile={true}
        cardView={
          currentOrders.length === 0 ? (
            <OrdersEmptyState />
          ) : (
            <TableCard
              data={currentOrders}
              renderCard={(order) => (
                <OrderCard
                  order={order as Order}
                  showRemainingColumn={showRemainingColumn}
                  showSupplierRefundColumn={showSupplierRefundColumn}
                  showActionButtons={showActionButtons}
                  isCanceled={isCanceled}
                  canEdit={canEditOrder}
                  canRenewOrder={canRenewOrder}
                  renewingOrderCode={renewingOrderCode}
                  completingOrderCode={completingOrderCode}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onConfirmRefund={onConfirmRefund}
                  onCreateTopupOrderFromRefund={onCreateTopupOrderFromRefund}
                  onMarkPaid={onMarkPaid}
                  onRenew={onRenew}
                />
              )}
              className="p-2"
            />
          )
        }
      >
        <table className="min-w-full table-fixed border-separate border-spacing-y-4 text-white">
          <thead>
            <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:pb-2 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:sm:tracking-[0.2em] [&>th]:text-indigo-300/70 [&>th]:text-center">
              <th className="w-[14%]">SẢN PHẨM</th>
              <th className="w-[18%]">THÔNG TIN ĐƠN</th>
              <th className="w-[14%]">KHÁCH HÀNG</th>
              <th className="w-[16%]">THỜI HẠN</th>
              {showRemainingColumn && (
                <th className="w-[8%] whitespace-nowrap">{remainingLabel}</th>
              )}
              {showSupplierRefundColumn && (
                <th className="w-[8%] whitespace-nowrap">Hoàn từ NCC</th>
              )}
              <th className="w-[12%]">TRẠNG THÁI</th>
              <th className="w-[18%] text-right pr-4">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {currentOrders.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="text-center py-12">
                  <OrdersEmptyState />
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
                  showSupplierRefundColumn={showSupplierRefundColumn}
                  showActionButtons={showActionButtons}
                  isCanceled={isCanceled}
                  canEdit={canEditOrder}
                  canRenewOrder={canRenewOrder}
                  totalColumns={totalColumns}
                  renewingOrderCode={renewingOrderCode}
                  completingOrderCode={completingOrderCode}
                  onToggleDetails={onToggleDetails}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onConfirmRefund={onConfirmRefund}
                  onCreateTopupOrderFromRefund={onCreateTopupOrderFromRefund}
                  onMarkPaid={onMarkPaid}
                  onRenew={onRenew}
                />
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTable>

      <OrdersPagination
        filteredOrdersLength={filteredOrdersLength}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        currentPage={currentPage}
        totalPages={totalPages}
        paginationPages={paginationPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
