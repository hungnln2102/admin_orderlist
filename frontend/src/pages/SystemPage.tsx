import React, { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  ToggleLeft,
  ToggleRight,
  Database,
  X,
  AlarmClock,
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
  const [activeTab, setActiveTab] = useState<"general" | "cron" | "telegram" | "backup">("general");
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable Values state
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Telegram test modal
  const [testMessageText, setTestMessageText] = useState<string>("");
  const [testTopicId, setTestTopicId] = useState<string>("");
  const [sendingTest, setSendingTest] = useState(false);

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
  const handleSaveConfig = async (key: string) => {
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

      showToast("success", `Đã cập nhật cấu hình [${key}] thành công!`);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lưu cấu hình thất bại");
    } finally {
      setSavingKey(null);
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700 active:scale-95 shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${loadingConfigs ? "animate-spin text-cyan-400" : ""}`} />
          Tải lại cấu hình
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "general"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Database className="w-4 h-4" />
          Cấu Hình Vận Hành & Giá
        </button>

        <button
          onClick={() => setActiveTab("cron")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
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

      {/* Tab 1: General Business Configs */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Order Expiration Warnings */}
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Cảnh Báo Hết Hạn Đơn Hàng</h3>
                <p className="text-[11px] text-slate-400">Thiết lập thời gian tự động quét và gửi nhắc gia hạn</p>
              </div>
            </div>

            {getConfigObj("RENEWAL_WARN_DAYS") && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Số ngày còn lại để cảnh báo (RENEWAL_WARN_DAYS)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData["RENEWAL_WARN_DAYS"] ?? 4}
                    onChange={(e) => handleChange("RENEWAL_WARN_DAYS", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => handleSaveConfig("RENEWAL_WARN_DAYS")}
                    disabled={savingKey === "RENEWAL_WARN_DAYS"}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === "RENEWAL_WARN_DAYS" ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  {getConfigObj("RENEWAL_WARN_DAYS")?.description || "Số ngày trước khi hết hạn đơn hàng để hệ thống gắn tag Cần Gia Hạn"}
                </p>
              </div>
            )}

            {getConfigObj("RENEWAL_NOTIFICATION_TIME") && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Thời gian thông báo (RENEWAL_NOTIFICATION_TIME)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="VD: 07:00"
                    value={formData["RENEWAL_NOTIFICATION_TIME"] ?? "07:00"}
                    onChange={(e) => handleChange("RENEWAL_NOTIFICATION_TIME", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => handleSaveConfig("RENEWAL_NOTIFICATION_TIME")}
                    disabled={savingKey === "RENEWAL_NOTIFICATION_TIME"}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === "RENEWAL_NOTIFICATION_TIME" ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  {getConfigObj("RENEWAL_NOTIFICATION_TIME")?.description || "Thời điểm trong ngày hệ thống tự động quét và gửi thông báo nhắc gia hạn"}
                </p>
              </div>
            )}
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
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
                  className="flex items-center gap-2 focus:outline-none"
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
              className="flex items-center gap-2 focus:outline-none active:scale-95 transition-transform"
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
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingKey === "TELEGRAM_CHAT_ID" ? "Đang lưu..." : "Lưu Chat ID"}
                </button>
              </div>
            </div>
          </div>

          {/* Grid of Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "TELEGRAM_ORDER_TOPIC_ID", label: "Topic ID - Đơn Hàng Mới", desc: "ID Thread nhận thông báo tạo đơn mới từ khách hàng" },
              { key: "TELEGRAM_RENEWAL_TOPIC_ID", label: "Topic ID - Cảnh Báo Gia Hạn", desc: "ID Thread nhận danh sách đơn sắp hết hạn hoặc đã hết hạn" },
              { key: "TELEGRAM_FINANCE_TOPIC_ID", label: "Topic ID - Biến Động Số Dư", desc: "ID Thread nhận tin báo tiền chuyển vào/ra tài khoản ngân hàng" },
              { key: "TELEGRAM_SYSTEM_ALERT_TOPIC_ID", label: "Topic ID - Cảnh Báo Lỗi Khẩn Cấp", desc: "ID Thread nhận tin báo sự cố hệ thống nghiêm trọng" },
            ].map((item) => (
              <div key={item.key} className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-3 shadow-xl">
                <label className="text-xs font-bold text-white block">{item.label}</label>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
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
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === item.key ? "Đang lưu..." : "Lưu ID"}
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
              className="flex items-center gap-2 focus:outline-none"
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
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
