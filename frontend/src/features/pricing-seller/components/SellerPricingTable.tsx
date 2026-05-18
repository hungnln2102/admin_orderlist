import { Fragment, useState } from "react";
import type { SellerPricingItem } from "../types";
import { formatVnd, parseDurationFromVariantName, toPlainRulesText } from "../utils";

type SellerPricingTableProps = {
  items: SellerPricingItem[];
};

export default function SellerPricingTable({ items }: SellerPricingTableProps) {
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const toggleRow = (key: string) => {
    setExpandedRowKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
              Variant
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
              Thời hạn
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
              Giá gốc
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
              Giá sỉ
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
              Giá lẻ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => {
            const rowKey = `${item.variant_id ?? item.variant_name}-${item.gia_si}-${item.gia_le}`;
            const isExpanded = expandedRowKey === rowKey;
            const plainRules = toPlainRulesText(item.product_rules);

            return (
              <Fragment key={rowKey}>
                <tr
                  onClick={() => toggleRow(rowKey)}
                  className="cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm text-slate-900">{item.variant_name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {parseDurationFromVariantName(item.variant_name, item.display_name)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                    {formatVnd(item.gia_goc)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                    {formatVnd(item.gia_si)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                    {formatVnd(item.gia_le)}
                  </td>
                </tr>

                {isExpanded ? (
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-4 py-3 text-sm text-slate-700">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Quy tắc sản phẩm
                      </p>
                      <p className="whitespace-pre-line break-words">{plainRules || "-"}</p>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
