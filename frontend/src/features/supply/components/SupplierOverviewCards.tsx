import { formatCurrency } from "@/shared/money";

type SupplierOverviewSupply = {
  sourceName?: string | null;
  numberBank?: string | null;
  isActive?: boolean | null;
};

type SupplierOverviewStats = {
  totalPaidAmount?: number | null;
  unpaidOrders?: number | null;
  totalOrders?: number | null;
  paidOrders?: number | null;
  canceledOrders?: number | null;
};

type SupplierOverviewCardsProps = {
  supply?: SupplierOverviewSupply | null;
  stats?: SupplierOverviewStats | null;
  bankName: string;
  statusLabel: string;
  totalUnpaid: number;
  totalSupplierRefund: number;
};

export function SupplierOverviewCards({
  supply,
  stats,
  bankName,
  statusLabel,
  totalUnpaid,
  totalSupplierRefund,
}: SupplierOverviewCardsProps) {
  const statCards = [
    { label: "Tổng đơn", value: stats?.totalOrders ?? 0, color: "text-indigo-200" },
    { label: "Đã thanh toán", value: stats?.paidOrders ?? 0, color: "text-emerald-400" },
    { label: "Chưa thanh toán", value: stats?.unpaidOrders ?? 0, color: "text-amber-400" },
    { label: "Đã hủy", value: stats?.canceledOrders ?? 0, color: "text-rose-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4 mt-2">
        {/* Thông tin chung */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border border-white/10 p-5 shadow-lg space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">Thông tin chung</h3>
          <div className="text-sm space-y-3 relative z-10">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-white/50 text-xs font-medium">Tên NCC</span>
              <span className="font-bold text-white text-base">{supply?.sourceName || "--"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-white/50 text-xs font-medium">Ngân hàng</span>
              <span className="font-semibold text-indigo-200">{bankName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-white/50 text-xs font-medium">Số tài khoản</span>
              <span className="font-mono font-bold text-emerald-400 tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">{supply?.numberBank || "--"}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-white/50 text-xs font-medium">Trạng thái</span>
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border shadow-sm ${supply?.isActive ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" : "text-white/50 bg-white/5 border-white/10"}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tổng quan thanh toán */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-purple-950/30 border border-white/10 p-5 shadow-lg space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-300">Tổng quan thanh toán</h3>
          <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5 hover:border-white/15 transition-all">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Đã trả</p>
              <p className="text-base sm:text-lg font-bold text-white mt-1 tabular-nums">{formatCurrency(stats?.totalPaidAmount || 0)}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3.5 border border-amber-500/20 hover:border-amber-500/30 transition-all">
              <p className="text-amber-300/60 text-[10px] font-bold uppercase tracking-wider">Còn nợ</p>
              <p className="text-base sm:text-lg font-bold text-amber-400 mt-1 tabular-nums">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5 hover:border-white/15 transition-all">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Hoàn tiền</p>
              <p className="text-base sm:text-lg font-bold text-rose-400 mt-1 tabular-nums">{formatCurrency(totalSupplierRefund)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5 hover:border-white/15 transition-all">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Nợ đơn</p>
              <p className="text-base sm:text-lg font-bold text-indigo-200 mt-1 tabular-nums">{stats?.unpaidOrders ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl bg-slate-900/60 border border-white/5 p-3.5 hover:border-white/10 transition-colors flex flex-col justify-between">
            <p className="text-white/40 text-xs font-medium">{card.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1.5 tabular-nums ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
