import { Receipt } from "lucide-react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatDateDisplay, formatVND } from "@/shared/utils";
import type { FixedCostPaymentLog } from "../types";

export function FixedCostPaymentHistory({ payments }: { payments: FixedCostPaymentLog[] }) {
  return (
    <GlassCard className="overflow-hidden !p-0">
      <h3 className="flex items-center gap-2 border-b border-slate-800 px-4 py-4 text-sm font-bold text-white">
        <Receipt className="h-4 w-4 text-amber-300" />
        Nhật ký thanh toán chi phí cố định
      </h3>
      {payments.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">Chưa có thanh toán trong kỳ này.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300" aria-label="Nhật ký thanh toán chi phí cố định">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                {["Ngày thanh toán", "Khoản chi", "Kỳ", "Thực trả", "Nguồn tiền", "Mã biên lai", "Ghi chú"].map((label) => (
                  <th key={label} scope="col" className="whitespace-nowrap px-4 py-3">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateDisplay(payment.paymentDate)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{payment.targetName || `Khoản chi #${payment.targetId}`}</td>
                  <td className="whitespace-nowrap px-4 py-3">{payment.periodMonth}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-amber-300">{formatVND(payment.amount)}</td>
                  <td className="px-4 py-3">
                    {payment.hasReceiptAllocation ? "Biên lai" : payment.hasFinancialAccount ? "Ví / Tài khoản" :
                      payment.note.startsWith("Đã trả bằng tiền mặt") ? "Tiền mặt" : "—"}
                    {payment.accountLabel && <span className="mt-1 block text-slate-400">{payment.accountLabel}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-cyan-300">{payment.receiptCode ?? "—"}</td>
                  <td className="min-w-40 px-4 py-3 break-words">{payment.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
