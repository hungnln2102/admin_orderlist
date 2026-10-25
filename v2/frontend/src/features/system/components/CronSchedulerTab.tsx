import React, { useState, useEffect, useCallback } from "react";
import {
  AlarmClock,
  Clock,
  Save,
  FileText,
  Plus,
  Zap,
  Power,
  X,
  Terminal,
  RefreshCw,
} from "lucide-react";

export interface CronJobItem {
  id: string;
  name: string;
  description: string;
  group: "orders" | "notifications" | "finance" | "summary" | "backup";
  groupLabel: string;
  time: string; // HH:mm dạng 24h
  frequency: "daily" | "weekdays" | "hourly" | "custom";
  frequencyLabel: string;
  selectedDays?: number[]; // 1 = T2, 2 = T3, ..., 7 = CN
  enabled: boolean;
  lastRunTime?: string;
  lastRunStatus?: "success" | "failed" | "running";
  lastRunMessage?: string;
  nextRunTime?: string;
  cronExpressionPreview?: string;
}

export interface CronExecutionLog {
  id: string;
  jobId: string;
  jobName: string;
  startedAt: string;
  durationMs: number;
  status: "success" | "failed";
  output: string;
  triggeredBy: "cron_schedule" | "manual_ui";
}

const CATEGORY_ACCENTS = [
  { border: "border-cyan-500/30", glow: "bg-cyan-500/20", text: "text-cyan-400" },
  { border: "border-indigo-500/30", glow: "bg-indigo-500/20", text: "text-indigo-400" },
  { border: "border-emerald-500/30", glow: "bg-emerald-500/20", text: "text-emerald-400" },
  { border: "border-purple-500/30", glow: "bg-purple-500/20", text: "text-purple-400" },
  { border: "border-amber-500/30", glow: "bg-amber-500/20", text: "text-amber-400" },
];

interface CronSchedulerTabProps {
  onShowToast: (type: "success" | "error", message: string) => void;
}

