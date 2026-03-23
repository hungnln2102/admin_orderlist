import React from "react";
import { EyeIcon, PencilIcon, PlusIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../../components/ui/GradientButton";

const SUMMARY_CARD_ACCENTS = [
  {
    border: "border-sky-500/30",
    glow: "bg-sky-500/20",
  },
  {
    border: "border-emerald-500/30",
    glow: "bg-emerald-500/20",
  },
  {
    border: "border-violet-500/30",
    glow: "bg-violet-500/20",
  },
  {
    border: "border-amber-500/30",
    glow: "bg-amber-500/20",
  },
] as const;

type PackageSummary = {
  name: string;
  total: number;
  low: number;
  out: number;
};

type PackageSummarySectionProps = {
  packageSummaries: PackageSummary[];
  selectedPackage: string | null;
  deleteMode: boolean;
  deleteProcessing: boolean;
  packagesMarkedForDeletion: Set<string>;
  selectedInlineSection: React.ReactNode;
  onCreateButtonClick: () => void;
  onCategorySelect: (value: string) => void;
  onEditTemplateFields: (packageName: string) => void;
  onTogglePackageMarked: (packageName: string) => void;
};

export const PackageSummarySection: React.FC<PackageSummarySectionProps> = ({
  packageSummaries,
  selectedPackage,
  deleteMode,
  deleteProcessing,
  packagesMarkedForDeletion,
  selectedInlineSection,
  onCreateButtonClick,
  onCategorySelect,
  onEditTemplateFields,
  onTogglePackageMarked,
}) => {
  return (
    <div className="glass-panel-dark rounded-3xl shadow-2xl p-6 text-white border border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Tổng quan các loại gói
          </h2>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Manage and organize your product categories
          </p>
        </div>
        <GradientButton
          icon={PlusIcon}
          onClick={onCreateButtonClick}
          className="!py-2 !px-4 text-xs shrink-0"
        >
          Tạo Loại Gói
        </GradientButton>
      </div>
      {packageSummaries.length === 0 ? (
        <p className="mt-6 text-sm text-white/70">
          Không có loại gói nào được tìm thấy.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packageSummaries.map((summary, index) => {
            const isSelected = summary.name === selectedPackage;
            const accent = SUMMARY_CARD_ACCENTS[index % SUMMARY_CARD_ACCENTS.length];
            const isMarkedForDeletion = packagesMarkedForDeletion.has(summary.name.trim());

            return (
              <div
                key={summary.name}
                className={`relative isolate rounded-[28px] border ${accent.border} bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${
                  isSelected
                    ? "ring-2 ring-indigo-500/50 shadow-indigo-500/20"
                    : "hover:bg-white/10 border-white/10"
                }`}
              >
                <div
                  className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-[40px] opacity-10 ${accent.glow}`}
                ></div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/50">
                      Loại Gói
                    </p>
                    <h3 className="text-xl font-bold tracking-tight mt-1">{summary.name}</h3>
                    <p className="mt-1 text-sm font-medium text-white/40">
                      Số lượng: {summary.total}
                    </p>
                  </div>
                  {deleteMode ? (
                    <label className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-400"
                        checked={isMarkedForDeletion}
                        disabled={deleteProcessing}
                        onChange={() => onTogglePackageMarked(summary.name)}
                      />
                      Chọn để xóa
                    </label>
                  ) : (
                    <div className="flex flex-col items-end gap-1 text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCategorySelect(summary.name)}
                          className={`p-2 rounded-full hover:bg-blue-50 transition ${
                            isSelected ? "text-blue-300" : "text-white/80"
                          }`}
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTemplateFields(summary.name)}
                          className="p-2 rounded-full hover:bg-indigo-50 text-indigo-500 transition"
                          title="Chỉnh sửa Loại Gói"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center transition-colors hover:bg-white/10">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-indigo-300/40">
                      Tổng
                    </dt>
                    <dd className="mt-1 text-xl font-bold text-white">{summary.total}</dd>
                  </div>
                  <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-3 text-center transition-colors hover:bg-amber-500/10">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60">
                      Sắp hết
                    </dt>
                    <dd className="mt-1 text-xl font-bold text-amber-400">{summary.low}</dd>
                  </div>
                  <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-3 text-center transition-colors hover:bg-rose-500/10">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-rose-500/60">
                      Hết
                    </dt>
                    <dd className="mt-1 text-xl font-bold text-rose-400">{summary.out}</dd>
                  </div>
                </dl>
                {isSelected && (
                  <div className="mt-4 border-t border-white/10 pt-4 md:hidden">
                    {selectedInlineSection}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

