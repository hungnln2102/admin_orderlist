import React from "react";
import { BoltIcon, EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  AugmentedRow,
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_LIMIT,
  formatCapacityLabel,
  formatDisplayDate,
  getCapacityAvailabilityState,
  getSlotAvailabilityState,
} from "../utils/packageHelpers";

type PackageRowProps = {
  row: AugmentedRow;
  showCapacityColumn: boolean;
  tableColumnCount: number;
  isExpanded: boolean;
  onToggle: (rowId: number) => void;
  onEdit: (row: AugmentedRow) => void;
  onView: (row: AugmentedRow) => void;
  onDelete: (row: AugmentedRow) => void;
};

export const PackageRow: React.FC<PackageRowProps> = ({
  row,
  showCapacityColumn,
  tableColumnCount,
  isExpanded,
  onToggle,
  onEdit,
  onView,
  onDelete,
}) => {
  const totalSlots = row.slotLimit || DEFAULT_SLOT_LIMIT;
  const slotUsed = row.slotUsed;
  const remainingSlots = row.remainingSlots;
  const slotAvailabilityRatio =
    totalSlots > 0 ? Math.min((remainingSlots / totalSlots) * 100, 100) : 0;
  const slotAvailabilityState = getSlotAvailabilityState(remainingSlots);
  const slotColorClass =
    slotAvailabilityState === "out"
      ? "bg-red-500"
      : slotAvailabilityState === "low"
      ? "bg-yellow-500"
      : "bg-green-500";

  const capacityLimit = row.capacityLimit || DEFAULT_CAPACITY_LIMIT;
  const capacityUsed = row.capacityUsed;
  const remainingCapacity = row.remainingCapacity;
  const capacityAvailabilityRatio =
    capacityLimit > 0
      ? Math.min((remainingCapacity / capacityLimit) * 100, 100)
      : 0;
  const capacityAvailabilityState = getCapacityAvailabilityState(
    remainingCapacity,
    capacityLimit
  );
  const capacityColorClass =
    capacityAvailabilityState === "out"
      ? "bg-red-500"
      : capacityAvailabilityState === "low"
      ? "bg-yellow-500"
      : "bg-green-500";
  const usedWithinLimit = Math.min(slotUsed, totalSlots);
  const slotAssignments = row.slotAssignments ?? [];
  const slotCells = Array.from({ length: Math.max(totalSlots, 0) }, (_, idx) => {
    const slotNumber = idx + 1;
    const isUsed = slotNumber <= usedWithinLimit;
    const assignment = slotAssignments[slotNumber - 1] ?? null;
    return { slotNumber, isUsed, assignment };
  });
  const showRowCapacity = showCapacityColumn && !!row.hasCapacityField;

  return (
    <>
      <tr
        onClick={() => onToggle(row.id)}
        className={`hover:bg-indigo-500/20 ${
          isExpanded ? "bg-indigo-900/30" : ""
        } cursor-pointer text-white`}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
          {row.package}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
          {row.informationUser || ""}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-white">
            <span className="font-medium">{slotUsed}</span> / {totalSlots} Vị trí
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${slotColorClass}`}
              style={{ width: `${slotAvailabilityRatio}%` }}
            />
          </div>
          <div className="text-xs text-white/70 mt-1">
            Còn trống: {remainingSlots}
          </div>
        </td>
        {showCapacityColumn && (
          <td className="px-6 py-4 whitespace-nowrap">
            {showRowCapacity ? (
              <>
                <div className="text-sm text-white">
                  <span className="font-medium">{capacityUsed}</span> /{" "}
                  {capacityLimit} GB
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full ${capacityColorClass}`}
                    style={{
                      width: `${capacityAvailabilityRatio}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-white/70 mt-1">
                  Còn trống: {remainingCapacity} GB
                </div>
              </>
            ) : (
              <div className="text-sm text-white/70 italic">Không có</div>
            )}
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
          {row.supplier || ""}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
          {Number(row.import || 0).toLocaleString("vi-VN")} VND
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
          {formatDisplayDate(row.expired)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
          {row.note || ""}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
            type="button"
            aria-label="Sửa"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
            type="button"
            aria-label="Xem"
            onClick={(e) => {
              e.stopPropagation();
              onView(row);
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
            type="button"
            aria-label="Xóa"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td
            colSpan={tableColumnCount}
            className="bg-indigo-900/30 px-6 py-4 text-white"
          >
            <div className="border border-dashed border-white/40 rounded-lg p-4 space-y-4 text-center">
              <div>
                <p className="text-sm font-semibold text-white">
                  Chi Tiết Các vị trí
                </p>
                <p className="text-xs text-white/80">
                  Hiển thị {totalSlots} vị trí - {slotUsed} đã dùng,{" "}
                  {remainingSlots} còn trống
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {slotCells.map((slot) => (
                  <div
                    key={slot.slotNumber}
                    className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 basis-1/2 sm:basis-1/3 lg:basis-1/5 min-w-[120px] ${
                      slot.isUsed
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-green-200 bg-green-50"
                    }`}
                    title={
                      slot.assignment?.matchValue ||
                      slot.assignment?.slotLabel ||
                      undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <BoltIcon
                        className={`h-5 w-5 ${
                          slot.isUsed ? "text-yellow-500" : "text-green-500"
                        }`}
                      />
                      <span
                        className="text-sm font-semibold text-gray-900 max-w-[170px] truncate"
                        title={
                          slot.assignment?.slotLabel ||
                          (slot.assignment
                            ? undefined
                            : `vị trí ${slot.slotNumber}`)
                        }
                      >
                        {slot.assignment?.slotLabel
                          ? slot.assignment.slotLabel
                          : `vị trí ${slot.slotNumber}`}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        slot.isUsed ? "text-yellow-700" : "text-green-700"
                      }`}
                    >
                      {slot.assignment && showRowCapacity
                        ? formatCapacityLabel(slot.assignment.capacityUnits)
                        : slot.isUsed
                        ? "Đã dùng"
                        : "Còn trống"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
