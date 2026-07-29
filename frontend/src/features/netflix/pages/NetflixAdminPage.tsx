import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useNetflixAdmin } from "../hooks/useNetflixAdmin";
import { NETFLIX_TABS } from "../constants";
import { ClipboardIcon, ArrowTopRightOnSquareIcon, ArrowPathIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { showAppNotification } from "@/lib/notifications";

export default function NetflixAdminPage() {
  // Quản lý tab trực tiếp ở component để hỗ trợ thêm tab Sửa lỗi Outlook
  const [activeTab, setActiveTab] = useState<"household" | "otp" | "six-digit" | "outlook-fix">("household");
  
  const {
    email: netflixEmail,
    loading: netflixLoading,
    cooldownSeconds: netflixCooldown,
    householdResult,
    otpResult,
    sixDigitResult,
    error: netflixError,
    setEmail: setNetflixEmail,
    handleFetchHousehold,
    handleFetchOtp,
    handleFetchSixDigit,
  } = useNetflixAdmin();

  // --- LOGIC CHO OUTLOOK FIX BOT ---
  const [serverUrl, setServerUrl] = useState(() => {
    return localStorage.getItem("outlook_bot_server_url") || "https://sunny-shoe-keep-inner.trycloudflare.com";
  });
  const [showConfig, setShowConfig] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const ACCESS_CODE = "AHCPS3";

  // Hàm ghi log vào terminal
  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

  useEffect(() => {
    if (activeTab !== "outlook-fix") {
      // Ngắt kết nối socket khi chuyển sang các tab Netflix khác
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setIsLoggedIn(false);
      setIsFixing(false);
      return;
    }

    addLog(`Đang kết nối tới server: ${serverUrl}...`);
    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      addLog("Đã kết nối với server WebSocket.");
      socket.emit("userLogin", ACCESS_CODE);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsLoggedIn(false);
      setIsFixing(false);
      addLog("Đã ngắt kết nối khỏi server.");
    });

    socket.on("connect_error", () => {
      addLog("Lỗi kết nối server. Hãy kiểm tra lại URL Server trong phần cấu đặt.");
    });

    socket.on("userLoginResult", (res: { success: boolean; message?: string }) => {
      if (res.success) {
        setIsLoggedIn(true);
        addLog("Đăng nhập User Portal thành công!");
      } else {
        addLog(`Đăng nhập thất bại: ${res.message || "Mã truy cập sai"}`);
      }
    });

    socket.on("log", (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    });

    socket.on("results", (data) => {
      setIsFixing(false);
      addLog("--- QUÁ TRÌNH HOÀN TẤT ---");
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl, activeTab]);

  // Tự động scroll terminal xuống cuối
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSaveConfig = (newUrl: string) => {
    localStorage.setItem("outlook_bot_server_url", newUrl);
    setServerUrl(newUrl);
    setShowConfig(false);
    setLogs([]);
    showAppNotification("Đã cập nhật URL Server!", "success");
  };

  const handleStartFix = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outlookEmail.trim() || !socketRef.current || !isLoggedIn) return;

    setIsFixing(true);
    setLogs([]);
    addLog(`Bắt đầu tiến trình Fix cho email: ${outlookEmail}...`);
    
    socketRef.current.emit("userStart", {
      primary: outlookEmail.trim(),
      accessCode: ACCESS_CODE,
    });
  };

  // --- COMMON LOGIC FOR NETFLIX OTP ---
  const handleNetflixSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (netflixLoading || netflixCooldown > 0) return;
    if (activeTab === "household") {
      handleFetchHousehold();
    } else if (activeTab === "otp") {
      handleFetchOtp();
    } else if (activeTab === "six-digit") {
      handleFetchSixDigit();
    }
  };

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showAppNotification("Đã copy vào bộ nhớ tạm!", "success");
  };

  const currentResult =
    activeTab === "household"
      ? householdResult
      : activeTab === "otp"
      ? otpResult
      : activeTab === "six-digit"
      ? sixDigitResult
      : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Quản lý Netflix & Outlook</h1>
        <p className="text-sm text-slate-400 mt-1">
          Lấy mã xác minh Netflix hoặc chạy công cụ sửa lỗi quy tắc chuyển tiếp Outlook cho khách hàng.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {NETFLIX_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={netflixLoading || isFixing}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                isActive
                  ? `${tab.activeColor} border-opacity-100 shadow-lg scale-[1.02]`
                  : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-300"
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 ${tab.color}`} />
              <span className="font-semibold text-sm">{tab.label}</span>
              <span className="text-xs text-slate-500 mt-1 hidden sm:inline text-center">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* RENDER NETFLIX TABS (household, otp, six-digit) */}
      {activeTab !== "outlook-fix" ? (
        <>
          {/* Form Input */}
          <form onSubmit={handleNetflixSubmit} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Netflix của khách hàng
              </label>
              <input
                type="email"
                required
                value={netflixEmail}
                onChange={(e) => setNetflixEmail(e.target.value)}
                placeholder="example@gmail.com"
                disabled={netflixLoading || netflixCooldown > 0}
                className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={netflixLoading || netflixCooldown > 0 || !netflixEmail}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {netflixLoading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : netflixCooldown > 0 ? (
                <span>Vui lòng chờ {netflixCooldown}s</span>
              ) : (
                <span>Gửi yêu cầu lấy mã</span>
              )}
            </button>
          </form>

          {/* Result Section */}
          {netflixError && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5 text-sm text-red-200/90 leading-relaxed">
              <p className="font-semibold text-red-400 mb-1">Đã xảy ra lỗi:</p>
              {netflixError}
            </div>
          )}

          {currentResult && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Kết quả nhận được
              </h3>

              {/* Link Hộ gia đình */}
              {activeTab === "household" && "link" in currentResult && currentResult.link && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 font-medium">{currentResult.message || "Đã tìm thấy link xác minh:"}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentResult.link}
                      className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(currentResult.link)}
                      className="px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      <ClipboardIcon className="h-4 w-4" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(currentResult.link, "_blank")}
                      className="px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Mở link
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Code (4-8 số hoặc 6 số) */}
              {(activeTab === "otp" || activeTab === "six-digit") && "code" in currentResult && currentResult.code && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-900/50 rounded-2xl border border-slate-700/40 relative group">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                      Mã OTP Đăng nhập
                    </span>
                    <span className="text-4xl font-extrabold tracking-widest text-red-500 font-mono select-all">
                      {currentResult.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentResult.code)}
                      className="absolute right-4 bottom-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      <ClipboardIcon className="h-4 w-4" /> Copy
                    </button>
                  </div>

                  {/* Meta information */}
                  <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-800/80 space-y-2 text-xs text-slate-400">
                    {currentResult.subject && (
                      <p>
                        <strong className="text-slate-300">Tiêu đề:</strong> {currentResult.subject}
                      </p>
                    )}
                    {currentResult.from && (
                      <p>
                        <strong className="text-slate-300">Gửi từ:</strong> {currentResult.from}
                      </p>
                    )}
                    {currentResult.date && (
                      <p>
                        <strong className="text-slate-300">Thời gian nhận:</strong> {currentResult.date}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!("code" in currentResult) && !("link" in currentResult) && currentResult.message && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-300/90 leading-relaxed">
                  {currentResult.message}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* RENDER OUTLOOK FIX TAB */
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <p className="text-sm text-slate-400">
              Công cụ tự động sửa lại cấu hình chuyển tiếp email trên tài khoản Outlook của khách hàng.
            </p>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Cấu hình Server URL"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Cấu hình URL */}
          {showConfig && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Cấu hình Server URL (Cloudflare Tunnel)</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={serverUrl}
                  placeholder="https://..."
                  id="configUrlInput"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const val = (document.getElementById("configUrlInput") as HTMLInputElement)?.value;
                    if (val) handleSaveConfig(val.trim());
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Lưu URL
                </button>
              </div>
            </div>
          )}

          {/* Form Input */}
          <form onSubmit={handleStartFix} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Địa chỉ Email Outlook chính (Primary Email)
              </label>
              <input
                type="email"
                required
                value={outlookEmail}
                onChange={(e) => setOutlookEmail(e.target.value)}
                placeholder="example@outlook.com"
                disabled={isFixing || !isLoggedIn}
                className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isFixing || !isLoggedIn || !outlookEmail}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFixing ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>Đang xử lý sửa lỗi...</span>
                </>
              ) : (
                <span>Bắt đầu sửa lỗi (Start Fix)</span>
              )}
            </button>
            <p className="text-xs text-amber-500/90 flex items-center gap-1.5 font-medium">
              ⚠️ Mỗi email chỉ có thể xử lý một lần mỗi 24 giờ.
            </p>
          </form>

          {/* Terminal Log */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Console Terminal Logs</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isConnected && isLoggedIn 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected && isLoggedIn ? "bg-emerald-500" : "bg-amber-500"}`} />
                {isConnected ? (isLoggedIn ? "Đã kết nhập" : "Đang kết nối") : "Mất kết nối"}
              </span>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 h-72 overflow-y-auto font-mono text-xs leading-relaxed text-emerald-400/90 shadow-inner">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">{log}</div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
