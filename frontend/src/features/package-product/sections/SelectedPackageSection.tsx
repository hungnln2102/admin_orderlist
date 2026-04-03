import React from "react";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import { PackageTable } from "../components/PackageTable";
import { STATUS_FILTERS, type AugmentedRow, type StatusFilter } from "../utils/packageHelpers";

type SelectedPackageSectionProps = {
  selectedPackage: string | null;
  mobileInline?: boolean;
  searchTerm: string;
  statusFilter: StatusFilter;
  filteredRowsCount: number;
  rows: AugmentedRow[];
  loading: boolean;
  showCapacityColumn: boolean;
  tableColumnCount: number;
  deleteMode: boolean;
  deleteProcessing: boolean;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onStartDeleteMode: () => void;
  onConfirmDeletePackages: () => void;
  onResetDeleteSelection: () => void;
  onAddButtonClick: () => void;
  onEditRow: (row: AugmentedRow) => void;
  onViewRow: (row: AugmentedRow) => void;
  onDeleteRow: (row: AugmentedRow) => void;
};

export const SelectedPackageSection: React.FC<SelectedPackageSectionProps> = ({
  selectedPackage,
  mobileInline = false,
  searchTerm,
  statusFilter,
  filteredRowsCount,
  rows,
  loading,
  showCapacityColumn,
  tableColumnCount,
  deleteMode,
  deleteProcessing,
  onSearchTermChange,
  onStatusFilterChange,
  onStartDeleteMode,
  onConfirmDeletePackages,
  onResetDeleteSelection,
  onAddButtonClick,
  onEditRow,
  onViewRow,
  onDeleteRow,
}) => {
  if (!selectedPackage) return null;

  return (
    <>
      <div
        className={`rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm ${
          mobileInline ? "p-3" : "p-4 lg:p-5"
        }`}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative w-full lg:flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
            <input
              type="text"
              placeholder={`Tìm kiếm trong các gói của ${selectedPackage}...`}
              className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              style={{ paddingLeft: "3.25rem" }}
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
          </div>

          <div className="flex w-full lg:w-auto gap-3 items-center">
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
            <div className="relative w-full lg:w-[180px]">
              <select
                className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")',
                  backgroundPosition: "right 1rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.1rem",
                  paddingRight: "2.5rem",
                }}
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>

            {!deleteMode ? (
              <GradientButton
                icon={TrashIcon}
                onClick={onStartDeleteMode}
                disabled={deleteProcessing}
                className="!py-2 !px-4 text-xs"
              >
                Xóa Loại gói
              </GradientButton>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onConfirmDeletePackages}
                  className="flex items-center justify-center gap-1 rounded-xl bg-emerald-500/80 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-600 transition disabled:opacity-60"
                  disabled={deleteProcessing}
                  title="Xác nhận xóa"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onResetDeleteSelection}
                  className="flex items-center justify-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-white/20 transition disabled:opacity-60"
                  disabled={deleteProcessing}
                  title="Hủy xóa"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            <GradientButton
              icon={PlusIcon}
              onClick={onAddButtonClick}
              disabled={!selectedPackage}
              className="!py-2 !px-4 text-xs"
            >
              Thêm Gói
            </GradientButton>

            <button
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                filteredRowsCount
                  ? "bg-white/5 text-white border-white/10 hover:bg-white/10"
                  : "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
              }`}
              disabled={!filteredRowsCount}
            >
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      <div
        className={`text-xs font-medium text-indigo-300/60 flex items-center gap-2 ${
          mobileInline ? "px-1 py-2" : "px-4 py-1"
        }`}
      >
        <span className="opacity-70">Đang xem:</span>
        <span className="text-indigo-300">{selectedPackage}</span>
        {statusFilter !== "all" && (
          <>
            <span className="text-white/20">/</span>
            <span className="text-indigo-300">
              {STATUS_FILTERS.find((opt) => opt.value === statusFilter)?.label}
            </span>
          </>
        )}
      </div>
      <PackageTable
        rows={rows}
        loading={loading}
        showCapacityColumn={showCapacityColumn}
        tableColumnCount={tableColumnCount}
        onEdit={onEditRow}
        onView={onViewRow}
        onDelete={onDeleteRow}
      />
    </>
  );
};