export const CronSchedulerTab: React.FC<CronSchedulerTabProps> = ({ onShowToast }) => {
  const [jobs, setJobs] = useState<CronJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  // Live Digital Clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  // Modal State for Logs
  const [selectedJobLogs, setSelectedJobLogs] = useState<CronJobItem | null>(null);
  const [jobLogs, setJobLogs] = useState<CronExecutionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Job Form State
  const [newJobName, setNewJobName] = useState("");
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newJobTime, setNewJobTime] = useState("08:00");
  const [newJobFrequency, setNewJobFrequency] = useState<"daily" | "weekdays" | "hourly" | "custom">("daily");
  const [newJobGroup, setNewJobGroup] = useState<"orders" | "notifications" | "finance" | "summary" | "backup">("orders");

  // 1. Fetch live cron jobs from PostgreSQL backend
  const fetchJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const res = await fetch("/api/system/cron-jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } else {
        onShowToast("error", "Không thể tải lịch tác vụ từ máy chủ.");
      }
    } catch (err) {
      console.error("Lỗi tải cron jobs:", err);
      onShowToast("error", "Lỗi kết nối máy chủ khi tải tác vụ.");
    } finally {
      setLoadingJobs(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // 2. Fetch live logs for a specific job
  const handleOpenLogs = async (job: CronJobItem) => {
    setSelectedJobLogs(job);
    setLoadingLogs(true);
    setJobLogs([]);
    try {
      const res = await fetch(`/api/system/cron-jobs/${job.id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setJobLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử tác vụ:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Toggle Alarm Status (On / Off) via Backend API
  const handleToggleJob = async (id: string) => {
    const current = jobs.find((j) => j.id === id);
    if (!current) return;
    const nextState = !current.enabled;

    try {
      const res = await fetch(`/api/system/cron-jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, ...updated, enabled: nextState } : j))
        );
        onShowToast("success", `${nextState ? "Đã BẬT" : "Đã TẮT"} tác vụ: [${current.name}]`);
      } else {
        const errData = await res.json().catch(() => ({}));
        onShowToast("error", errData.error || "Không thể cập nhật trạng thái tác vụ.");
      }
    } catch (err: any) {
      onShowToast("error", err.message || "Lỗi kết nối máy chủ");
    }
  };

  // Change Time for a job locally
  const handleTimeChange = (id: string, newTime: string) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id === id) {
          const [hour, min] = newTime.split(":");
          return {
            ...job,
            time: newTime,
            cronExpressionPreview: `${min || "0"} ${hour || "0"} * * *`,
            nextRunTime: `${newTime} ${job.frequency === "daily" ? "mai" : ""}`,
          };
        }
        return job;
      })
    );
  };

  // Change Frequency locally
  const handleFrequencyChange = (id: string, freq: "daily" | "weekdays" | "hourly" | "custom") => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id === id) {
          let label = "Hàng ngày";
          if (freq === "weekdays") label = "Thứ 2 - Thứ 6";
          if (freq === "hourly") label = "Mỗi giờ";
          if (freq === "custom") label = "Tùy chọn";
          return { ...job, frequency: freq, frequencyLabel: label };
        }
        return job;
      })
    );
  };

  // Run Job Immediately via Backend API
  const handleRunNow = async (job: CronJobItem) => {
    setRunningJobId(job.id);
    onShowToast("success", `⚡ Đang kích hoạt: ${job.name}...`);
    try {
      const res = await fetch(`/api/system/cron-jobs/${job.id}/run-now`, {
        method: "POST",
      });
      if (res.ok) {
        onShowToast("success", `✅ Tác vụ [${job.name}] đã chạy thành công!`);
        await fetchJobs();
      } else {
        const errData = await res.json().catch(() => ({}));
        onShowToast("error", errData.error || "Không thể kích hoạt chạy tác vụ.");
      }
    } catch (err: any) {
      onShowToast("error", err.message || "Lỗi kết nối khi chạy tác vụ");
    } finally {
      setRunningJobId(null);
    }
  };

  // Save Job Settings via Backend API
  const handleSaveJob = async (job: CronJobItem) => {
    setSavingJobId(job.id);
    try {
      const res = await fetch(`/api/system/cron-jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: job.time,
          frequency: job.frequency,
          selectedDays: job.selectedDays,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...updated } : j)));
        onShowToast("success", `Đã lưu lịch tác vụ [${job.name}] (${job.time})!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        onShowToast("error", errData.error || "Không thể lưu cấu hình tác vụ.");
      }
    } catch (err: any) {
      onShowToast("error", err.message || "Lỗi kết nối khi lưu");
    } finally {
      setSavingJobId(null);
    }
  };

  // Handle Add New Job via Backend API
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim()) {
      onShowToast("error", "Vui lòng nhập tên tác vụ!");
      return;
    }

    try {
      const res = await fetch("/api/system/cron-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newJobName,
          description: newJobDesc || "Tác vụ tự động hóa quản trị hệ thống.",
          group: newJobGroup,
          time: newJobTime,
          frequency: newJobFrequency,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setJobs((prev) => [created, ...prev]);
        onShowToast("success", `Đã tạo tác vụ mới: [${newJobName}]!`);
        setShowCreateModal(false);
        setNewJobName("");
        setNewJobDesc("");
      } else {
        const errData = await res.json().catch(() => ({}));
        onShowToast("error", errData.error || "Không thể tạo tác vụ.");
      }
    } catch (err: any) {
      onShowToast("error", err.message || "Lỗi kết nối máy chủ");
    }
  };

  // Filtered List
  const filteredJobs = jobs.filter((job) => {
    const matchSearch =
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.time.includes(searchQuery);
    const matchGroup = filterGroup === "all" || job.group === filterGroup;
    return matchSearch && matchGroup;
  });

  const activeCount = jobs.filter((j) => j.enabled).length;
  const pausedCount = jobs.length - activeCount;

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* 1. Compact Header Banner & Live Server Clock */}
      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
            <AlarmClock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Lịch Trình Tác Vụ & Báo Thức Hệ Thống
              </h2>
              <span className="px-2 py-0.2 text-[9px] font-black uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                CRON ALARM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cài đặt giờ tự động hóa dạng báo thức mini. Tổng: <strong className="text-white">{jobs.length}</strong> • Đang bật: <strong className="text-emerald-400">{activeCount}</strong> • Tạm dừng: <strong className="text-slate-400">{pausedCount}</strong>
            </p>
          </div>
        </div>

        {/* Right side: Live Digital Clock & Button */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-right font-mono">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              SERVER GMT+7
            </div>
            <div className="text-sm font-black text-cyan-300">
              {currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Báo Thức</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Tất Cả" },
            { id: "orders", label: "Đơn Hàng" },
            { id: "notifications", label: "Thông Báo" },
            { id: "finance", label: "Tài Chính" },
            { id: "summary", label: "Báo Cáo" },
            { id: "backup", label: "Sao Lưu" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterGroup(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterGroup === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tác vụ, giờ..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 3. Category-Style Grid: 3 Cột nhỏ gọn chuẩn PackageCategoryCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredJobs.map((job, idx) => {
          const isRunning = runningJobId === job.id;
          const isSaving = savingJobId === job.id;
          const accent = CATEGORY_ACCENTS[idx % CATEGORY_ACCENTS.length];

          return (
            <div
              key={job.id}
              className={`relative group rounded-2xl border transition-all duration-300 p-5 backdrop-blur-xl overflow-hidden ${
                job.enabled
                  ? `bg-slate-900/80 ${accent.border} hover:border-cyan-400/50 shadow-lg shadow-cyan-950/20`
                  : "bg-slate-900/30 border-slate-800/70 opacity-70 hover:opacity-90"
              }`}
            >
              {/* Background Ambient Glow */}
              <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none ${accent.glow}`} />

              {/* ── Top Header: Nhóm & Tên & Toolbar Viên Thuốc ── */}
              <div className="flex items-start justify-between mb-2.5 relative z-10 min-w-0 gap-2">
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                      {job.groupLabel}
                    </span>
                    {job.cronExpressionPreview && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-950/80 border border-slate-800 text-cyan-400">
                        {job.cronExpressionPreview}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide mt-0.5 truncate block" title={job.name}>
                    {job.name}
                  </h3>
                </div>

                {/* Pill Toolbar nhỏ gọn (Xem/Chạy/Lưu/Log) y hệt bên Gói Sản Phẩm */}
                <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    onClick={() => handleRunNow(job)}
                    disabled={isRunning}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Kích hoạt chạy thử ngay (Run Now)"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isRunning ? "animate-spin text-amber-400" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleSaveJob(job)}
                    disabled={isSaving}
                    className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Lưu cấu hình giờ báo thức"
                  >
                    <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin text-cyan-400" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleOpenLogs(job)}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Xem nhật ký chạy"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-3 relative z-10 leading-relaxed">
                {job.description}
              </p>

              {/* ── Cài Đặt Giờ Báo Thức Mini ── */}
              <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  {/* Toggle Switch Mini */}
                  <button
                    onClick={() => handleToggleJob(job.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                      job.enabled ? "bg-cyan-500 border-cyan-400 shadow-sm shadow-cyan-500/40" : "bg-slate-800 border-slate-700"
                    }`}
                    title={job.enabled ? "Báo thức Đang BẬT (bấm để tắt)" : "Báo thức Đang TẮT (bấm để bật)"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        job.enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>

                  {/* Input Giờ */}
                  <input
                    type="time"
                    value={job.time}
                    disabled={!job.enabled}
                    onChange={(e) => handleTimeChange(job.id, e.target.value)}
                    className={`font-mono text-xs font-black rounded-lg px-2 py-0.5 border focus:outline-none transition-all ${
                      job.enabled
                        ? "text-cyan-300 bg-slate-900 border-cyan-500/40 focus:border-cyan-400"
                        : "text-slate-500 bg-slate-950 border-slate-800 cursor-not-allowed"
                    }`}
                  />
                </div>

                {/* Dropdown Chu Kỳ */}
                <select
                  value={job.frequency}
                  disabled={!job.enabled}
                  onChange={(e) => handleFrequencyChange(job.id, e.target.value as any)}
                  className={`text-[10px] font-bold rounded-lg px-2 py-1 bg-slate-900 border focus:outline-none ${
                    job.enabled
                      ? "text-slate-300 border-slate-700 hover:border-cyan-500/40"
                      : "text-slate-500 border-slate-800 cursor-not-allowed"
                  }`}
                >
                  <option value="daily">Hàng ngày</option>
                  <option value="weekdays">T2 - T6</option>
                  <option value="hourly">Mỗi giờ</option>
                  <option value="custom">Tùy chọn</option>
                </select>
              </div>

              {/* ── 3 Stats Indicators Y Hệt Bên Gói Sản Phẩm ── */}
              <div className="grid grid-cols-3 gap-2 relative z-10">
                {/* Ô 1: Lần Tới */}
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 text-center">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">LẦN TỚI</div>
                  <div className="text-xs font-black text-white mt-0.5 truncate" title={job.nextRunTime}>
                    {job.enabled ? job.time : "--:--"}
                  </div>
                </div>

                {/* Ô 2: Kết Quả */}
                <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/15 text-center">
                  <div className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider truncate">KẾT QUẢ</div>
                  <div className="text-xs font-black text-emerald-400 mt-0.5 truncate" title={job.lastRunMessage}>
                    {job.lastRunStatus === "success" ? "Thành Công" : "Chờ Chạy"}
                  </div>
                </div>

                {/* Ô 3: Trạng Thái Báo Thức */}
                <div
                  className={`p-2 rounded-xl border text-center ${
                    job.enabled
                      ? "bg-cyan-500/5 border-cyan-500/20"
                      : "bg-slate-950/60 border-slate-800/60"
                  }`}
                >
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">BÁO THỨC</div>
                  <div className={`text-xs font-black mt-0.5 ${job.enabled ? "text-cyan-400" : "text-slate-500"}`}>
                    {job.enabled ? "Đang Bật" : "Đã Tắt"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Modal: Xem Nhật Ký Chạy Tác Vụ */}
      {selectedJobLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{selectedJobLogs.name}</h3>
                  <p className="text-[10px] text-slate-400">Lịch chạy: {selectedJobLogs.time} • ID: {selectedJobLogs.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJobLogs(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loadingLogs ? (
                <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Đang tải nhật ký từ máy chủ...</span>
                </div>
              ) : jobLogs.length > 0 ? (
                jobLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>{log.startedAt ? new Date(log.startedAt).toLocaleString("vi-VN") : "--"}</span>
                      <span className={log.status === "success" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {log.durationMs || 0}ms • {log.status || "done"}
                      </span>
                    </div>
                    <div className="text-slate-300 break-words whitespace-pre-wrap">{log.output || "Không có chi tiết"}</div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">
                  Chưa có nhật ký ghi nhận cho tác vụ này trên hệ thống.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedJobLogs(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Tạo Báo Thức Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleCreateJob}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <AlarmClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thêm Báo Thức Tác Vụ Mới</h3>
                  <p className="text-[11px] text-slate-400">Tạo lịch kích hoạt tự động theo giờ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Tên tác vụ (*)</label>
                <input
                  type="text"
                  required
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="Ví dụ: Tự động đồng bộ tồn kho Shopee"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={2}
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  placeholder="Mô tả công việc tác vụ sẽ chạy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Giờ kích hoạt</label>
                  <input
                    type="time"
                    required
                    value={newJobTime}
                    onChange={(e) => setNewJobTime(e.target.value)}
                    className="w-full font-mono text-sm font-bold bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tần suất</label>
                  <select
                    value={newJobFrequency}
                    onChange={(e) => setNewJobFrequency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekdays">Thứ 2 - Thứ 6</option>
                    <option value="hourly">Mỗi giờ</option>
                    <option value="custom">Tùy chọn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nhóm nghiệp vụ</label>
                <select
                  value={newJobGroup}
                  onChange={(e) => setNewJobGroup(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="orders">ĐƠN HÀNG & VẬN HÀNH</option>
                  <option value="notifications">THÔNG BÁO KHÁCH HÀNG</option>
                  <option value="finance">TÀI CHÍNH & TÍN DỤNG</option>
                  <option value="summary">BÁO CÁO & KẾ TOÁN</option>
                  <option value="backup">SAO LƯU HỆ THỐNG</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Lưu Báo Thức
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
