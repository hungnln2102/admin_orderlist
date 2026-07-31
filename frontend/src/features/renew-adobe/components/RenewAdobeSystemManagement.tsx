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
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export function RenewAdobeSystemManagement() {
  // Form Fix/Renew
  const [fixEmail, setFixEmail] = useState("");
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);

  // Form OTP
  const [otpSource, setOtpSource] = useState<"imap" | "tinyhost" | "hdsd" | "ades" | "yuna">("imap");
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedMailboxId, setSelectedMailboxId] = useState<number | "">("");
  const [otpYunaOrderCode, setOtpYunaOrderCode] = useState("");
  const [mailboxes, setMailboxes] = useState<MailBackupMailboxOption[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Yuna Lookup State
  const [yunaLookupCode, setYunaLookupCode] = useState("");
  const [yunaLoading, setYunaLoading] = useState(false);
  const [yunaError, setYunaError] = useState<string | null>(null);
  const [yunaData, setYunaData] = useState<{
    items: Array<{ name: string; code: string; group: string }>;
    time_left: number;
  } | null>(null);
  const [yunaCountdown, setYunaCountdown] = useState<number>(0);
  const [reportingItem, setReportingItem] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedUserIndex, setCopiedUserIndex] = useState<number | null>(null);
  const [copiedPassIndex, setCopiedPassIndex] = useState<number | null>(null);

  const parseYunaAccountName = (fullName: string) => {
    const parts = fullName.split(/[#|]/);
    return {
      username: parts[0] || "",
      password: parts[1] || "",
    };
  };

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

  // Yuna Countdown Timer
  useEffect(() => {
    if (yunaCountdown <= 0) return;
    const timer = setInterval(() => {
      setYunaCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [yunaCountdown]);

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
          yunaOrderCode: otpSource === "yuna" ? otpYunaOrderCode.trim() : null,
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

  const handleYunaLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yunaLookupCode.trim()) {
      setYunaError("Vui lòng nhập mã đơn hàng.");
      return;
    }
    setYunaError(null);
    setYunaData(null);
    setReportSuccess(null);
    setReportError(null);
    setYunaLoading(true);

    try {
      const res = await apiFetch(API_ENDPOINTS.RENEW_ADOBE_YUNA_ORDER(yunaLookupCode.trim()));
      const data = await res.json();
      if (res.ok && data.success) {
        setYunaData(data);
        setYunaCountdown(data.time_left || 30);
      } else {
        setYunaError(data.error || "Không tìm thấy thông tin đơn hàng hoặc lỗi từ YunaGRP.");
      }
    } catch (err) {
      setYunaError((err as Error).message || "Lỗi kết nối.");
    } finally {
      setYunaLoading(false);
    }
  };

  const handleYunaReportError = async (item: { name: string; group: string }) => {
    setReportSuccess(null);
    setReportError(null);
    setReportingItem(item.name);

    try {
      const res = await apiFetch(API_ENDPOINTS.RENEW_ADOBE_YUNA_REPORT_ERROR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: yunaLookupCode.trim(),
          group: item.group,
          name: item.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReportSuccess(data.message || `Đã báo cáo lỗi cho tài khoản ${item.name} thành công.`);
      } else {
        setReportError(data.error || "Gửi báo cáo lỗi thất bại.");
      }
    } catch (err) {
      setReportError((err as Error).message || "Lỗi kết nối khi gửi báo cáo lỗi.");
    } finally {
      setReportingItem(null);
    }
  };

  const copyToClipboard = () => {
    if (!otpCode) return;
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyYunaOtp = (code: string, index: number) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyYunaUser = (val: string, index: number) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedUserIndex(index);
    setTimeout(() => setCopiedUserIndex(null), 2000);
  };

  const copyYunaPass = (val: string, index: number) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedPassIndex(index);
    setTimeout(() => setCopiedPassIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
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
                      <option value="yuna">YunaGRP (Mã đơn)</option>
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

              {otpSource === "yuna" && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Mã đơn YunaGRP
                  </label>
                  <input
                    type="text"
                    placeholder="vd: DH123456"
                    value={otpYunaOrderCode}
                    onChange={(e) => {
                      setOtpYunaOrderCode(e.target.value);
                      setOtpError(null);
                      setOtpCode(null);
                    }}
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all"
                    required
                    disabled={otpLoading}
                  />
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

      {/* YunaGRP Order Lookup Card */}
      <div className="rounded-[22px] bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-950/60 border border-white/10 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300 border border-emerald-500/20">
            <MagnifyingGlassIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Tra Cứu Mã Đơn YunaGRP (2FA OTP)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tìm kiếm danh sách tài khoản và OTP theo mã đơn hàng</p>
          </div>
        </div>

        {/* Bảng hướng dẫn đọc Mail lấy OTP */}
        <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-300 text-xs mb-6 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-sky-200">
            <InformationCircleIcon className="h-4.5 w-4.5" />
            <span>Hướng dẫn lấy OTP Email cho Adobe (Yuna):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Đuôi mail <code className="text-sky-300 font-semibold font-mono">@sluemone.xyz</code> &amp; <code className="text-sky-300 font-semibold font-mono">@kaineapp.top</code>: Truy cập <a href="https://tmail.wibucrypto.pro" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300 font-semibold">tmail.wibucrypto.pro/mailbox/&lt;tên_mail&gt;</a> để nhận OTP.</li>
            <li>Đuôi mail <code className="text-sky-300 font-semibold font-mono">@rilzz.store</code>: Truy cập <a href="https://generator.email" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300 font-semibold">generator.email/&lt;tên_mail&gt;</a> để nhận OTP.</li>
            <li>Đuôi mail Microsoft (hotmail, outlook...): Truy cập <a href="https://generator.email/adobeyunacode@fatub.org" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300 font-semibold">generator.email/adobeyunacode@fatub.org</a> để nhận OTP.</li>
          </ul>
          <p className="text-[11px] text-slate-400 italic mt-1">* Hệ thống backend đã hỗ trợ tự động quét tìm và hiển thị mã OTP ngay trong bảng kết quả bên dưới khi bạn tra cứu.</p>
        </div>

        <form onSubmit={handleYunaLookup} className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Nhập mã đơn YunaGRP (ví dụ: DH123456)"
              value={yunaLookupCode}
              onChange={(e) => {
                setYunaLookupCode(e.target.value);
                setYunaError(null);
              }}
              className="w-full px-4 py-3 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all"
              required
              disabled={yunaLoading}
            />
          </div>
          <button
            type="submit"
            disabled={yunaLoading}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 text-sm transition-colors shadow-lg shadow-emerald-500/10 whitespace-nowrap"
          >
            {yunaLoading ? "Đang tra cứu..." : "Tra cứu đơn hàng"}
          </button>
        </form>

        {/* Results / Feedback */}
        <div className="mt-6">
          {yunaError && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex items-start gap-2">
              <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{yunaError}</p>
            </div>
          )}

          {reportSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs mb-4">
              {reportSuccess}
            </div>
          )}

          {reportError && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs mb-4">
              {reportError}
            </div>
          )}

          {yunaData && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="text-sm font-semibold text-slate-200">
                  Thông tin đơn hàng: <span className="text-emerald-400 font-mono">{yunaLookupCode}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
                  <ClockIcon className="h-4 w-4 text-emerald-400" />
                  <span>
                    OTP hết hiệu lực trong:{" "}
                    <span className={`font-bold font-mono ${yunaCountdown <= 10 ? "text-rose-400" : "text-emerald-400"}`}>
                      {yunaCountdown}s
                    </span>
                  </span>
                  {yunaCountdown <= 0 && (
                    <button
                      onClick={handleYunaLookup}
                      className="ml-2 text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                    >
                      Làm mới
                    </button>
                  )}
                </div>
              </div>

              {yunaData.items.length === 0 ? (
                <p className="text-sm text-slate-400/80">Không tìm thấy tài khoản nào gắn với đơn hàng này.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-white/5">
                        <th className="p-3.5">Nhóm sản phẩm</th>
                        <th className="p-3.5">Tài khoản</th>
                        <th className="p-3.5">Mật khẩu</th>
                        <th className="p-3.5 text-center">Mã OTP (2FA)</th>
                        <th className="p-3.5 text-right">Báo lỗi tài khoản</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {yunaData.items.map((item, idx) => {
                        const { username, password } = parseYunaAccountName(item.name);
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5 text-slate-300 font-medium">{item.group || "N/A"}</td>
                            <td className="p-3.5 text-slate-200 font-mono">
                              <div className="flex items-center gap-2">
                                <span className="select-all">{username}</span>
                                <button
                                  onClick={() => copyYunaUser(username, idx)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                  title="Copy Tài khoản"
                                >
                                  {copiedUserIndex === idx ? (
                                    <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <ClipboardIcon className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-200 font-mono">
                              {password ? (
                                <div className="flex items-center gap-2">
                                  <span className="select-all">{password}</span>
                                  <button
                                    onClick={() => copyYunaPass(password, idx)}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title="Copy Mật khẩu"
                                  >
                                    {copiedPassIndex === idx ? (
                                      <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <ClipboardIcon className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">-</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-2">
                                {yunaCountdown <= 0 ? (
                                  <span className="text-slate-500 font-semibold italic">Đã hết hạn</span>
                                ) : item.code ? (
                                  <>
                                    <span className="font-mono font-bold text-sm text-white bg-slate-950/60 px-2.5 py-1 rounded-md border border-white/5 select-all">
                                      {item.code}
                                    </span>
                                    <button
                                      onClick={() => copyYunaOtp(item.code, idx)}
                                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                      title="Copy OTP"
                                    >
                                      {copiedIndex === idx ? (
                                        <ClipboardDocumentCheckIcon className="h-4 w-4 text-emerald-400" />
                                      ) : (
                                        <ClipboardIcon className="h-4 w-4" />
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-slate-500 italic">Chưa có mã</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleYunaReportError(item)}
                                disabled={reportingItem !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all font-semibold text-[11px]"
                              >
                                {reportingItem === item.name ? (
                                  "Đang gửi..."
                                ) : (
                                  <>
                                    <span>🚨</span>
                                    <span>Báo lỗi</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
