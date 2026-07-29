import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { showAppNotification } from "@/lib/notifications";
import { Cog6ToothIcon, CommandLineIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function OutlookFixPage() {
  const [serverUrl, setServerUrl] = useState(() => {
    return localStorage.getItem("outlook_bot_server_url") || "https://sunny-shoe-keep-inner.trycloudflare.com";
  });
  const [showConfig, setShowConfig] = useState(false);
  const [email, setEmail] = useState("");
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
    addLog(`Đang kết nối tới server: ${serverUrl}...`);
    
    // Khởi tạo kết nối socket
    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      addLog("Đã kết nối với server WebSocket.");
      // Gửi đăng nhập ngay khi kết nối
      socket.emit("userLogin", ACCESS_CODE);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsLoggedIn(false);
      setIsFixing(false);
      addLog("Đã ngắt kết nối khỏi server.");
    });

    socket.on("connect_error", () => {
      addLog("Lỗi kết nối server. Hãy kiểm tra lại URL Server trong phần cài đặt.");
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
  }, [serverUrl]);

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
    if (!email.trim() || !socketRef.current || !isLoggedIn) return;

    setIsFixing(true);
    setLogs([]);
    addLog(`Bắt đầu tiến trình Fix cho email: ${email}...`);
    
    socketRef.current.emit("userStart", {
      primary: email.trim(),
      accessCode: ACCESS_CODE,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <CommandLineIcon className="h-7 w-7 text-red-500" /> Sửa lỗi chuyển tiếp Outlook
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tự động khôi phục quy tắc chuyển tiếp email trên tài khoản Outlook của khách hàng.
          </p>
        </div>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@outlook.com"
            disabled={isFixing || !isLoggedIn}
            className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={isFixing || !isLoggedIn || !email}
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
            {isConnected ? (isLoggedIn ? "Đã đăng nhập" : "Chờ đăng nhập") : "Mất kết nối"}
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
  );
}
