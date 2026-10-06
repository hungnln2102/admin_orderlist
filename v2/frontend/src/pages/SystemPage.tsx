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
  const [activeTab, setActiveTab] = useState<"general" | "telegram" | "logs">("general");
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable Values state
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Notification Logs state
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [logsFilterStatus, setLogsFilterStatus] = useState<string>("");

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Load System Configs
  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const res = await fetch("/api/system/configs");
      if (!res.ok) throw new Error("Không thể tải danh sách cấu hình.");
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
        limit: "20",
      });
      if (status) query.append("status", status);

      const res = await fetch(`/api/system/notification-logs?${query.toString()}`);
      if (!res.ok) throw new Error("Không thể tải nhật ký thông báo.");
      const result = await res.json();
      setLogs(result.data || []);
      setLogsPagination(result.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err: any) {
      showToast("error", err.message || "Lỗi tải log");
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

      showToast("success", `Đã lưu cấu hình [${key}] thành công!`);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lưu thất bại");
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
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 shadow-inner">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Cấu Hình Hệ Thống (System Configs)
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                V2 Enterprise
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý tập trung các thông số tự động hóa, thông báo Telegram và kiểm tra nhật ký chạy nền.
            </p>
          </div>
        </div>

        <button
          onClick={fetchConfigs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700 active:scale-95 shrink-0"
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
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Cảnh Báo Hết Hạn Đơn Hàng</h3>
                <p className="text-[11px] text-slate-400">Thiết lập thời gian tự động gửi nhắc gia hạn</p>
              </div>
            </div>

            {getConfigObj("RENEWAL_WARN_DAYS") && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Số ngày cảnh báo trước khi hết hạn (RENEWAL_WARN_DAYS)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData["RENEWAL_WARN_DAYS"] ?? 4}
                    onChange={(e) => handleChange("RENEWAL_WARN_DAYS", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSaveConfig("RENEWAL_WARN_DAYS")}
                    disabled={savingKey === "RENEWAL_WARN_DAYS"}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  {getConfigObj("RENEWAL_WARN_DAYS")?.description}
                </p>
              </div>
            )}
          </div>

          {/* Box 2: Finance & Exchange Rates */}
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Tài Chính & Khớp Thanh Toán</h3>
                <p className="text-[11px] text-slate-400">Cấu hình tỷ giá đổi tiền và cổng Sepay Auto</p>
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
                    value={formData["USDT_EXCHANGE_RATE"] ?? 25400}
                    onChange={(e) => handleChange("USDT_EXCHANGE_RATE", e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSaveConfig("USDT_EXCHANGE_RATE")}
                    disabled={savingKey === "USDT_EXCHANGE_RATE"}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu
                  </button>
                </div>
              </div>
            )}

            {/* Sepay Auto Match Toggle */}
            {getConfigObj("SEPAY_AUTO_MATCH") && (
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Sepay Auto Match</h4>
                  <p className="text-[11px] text-slate-400">Tự động duyệt biên lai khi trùng khớp mã giao dịch</p>
                </div>

                <button
                  onClick={() => {
                    const newVal = !formData["SEPAY_AUTO_MATCH"];
                    handleChange("SEPAY_AUTO_MATCH", newVal);
                    handleSaveConfig("SEPAY_AUTO_MATCH");
                  }}
                  className="flex items-center gap-2 text-cyan-400 font-bold text-xs"
                >
                  {formData["SEPAY_AUTO_MATCH"] ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
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
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Dịch Vụ Thông Báo Telegram</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bật/Tắt toàn bộ tiến trình đẩy tin nhắn Telegram lên nhóm quản trị.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const newVal = !formData["TELEGRAM_ENABLED"];
                handleChange("TELEGRAM_ENABLED", newVal);
                handleSaveConfig("TELEGRAM_ENABLED");
              }}
              className="flex items-center gap-2"
            >
              {formData["TELEGRAM_ENABLED"] ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/40 text-xs font-bold">
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                  Đang Bật (ONLINE)
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/40 text-xs font-bold">
                  <ToggleLeft className="w-6 h-6 text-rose-400" />
                  Đang Tắt (OFFLINE)
                </div>
              )}
            </button>
          </div>

          {/* Grid of Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "TELEGRAM_ORDER_TOPIC_ID", label: "Topic ID - Đơn Hàng Mới", desc: "ID Thread nhận thông báo tạo đơn mới từ khách hàng" },
              { key: "TELEGRAM_RENEWAL_TOPIC_ID", label: "Topic ID - Cảnh Báo Gia Hạn", desc: "ID Thread nhận thông báo đơn hết hạn (4 ngày / 0 ngày)" },
              { key: "TELEGRAM_FINANCE_TOPIC_ID", label: "Topic ID - Biến Động Số Dư", desc: "ID Thread nhận biến động Sepay & số dư tài khoản" },
              { key: "TELEGRAM_SYSTEM_ALERT_TOPIC_ID", label: "Topic ID - Cảnh Báo Lỗi Khẩn Cấp", desc: "ID Thread nhận lỗi hệ thống nghiêm trọng" },
            ].map((item) => (
              <div key={item.key} className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-white block">{item.label}</label>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="VD: 7009"
                    value={formData[item.key] ?? ""}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSaveConfig(item.key)}
                    disabled={savingKey === item.key}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu ID
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Notification Logs Audit */}
      {activeTab === "logs" && (
        <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Lịch Sử Gửi Thông Báo (Notification Logs)</h3>
              <p className="text-[11px] text-slate-400">Giám sát các tin nhắn phát sinh từ EventBus tới Telegram</p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={logsFilterStatus}
                onChange={(e) => setLogsFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="SENT">Gửi thành công (SENT)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Kênh</th>
                  <th className="py-3 px-4">Loại Sự Kiện</th>
                  <th className="py-3 px-4">Nội Dung</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Đang tải nhật ký...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Chưa có nhật ký thông báo nào.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">#{log.id}</td>
                      <td className="py-3 px-4 font-bold text-cyan-400">{log.channel}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{log.event_type}</td>
                      <td className="py-3 px-4 max-w-md truncate text-slate-300" title={log.message_content}>
                        {log.message_content}
                      </td>
                      <td className="py-3 px-4">
                        {log.status === "SENT" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            SENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemPage;
