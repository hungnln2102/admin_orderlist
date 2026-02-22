import React, { useState } from "react";
import { PackageRow } from "./PackageRow";
import { PackageCard } from "./PackageCard";
import { AugmentedRow } from "../utils/packageHelpers";

type PackageTableProps = {
  rows: AugmentedRow[];
  loading: boolean;
  showCapacityColumn: boolean;
  tableColumnCount: number;
  onEdit: (row: AugmentedRow) => void;
  onView: (row: AugmentedRow) => void;
  onDelete: (row: AugmentedRow) => void;
};

export const PackageTable: React.FC<PackageTableProps> = ({
  rows,
  loading,
  showCapacityColumn,
  tableColumnCount,
  onEdit,
  onView,
  onDelete,
}) => {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const handleRowToggle = (rowId: number) => {
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <div className="package-table glass-panel-dark rounded-[32px] shadow-2xl overflow-hidden text-white border border-white/5">
      {/* ───── Mobile card view (< md) ───── */}
      <div className="md:hidden">
        {loading ? (
          <div className="px-6 py-8 text-center text-white/80 text-sm">
            Đang Tải Dữ Liệu...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-8 text-center text-white/80 text-sm">
            Không có gói nào để hiển thị.
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {rows.map((item, idx) => (
              <PackageCard
                key={`card-${item.id}-${idx}`}
                row={item}
                showCapacityColumn={showCapacityColumn}
                onEdit={onEdit}
                onView={onView}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ───── Desktop table view (>= md) ───── */}
      <div className="package-table__inner overflow-x-auto hidden md:block">
        <div className="inline-block min-w-full align-middle">
          <table className="package-table__table w-full table-fixed divide-y divide-white/5">
          <colgroup>
            <col className={showCapacityColumn ? "w-[12%]" : "w-[14%]"} />
            <col className={showCapacityColumn ? "w-[17%]" : "w-[20%]"} />
            <col className="w-[10%]" />
            {showCapacityColumn && <col className="w-[8%]" />}
            <col className={showCapacityColumn ? "w-[8%]" : "w-[9%]"} />
            <col className={showCapacityColumn ? "w-[10%]" : "w-[11%]"} />
            <col className="w-[10%]" />
            <col className={showCapacityColumn ? "w-[15%]" : "w-[17%]"} />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="package-table__head bg-white/5">
            <tr>
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Tên Gói
              </th>
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Thông Tin Gói
              </th>
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Số Lượng
              </th>
              {showCapacityColumn && (
                <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                  Dung Lượng
                </th>
              )}
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                NCC
              </th>
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Giá Nhập
              </th>
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Ngày Hết Hạn
              </th>
              <th className="package-table__th px-2 py-4 lg:px-4 text-left text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Ghi Chú
              </th>
              <th className="package-table__th px-2 py-4 lg:px-4 text-center text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest whitespace-nowrap">
                Thao Tác
              </th>
            </tr>
          </thead>
          <tbody className="package-table__body divide-y divide-white/5">
            {loading ? (
              <tr className="package-table__loading-row">
                <td
                  colSpan={tableColumnCount}
                  className="package-table__loading-cell px-6 py-8 text-center text-white/80 text-sm"
                >
                  Đang Tải Dữ Liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr className="package-table__empty-row">
                <td
                  colSpan={tableColumnCount}
                  className="package-table__empty-cell px-6 py-8 text-center text-white/80 text-sm"
                >
                  Không có gói nào để hiển thị.
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => (
                <PackageRow
                  key={`${item.id}-${idx}`}
                  row={item}
                  showCapacityColumn={showCapacityColumn}
                  tableColumnCount={tableColumnCount}
                  isExpanded={expandedRowId === item.id}
                  onToggle={handleRowToggle}
                  onEdit={onEdit}
                  onView={onView}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
