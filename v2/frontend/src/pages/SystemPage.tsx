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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Info,
  Key,
} from "lucide-react";

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

interface NotificationLog {
  id: number;
  channel: string;
  event_type: string;
  recipient: string;
  message_content: string;
  status: "SENT" | "FAILED" | "PENDING";
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export const SystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "telegram" | "integrations" | "backup" | "logs">("general");
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable Values state
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Notification Logs state
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [logsFilterStatus, setLogsFilterStatus] = useState<string>("");
  const [logsSearchQuery, setLogsSearchQuery] = useState<string>("");

  // Modal State
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
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

  // 2. Load Notification Logs
  const fetchLogs = async (page = 1, status = logsFilterStatus) => {
    try {
      setLogsLoading(true);
      const query = new URLSearchParams({
        page: String(page),
        limit: String(logsPagination.limit),
      });
      if (status) query.append("status", status);

      const res = await fetch(`/api/system/notification-logs?${query.toString()}`);
      if (!res.ok) throw new Error("Không thể tải nhật ký thông báo.");
      const result = await res.json();
      setLogs(result.data || []);
      setLogsPagination(result.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err: any) {
      showToast("error", err.message || "Lỗi tải nhật ký thông báo");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs(1, logsFilterStatus);
    }
  }, [activeTab, logsFilterStatus]);

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

  // Filter logs locally by search query
  const filteredLogs = logs.filter((log) => {
    if (!logsSearchQuery.trim()) return true;
    const q = logsSearchQuery.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(q) ||
      log.message_content.toLowerCase().includes(q) ||
      (log.recipient && log.recipient.toLowerCase().includes(q))
    );
  });

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
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "integrations"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Key className="w-4 h-4" />
          API Keys & Tích Hợp
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

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "logs"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          Nhật Ký Thông Báo (Logs)
        </button>
      </div>

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

      {/* Tab: API Keys & Integrations */}
      {activeTab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { key: "GOOGLE_API_KEY", label: "Google API Key", desc: "Khóa API tích hợp Google Sheets, Maps hoặc Google Services" },
            { key: "AI_API_KEY", label: "AI / Gemini / OpenAI API Key", desc: "Khóa API tích hợp các dịch vụ Trí tuệ nhân tạo (AI Assistant)" },
            { key: "SEPAY_API_KEY", label: "SePay API Key", desc: "Khóa API dùng để gọi các dịch vụ SePay API" },
            { key: "SEPAY_WEBHOOK_SECRET", label: "SePay Webhook Secret", desc: "Mã xác thực Webhook Token từ cổng SePay" },
            { key: "WEBHOOK_SECRET", label: "General Webhook Secret", desc: "Mã xác thực webhook chung cho hệ thống" },
          ].map((item) => (
            <div key={item.key} className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-3 shadow-xl">
              <label className="text-xs font-bold text-white block">{item.label} ({item.key})</label>
              <p className="text-[11px] text-slate-400">{item.desc}</p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="password"
                  placeholder="VD: AIzaSy..."
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
                  {savingKey === item.key ? "Đang lưu..." : "Lưu Key"}
                </button>
              </div>
            </div>
          ))}
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

      {/* Tab 3: Notification Logs Audit */}
      {activeTab === "logs" && (
        <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Nhật Ký Gửi Thông Báo (Notification Audit Logs)</h3>
              <p className="text-[11px] text-slate-400">Giám sát lịch sử tất cả các tin nhắn phát sinh từ EventBus tới Telegram</p>
            </div>

            {/* Controls & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Local Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo nội dung..."
                  value={logsSearchQuery}
                  onChange={(e) => setLogsSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 w-44"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={logsFilterStatus}
                  onChange={(e) => setLogsFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SENT">Gửi thành công (SENT 🟢)</option>
                  <option value="FAILED">Gửi thất bại (FAILED 🔴)</option>
                </select>
              </div>

              <button
                onClick={() => fetchLogs(logsPagination.page, logsFilterStatus)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-all"
                title="Làm mới bảng log"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Kênh</th>
                  <th className="py-3 px-4">Loại Sự Kiện</th>
                  <th className="py-3 px-4">Nội Dung Tin Nhắn</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400 mb-2" />
                      Đang tải nhật ký thông báo...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Chưa có nhật ký thông báo nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">#{log.id}</td>
                      <td className="py-3 px-4 font-bold text-cyan-400">{log.channel || "TELEGRAM"}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{log.event_type}</td>
                      <td className="py-3 px-4 max-w-md truncate text-slate-300 font-mono text-[11px]" title={log.message_content}>
                        {log.message_content}
                      </td>
                      <td className="py-3 px-4">
                        {log.status === "SENT" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            SENT 🟢
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            FAILED 🔴
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                          title="Xem chi tiết nội dung log"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {logsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <div>
                Hiển thị trang <span className="font-bold text-white">{logsPagination.page}</span> /{" "}
                <span className="font-bold text-white">{logsPagination.totalPages}</span> (Tổng {logsPagination.total} bản ghi)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(logsPagination.page - 1, logsFilterStatus)}
                  disabled={logsPagination.page <= 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Trang trước
                </button>
                <button
                  onClick={() => fetchLogs(logsPagination.page + 1, logsFilterStatus)}
                  disabled={logsPagination.page >= logsPagination.totalPages}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg transition-all flex items-center gap-1"
                >
                  Trang sau <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Info className="w-4 h-4" /> Chi Tiết Nhật Ký Thông Báo #{selectedLog.id}
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block">Kênh thông báo:</span>
                  <span className="font-bold text-cyan-300">{selectedLog.channel}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Loại sự kiện:</span>
                  <span className="font-bold text-slate-200">{selectedLog.event_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Trạng thái:</span>
                  <span className="font-bold text-emerald-400">{selectedLog.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Thời gian tạo:</span>
                  <span className="text-slate-300">{new Date(selectedLog.created_at).toLocaleString("vi-VN")}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Nội dung tin nhắn:</span>
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                  {selectedLog.message_content}
                </pre>
              </div>

              {selectedLog.error_message && (
                <div>
                  <span className="text-rose-400 font-semibold block mb-1">Thông báo lỗi:</span>
                  <pre className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-rose-200 font-mono text-[11px] whitespace-pre-wrap">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemPage;
