import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Payment } from "../types";
import * as Helpers from "@/lib/helpers";

const formatCurrency = Helpers.formatCurrency;

interface Props {
  supplyId: number;
}

const PaymentHistoryTable: React.FC<Props> = ({ supplyId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/supplies/${supplyId}/payments?offset=0&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } finally {
      setLoading(false);
    }
  }, [supplyId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
        <h4 className="text-sm font-semibold text-white">Lịch Sử Thanh Toán</h4>
        <span className="text-xs text-white/50">Một chu kỳ / NCC — tổng nhập là công nợ chưa TT</span>
      </div>

      <table className="w-full text-sm text-left text-white/80">
        <thead className="bg-white/5 text-xs uppercase text-white/60">
          <tr>
            <th className="px-4 py-2">Chu Kỳ</th>
            <th className="px-4 py-2">Tổng Nhập</th>
            <th className="px-4 py-2">Còn Nợ</th>
            <th className="px-4 py-2">Đã Thanh Toán</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                Đang tải...
              </td>
            </tr>
          ) : payments.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-4 opacity-50">
                Chưa có dữ liệu thanh toán
              </td>
            </tr>
          ) : (
            payments.map((p) => {
              return (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-2">{p.round}</td>
                  <td className="px-4 py-2">{p.totalImport >= 0 ? formatCurrency(p.totalImport) : "—"}</td>
                  <td className={`px-4 py-2 ${p.totalImport < 0 ? "text-rose-400 font-semibold" : ""}`}>
                    {p.totalImport < 0 ? formatCurrency(Math.abs(p.totalImport)) : "—"}
                  </td>
                  <td className="px-4 py-2">{p.paid > 0 ? formatCurrency(p.paid) : "—"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentHistoryTable;
