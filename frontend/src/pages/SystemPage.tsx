import React, { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  ToggleLeft,
  ToggleRight,
  Database,
  AlarmClock,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import { CronSchedulerTab } from "@/features/system/components/CronSchedulerTab";

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: any;
  raw_value: string;
  data_type: "NUMBER" | "BOOLEAN" | "JSON" | "STRING";
  description: string;
  group_name: string;
  updated_at: string;
  updated_by: string;
}

export const SystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "expiry_alerts" | "cron" | "telegram" | "backup">("general");
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable Values state
  const [formData, setFormData] = useState<Record<string, any>>({});

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Load System Configs
  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const res = await fetch("/api/system/configs");
      if (!res.ok) throw new Error("Không thể tải danh sách cấu hình hệ thống.");
      const data: SystemConfig[] = await res.json();
      setConfigs(data);

      const initialData: Record<string, any> = {};
      data.forEach((c) => {
        initialData[c.config_key] = c.config_value;
      });
      setFormData(initialData);
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi tải cấu hình");
    } finally {
      setLoadingConfigs(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Handle Input Change
  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Save Single Config
  const handleSaveConfig = async (key: string, linkedJobId?: string, linkedJobField?: "time" | "enabled") => {
    try {
      setSavingKey(key);
      const rawVal = formData[key];
      const res = await fetch(`/api/system/configs/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: String(rawVal) }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Không thể lưu cấu hình");
      }

      // Tự động đồng bộ sang bảng cron_jobs nếu có liên kết
      if (linkedJobId && linkedJobField) {
        await fetch(`/api/system/cron-jobs/${linkedJobId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [linkedJobField]: rawVal }),
        }).catch(() => null);
      }

      showToast("success", `Đã cập nhật cấu hình [${key}] thành công!`);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lưu cấu hình thất bại");
    } finally {
      setSavingKey(null);
    }
  };

  // Kích hoạt chạy thử tác vụ ngay lập tức
  const handleRunTaskNow = async (jobId: string, label: string) => {
    try {
      setRunningJobId(jobId);
      showToast("success", `⚡ Đang kích hoạt tác vụ [${label}]...`);
      const res = await fetch(`/api/system/cron-jobs/${jobId}/run-now`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Không thể kích hoạt tác vụ");
      }

      showToast("success", `✅ Tác vụ [${label}] đã chạy hoàn tất!`);
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi kích hoạt chạy tác vụ");
    } finally {
      setRunningJobId(null);
    }
  };

  const getConfigObj = (key: string) => configs.find((c) => c.config_key === key);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/95 border-rose-500/50 text-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 rounded-2xl border border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 shadow-inner">
            <Settings className="w-8 h-8 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Cấu Hình Hệ Thống (System Configs)
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                V2 Enterprise
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý tập trung các thông số tự động hóa, thông báo Telegram và giám sát nhật ký chạy nền.
            </p>
          </div>
        </div>

        <button
          onClick={fetchConfigs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700 active:scale-95 shrink-0 shadow-md cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loadingConfigs ? "animate-spin text-cyan-400" : ""}`} />
          Tải lại cấu hình
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Database className="w-4 h-4" />
          Cấu Hình Vận Hành & Giá
        </button>

        {/* Tab Riêng: Hạn Dùng & Cảnh Báo Đơn */}
        <button
          onClick={() => setActiveTab("expiry_alerts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "expiry_alerts"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Hạn Dùng & Cảnh Báo Đơn</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
            RIÊNG
          </span>
        </button>

        <button
          onClick={() => setActiveTab("cron")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "cron"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <AlarmClock className="w-4 h-4 text-cyan-400" />
          Lịch Trình Tác Vụ (Báo Thức Cron)
        </button>

        <button
          onClick={() => setActiveTab("telegram")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "telegram"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Bell className="w-4 h-4" />
          Thông Báo Telegram
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "backup"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Database className="w-4 h-4" />
          Backup & Google Drive
        </button>
      </div>

      {/* Tab: Smart Cron Scheduler (Alarm UI) */}
      {activeTab === "cron" && (
        <CronSchedulerTab onShowToast={(type, text) => showToast(type, text)} />
      )}

      {/* ── TAB MỚI RIÊNG BIỆT: HẠN DÙNG & CẢNH BÁO ĐƠN HÀNG ── */}
      {activeTab === "expiry_alerts" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Giới Thiệu Chuyên Sâu */}
          <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Quản Trị Hạn Dùng & Cảnh Báo Gia Hạn Đơn Hàng
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SSOT DECOUPLED
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kiến trúc đã bóc tách: Tiến trình chuyển đổi trạng thái Database (00:00 ngầm) hoàn toàn độc lập với Thông báo Telegram ban ngày.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* THẺ 1: ĐƠN HẾT HẠN HÔM NAY (0 NGÀY) */}
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-rose-500/30 flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-rose-500/10 blur-xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Đơn Hết Hạn Hôm Nay (0 Ngày)</h3>
                      <p className="text-[11px] text-slate-400">Cảnh báo đơn hết hạn đúng trong ngày</p>
                    </div>
                  </div>

                  {/* Toggle On/Off */}
                  <button
                    onClick={() => {
                      const currentVal = formData["ZERO_DAYS_NOTIFICATION_ENABLED"] ?? true;
                      const newVal = !currentVal;
                      handleChange("ZERO_DAYS_NOTIFICATION_ENABLED", newVal);
                      handleSaveConfig("ZERO_DAYS_NOTIFICATION_ENABLED", "task_notify_zero_days_7h", "enabled");
                    }}
                    className="cursor-pointer focus:outline-none"
                    title="Bật/Tắt gửi thông báo đơn 0 ngày"
                  >
                    {(formData["ZERO_DAYS_NOTIFICATION_ENABLED"] ?? true) ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400 transition-transform active:scale-95" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600 transition-transform active:scale-95" />
                    )}
                  </button>
                </div>

                {/* Giờ thông báo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Giờ phát thông báo (ZERO_DAYS_NOTIFICATION_TIME)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={formData["ZERO_DAYS_NOTIFICATION_TIME"] ?? "07:00"}
                      onChange={(e) => handleChange("ZERO_DAYS_NOTIFICATION_TIME", e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                    <button
                      onClick={() => handleSaveConfig("ZERO_DAYS_NOTIFICATION_TIME", "task_notify_zero_days_7h", "time")}
                      disabled={savingKey === "ZERO_DAYS_NOTIFICATION_TIME"}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === "ZERO_DAYS_NOTIFICATION_TIME" ? "..." : "Lưu"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Giờ quét và gửi danh sách đơn hết hạn hôm nay lên Telegram</p>
                </div>

                {/* Topic ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Telegram Topic ID (ZERO_DAYS_TOPIC_ID)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Mặc định: 2563"
                      value={formData["ZERO_DAYS_TOPIC_ID"] ?? "2563"}
                      onChange={(e) => handleChange("ZERO_DAYS_TOPIC_ID", e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                    <button
                      onClick={() => handleSaveConfig("ZERO_DAYS_TOPIC_ID")}
                      disabled={savingKey === "ZERO_DAYS_TOPIC_ID"}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === "ZERO_DAYS_TOPIC_ID" ? "..." : "Lưu"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Thread Telegram nhận thông báo đơn 0 ngày</p>
                </div>
              </div>

              {/* Nút Test Run Now */}
              <div className="pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleRunTaskNow("task_notify_zero_days_7h", "Thông báo đơn 0 ngày")}
                  disabled={runningJobId === "task_notify_zero_days_7h"}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50 shadow-sm"
                >
                  <Zap className={`w-3.5 h-3.5 ${runningJobId === "task_notify_zero_days_7h" ? "animate-spin text-amber-400" : "text-rose-400"}`} />
                  <span>{runningJobId === "task_notify_zero_days_7h" ? "Đang quét..." : "Gửi Thử Thông Báo 0 Ngày Ngay"}</span>
                </button>
              </div>
            </div>

            {/* THẺ 2: ĐƠN CẬN HẠN CẦN GIA HẠN (N NGÀY) */}
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-amber-500/30 flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Đơn Cận Hạn Cần Gia Hạn (N Ngày)</h3>
                      <p className="text-[11px] text-slate-400">Nhắc nhở khách hàng trước khi hết hạn</p>
                    </div>
                  </div>
                </div>

                {/* Số ngày cảnh báo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Số ngày còn lại để cảnh báo (RENEWAL_WARN_DAYS)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData["RENEWAL_WARN_DAYS"] ?? 4}
                      onChange={(e) => handleChange("RENEWAL_WARN_DAYS", e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      onClick={() => handleSaveConfig("RENEWAL_WARN_DAYS")}
                      disabled={savingKey === "RENEWAL_WARN_DAYS"}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === "RENEWAL_WARN_DAYS" ? "..." : "Lưu"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Mốc số ngày cận hạn sẽ kích hoạt gửi tin nhắn chăm sóc</p>
                </div>

                {/* Giờ thông báo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Giờ phát thông báo (RENEWAL_NOTIFICATION_TIME)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={formData["RENEWAL_NOTIFICATION_TIME"] ?? "07:00"}
                      onChange={(e) => handleChange("RENEWAL_NOTIFICATION_TIME", e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      onClick={() => handleSaveConfig("RENEWAL_NOTIFICATION_TIME", "task_notify_four_days_7h", "time")}
                      disabled={savingKey === "RENEWAL_NOTIFICATION_TIME"}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === "RENEWAL_NOTIFICATION_TIME" ? "..." : "Lưu"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Giờ gửi danh sách đơn cần gia hạn kèm QR thanh toán</p>
                </div>

                {/* Topic ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Telegram Topic ID (FOUR_DAYS_TOPIC_ID)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Mặc định: 12"
                      value={formData["FOUR_DAYS_TOPIC_ID"] ?? "12"}
                      onChange={(e) => handleChange("FOUR_DAYS_TOPIC_ID", e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      onClick={() => handleSaveConfig("FOUR_DAYS_TOPIC_ID")}
                      disabled={savingKey === "FOUR_DAYS_TOPIC_ID"}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === "FOUR_DAYS_TOPIC_ID" ? "..." : "Lưu"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Thread Telegram nhận thông báo nhắc gia hạn</p>
                </div>
              </div>

              {/* Nút Test Run Now */}
              <div className="pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleRunTaskNow("task_notify_four_days_7h", "Nhắc gia hạn đơn")}
                  disabled={runningJobId === "task_notify_four_days_7h"}
                  className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50 shadow-sm"
                >
                  <Zap className={`w-3.5 h-3.5 ${runningJobId === "task_notify_four_days_7h" ? "animate-spin text-cyan-400" : "text-amber-400"}`} />
                  <span>{runningJobId === "task_notify_four_days_7h" ? "Đang quét..." : "Gửi Thử Nhắc Gia Hạn Ngay"}</span>
                </button>
              </div>
            </div>

            {/* THẺ 3: CHUYỂN TRẠNG THÁI HỆ THỐNG (00:00 ĐÊM) */}
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-cyan-500/30 flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Chuyển Đổi Trạng Thái Hệ Thống</h3>
                      <p className="text-[11px] text-slate-400">Chạy ngầm DB lúc 00:00 (Nửa đêm)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    00:00 ĐÊM
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Nguyên lý vận hành an toàn:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Đơn quá hạn (&lt; 0 ngày) $\rightarrow$ chuyển sang <strong>EXPIRED</strong> (Giữ nguyên giá).</li>
                    <li>Đơn cận hạn (0 tới N ngày) $\rightarrow$ chuyển sang <strong>RENEW_REQUIRED</strong> (Đồng bộ giá Catalog).</li>
                    <li><strong>Hoàn toàn không gửi Telegram</strong> lúc nửa đêm, không làm phiền operator.</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
                  <span>Mã tác vụ trong Scheduler: </span>
                  <code className="text-cyan-400 font-mono">task_order_status_0h</code>
                </div>
              </div>

              {/* Nút Run Status Transition Now */}
              <div className="pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleRunTaskNow("task_order_status_0h", "Cập nhật trạng thái đơn")}
                  disabled={runningJobId === "task_order_status_0h"}
                  className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50 shadow-sm"
                >
                  <Zap className={`w-3.5 h-3.5 ${runningJobId === "task_order_status_0h" ? "animate-spin text-amber-400" : "text-cyan-400"}`} />
                  <span>{runningJobId === "task_order_status_0h" ? "Đang cập nhật..." : "Quét & Cập Nhật Trạng Thái DB Ngay"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: General Business Configs */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Box 1: Navigation banner to Dedicated Expiry Alerts Tab */}
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Hạn Dùng & Cảnh Báo Đơn
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ĐÃ TÁCH RIÊNG
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Quản trị độc lập đơn 0 ngày, đơn 4 ngày và cập nhật DB 0h</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toàn bộ cấu hình liên quan đến chu kỳ hết hạn đơn hàng (Đơn 0 ngày hết hạn hôm nay, Đơn N ngày cận hạn, giờ phát thông báo Telegram và quy trình quét DB ngầm) đã được quy tụ về một nơi duy nhất tại tab <strong>"Hạn Dùng & Cảnh Báo Đơn"</strong>.
              </p>
            </div>

            <button
              onClick={() => setActiveTab("expiry_alerts")}
              className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-sm"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Chuyển Sang Tab "Hạn Dùng & Cảnh Báo Đơn"</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {/* Box 2: Finance & Exchange Rates */}
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Tài Chính & Khớp Thanh Toán</h3>
                <p className="text-[11px] text-slate-400">Cấu hình tỷ giá quy đổi tiền và cổng Sepay Auto Match</p>
              </div>
            </div>

            {/* USDT Rate */}
            {getConfigObj("USDT_EXCHANGE_RATE") && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Tỷ giá USDT / VND (USDT_EXCHANGE_RATE)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="100"
                    value={formData["USDT_EXCHANGE_RATE"] ?? 25400}
                    onChange={(e) => handleChange("USDT_EXCHANGE_RATE", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => handleSaveConfig("USDT_EXCHANGE_RATE")}
                    disabled={savingKey === "USDT_EXCHANGE_RATE"}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === "USDT_EXCHANGE_RATE" ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Tỷ giá áp dụng khi quy đổi nạp tiền ví từ USDT sang VND
                </p>
              </div>
            )}

            {/* Sepay Auto Match Toggle */}
            {getConfigObj("SEPAY_AUTO_MATCH") && (
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Sepay Auto Match</h4>
                  <p className="text-[11px] text-slate-400">Tự động duyệt biên lai ngân hàng theo Slot Suffix chính xác</p>
                </div>

                <button
                  onClick={() => {
                    const newVal = !formData["SEPAY_AUTO_MATCH"];
                    handleChange("SEPAY_AUTO_MATCH", newVal);
                    handleSaveConfig("SEPAY_AUTO_MATCH");
                  }}
                  className="flex items-center gap-2 focus:outline-none cursor-pointer"
                >
                  {formData["SEPAY_AUTO_MATCH"] ? (
                    <ToggleRight className="w-9 h-9 text-emerald-400 transition-transform active:scale-95" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-600 transition-transform active:scale-95" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Telegram Notifications Config */}
      {activeTab === "telegram" && (
        <div className="space-y-6">
          {/* Top Switch */}
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                <Send className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Dịch Vụ Thông Báo Telegram</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bật/Tắt toàn bộ tiến trình đẩy tin nhắn Telegram tự động lên các nhóm quản trị.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const newVal = !formData["TELEGRAM_ENABLED"];
                handleChange("TELEGRAM_ENABLED", newVal);
                handleSaveConfig("TELEGRAM_ENABLED");
              }}
              className="flex items-center gap-2 focus:outline-none active:scale-95 transition-transform cursor-pointer"
            >
              {formData["TELEGRAM_ENABLED"] ? (
                <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/40 text-xs font-bold shadow-inner">
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                  Đang Bật (ONLINE)
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/40 text-xs font-bold shadow-inner">
                  <ToggleLeft className="w-6 h-6 text-rose-400" />
                  Đang Tắt (OFFLINE)
                </div>
              )}
            </button>
          </div>

          {/* Bot Token & Group Chat ID Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-3 shadow-xl">
              <label className="text-xs font-bold text-white block">Telegram Bot Token (TELEGRAM_BOT_TOKEN)</label>
              <p className="text-[11px] text-slate-400">Token HTTP API cấp bởi @BotFather</p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="password"
                  placeholder="VD: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={formData["TELEGRAM_BOT_TOKEN"] ?? ""}
                  onChange={(e) => handleChange("TELEGRAM_BOT_TOKEN", e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                />
                <button
                  onClick={() => handleSaveConfig("TELEGRAM_BOT_TOKEN")}
                  disabled={savingKey === "TELEGRAM_BOT_TOKEN"}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingKey === "TELEGRAM_BOT_TOKEN" ? "Đang lưu..." : "Lưu Token"}
                </button>
              </div>
            </div>

            <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-3 shadow-xl">
              <label className="text-xs font-bold text-white block">Telegram Chat / Group ID (TELEGRAM_CHAT_ID)</label>
              <p className="text-[11px] text-slate-400">ID của nhóm chat hoặc supergroup nhận thông báo</p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="text"
                  placeholder="VD: -100123456789"
                  value={formData["TELEGRAM_CHAT_ID"] ?? ""}
                  onChange={(e) => handleChange("TELEGRAM_CHAT_ID", e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                />
                <button
                  onClick={() => handleSaveConfig("TELEGRAM_CHAT_ID")}
                  disabled={savingKey === "TELEGRAM_CHAT_ID"}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingKey === "TELEGRAM_CHAT_ID" ? "Đang lưu..." : "Lưu Chat ID"}
                </button>
              </div>
            </div>
          </div>

          {/* Grid of Topics: Full 6 Topics bao gồm cả 0 ngày & 4 ngày */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { key: "TELEGRAM_ORDER_TOPIC_ID", label: "Topic ID - Đơn Hàng Mới", desc: "ID Thread nhận thông báo tạo đơn mới từ khách hàng" },
              { key: "ZERO_DAYS_TOPIC_ID", label: "Topic ID - Đơn 0 Ngày", desc: "ID Thread nhận cảnh báo các đơn hàng hết hạn hôm nay" },
              { key: "FOUR_DAYS_TOPIC_ID", label: "Topic ID - Đơn Cận Hạn 4 Ngày", desc: "ID Thread nhận thông báo chăm sóc khách hàng cận hạn" },
              { key: "TELEGRAM_RENEWAL_TOPIC_ID", label: "Topic ID - Gia Hạn Thành Công", desc: "ID Thread nhận tin báo gia hạn đơn hàng thành công" },
              { key: "TELEGRAM_FINANCE_TOPIC_ID", label: "Topic ID - Biến Động Số Dư", desc: "ID Thread nhận tin báo tiền chuyển vào/ra tài khoản ngân hàng" },
              { key: "TELEGRAM_SYSTEM_ALERT_TOPIC_ID", label: "Topic ID - Cảnh Báo Lỗi Khẩn Cấp", desc: "ID Thread nhận tin báo sự cố hệ thống nghiêm trọng" },
            ].map((item) => (
              <div key={item.key} className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-3 shadow-xl">
                <label className="text-xs font-bold text-white block">{item.label}</label>
                <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[32px]">{item.desc}</p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="VD: 7009"
                    value={formData[item.key] ?? ""}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => handleSaveConfig(item.key)}
                    disabled={savingKey === item.key}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === item.key ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Backup & Google Drive */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Tự Động Sao Lưu Cơ Sở Dữ Liệu (DB Backup)</h3>
              <p className="text-[11px] text-slate-400">Bật/tắt tính năng định kỳ dump database và upload lên Google Drive</p>
            </div>
            <button
              onClick={() => {
                const newVal = !formData["ENABLE_DB_BACKUP"];
                handleChange("ENABLE_DB_BACKUP", newVal);
                handleSaveConfig("ENABLE_DB_BACKUP");
              }}
              className="flex items-center gap-2 focus:outline-none cursor-pointer"
            >
              {formData["ENABLE_DB_BACKUP"] ? (
                <ToggleRight className="w-9 h-9 text-emerald-400 transition-transform active:scale-95" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-600 transition-transform active:scale-95" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "GOOGLE_DRIVE_FOLDER_ID", label: "Google Drive Folder ID", desc: "ID thư mục Google Drive lưu trữ các bản backup" },
              { key: "BACKUP_RETENTION_DAYS", label: "Số Ngày Giữ Backup (Retention Days)", desc: "Xoá tự động file backup cũ hơn số ngày này" },
              { key: "GOOGLE_DRIVE_OAUTH_CLIENT_ID", label: "OAuth Client ID", desc: "Google OAuth Client ID cho Google Drive API" },
              { key: "GOOGLE_DRIVE_OAUTH_CLIENT_SECRET", label: "OAuth Client Secret", desc: "Google OAuth Client Secret" },
              { key: "GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN", label: "OAuth Refresh Token", desc: "Google OAuth Refresh Token vĩnh viễn" },
            ].map((item) => (
              <div key={item.key} className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-3 shadow-xl">
                <label className="text-xs font-bold text-white block">{item.label} ({item.key})</label>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type={item.key.includes("SECRET") || item.key.includes("TOKEN") ? "password" : "text"}
                    value={formData[item.key] ?? ""}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => handleSaveConfig(item.key)}
                    disabled={savingKey === item.key}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === item.key ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemPage;
