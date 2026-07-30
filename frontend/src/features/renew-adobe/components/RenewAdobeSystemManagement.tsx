import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import { fetchRenewAdobeMailBackupMailboxes, type MailBackupMailboxOption } from "../api/renewAdobeApi";
import {
  KeyIcon,
  WrenchScrewdriverIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export function RenewAdobeSystemManagement() {
  // Form Fix/Renew
  const [fixEmail, setFixEmail] = useState("");
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);

  // Form OTP
  const [otpSource, setOtpSource] = useState<"imap" | "tinyhost" | "hdsd" | "ades">("imap");
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedMailboxId, setSelectedMailboxId] = useState<number | "">("");
  const [mailboxes, setMailboxes] = useState<MailBackupMailboxOption[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load backup mailboxes if IMAP is selected
  useEffect(() => {
    if (otpSource === "imap") {
      fetchRenewAdobeMailBackupMailboxes()
        .then((data) => {
          setMailboxes(data);
          if (data.length > 0) {
            setSelectedMailboxId(data[0].id);
          }
        })
        .catch((err) => {
          console.error("Lỗi khi tải mailboxes:", err);
        });
    }
  }, [otpSource]);

  const handleFixRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixEmail.trim()) {
      setFixError("Vui lòng nhập email cần Fix/Renew.");
      return;
    }
    setFixError(null);
    setFixSuccess(null);
    setFixLoading(true);

    try {
      const res = await apiFetch(API_ENDPOINTS.RENEW_ADOBE_FIX_USER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fixEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFixSuccess(data.message || "Chạy API Fix/Renew Adobe thành công!");
      } else {
        setFixError(data.error || "Gặp lỗi khi chạy API Fix/Renew Adobe.");
      }
    } catch (err) {
      setFixError((err as Error).message || "Lỗi kết nối.");
    } finally {
      setFixLoading(false);
    }
  };

  const handleFetchOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setOtpCode(null);
    setCopied(false);
    setOtpLoading(true);

    try {
      const res = await apiFetch(API_ENDPOINTS.RENEW_ADOBE_TEST_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpSource,
          accountEmail: targetEmail.trim(),
          mailBackupId: otpSource === "imap" && selectedMailboxId ? Number(selectedMailboxId) : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpCode(data.otp);
      } else {
        setOtpError(data.error || "Không lấy được OTP. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau.");
      }
    } catch (err) {
      setOtpError((err as Error).message || "Lỗi kết nối.");
    } finally {
      setOtpLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!otpCode) return;
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Fix/Renew */}
      <div className="rounded-[22px] bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-950/60 border border-white/10 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-300 border border-indigo-500/20">
              <WrenchScrewdriverIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Kích Hoạt & Gia Hạn (Fix Renew)</h2>
              <p className="text-xs text-slate-400 mt-0.5">Chạy thủ công API kích hoạt hoặc sửa lỗi tài khoản Adobe</p>
            </div>
          </div>

          <form onSubmit={handleFixRenew} className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email tài khoản khách hàng
              </label>
              <input
                type="email"
                placeholder="vd: customer@gmail.com"
                value={fixEmail}
                onChange={(e) => {
                  setFixEmail(e.target.value);
                  setFixError(null);
                  setFixSuccess(null);
                }}
                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all"
                required
                disabled={fixLoading}
              />
            </div>

            <button
              type="submit"
              disabled={fixLoading}
              className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors shadow-lg shadow-indigo-500/10"
            >
              {fixLoading ? "Đang xử lý..." : "Chạy Kích Hoạt (Fix/Renew)"}
            </button>
          </form>
        </div>

        {/* Kết quả Fix/Renew */}
        <div className="mt-6 min-h-[60px]">
          {fixError && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex items-start gap-2">
              <span className="font-semibold">Lỗi:</span>
              <p>{fixError}</p>
            </div>
          )}
          {fixSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs flex items-start gap-2">
              <span className="font-semibold">Thành công:</span>
              <p>{fixSuccess}</p>
            </div>
          )}
        </div>
      </div>

      {/* Form OTP */}
      <div className="rounded-[22px] bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-950/60 border border-white/10 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300 border border-violet-500/20">
              <KeyIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Lấy mã OTP Thử Nghiệm</h2>
              <p className="text-xs text-slate-400 mt-0.5">Tổng hợp các phương thức lấy OTP từ hệ thống</p>
            </div>
          </div>

          <form onSubmit={handleFetchOtp} className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nguồn lấy OTP
                </label>
                <div className="relative">
                  <select
                    value={otpSource}
                    onChange={(e) => {
                      setOtpSource(e.target.value as any);
                      setOtpCode(null);
                      setOtpError(null);
                    }}
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none appearance-none cursor-pointer transition-all"
                    disabled={otpLoading}
                  >
                    <option value="imap">IMAP (Mail dự phòng)</option>
                    <option value="tinyhost">TinyHost API</option>
                    <option value="hdsd">otp.hdsd.net</option>
                    <option value="ades">OTP Ades</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email đích nhận OTP
                </label>
                <input
                  type="text"
                  placeholder="vd: mymail@domain.com"
                  value={targetEmail}
                  onChange={(e) => {
                    setTargetEmail(e.target.value);
                    setOtpError(null);
                    setOtpCode(null);
                  }}
                  className="w-full px-4 py-3 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all"
                  required
                  disabled={otpLoading}
                />
              </div>
            </div>

            {otpSource === "imap" && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Hòm thư dự phòng (IMAP)
                </label>
                <div className="relative">
                  <select
                    value={selectedMailboxId}
                    onChange={(e) => {
                      setSelectedMailboxId(e.target.value ? Number(e.target.value) : "");
                      setOtpCode(null);
                      setOtpError(null);
                    }}
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none appearance-none cursor-pointer transition-all"
                    disabled={otpLoading}
                  >
                    <option value="">-- Chọn hòm thư backup --</option>
                    {mailboxes.map((mailbox) => (
                      <option key={mailbox.id} value={mailbox.id}>
                        {mailbox.email} {mailbox.alias_prefix ? `(Prefix: ${mailbox.alias_prefix})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={otpLoading}
              className="w-full rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors shadow-lg shadow-violet-500/10"
            >
              {otpLoading ? "Đang truy vấn OTP..." : "Lấy OTP Thử Nghiệm"}
            </button>
          </form>
        </div>

        {/* Kết quả OTP */}
        <div className="mt-6 min-h-[80px] flex flex-col justify-center">
          {otpError && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex items-start gap-2">
              <span className="font-semibold">Lỗi:</span>
              <p>{otpError}</p>
            </div>
          )}
          {otpCode && (
            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 flex items-center justify-between gap-4 animate-scaleUp">
              <div>
                <span className="text-[10px] uppercase font-bold text-violet-400/80 tracking-wider">Mã OTP lấy được</span>
                <div className="text-3xl font-extrabold text-white tracking-widest mt-1 font-mono">{otpCode}</div>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors border border-white/5"
              >
                {copied ? (
                  <>
                    <ClipboardDocumentCheckIcon className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">Đã copy</span>
                  </>
                ) : (
                  <>
                    <ClipboardIcon className="h-4 w-4" />
                    <span>Copy mã</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
