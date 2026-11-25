import React from "react";
import { Link2, RefreshCw, RotateCcw } from "lucide-react";
import { GlassCard } from "@/shared/components";
import { PortalUrlTable, usePortalUrlsConfig } from "@/features/website-urls";

export const WebsiteUrlConfigPage: React.FC = () => {
  const {
    config,
    loading,
    saving,
    loadConfig,
    validateRowSlug,
    saveRow,
    handleResetDefaults,
  } = usePortalUrlsConfig();

  return (
    <div className="p-4 sm:p-6 space-y-4 text-slate-100 max-w-5xl mx-auto">
      {/* Header gọn gàng */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30 shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <h1 className="text-base font-extrabold tracking-tight text-white">
            Quản Lý URL Website
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadConfig()}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Tải lại</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>
        </div>
      </div>

      {/* Bảng URL duy nhất */}
      {loading || !config ? (
        <GlassCard className="p-10 flex items-center justify-center text-slate-400 text-sm gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Đang tải danh sách URL...</span>
        </GlassCard>
      ) : (
        <PortalUrlTable
          basePath={config.basePath}
          defaultRouteKey={config.defaultRouteKey}
          items={Object.values(config.routes)}
          saving={saving}
          validateRowSlug={validateRowSlug}
          onSaveRow={saveRow}
        />
      )}
    </div>
  );
};
