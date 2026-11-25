import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Save,
  Repeat,
  CalendarDays,
} from "lucide-react";
import { GlassCard } from "@/shared/components";
import {
  useOtpThemeConfig,
  FixedCycleSection,
  CompactCalendarSection,
} from "../features/otp-theme";

const PORTAL_LIVE_URL = "https://www.mavrykpremium.com/system/";

type ActiveSectionTab = "fixed_cycle" | "calendar";

export const OtpThemeConfigPage: React.FC = () => {
  const {
    themesList,
    schedule,
    setSchedule,
    loading,
    saving,
    isDirty,
    todayActiveTheme,
    fetchConfig,
    handleSave,
  } = useOtpThemeConfig();

  const [activeTab, setActiveTab] = useState<ActiveSectionTab>("fixed_cycle");

  return (
    <div className="p-4 sm:p-6 space-y-4 text-slate-100 max-w-6xl mx-auto">
      {/* Header gọn gàng */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-base font-extrabold tracking-tight text-white">
            Cấu Hình Theme Website
          </h1>

          {!loading && todayActiveTheme.theme && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-semibold text-slate-200">
              <span>{todayActiveTheme.theme.icon}</span>
              <span>Hôm nay: {todayActiveTheme.theme.name}</span>
              <span className="text-slate-400">({todayActiveTheme.sourceLabel})</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchConfig()}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Tải lại</span>
          </button>

          <a
            href={PORTAL_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cổng Live</span>
          </a>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-xs font-bold text-white shadow-md shadow-cyan-900/30 hover:brightness-110 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Đang lưu..." : "Lưu cấu hình"}</span>
          </button>
        </div>
      </div>

      {/* 2 Tab chính: Cố Định & Chu Kỳ | Lịch Phân Bổ Theme */}
      <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-800 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("fixed_cycle")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "fixed_cycle"
              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Cố Định &amp; Chu Kỳ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "calendar"
              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Lịch Kéo Dải Ngày</span>
        </button>
      </div>

      {loading ? (
        <GlassCard className="p-10 flex items-center justify-center text-slate-400 text-sm gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Đang tải cấu hình theme...</span>
        </GlassCard>
      ) : activeTab === "fixed_cycle" ? (
        <FixedCycleSection
          schedule={schedule}
          setSchedule={setSchedule}
          themesList={themesList}
          portalBaseUrl={PORTAL_LIVE_URL}
        />
      ) : (
        <CompactCalendarSection
          schedule={schedule}
          setSchedule={setSchedule}
          themesList={themesList}
          portalBaseUrl={PORTAL_LIVE_URL}
        />
      )}
    </div>
  );
};

export default OtpThemeConfigPage;
