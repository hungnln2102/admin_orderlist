import React, { useEffect, useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  Mail,
  Key,
  Radio,
  CheckCircle2,
  AlertTriangle,
  X,
  Server,
  Zap,
  Lock,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
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

export const VpbankMailboxConfigModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const notify = useNotification();

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [syncMode, setSyncMode] = useState<"IDLE" | "POLLING">("IDLE");
  const [isActive, setIsActive] = useState(true);
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState(993);
  const [hasAppPassword, setHasAppPassword] = useState(false);
  const [workerState, setWorkerState] = useState<string>("STOPPED");
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
        setAppPassword(""); // không fill mật khẩu thô
      }
    } catch {
      notify.error("Không thể tải cấu hình Mailbox VPBank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
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
        notify.success("Kiểm tra kết nối IMAP thành công!");
      } else {
        setTestResult({
          success: false,
          message: body.error || "Không thể kết nối tới máy chủ IMAP",
        });
        notify.error(body.error || "Kết nối IMAP thất bại");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi kiểm tra kết nối";
      setTestResult({ success: false, message: msg });
      notify.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      notify.error("Vui lòng nhập Email Gmail");
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
        notify.success("Đã lưu cấu hình Mailbox và tải lại Worker!");
        if (onSaved) onSaved();
        onClose();
      } else {
        notify.error(body.error || "Không thể lưu cấu hình");
      }
    } catch {
      notify.error("Lỗi khi lưu cấu hình Mailbox");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <GlassCard className="w-full max-w-lg bg-slate-900 border-slate-700/80 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Cấu Hình Mailbox VPBank
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {isActive ? `Đang Bật (${workerState})` : "Đang Tắt"}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Tự động đọc email biến động VPBank qua Gmail IMAP (Không lưu trong .env)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
            <span>Đang tải cấu hình an toàn từ Database...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* 1. Trạng Thái Bật/Tắt */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${isActive ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
                <div>
                  <span className="font-semibold text-white block">Tự động đọc mail ngầm (Background Worker)</span>
                  <span className="text-[10.5px] text-slate-400">
                    Kích hoạt socket IMAP IDLE để nhận biến động tức thì
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-500"></div>
              </label>
            </div>

            {/* 2. Tài khoản Gmail */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-pink-400" />
                <span>Địa chỉ Gmail nhận thông báo VPBank:</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: hungnln2102@gmail.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>

            {/* 3. Mật khẩu ứng dụng (Google App Password) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mật khẩu ứng dụng (Google App Password):</span>
                </label>
                {hasAppPassword && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã lưu mật khẩu
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder={hasAppPassword ? "•••••••••••••••• (Để trống để giữ nguyên mật khẩu cũ)" : "Nhập mã 16 ký tự tạo từ Google Account"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 font-mono"
                />
                <Lock className="w-3.5 h-3.5 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Tạo tại: <em>Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng</em>. Mật khẩu được mã hóa an toàn trong database.
              </p>
            </div>

            {/* 4. Chế độ đồng bộ (Sync Mode) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chế độ đồng bộ:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSyncMode("IDLE")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                    syncMode === "IDLE"
                      ? "bg-pink-500/10 border-pink-500/50 text-white shadow-sm shadow-pink-500/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    ⚡ IMAP IDLE (Real-time)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Bắt ngay trong 1-3 giây khi VPBank phát mail
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncMode("POLLING")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                    syncMode === "POLLING"
                      ? "bg-pink-500/10 border-pink-500/50 text-white shadow-sm shadow-pink-500/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    ⏱️ Polling Định Kỳ
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Quét hộp thư mỗi 60 giây một lần
                  </span>
                </button>
              </div>
            </div>

            {/* Kết quả Test Kết Nối Trực Tiếp */}
            {testResult && (
              <div
                className={`p-2.5 rounded-xl border flex items-start gap-2 animate-in fade-in duration-150 ${
                  testResult.success
                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/50 border-rose-500/40 text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div className="space-y-0.5">
                  <span className="font-semibold block">{testResult.message}</span>
                  {testResult.latencyMs && (
                    <span className="text-[10px] opacity-80 font-mono">
                      Thời gian phản hồi máy chủ: {testResult.latencyMs} ms
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!email && !hasAppPassword)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Bắt tay thử nghiệm kết nối trực tiếp với Gmail IMAP"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-pink-400" />
                )}
                <span>{testing ? "Đang bắt tay..." : "🔌 Kiểm tra kết nối ngay"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? "Đang lưu..." : "Lưu Cấu Hình"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  );
};

