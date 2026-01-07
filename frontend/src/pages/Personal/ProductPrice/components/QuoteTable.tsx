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
            TEN SAN PHAM
          </th>
          <th className="border border-slate-600 py-2 w-32">GOI</th>
          <th className="border border-slate-600 py-2 w-28">THOI GIAN</th>
          <th className="border border-slate-600 py-2 w-32">DON GIA</th>
          <th className="border border-slate-600 py-2 w-28">GIAM GIA</th>
          <th className="border border-slate-600 py-2 w-32">THANH TIEN</th>
          <th className="border border-slate-600 py-2 w-36">GHI CHU</th>
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
                ? `${row.durationMonths} thang`
                : row.durationDays
                ? `${row.durationDays} ngay`
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
