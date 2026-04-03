import React from "react";
import type { QuoteLineWithTotal } from "../types";
import { formatCurrency } from "../utils/quoteFormat";

type QuoteTableProps = {
  rows: QuoteLineWithTotal[];
  grandTotal: number;
};

export const QuoteTable: React.FC<QuoteTableProps> = ({ rows, grandTotal }) => {
  const cell =
    "border border-slate-300 py-2 px-2 text-sm align-middle text-slate-800";

  return (
    <div className="px-8 pb-1">
      <table className="w-full border-collapse">
        <thead className="quote-table-head">
          <tr>
            <th className={`${cell} w-10 text-center text-xs font-semibold`}>
              STT
            </th>
            <th
              className={`${cell} min-w-[100px] text-center text-xs font-semibold`}
            >
              TÊN SẢN PHẨM
            </th>
            <th className={`${cell} w-28 text-center text-xs font-semibold`}>
              GÓI
            </th>
            <th className={`${cell} w-24 text-center text-xs font-semibold`}>
              THỜI GIAN
            </th>
            <th className={`${cell} w-28 text-center text-xs font-semibold`}>
              ĐƠN GIÁ
            </th>
            <th className={`${cell} w-24 text-center text-xs font-semibold`}>
              GIẢM GIÁ
            </th>
            <th className={`${cell} w-28 text-center text-xs font-semibold`}>
              THÀNH TIỀN
            </th>
            <th className={`${cell} min-w-[72px] text-center text-xs font-semibold`}>
              GHI CHÚ
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className={`${cell} py-10 text-center text-slate-500 italic`}
              >
                Chưa có dòng hàng — thêm sản phẩm từ bảng điều khiển bên trái.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id} className="bg-white">
                <td className={`${cell} text-center tabular-nums`}>
                  {idx + 1}
                </td>
                <td className={`${cell} text-left font-medium`} title={row.product}>
                  {row.product}
                </td>
                <td className={`${cell} text-center`}>
                  {row.packageName || row.term}
                </td>
                <td className={`${cell} text-center`}>
                  {row.durationMonths
                    ? `${row.durationMonths} tháng`
                    : row.durationDays
                      ? `${row.durationDays} ngày`
                      : row.term || "—"}
                </td>
                <td className={`${cell} text-right tabular-nums`}>
                  {formatCurrency(row.unitPrice)}
                </td>
                <td className={`${cell} text-right tabular-nums text-slate-600`}>
                  {formatCurrency(row.discount || 0)}
                </td>
                <td className={`${cell} text-right tabular-nums font-semibold`}>
                  {formatCurrency(row.total)}
                </td>
                <td className={`${cell} text-left text-sm`}>{row.note || ""}</td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="quote-table-foot">
              <td
                colSpan={6}
                className="border border-slate-300 py-2.5 px-3 text-right text-sm font-bold uppercase"
              >
                Tổng cộng (VNĐ)
              </td>
              <td className="border border-slate-300 py-2.5 px-3 text-right text-base font-bold tabular-nums">
                {formatCurrency(grandTotal)}
              </td>
              <td className="border border-slate-300" />
            </tr>
          </tfoot>
        )}
      </table>
      <p className="quote-muted mt-2 text-right text-[11px]">
        Đơn vị: VNĐ — làm tròn theo quy ước cửa hàng.
      </p>
    </div>
  );
};
