import { formatCurrency } from "@/shared/money";

type MonthlyLogOrder = {
  orderListId: number;
  idOrder: string;
  importCost: number;
  refundAmount: number;
  nccPaymentStatus: string;
  loggedAt: string;
};

type MonthlyLogOrderSummary = {
  month: number;
  orders: number;
};

type SupplierMonthlyOrdersPanelProps = {
  monthlyLogOrders: MonthlyLogOrderSummary[];
  logOrdersByMonthMap: Map<number, MonthlyLogOrder[]>;
  expandedMonth: number | null;
  onToggleMonth: (month: number) => void;
};

export function SupplierMonthlyOrdersPanel({
  monthlyLogOrders,
  logOrdersByMonthMap,
  expandedMonth,
  onToggleMonth,
}: SupplierMonthlyOrdersPanelProps) {
  return (
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/80">Đơn theo tháng</h3>
                    <span className="text-xs text-white/60">{monthlyLogOrders.length} tháng</span>
                  </div>
                  {monthlyLogOrders.length === 0 ? (
                    <p className="text-white/50 text-sm">Chưa có dữ liệu đơn trong log.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scroll scroll-overlay">
                      {monthlyLogOrders.map((m) => {
                        const monthLogOrders = logOrdersByMonthMap.get(m.month) || [];
                        const isExpanded = expandedMonth === m.month;
                        return (
                          <div key={m.month} className="rounded-lg border border-white/5 bg-white/5">
                            <button
                              type="button"
                              onClick={() => onToggleMonth(m.month)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition"
                            >
                              <span className="text-sm font-semibold">Tháng {m.month}</span>
                              <span className="text-sm">{m.orders} đơn</span>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-white/5 px-3 py-2 space-y-1.5 bg-black/10">
                                {monthLogOrders.length === 0 ? (
                                  <p className="text-xs text-white/50">Chưa có đơn log trong tháng này.</p>
                                ) : (
                                  monthLogOrders.map((order) => (
                                    <div key={`${m.month}-${order.orderListId}-${order.idOrder}`} className="rounded-md border border-white/10 px-2 py-1.5">
                                      <p className="text-xs font-semibold text-white/90 truncate">{order.idOrder || `#${order.orderListId}`}</p>
                                      <p className="text-[11px] text-white/60 truncate">{order.nccPaymentStatus || "—"}</p>
                                      <p className="text-[11px] text-emerald-300 mt-0.5">
                                        Chi phí: {formatCurrency(order.importCost)}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
  );
}
