import React from "react";
import { Calendar, Clock3, Coins, CreditCard, ShieldCheck, Sparkles, TrendingUp, Wallet, Zap } from "lucide-react";

interface PersonalAssetPreviewProps {
  isDebtAsset: boolean;
  type: string;
  isYieldAsset: boolean;
  theme: any;
  debtHasEndDate: boolean;
  debtRemainingDays: number | null;
  debtRemainingMonths: number | null;
  debtDailyPayment: number;
  debtDueDay: string;
  amountValue: number;
  debtMonthlyPayment: number;
  debtInterestEnabled: boolean;
  debtInterestAmount: number;
  monthlyInterestAmount: number;
  annualRateValue: number;
  estimatedDebtTotal: number;
  profitEnabled: boolean;
  annualProfit: number;
  periodProfit: number;
  periodLabel: string;
  profitDestinationLabels: Record<string, string>;
  profitDestination: string;
  profitCreditTime: string;
}

export const PersonalAssetPreview: React.FC<PersonalAssetPreviewProps> = ({
  isDebtAsset,
  type,
  isYieldAsset,
  theme,
  debtHasEndDate,
  debtRemainingDays,
  debtRemainingMonths,
  debtDailyPayment,
  debtDueDay,
  amountValue,
  debtMonthlyPayment,
  debtInterestEnabled,
  debtInterestAmount,
  monthlyInterestAmount,
  annualRateValue,
  estimatedDebtTotal,
  profitEnabled,
  annualProfit,
  periodProfit,
  periodLabel,
  profitDestinationLabels,
  profitDestination,
  profitCreditTime,
}) => (            <div className="md:col-span-5 flex flex-col h-full space-y-4">
              {isDebtAsset ? (
                /* SMART DAILY ACCRUAL HUD FOR DEBTS */
                <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/20 p-4 sm:p-5 space-y-4 shadow-xl">
                  {/* HUD Top Badge */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
                      Smart Accrual HUD
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-200 border border-rose-500/30">
                      {debtHasEndDate && debtRemainingDays
                        ? `Còn ${debtRemainingDays} ngày (~${debtRemainingMonths} tháng)`
                        : "Thẻ tín dụng / Nợ linh hoạt"}
                    </span>
                  </div>

                  {/* 2 Big Visual Stats */}
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-medium">Định mức gánh nợ / ngày</span>
                        <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-400/10">Shop tự bù</span>
                      </div>
                      <span className={`text-xl font-black font-mono block ${amountValue > 0 ? "text-amber-300" : "text-slate-500"}`}>
                        {amountValue > 0 ? `~${debtDailyPayment.toLocaleString("vi-VN")} ₫` : "— ₫"}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Tự động cộng dồn vào chỉ tiêu bán hàng mỗi ngày</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-medium">
                          {debtHasEndDate ? "Tổng gom đóng mỗi tháng" : "Gom trả tháng (Ước tính tối thiểu)"}
                        </span>
                        <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-400/10">Hạn ngày {debtDueDay || 15}</span>
                      </div>
                      <span className={`text-xl font-black font-mono block ${amountValue > 0 ? "text-rose-300" : "text-slate-500"}`}>
                        {amountValue > 0 ? `${debtMonthlyPayment.toLocaleString("vi-VN")} ₫` : "— ₫"}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {debtHasEndDate
                          ? "Khoản tiền cần tích lũy sẵn sàng trước kỳ thanh toán"
                          : "Định mức tối thiểu cần trả định kỳ để không bị phạt quá hạn"}
                      </span>
                    </div>
                  </div>

                  {/* Mechanism Box */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">💡 Cơ chế:</span>
                      <span>
                        {debtHasEndDate
                          ? `Động Cơ Hòa Vốn cộng dồn ${amountValue > 0 ? `${debtDailyPayment.toLocaleString("vi-VN")} ₫` : "tiền nợ"} vào mục tiêu đơn hàng mỗi ngày.`
                          : `Động cơ gom đều ${amountValue > 0 ? `${debtDailyPayment.toLocaleString("vi-VN")} ₫` : "tiền"} mỗi ngày để chuẩn bị đóng thẻ tín dụng trước ngày ${debtDueDay || 15}.`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-slate-400 border-t border-slate-800/70 pt-2">
                      <span className="text-purple-400 font-bold shrink-0">
                        {debtHasEndDate ? "🔄 Gối đầu:" : "✨ Linh hoạt:"}
                      </span>
                      <span>
                        {debtHasEndDate
                          ? `Hôm nay chưa đủ sẽ tự dồn sang hôm sau, bảo đảm gom đủ tiền trước ngày ${debtDueDay || 15} mà không lo bị hụt vốn đột ngột.`
                          : `Khi shop có dòng tiền dôi dư có thể trích trả bớt nợ bất kỳ lúc nào mà không bị ép hạn chót.`}
                      </span>
                    </div>
                  </div>

                  {/* Projected Total Obligation */}
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-300 block font-medium">
                        {debtInterestEnabled ? (debtHasEndDate ? "Tổng gốc + lãi cần trả:" : "Dư nợ gốc (Chưa gồm lãi):") : "Tổng nợ gốc cần trả:"}
                      </span>
                      {debtInterestEnabled && amountValue > 0 && (
                        <span className="text-[10px] text-rose-300">
                          {debtHasEndDate
                            ? `(Lãi: +${Math.round(debtInterestAmount).toLocaleString("vi-VN")} ₫)`
                            : `(Lãi ước tính: ~${Math.round(monthlyInterestAmount).toLocaleString("vi-VN")} ₫ / tháng)`}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black text-white text-base sm:text-lg">
                      {amountValue > 0 ? `${estimatedDebtTotal.toLocaleString("vi-VN")} ₫` : "0 ₫"}
                    </span>
                  </div>
                </div>
              ) : isYieldAsset ? (
                /* YIELD & PROFIT HUD FOR SAVINGS */
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                      Dự Tính Sinh Lời Quỹ
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/15 text-purple-200 border border-purple-500/30">
                      {profitEnabled ? `Lãi ${annualRateValue}% / năm` : "Chưa bật lãi"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-medium">Ước tính sinh lời mỗi {periodLabel}</span>
                    <span className={`text-2xl font-black font-mono block ${amountValue > 0 && profitEnabled ? "text-purple-300" : "text-slate-500"}`}>
                      {amountValue > 0 && profitEnabled ? `+${periodProfit.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫` : "0 ₫"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Ước tính cả năm: {amountValue > 0 && profitEnabled ? `+${annualProfit.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫` : "0 ₫"}
                    </span>
                  </div>

                  {profitEnabled ? (
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Hình thức nhận lãi:</span>
                        <span className="font-semibold text-white">{profitDestinationLabels[profitDestination]}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800/70 pt-2">
                        <span className="text-slate-400">Giờ ghi nhận:</span>
                        <span className="font-mono text-purple-300">{profitCreditTime} hàng ngày</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 italic text-center">
                      Quỹ này hiện không bật sinh lời định kỳ. Chỉ ghi nhận số dư gốc tích lũy.
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
                    <span>Lợi nhuận từ quỹ này sẽ tự động gia tăng vào Tài sản ròng (Net Worth) của bạn.</span>
                  </div>
                </div>
              ) : (
                /* LIQUIDITY / INVESTMENT ASSET CARD */
                <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 shadow-xl ${
                  type === "CASH_BANK"
                    ? "border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/20"
                    : "border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20"
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${theme.accentText}`}>
                      {theme.icon}
                      {type === "CASH_BANK" ? "Tài Sản Thanh Khoản" : "Tài Sản Đầu Tư Tích Trữ"}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${theme.badgeBg}`}>
                      {type === "CASH_BANK" ? "Tiền mặt / Bank" : "Vàng / Crypto"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                    <span className="text-xs text-slate-400 block font-medium">Giá trị tài sản ghi nhận</span>
                    <span className={`text-2xl font-black font-mono block ${amountValue > 0 ? "text-white" : "text-slate-500"}`}>
                      {amountValue > 0 ? `${amountValue.toLocaleString("vi-VN")} ₫` : "0 ₫"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Được bảo vệ độc lập, không bị trộn lẫn vào số dư Shop</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        Mục này đóng vai trò như đệm an toàn tài chính cá nhân, giúp Master nắm rõ tổng tài sản thực tế bất kỳ lúc nào.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>);