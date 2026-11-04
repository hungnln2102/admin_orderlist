import React, { useEffect, useState } from "react";
import {
  Mail,
  Key,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Lock,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  Activity,
} from "lucide-react";

interface VpbankMailboxTabProps {
  onShowToast: (type: "success" | "error", message: string) => void;
}

interface MailboxConfigData {
  email: string;
  hasAppPassword: boolean;
  appPasswordMasked?: string;
  host: string;
  port: number;
  tls: boolean;
  syncMode: "IDLE" | "POLLING";
  isActive: boolean;
  workerState?: string;
  lastSuccessAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
}

export const VpbankMailboxTab: React.FC<VpbankMailboxTabProps> = ({ onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [syncMode, setSyncMode] = useState<"IDLE" | "POLLING">("IDLE");
  const [isActive, setIsActive] = useState(true);
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState(993);
  const [hasAppPassword, setHasAppPassword] = useState(false);
  const [workerState, setWorkerState] = useState<string>("STOPPED");
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/finance/vpbank/mailbox-config");
      const body = await res.json();
      if (body.success && body.data) {
        const d: MailboxConfigData = body.data;
        setEmail(d.email || "");
        setSyncMode(d.syncMode || "IDLE");
        setIsActive(Boolean(d.isActive));
        setHost(d.host || "imap.gmail.com");
        setPort(d.port || 993);
        setHasAppPassword(Boolean(d.hasAppPassword));
        setWorkerState(d.workerState || "STOPPED");
        setLastSuccessAt(d.lastSuccessAt || null);
        setLastErrorMessage(d.lastErrorMessage || null);
        setAppPassword(""); // Không nạp mật khẩu thô ra ngoài UI
      }
    } catch (err: any) {
      onShowToast("error", err?.message || "Không thể tải cấu hình Mailbox VPBank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTestConnection = async () => {
    if (!email.trim()) {
      onShowToast("error", "Vui lòng nhập Email Gmail trước khi kiểm tra");
      return;
    }
    if (!appPassword.trim() && !hasAppPassword) {
      onShowToast("error", "Vui lòng nhập Mật khẩu ứng dụng (App Password) để kiểm tra");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/finance/vpbank/mailbox-config/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          appPassword: appPassword.trim(),
          host,
          port,
        }),
      });
      const body = await res.json();
      if (body.success) {
        setTestResult({
          success: true,
          message: body.data?.message || "Bắt tay kết nối TLS Socket với Gmail thành công!",
          latencyMs: body.data?.latencyMs,
        });
        onShowToast("success", "Kiểm tra kết nối IMAP thành công!");
      } else {
        setTestResult({
          success: false,
          message: body.error || "Không thể kết nối tới máy chủ IMAP",
        });
        onShowToast("error", body.error || "Kết nối IMAP thất bại");
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Lỗi kiểm tra kết nối";
      setTestResult({ success: false, message: msg });
      onShowToast("error", msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onShowToast("error", "Vui lòng nhập Email Gmail");
      return;
    }
    if (!hasAppPassword && !appPassword.trim()) {
      onShowToast("error", "Vui lòng nhập Mật khẩu ứng dụng (App Password)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/finance/vpbank/mailbox-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          appPassword: appPassword.trim(),
          host,
          port,
          syncMode,
          isActive,
        }),
      });
      const body = await res.json();
      if (body.success) {
        onShowToast("success", "Đã lưu cấu hình Mailbox VPBank thành công!");
        setAppPassword("");
        await fetchConfig();
      } else {
        onShowToast("error", body.error || "Lưu cấu hình thất bại");
      }
    } catch (err: any) {
      onShowToast("error", err?.message || "Lỗi khi lưu cấu hình Mailbox");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2.5">
              Cấu Hình Mailbox Đọc Email VPBank (Gmail IMAP)
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                REALTIME IMAP IDLE
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Tự động bắt thư thông báo biến động số dư tài khoản thanh toán và sao kê thẻ tín dụng VPBank gửi về Gmail, đồng bộ chuẩn ACID vào sổ quỹ thu chi cá nhân.
            </p>
          </div>
        </div>

        <button
          onClick={fetchConfig}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          <span>Tải lại</span>
        </button>
      </div>

      {/* 2. Grid Nội Dung Chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (8 CỘT): FORM CẤU HÌNH CHI TIẾT */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thông Tin Xác Thực Hòm Thư Gmail</h3>
                  <p className="text-[11px] text-slate-400">Thiết lập tài khoản Gmail và Mật khẩu ứng dụng 16 ký tự</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Tiến trình Worker:</span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    workerState === "ONLINE" || workerState === "IDLE"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : workerState === "ERROR"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      workerState === "ONLINE" || workerState === "IDLE"
                        ? "bg-emerald-400 animate-pulse"
                        : workerState === "ERROR"
                        ? "bg-rose-400"
                        : "bg-slate-500"
                    }`}
                  />
                  {workerState || "STOPPED"}
                </span>
              </div>
            </div>

            {/* Email Gmail Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Địa Chỉ Gmail Nhận Thông Báo VPBank</span>
                <span className="text-[10px] text-slate-400 font-normal">Được cấp quyền IMAP</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ví dụ: yourname@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Gmail này phải là hòm thư nhận các email thông báo giao dịch hoặc sao kê gửi từ VPBank (customercare@vpbank.com.vn).
              </p>
            </div>

            {/* Google App Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mật Khẩu Ứng Dụng (Google App Password)</span>
                </label>
                {hasAppPassword && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã lưu mật khẩu trong DB
                  </span>
                )}
              </div>

              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder={hasAppPassword ? "•••••••••••••••• (Để trống nếu giữ nguyên mật khẩu cũ)" : "16 ký tự mã ứng dụng Google cấp (VD: abcd efgh ijkl mnop)"}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Mật khẩu này được mã hóa an toàn khi lưu trữ. Tuyệt đối không dùng mật khẩu tài khoản Google chính.
              </p>
            </div>

            {/* Thông Số Kỹ Thuật Máy Chủ IMAP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Máy Chủ IMAP Host</label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Cổng IMAP Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || 993)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Giao Thức Bảo Mật</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>SSL / TLS (Bắt buộc)</span>
                </div>
              </div>
            </div>

            {/* Chế Độ Đồng Bộ & Kích Hoạt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chế Độ Đồng Bộ Mail</span>
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSyncMode("IDLE")}
                    className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      syncMode === "IDLE"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    IDLE (Push Realtime)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncMode("POLLING")}
                    className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      syncMode === "POLLING"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    POLLING (Mỗi 60s)
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {syncMode === "IDLE"
                    ? "Nhận email ngay tức thì qua cơ chế RFC 2177 mà không cần liên tục quét máy chủ."
                    : "Quét hộp thư theo chu kỳ 60 giây, phù hợp khi mạng không hỗ trợ giữ kết nối TCP dài."}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      Trạng Thái Tiến Trình Worker
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                      {isActive ? "ĐANG BẬT" : "TẠM TẮT"}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Bật để tiến trình nền tự động kết nối và lắng nghe email VPBank khi backend khởi động.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-900">
                  <span className="text-xs text-slate-300 font-semibold">Tự động đọc mail ngầm:</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {isActive ? "Kích Hoạt (ON)" : "Vô Hiệu Hóa (OFF)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection Banner Display */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in duration-200 ${
                  testResult.success
                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                    : "bg-rose-950/50 border-rose-500/40 text-rose-200"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-0.5">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.latencyMs !== undefined && (
                    <p className="text-[11px] text-emerald-300 font-mono">
                      ⏱ Độ trễ bắt tay socket TLS: <strong>{testResult.latencyMs} ms</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Message if Worker had error */}
            {lastErrorMessage && (
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Nhật ký lỗi worker gần nhất: <strong>{lastErrorMessage}</strong></span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Đang bắt tay TLS...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Kiểm Tra Kết Nối Ngay</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving || testing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Đang lưu cấu hình...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Cấu Hình Mailbox</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* CỘT PHẢI (4 CỘT): HƯỚNG DẪN TẠO GOOGLE APP PASSWORD */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card Hướng dẫn */}
          <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Cách Tạo Google App Password</h3>
                <p className="text-[10px] text-slate-400">Chỉ mất 1 phút thiết lập bảo mật</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Đảm bảo tài khoản Gmail đã <strong>bật Xác minh 2 bước (2-Step Verification)</strong>.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-1">
                  <span>Truy cập trang Mật khẩu ứng dụng Google:</span>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    <span>myaccount.google.com/apppasswords</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Nhập tên ứng dụng (VD: <code className="text-emerald-400 font-mono">VPBank Ingestion</code>) và bấm <strong>Tạo (Create)</strong>.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  Sao chép chuỗi <strong>16 ký tự</strong> do Google cấp và dán vào ô mật khẩu bên cạnh.
                </span>
              </li>
            </ol>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-200">💡 Lưu ý quan trọng:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>Không chia sẻ chuỗi 16 ký tự này cho bất kỳ ai.</li>
                <li>Hệ thống lưu trữ mật khẩu an toàn trong DB và không bao giờ hiển thị nguyên văn ra ngoài.</li>
              </ul>
            </div>
          </div>

          {/* Card Thông tin Lịch sử & Thống kê */}
          <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800/90 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Lần Đồng Bộ Thành Công Gần Nhất
            </h4>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
              {lastSuccessAt ? (
                <span className="text-emerald-300 font-bold">{new Date(lastSuccessAt).toLocaleString("vi-VN")}</span>
              ) : (
                <span className="text-slate-500 italic">Chưa có giao dịch nào được đồng bộ</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

