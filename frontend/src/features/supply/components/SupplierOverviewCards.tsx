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
    { label: "Tổng đơn", value: stats?.totalOrders ?? 0 },
    { label: "Đã thanh toán", value: stats?.paidOrders ?? 0 },
    { label: "Chưa thanh toán", value: stats?.unpaidOrders ?? 0 },
    { label: "Đã hủy", value: stats?.canceledOrders ?? 0 },
  ];

  return (
    <>
      <div className="grid md:grid-cols-2 gap-3 mt-5">
        <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">Thông tin chung</h3>
          <div className="text-sm text-white/80 space-y-2">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/40">Tên NCC</span>
              <span className="font-bold text-white">{supply?.sourceName || "--"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/40">Ngân hàng</span>
              <span className="font-semibold text-white">{bankName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/40">Số tài khoản</span>
              <span className="font-mono font-semibold text-white">{supply?.numberBank || "--"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Trạng thái</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${supply?.isActive ? "text-emerald-400 bg-emerald-500/10" : "text-white/50 bg-white/5"}`}>{statusLabel}</span>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">Tổng quan thanh toán</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Đã trả</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats?.totalPaidAmount || 0)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Còn nợ</p>
              <p className="text-lg font-bold text-orange-400 mt-1">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Hoàn tiền</p>
              <p className="text-lg font-bold text-rose-400 mt-1">{formatCurrency(totalSupplierRefund)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Nợ đơn</p>
              <p className="text-lg font-bold text-white mt-1">{stats?.unpaidOrders ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white/5 rounded-lg p-3 border border-white/5">
            <p className="text-white/50 text-xs">{card.label}</p>
            <p className="text-xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}
