/**
 * PackageCard Component
 * Mobile-friendly card view for package products
 */

import React from "react";
import { EyeIcon, PencilIcon, TrashIcon, BoltIcon } from "@heroicons/react/24/outline";
import {
  AugmentedRow,
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_LIMIT,
  formatCapacityLabel,
  formatDisplayDate,
  getCapacityAvailabilityState,
  getSlotAvailabilityState,
} from "../utils/packageHelpers";

type PackageCardProps = {
  row: AugmentedRow;
  showCapacityColumn: boolean;
  onEdit: (row: AugmentedRow) => void;
  onView: (row: AugmentedRow) => void;
  onDelete: (row: AugmentedRow) => void;
};

export const PackageCard: React.FC<PackageCardProps> = ({
  row,
  showCapacityColumn,
  onEdit,
  onView,
  onDelete,
}) => {
  const totalSlots = row.slotLimit || DEFAULT_SLOT_LIMIT;
  const slotUsed = row.slotUsed;
  const remainingSlots = row.remainingSlots;
  const slotAvailabilityRatio =
    totalSlots > 0 ? Math.min((remainingSlots / totalSlots) * 100, 100) : 0;
  const slotState = getSlotAvailabilityState(remainingSlots);
  const slotColorClass =
    slotState === "out" ? "bg-red-500" : slotState === "low" ? "bg-yellow-500" : "bg-green-500";
  const slotGlowClass =
    slotState === "out" ? "bg-red-500" : slotState === "low" ? "bg-amber-500" : "bg-emerald-500";

  const showRowCapacity = showCapacityColumn && !!row.hasCapacityField;
  const capacityLimit = row.capacityLimit || DEFAULT_CAPACITY_LIMIT;
  const capacityUsed = row.capacityUsed;
  const remainingCapacity = row.remainingCapacity;
  const capacityRatio =
    capacityLimit > 0 ? Math.min((remainingCapacity / capacityLimit) * 100, 100) : 0;
  const capState = getCapacityAvailabilityState(remainingCapacity, capacityLimit);
  const capColorClass =
    capState === "out" ? "bg-red-500" : capState === "low" ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="package-card relative group overflow-hidden glass-panel rounded-[24px] p-4 transition-all duration-500 hover:border-indigo-500/40 shadow-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-900/50">
      {/* Glow effect */}
      <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-10 transition-all duration-700 group-hover:opacity-20 ${slotGlowClass}`} />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Header: Package name + tags */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <h3 className="text-[12px] sm:text-sm font-bold text-white tracking-widest uppercase truncate leading-none">
              {row.package || "--"}
            </h3>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {row.informationUser && (
              <div className="inline-flex px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-indigo-300 uppercase tracking-wide truncate max-w-[200px]">
                  {row.informationUser}
                </p>
              </div>
            )}
            {row.supplier && (
              <div className="inline-flex px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 backdrop-blur-md min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-purple-300 uppercase tracking-wide truncate max-w-[120px]">
                  NCC: {row.supplier}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Slot + Capacity info */}
        <div className="flex items-stretch gap-3">
          {/* Slot info */}
          <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Vị trí</span>
              <span className="text-xs font-bold text-white">
                <span className="text-indigo-400">{slotUsed}</span>
                <span className="text-white/20 mx-0.5">/</span>
                {totalSlots}
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${slotColorClass} shadow-[0_0_8px_rgba(34,197,94,0.4)]`}
                style={{ width: `${slotAvailabilityRatio}%` }}
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1.5">
              Trống: {remainingSlots}
            </p>
          </div>

          {/* Capacity info (if applicable) */}
          {showRowCapacity && (
            <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Dung lượng</span>
                <span className="text-xs font-bold text-white">
                  <span className="text-purple-400">{capacityUsed}</span>
                  <span className="text-white/20 mx-0.5">/</span>
                  {capacityLimit} GB
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${capColorClass} shadow-[0_0_8px_rgba(168,85,247,0.4)]`}
                  style={{ width: `${capacityRatio}%` }}
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mt-1.5">
                Trống: {remainingCapacity} GB
              </p>
            </div>
          )}
        </div>

        {/* Price + Expiry info */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Giá nhập</span>
            <p className="text-sm font-black text-indigo-200 tabular-nums">
              {Number(row.import || 0).toLocaleString("vi-VN")} <span className="text-[10px] text-white/40">VND</span>
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0 pl-4 border-l border-white/10">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Hết hạn</span>
            <p className="text-[11px] font-bold text-slate-300 tabular-nums font-mono">
              {formatDisplayDate(row.expired) || "---"}
            </p>
          </div>
        </div>

        {/* Note (if exists) */}
        {row.note && (
          <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[11px] text-white/50 truncate" title={row.note}>
              📝 {row.note}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-90"
            onClick={() => onEdit(row)}
            title="Sửa"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-90"
            onClick={() => onView(row)}
            title="Xem"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500/70 hover:bg-rose-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-90"
            onClick={() => onDelete(row)}
            title="Xóa"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
