import React, { useState, useEffect } from "react";
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

const INITIAL_CRON_JOBS: CronJobItem[] = [
  {
    id: "task_order_status_0h",
    name: "Cập nhật trạng thái đơn & Báo 0 ngày",
    description: "Rà soát hạn dùng đơn hàng, chuyển trạng thái Hết hạn (<0 ngày), Cần gia hạn và bắn Telegram đơn 0 ngày.",
    group: "orders",
    groupLabel: "ĐƠN HÀNG & VẬN HÀNH",
    time: "00:00",
    frequency: "daily",
    frequencyLabel: "Hàng ngày",
    selectedDays: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    lastRunTime: "Hôm nay 00:00:03",
    lastRunStatus: "success",
    lastRunMessage: "Đã cập nhật 14 đơn hết hạn, 8 đơn cần gia hạn.",
    nextRunTime: "00:00 ngày mai",
    cronExpressionPreview: "0 0 * * *",
  },
  {
    id: "task_notify_four_days_7h",
    name: "Thông báo nhắc gia hạn đơn (4 ngày)",
    description: "Quét tất cả đơn hàng còn 4 ngày sử dụng và gửi danh sách chi tiết đến nhóm Telegram CSKH chăm sóc khách.",
    group: "notifications",
    groupLabel: "THÔNG BÁO KHÁCH HÀNG",
    time: "07:00",
    frequency: "daily",
    frequencyLabel: "Hàng ngày",
    selectedDays: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    lastRunTime: "Hôm nay 07:00:02",
    lastRunStatus: "success",
    lastRunMessage: "Tìm thấy 6 đơn hàng còn 4 ngày sử dụng.",
    nextRunTime: "07:00 ngày mai",
    cronExpressionPreview: "0 7 * * *",
  },
  {
    id: "task_credit_savings_profit",
    name: "Tự động sinh lời & cộng lãi đa sổ",
    description: "Rà soát các sổ tiết kiệm tích lũy Credit đến hạn, tính lãi sinh lời và tự động cộng dồn số dư ví tín dụng.",
    group: "finance",
    groupLabel: "TÀI CHÍNH & TÍN DỤNG",
    time: "01:00",
    frequency: "hourly",
    frequencyLabel: "Định kỳ mỗi giờ",
    selectedDays: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    lastRunTime: "Vừa xong 21:00:01",
    lastRunStatus: "success",
    lastRunMessage: "Quét 24 sổ tiết kiệm, đã cộng lãi thành công.",
    nextRunTime: "22:00 hôm nay",
    cronExpressionPreview: "0 * * * *",
  },
  {
    id: "task_finalize_daily_summary",
    name: "Chốt số liệu doanh thu cuối ngày",
    description: "Khóa sổ giao dịch hàng ngày, chốt tổng doanh thu, giá vốn, lợi nhuận gộp và tạo snapshot đối soát dòng tiền.",
    group: "summary",
    groupLabel: "BÁO CÁO & KẾ TOÁN",
    time: "23:55",
    frequency: "daily",
    frequencyLabel: "Hàng ngày",
    selectedDays: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    lastRunTime: "Hôm qua 23:55:01",
    lastRunStatus: "success",
    lastRunMessage: "Doanh thu 18.450.000 ₫, Lợi nhuận 7.120.000 ₫.",
    nextRunTime: "23:55 hôm nay",
    cronExpressionPreview: "55 23 * * *",
  },
  {
    id: "task_auto_backup_database",
    name: "Tự động sao lưu Database lên Drive",
    description: "Dump toàn bộ CSDL PostgreSQL, nén file snapshot mã hóa và đồng bộ lên thư mục Google Drive dự phòng.",
    group: "backup",
    groupLabel: "SAO LƯU HỆ THỐNG",
    time: "03:30",
    frequency: "daily",
    frequencyLabel: "Hàng ngày",
    selectedDays: [1, 2, 3, 4, 5, 6, 7],
    enabled: false,
    lastRunTime: "Chưa kích hoạt",
    lastRunStatus: undefined,
    lastRunMessage: "Tác vụ đang tạm dừng để bảo trì đường truyền.",
    nextRunTime: "Tạm dừng",
    cronExpressionPreview: "30 3 * * *",
  },
];

const MOCK_EXECUTION_LOGS: CronExecutionLog[] = [
  {
    id: "log_1",
    jobId: "task_order_status_0h",
    jobName: "Cập nhật trạng thái đơn & Báo 0 ngày",
    startedAt: "23/10/2026 00:00:00",
    durationMs: 3120,
    status: "success",
    output: "[CRON 0H] Hoàn thành cập nhật trạng thái đơn. Expired: 14, Renew: 8. Telegram notify: 4 sent.",
    triggeredBy: "cron_schedule",
  },
  {
    id: "log_2",
    jobId: "task_notify_four_days_7h",
    jobName: "Thông báo nhắc gia hạn đơn (4 ngày)",
    startedAt: "23/10/2026 07:00:00",
    durationMs: 1850,
    status: "success",
    output: "[CRON 7H] Quét xong đơn 4 ngày. Gửi 6 thông báo đơn hàng sắp hết hạn đến nhóm CSKH.",
    triggeredBy: "cron_schedule",
  },
  {
    id: "log_3",
    jobId: "task_credit_savings_profit",
    jobName: "Tự động sinh lời & cộng lãi đa sổ",
    startedAt: "23/10/2026 21:00:00",
    durationMs: 980,
    status: "success",
    output: "[CRON HOURLY] Đã tính lãi tích lũy cho 24 tài khoản ví Credit. Tổng chi trả: 142.500 MCoin.",
    triggeredBy: "cron_schedule",
  },
];

