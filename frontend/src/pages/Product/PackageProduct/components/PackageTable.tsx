import React, { useState } from "react";
import { PackageRow } from "./PackageRow";
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
      <div className="package-table__inner overflow-x-auto">
        <table className="package-table__table min-w-full divide-y divide-white/5">
          <thead className="package-table__head bg-white/5">
            <tr>
              <th className="package-table__th px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Tên Gói
              </th>
              <th className="package-table__th px-6 py-4 text-left text-[11px] font-bold text-indigo-300/70 uppercase tracking-[0.2em]">
                Thông Tin Gói
              </th>
              <th className="package-table__th px-6 py-4 text-left text-[11px] font-bold text-indigo-300/70 uppercase tracking-[0.2em]">
                Số Lượng
              </th>
              {showCapacityColumn && (
                <th className="package-table__th px-6 py-4 text-left text-[10px] font-bold text-indigo-300/40 uppercase tracking-[0.2em]">
                  Dung Lượng
                </th>
              )}
              <th className="package-table__th px-6 py-4 text-left text-[11px] font-bold text-indigo-300/70 uppercase tracking-[0.2em]">
                NCC
              </th>
              <th className="package-table__th px-6 py-4 text-left text-[11px] font-bold text-indigo-300/70 uppercase tracking-[0.2em]">
                Giá Nhập
              </th>
              <th className="package-table__th px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                Ngày Hết Hạn
              </th>
              <th className="package-table__th px-6 py-4 text-left text-[11px] font-bold text-indigo-300/70 uppercase tracking-[0.2em]">
                Ghi Chú
              </th>
              <th className="package-table__th px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
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
  );
};
