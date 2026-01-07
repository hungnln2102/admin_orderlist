import React, { useCallback, useEffect, useState } from "react";
import { PlusIcon, CheckIcon, XMarkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "../../../../lib/api";
import { Payment } from "../types";
import { parseMoney } from "../utils/supplies";
import * as Helpers from "../../../../lib/helpers";

const formatCurrency = Helpers.formatCurrency;

interface Props {
  supplyId: number;
  onRefreshSupplies?: () => void;
}

const PaymentHistoryTable: React.FC<Props> = ({ supplyId, onRefreshSupplies }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ round: "", import: "", paid: "", isEditing: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const formatMoneyInput = (raw: string) => {
    const cleaned = String(raw || "").replace(/[^\d-]/g, "");
    const normalized = cleaned.startsWith("-")
      ? "-" + cleaned.slice(1).replace(/-/g, "")
      : cleaned.replace(/-/g, "");
    if (normalized === "-") return "-";
    const num = Number(normalized);
    if (!Number.isFinite(num)) return "";
    return num.toLocaleString("vi-VN");
  };

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

  const handleAddPayment = async () => {
    if (!draft.round) return;
    try {
      const payload = {
        round: draft.round,
        totalImport: parseMoney(draft.import),
        paid: parseMoney(draft.paid),
        status: "Chưa Thanh Toán",
      };
      const res = await apiFetch(`/api/supplies/${supplyId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDraft({ round: "", import: "", paid: "", isEditing: false });
        loadPayments();
        onRefreshSupplies?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPayment = async (pid: number) => {
    try {
      await apiFetch(`/api/supplies/${supplyId}/payments/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalImport: parseMoney(editValue) }),
      });
      setEditingId(null);
      loadPayments();
      onRefreshSupplies?.();
    } catch (err) {
      console.error(err);
    }
  };

  const normalizeStatus = (status: string) =>
    (status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  return (
    <div className="bg-slate-900/80 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
        <h4 className="text-sm font-semibold text-white">Lịch Sử Thanh Toán</h4>
        <button
          onClick={() => setDraft({ ...draft, isEditing: true })}
          className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white transition"
        >
          <PlusIcon className="h-3 w-3" /> Thêm Chu Kỳ
        </button>
      </div>

      <table className="w-full text-sm text-left text-white/80">
        <thead className="bg-white/5 text-xs uppercase text-white/60">
          <tr>
            <th className="px-4 py-2">Chu Kỳ</th>
            <th className="px-4 py-2">Tổng Nhập</th>
            <th className="px-4 py-2">Đã Thanh Toán</th>
            <th className="px-4 py-2">Trạng Thái</th>
            <th className="px-4 py-2 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {draft.isEditing && (
            <tr className="bg-indigo-500/10">
              <td className="px-4 py-2">
                <input
                  className="bg-transparent border-b border-white/30 w-full focus:outline-none text-white"
                  placeholder="Tên chu kỳ..."
                  value={draft.round}
                  onChange={(e) => setDraft({ ...draft, round: e.target.value })}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  className="bg-transparent border-b border-white/30 w-full focus:outline-none text-white"
                  placeholder="0"
                  value={draft.import}
                  onChange={(e) => setDraft({ ...draft, import: formatMoneyInput(e.target.value) })}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  className="bg-transparent border-b border-white/30 w-full focus:outline-none text-white"
                  placeholder="0"
                  value={draft.paid}
                  onChange={(e) => setDraft({ ...draft, paid: formatMoneyInput(e.target.value) })}
                />
              </td>
              <td className="px-4 py-2 text-xs italic opacity-70">Mới</td>
              <td className="px-4 py-2 text-right">
                <button onClick={handleAddPayment} className="text-emerald-400 hover:text-emerald-300 mr-2">
                  <CheckIcon className="h-5 w-5 inline" />
                </button>
                <button onClick={() => setDraft({ ...draft, isEditing: false })} className="text-rose-400 hover:text-rose-300">
                  <XMarkIcon className="h-5 w-5 inline" />
                </button>
              </td>
            </tr>
          )}

          {loading ? (
            <tr>
              <td colSpan={5} className="text-center py-4">
                Đang tải...
              </td>
            </tr>
          ) : payments.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-4 opacity-50">
                Chưa có dữ liệu thanh toán
              </td>
            </tr>
          ) : (
            payments.map((p) => {
              const canEdit = normalizeStatus(p.status) === "chua thanh toan";
              return (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-2">{p.round}</td>
                  <td className="px-4 py-2">
                    {editingId === p.id ? (
                      <input
                        className="bg-black/20 border border-white/20 rounded px-1 w-24 text-right"
                        value={editValue}
                        onChange={(e) => setEditValue(formatMoneyInput(e.target.value))}
                      />
                    ) : (
                      formatCurrency(p.totalImport)
                    )}
                  </td>
                  <td className="px-4 py-2">{formatCurrency(p.paid)}</td>
                  <td className="px-4 py-2">{p.status}</td>
                  <td className="px-4 py-2 text-right">
                    {editingId === p.id ? (
                      <>
                        <button onClick={() => handleEditPayment(p.id)} className="text-emerald-400 mr-2">
                          <CheckIcon className="h-4 w-4 inline" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-rose-400">
                          <XMarkIcon className="h-4 w-4 inline" />
                        </button>
                      </>
                    ) : (
                      canEdit && (
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditValue(p.totalImport.toLocaleString("vi-VN"));
                          }}
                          className="text-white/40 hover:text-blue-300"
                        >
                          <PencilSquareIcon className="h-4 w-4 inline" />
                        </button>
                      )
                    )}
                  </td>
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
