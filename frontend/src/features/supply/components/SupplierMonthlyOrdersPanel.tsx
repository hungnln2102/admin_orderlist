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
                <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.3)] h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <h3 className="text-[13px] font-bold uppercase tracking-widest text-indigo-200">Đơn theo tháng</h3>
                    <span className="text-xs font-semibold text-indigo-300/60 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{monthlyLogOrders.length} tháng</span>
                  </div>
                  {monthlyLogOrders.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-slate-500 text-xs font-medium tracking-wide">Chưa có dữ liệu đơn trong log.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scroll pr-1">
                      {monthlyLogOrders.map((m) => {
                        const monthLogOrders = logOrdersByMonthMap.get(m.month) || [];
                        const isExpanded = expandedMonth === m.month;
                        return (
                          <div key={m.month} className="rounded-xl border border-white/5 bg-white/5 overflow-hidden transition-all duration-300">
                            <button
                              type="button"
                              onClick={() => onToggleMonth(m.month)}
                              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors ${isExpanded ? "bg-indigo-500/10" : ""}`}
                            >
                              <span className="text-sm font-bold text-white/90">Tháng {m.month}</span>
                              <span className="text-xs font-semibold text-white/60">{m.orders} đơn</span>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-white/5 px-3 py-3 space-y-2 bg-slate-950/40 shadow-inner">
                                {monthLogOrders.length === 0 ? (
                                  <p className="text-xs text-slate-500 text-center py-2">Chưa có đơn log trong tháng này.</p>
                                ) : (
                                  monthLogOrders.map((order) => (
                                    <div key={`${m.month}-${order.orderListId}-${order.idOrder}`} className="rounded-lg border border-white/10 px-3 py-2 bg-white/5 hover:border-white/20 transition-colors">
                                      <div className="flex justify-between items-center mb-1">
                                        <p className="text-[13px] font-bold text-white/90 truncate">{order.idOrder || `#${order.orderListId}`}</p>
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-300/80 truncate">{order.nccPaymentStatus || "—"}</p>
                                      </div>
                                      <p className="text-[11px] font-semibold text-emerald-400 mt-1.5">
                                        <span className="text-emerald-500/60 uppercase tracking-widest text-[9px] mr-1">Chi phí</span> {formatCurrency(order.importCost)}
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