interface CronSchedulerTabProps {
  onShowToast: (type: "success" | "error", message: string) => void;
}

export const CronSchedulerTab: React.FC<CronSchedulerTabProps> = ({ onShowToast }) => {
  const [jobs, setJobs] = useState<CronJobItem[]>(INITIAL_CRON_JOBS);
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

  // Modal State
  const [selectedJobLogs, setSelectedJobLogs] = useState<CronJobItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Job Form State
  const [newJobName, setNewJobName] = useState("");
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newJobTime, setNewJobTime] = useState("08:00");
  const [newJobFrequency, setNewJobFrequency] = useState<"daily" | "weekdays" | "hourly" | "custom">("daily");
  const [newJobGroup, setNewJobGroup] = useState<"orders" | "notifications" | "finance" | "summary" | "backup">("orders");

  // Toggle Alarm Status (On / Off)
  const handleToggleJob = (id: string) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id === id) {
          const nextState = !job.enabled;
          onShowToast(
            "success",
            `${nextState ? "Đã BẬT" : "Đã TẮT"} báo thức: [${job.name}]`
          );
          return {
            ...job,
            enabled: nextState,
            nextRunTime: nextState ? `${job.time} ${job.frequency === "daily" ? "mai" : ""}` : "Tạm dừng",
          };
        }
        return job;
      })
    );
  };

  // Change Time for a job
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

  // Change Frequency
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

  // Run Job Immediately
  const handleRunNow = async (job: CronJobItem) => {
    setRunningJobId(job.id);
    onShowToast("success", `⚡ Đang kích hoạt: ${job.name}...`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                lastRunTime: `Vừa xong (${new Date().toLocaleTimeString("vi-VN")})`,
                lastRunStatus: "success",
                lastRunMessage: "Chạy thủ công thành công.",
              }
            : item
        )
      );
      onShowToast("success", `✅ Tác vụ [${job.name}] đã chạy thành công!`);
    } finally {
      setRunningJobId(null);
    }
  };

  // Save Job Settings
  const handleSaveJob = async (job: CronJobItem) => {
    setSavingJobId(job.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      onShowToast("success", `Đã lưu báo thức [${job.name}] (${job.time})!`);
    } finally {
      setSavingJobId(null);
    }
  };

  // Handle Add New Job
  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim()) {
      onShowToast("error", "Vui lòng nhập tên tác vụ!");
      return;
    }

    const [hour, min] = newJobTime.split(":");
    const newJob: CronJobItem = {
      id: `task_${Date.now()}`,
      name: newJobName,
      description: newJobDesc || "Tác vụ tự động hóa quản trị hệ thống.",
      group: newJobGroup,
      groupLabel:
        newJobGroup === "orders"
          ? "ĐƠN HÀNG & VẬN HÀNH"
          : newJobGroup === "notifications"
          ? "THÔNG BÁO KHÁCH HÀNG"
          : newJobGroup === "finance"
          ? "TÀI CHÍNH & TÍN DỤNG"
          : newJobGroup === "summary"
          ? "BÁO CÁO & KẾ TOÁN"
          : "SAO LƯU HỆ THỐNG",
      time: newJobTime,
      frequency: newJobFrequency,
      frequencyLabel:
        newJobFrequency === "daily"
          ? "Hàng ngày"
          : newJobFrequency === "weekdays"
          ? "Thứ 2 - Thứ 6"
          : newJobFrequency === "hourly"
          ? "Mỗi giờ"
          : "Tùy chọn",
      enabled: true,
      lastRunTime: "Chưa kích hoạt",
      lastRunStatus: undefined,
      nextRunTime: `${newJobTime} mai`,
      cronExpressionPreview: `${min || "0"} ${hour || "0"} * * *`,
    };

    setJobs((prev) => [newJob, ...prev]);
    onShowToast("success", `Đã tạo báo thức mới: [${newJobName}]!`);
    setShowCreateModal(false);
    setNewJobName("");
    setNewJobDesc("");
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
                    onClick={() => setSelectedJobLogs(job)}
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
              {MOCK_EXECUTION_LOGS.filter((l) => l.jobId === selectedJobLogs.id).length > 0 ? (
                MOCK_EXECUTION_LOGS.filter((l) => l.jobId === selectedJobLogs.id).map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>{log.startedAt}</span>
                      <span className="text-cyan-400">{log.durationMs}ms</span>
                    </div>
                    <div className="text-slate-300 break-words">{log.output}</div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">
                  Chưa có nhật ký ghi nhận cho tác vụ này.
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
