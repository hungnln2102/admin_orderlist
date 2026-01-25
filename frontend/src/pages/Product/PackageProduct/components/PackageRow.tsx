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
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span className="text-indigo-400">{slotUsed}</span>
            <span className="text-white/20">/</span>
            <span>{totalSlots} Vị trí</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${slotColorClass} shadow-[0_0_8px_rgba(34,197,94,0.4)]`}
              style={{ width: `${slotAvailabilityRatio}%` }}
            />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mt-2">
            Trống: {remainingSlots}
          </div>
        </td>
        {showCapacityColumn && (
          <td className="px-6 py-4 whitespace-nowrap">
            {showRowCapacity ? (
              <>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">{capacityUsed}</span>
                  <span className="text-white/20">/</span>
                  <span>{capacityLimit} GB</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${capacityColorClass} shadow-[0_0_8px_rgba(168,85,247,0.4)]`}
                    style={{
                      width: `${capacityAvailabilityRatio}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mt-2">
                  Trống: {remainingCapacity} GB
                </div>
              </>
            ) : (
              <div className="text-xs text-white/30 font-bold uppercase tracking-widest italic">N/A</div>
            )}
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
          {row.supplier || ""}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
          {Number(row.import || 0).toLocaleString("vi-VN")} VND
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className="font-mono font-semibold text-white/95 tracking-wide">
            {formatDisplayDate(row.expired) || "---"}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
          {row.note || ""}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-blue-400 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all active:scale-90"
            type="button"
            aria-label="Sửa"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-purple-400 border border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all active:scale-90"
            type="button"
            aria-label="Xem"
            onClick={(e) => {
              e.stopPropagation();
              onView(row);
            }}
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-rose-400 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all active:scale-90"
            type="button"
            aria-label="Xóa"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td
            colSpan={tableColumnCount}
            className="bg-indigo-900/30 px-6 py-4 text-white"
          >
            <div className="glass-panel-dark border border-white/5 bg-slate-900/40 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/70">
                    Chi Tiết Các Vị Trí
                  </p>
                  <p className="text-xl font-bold text-white tracking-tight mt-1">
                    Slot Distribution Maps
                  </p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-white/70">
                  {slotUsed} Dùng / {remainingSlots} Trống
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {slotCells.map((slot) => (
                  <div
                    key={slot.slotNumber}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.05] ${
                      slot.isUsed
                        ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
                        : "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-2 rounded-xl backdrop-blur-md ${slot.isUsed ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                        <BoltIcon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold tracking-tight text-white/90">
                        {slot.assignment?.slotLabel || `Slot ${slot.slotNumber}`}
                      </span>
                    </div>
                    <p className={`text-[11px] font-bold uppercase tracking-widest mt-2 ${slot.isUsed ? "text-amber-500/80" : "text-emerald-500/80"}`}>
                      {slot.assignment && showRowCapacity
                        ? formatCapacityLabel(slot.assignment.capacityUnits)
                        : slot.isUsed ? "ASSIGNED" : "AVAILABLE"}
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
