import React, { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Send,
  ToggleLeft,
  ToggleRight,
  Database,
  AlarmClock,
  Clock,
  Zap,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { CronSchedulerTab } from "@/features/system/components/CronSchedulerTab";
import { VpbankMailboxTab } from "@/features/system/components/VpbankMailboxTab";
import { TotpGeneratorTab } from "@/features/system/components/TotpGeneratorTab";

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
  // 5 Tabs Tinh Gọn Chuẩn Mực: Lịch Trình Tác Vụ, Thông Báo Telegram, Tài Chính & Thanh Toán, Backup, Sinh Mã TOTP
  const [activeTab, setActiveTab] = useState<"cron" | "telegram" | "finance" | "backup" | "totp">("cron");
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
              Quản lý tập trung lịch trình tự động hóa, thông báo Telegram, cổng thanh toán tài chính và sao lưu dữ liệu.
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

      {/* Navigation Tabs (5 Tabs Tinh Gọn) */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
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
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Bell className="w-4 h-4 text-blue-400" />
          Thông Báo Telegram
        </button>

        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "finance"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Tài Chính & Cổng Thanh Toán</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            VPBank & Sepay
          </span>
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "backup"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          Backup & Google Drive
        </button>

        <button
          onClick={() => setActiveTab("totp")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "totp"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          Sinh mã TOTP
        </button>
      </div>

      {/* ── TAB 1: SMART CRON SCHEDULER (ALARM UI) ── */}
      {activeTab === "cron" && (
        <CronSchedulerTab onShowToast={(type, text) => showToast(type, text)} />
      )}

      {/* ── TAB 2: TELEGRAM NOTIFICATIONS CONFIG (TẬP TRUNG TOÀN DIỆN) ── */}
      {activeTab === "telegram" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Switch Bật/Tắt Toàn Bộ Dịch Vụ Telegram */}
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

          {/* ── PHÂN KHỐI 1: CẢNH BÁO HẾT HẠN & GIA HẠN ĐƠN HÀNG (QUY VỀ TỪ TAB CŨ) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Kênh Cảnh Báo Hết Hạn & Nhắc Gia Hạn Đơn Hàng
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Chạy lúc 07:00 sáng
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <p className="text-[10px] text-slate-500">
                      Thread Telegram nhận danh sách đơn 0 ngày (Quét gửi tự động lúc 07:00 sáng).
                    </p>
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
                    <span>{runningJobId === "task_notify_zero_days_7h" ? "Đang gửi..." : "Gửi Thử Thông Báo 0 Ngày Ngay"}</span>
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
                        <p className="text-[11px] text-slate-400">Nhắc nhở khách hàng trước khi hết hạn kèm QR</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Số ngày cảnh báo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Số ngày cảnh báo (RENEWAL_WARN_DAYS)
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
                      <p className="text-[10px] text-slate-500">Mốc số ngày cận hạn kích hoạt tin nhắn chăm sóc</p>
                    </div>

                    {/* Topic ID */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Topic ID (FOUR_DAYS_TOPIC_ID)
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
                      <p className="text-[10px] text-slate-500">Thread nhận danh sách đơn cận hạn kèm QR</p>
                    </div>
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
                    <span>{runningJobId === "task_notify_four_days_7h" ? "Đang gửi..." : "Gửi Thử Nhắc Gia Hạn Ngay"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── PHÂN KHỐI 2: CÁC TOPIC THÔNG BÁO NGHIỆP VỤ KHÁC ── */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              Các Chủ Đề Nhận Tin Nghiệp Vụ Khác (Topic ID)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: "TELEGRAM_ORDER_TOPIC_ID", label: "Đơn Hàng Mới", desc: "Thread nhận thông báo tạo đơn mới từ khách hàng" },
                { key: "TELEGRAM_RENEWAL_TOPIC_ID", label: "Gia Hạn Thành Công", desc: "Thread nhận tin báo gia hạn đơn hàng thành công" },
                { key: "TELEGRAM_FINANCE_TOPIC_ID", label: "Biến Động Số Dư", desc: "Thread nhận tin báo tiền chuyển vào/ra tài khoản ngân hàng" },
                { key: "TELEGRAM_SYSTEM_ALERT_TOPIC_ID", label: "Cảnh Báo Lỗi Khẩn Cấp", desc: "Thread nhận tin báo sự cố hệ thống nghiêm trọng" },
              ].map((item) => (
                <div key={item.key} className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-2.5 shadow-xl">
                  <label className="text-xs font-bold text-white block">{item.label}</label>
                  <p className="text-[10px] text-slate-400 line-clamp-2 min-h-[28px]">{item.desc}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="VD: 7009"
                      value={formData[item.key] ?? ""}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                    />
                    <button
                      onClick={() => handleSaveConfig(item.key)}
                      disabled={savingKey === item.key}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === item.key ? "..." : "Lưu"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: TÀI CHÍNH & CỔNG THANH TOÁN (VPBANK & SEPAY & USDT) ── */}
      {activeTab === "finance" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Khối 1: Tỷ giá nạp ví & Tự động khớp biên lai Sepay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tỷ giá USDT */}
            <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-4 shadow-xl">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tỷ Giá Quy Đổi Nạp Ví (USDT / VND)</h3>
                  <p className="text-[11px] text-slate-400">Tỷ giá áp dụng khi khách hàng nạp Credit từ USDT sang VND</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Tỷ giá USDT (USDT_EXCHANGE_RATE)
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
                    {savingKey === "USDT_EXCHANGE_RATE" ? "Đang lưu..." : "Lưu Tỷ Giá"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Đơn vị: VNĐ / 1 USDT. Mặc định: 25,400 VNĐ.
                </p>
              </div>
            </div>

            {/* Sepay Auto Match Toggle */}
            <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cổng Khớp Biên Lai Sepay Tự Động</h3>
                    <p className="text-[11px] text-slate-400">Tự động duyệt biên lai ngân hàng theo Slot Suffix chính xác</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Khi bật tính năng này, hệ thống sẽ tự động đối soát nội dung chuyển khoản từ SePay webhook với mã đơn/slot suffix và duyệt đơn ngay lập tức.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 mt-2">
                <span className="text-xs font-bold text-slate-200">Trạng Thái Sepay Auto Match:</span>
                <button
                  onClick={() => {
                    const newVal = !formData["SEPAY_AUTO_MATCH"];
                    handleChange("SEPAY_AUTO_MATCH", newVal);
                    handleSaveConfig("SEPAY_AUTO_MATCH");
                  }}
                  className="flex items-center gap-2 focus:outline-none cursor-pointer"
                >
                  {formData["SEPAY_AUTO_MATCH"] ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                      <span>Đang BẬT</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                      <ToggleLeft className="w-5 h-5 text-slate-500" />
                      <span>Đang TẮT</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Khối 2: Mailbox VPBank (Gmail IMAP Realtime) */}
          <VpbankMailboxTab onShowToast={(type, text) => showToast(type, text)} />
        </div>
      )}

      {/* ── TAB 4: BACKUP & GOOGLE DRIVE ── */}
      {activeTab === "backup" && (
        <div className="space-y-6 animate-in fade-in duration-200">
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

      {/* ── TAB 5: TOTP GENERATOR ── */}
      {activeTab === "totp" && (
        <TotpGeneratorTab onShowToast={(type, message) => showToast(type, message)} />
      )}
    </div>
  );
};

export default SystemPage;
