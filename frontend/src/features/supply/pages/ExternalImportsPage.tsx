import React, { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/shared/api/client";
import { showAppNotification } from "@/lib/notifications";
import { ArrowDownTrayIcon, PencilIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { formatDateToDMY } from "@/shared/date";
import ExternalImportLogModal from "../components/ExternalImportLogModal";
import EditTraceCodeModal from "../components/EditTraceCodeModal";
import type { ExternalImportLogItem } from "../components/supply-order-costs-panel/types";

// Helper functions matching local formats
const formatCurrency = (val: unknown): string => {
  const num = Number(val);
  if (Number.isNaN(num)) return "0đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
};

export default function ExternalImportsPage() {
  const [logs, setLogs] = useState<ExternalImportLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [createLogOpen, setCreateLogOpen] = useState(false);
  const [editTraceTarget, setEditTraceTarget] = useState<ExternalImportLogItem | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<Record<string, unknown>>(
        "/api/store-profit-expenses?expense_type=external_import,mavn_import"
      );
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setLogs(
        items.map((item) => ({
          id: Number(item.id || 0),
          amount: Number(item.amount || 0),
          reason: String(item.reason || ""),
          linkedOrderCode: item.linkedOrderCode ? String(item.linkedOrderCode) : null,
          expenseDate: item.expenseDate || null,
          createdAt: item.createdAt || null,
          expenseType: String(item.expenseType || "external_import"),
          traceCode: item.traceCode ? String(item.traceCode) : null,
        }))
      );
    } catch (err) {
      console.error("Failed to load external import logs:", err);
      setLogs([]);
      setError("Không thể tải log nhập hàng ngoài luồng.");
      showAppNotification({
        type: "error",
        title: "Lỗi tải dữ liệu",
        message: "Không thể tải danh sách log nhập hàng ngoài luồng.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header section with gradient border and backdrop blur */}
      <section className="rounded-[24px] border border-violet-500/25 bg-[linear-gradient(135deg,rgba(30,27,75,0.50)_0%,rgba(15,23,42,0.72)_52%,rgba(12,18,32,0.88)_100%)] px-5 py-6 shadow-[0_24px_70px_-28px_rgba(79,70,229,0.48),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-200/70">
              Sourcing workspace
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl flex items-center gap-3">
              Nhập Hàng Ngoài Luồng
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Nhật ký nhập hàng ngoài luồng, thủ công, không qua hệ thống tự động.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateLogOpen(true)}
            className="self-start sm:self-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold tracking-wide text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4 stroke-2" />
            Tạo log nhập hàng
          </button>
        </div>
      </section>

      {/* External Import Log Modal */}
      <ExternalImportLogModal
        isOpen={createLogOpen}
        onClose={() => setCreateLogOpen(false)}
        onSuccess={() => {
          setCreateLogOpen(false);
          void loadLogs();
          showAppNotification({
            type: "success",
            title: "Đã tạo log nhập hàng",
            message: "Log chi phí ngoài luồng đã được ghi nhận.",
          });
        }}
      />

      {/* Edit Trace Code Modal */}
      <EditTraceCodeModal
        isOpen={Boolean(editTraceTarget)}
        expenseId={editTraceTarget?.id ?? 0}
        initialTraceCode={editTraceTarget?.traceCode ?? ""}
        initialReason={editTraceTarget?.reason ?? ""}
        onClose={() => setEditTraceTarget(null)}
        onSaved={() => {
          setEditTraceTarget(null);
          void loadLogs();
          showAppNotification({
            type: "success",
            title: "Đã lưu mã trace",
            message: "Mã trace cho log nhập hàng đã được cập nhật.",
          });
        }}
      />

      {/* Logs Table Section */}
      <div className="rounded-3xl bg-slate-950/40 border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-2xl overflow-hidden">
        <ResponsiveTable showCardOnMobile={false}>
          <table className="w-full text-left">
            <thead className="bg-slate-900/40 text-[9px] sm:text-[10px] uppercase text-indigo-200/50 font-bold tracking-[0.08em] sm:tracking-[0.15em] border-b border-white/5">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold w-14">STT</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Ngày tạo</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Nguồn</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Số tiền nhập</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Mã đơn liên kết</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Lý do</th>
                <th className="px-2 sm:px-4 py-3 sm:py-4 font-semibold">Mã trace</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-indigo-300/40">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
                      <span className="text-sm font-medium tracking-wide">Đang tải log nhập hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <p className="text-rose-400/80 font-medium">{error}</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500 text-sm font-medium tracking-wide">
                    Không có log nhập hàng ngoài luồng nào.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id} className="text-xs sm:text-sm text-white/90 hover:bg-indigo-900/10 transition-colors cursor-pointer group">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-white/50 font-medium whitespace-nowrap">{idx + 1}</td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4 text-white/70 whitespace-nowrap">
                      {formatDateToDMY(log.expenseDate || log.createdAt || "") || "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4 font-semibold text-white/95 tracking-wide max-w-[120px] sm:max-w-[180px] truncate">
                      {log.expenseType === "mavn_import" ? "MAVN AUTO" : "MANUAL"}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(log.amount)}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4 font-mono font-bold tracking-widest text-[11px] sm:text-xs text-indigo-300/80 whitespace-nowrap">
                      {log.linkedOrderCode || "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4 text-white/70 max-w-[150px] sm:max-w-[200px] truncate">
                      {log.reason || "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4">
                      <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-white/60 border border-white/10 whitespace-nowrap">
                        {log.traceCode || "—"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditTraceTarget(log)}
                          className="p-1.5 sm:p-2 rounded-xl bg-white/5 text-emerald-300 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/15 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all active:scale-90"
                          title="Sửa mã Trace"
                        >
                          <PencilIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-2" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
        {logs.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 text-xs text-indigo-200/60 bg-indigo-950/20 flex justify-between">
            <span className="font-medium tracking-wide">
              Tổng log ngoài luồng: <span className="text-white font-bold">{logs.length}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
