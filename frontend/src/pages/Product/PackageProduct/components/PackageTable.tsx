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
};

export const PackageTable: React.FC<PackageTableProps> = ({
  rows,
  loading,
  showCapacityColumn,
  tableColumnCount,
  onEdit,
  onView,
}) => {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const handleRowToggle = (rowId: number) => {
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Tên Gói
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Thông Tin Gói
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Số Lượng
              </th>
              {showCapacityColumn && (
                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                  Dung Lượng
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                NCC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Giá Nhập
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Ngày Hết Hạn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Ghi Chú
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                Thao Tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={tableColumnCount}
                  className="px-6 py-8 text-center text-white/80 text-sm"
                >
                  Đang Tải Dữ Liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={tableColumnCount}
                  className="px-6 py-8 text-center text-white/80 text-sm"
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
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
