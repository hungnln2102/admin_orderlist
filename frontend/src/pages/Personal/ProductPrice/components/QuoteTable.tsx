import React from "react";
import { QuoteLineWithTotal, formatCurrency } from "../helpers";

type QuoteTableProps = {
  rows: QuoteLineWithTotal[];
};

export const QuoteTable: React.FC<QuoteTableProps> = ({ rows }) => {
  return (
    <table className="w-full text-sm border-t border-b border-slate-600 text-white print:text-black">
      <thead>
        <tr className="text-center bg-indigo-100 text-slate-900 font-semibold">
          <th className="border border-slate-600 py-2 w-12">STT</th>
          <th className="border border-slate-600 py-2 px-2 whitespace-nowrap">
            TÊN SẢN PHẨM
          </th>
          <th className="border border-slate-600 py-2 w-32">GÓI</th>
          <th className="border border-slate-600 py-2 w-28">THỜI GIAN</th>
          <th className="border border-slate-600 py-2 w-32">ĐƠN GIÁ</th>
          <th className="border border-slate-600 py-2 w-28">GIẢM GIÁ</th>
          <th className="border border-slate-600 py-2 w-32">THANH TIỀN</th>
          <th className="border border-slate-600 py-2 w-36">GHI CHÚ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.id} className="align-top">
            <td className="border border-slate-600 text-center py-2">{idx + 1}</td>
            <td
              className="border border-slate-600 px-2 py-2 text-center text-white print:text-black"
              title={row.product}
            >
              {row.product}
            </td>
            <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
              {row.packageName || row.term}
            </td>
            <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
              {row.durationMonths
                ? `${row.durationMonths} tháng`
                : row.durationDays
                ? `${row.durationDays} ngày`
                : row.term || "--"}
            </td>
            <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
              {formatCurrency(row.unitPrice)}
            </td>
            <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
              {formatCurrency(row.discount || 0)}
            </td>
            <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
              {formatCurrency(row.total)}
            </td>
            <td className="border border-slate-600 px-2 py-2 text-sm text-white print:text-black">
              {row.note || ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
