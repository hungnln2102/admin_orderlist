import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useNetflixAdmin } from "../hooks/useNetflixAdmin";
import { NETFLIX_TABS } from "../constants";
import {
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  fetchSubAccessCodes,
  generateSubAccessCode,
  toggleSubAccessCode,
  deleteSubAccessCode,
  renameSubAccessCode,
  updateSubAccessCodePerms,
  SubAccessCodeItem,
} from "../api/netflixApi";
import { showAppNotification } from "@/lib/notifications";

export default function NetflixAdminPage() {
  const [activeTab, setActiveTab] = useState<"household" | "otp" | "six-digit" | "sub-access" | "outlook-fix">("household");

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

  // --- LOGIC CHO SUB-ACCESS CODES (cust.php) ---
  const [subCodes, setSubCodes] = useState<SubAccessCodeItem[]>([]);
  const [loadingSubCodes, setLoadingSubCodes] = useState(false);
  const [subCodeError, setSubCodeError] = useState<string | null>(null);

  // Form generate state
  const [newSubCode, setNewSubCode] = useState("");
  const [permSignin, setPermSignin] = useState(true);
  const [permReset, setPermReset] = useState(true);
  const [permCountry, setPermCountry] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Rename & Edit Perms state
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const loadSubCodes = async () => {
    setLoadingSubCodes(true);
    setSubCodeError(null);
    try {
      const res = await fetchSubAccessCodes();
      if (res.ok && res.data) {
        setSubCodes(res.data);
      } else {
        setSubCodeError(res.error || res.message || "Không tải được danh sách mã phụ.");
      }
    } catch (err) {
      setSubCodeError("Lỗi kết nối tới server.");
    } finally {
      setLoadingSubCodes(false);
    }
  };

  useEffect(() => {
    if (activeTab === "sub-access") {
      loadSubCodes();
    }
  }, [activeTab]);

  const handleGenerateSubCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await generateSubAccessCode({
        subCode: newSubCode.trim(),
        permSignin,
        permReset,
        permCountry,
      });
      if (res.ok && res.data) {
        setSubCodes(res.data);
        setNewSubCode("");
        showAppNotification(res.message || "Tạo mã phụ thành công!", "success");
      } else {
        showAppNotification(res.message || res.error || "Thất bại.", "error");
      }
    } catch (err) {
      showAppNotification("Có lỗi xảy ra khi tạo mã phụ.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSubStatus = async (subCode: string) => {
    try {
      const res = await toggleSubAccessCode(subCode);
      if (res.ok && res.data) {
        setSubCodes(res.data);
        showAppNotification(`Đã thay đổi trạng thái mã ${subCode}`, "success");
      }
    } catch (err) {
      showAppNotification("Không thể thay đổi trạng thái.", "error");
    }
  };

  const handleDeleteSubCode = async (subCode: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã phụ ${subCode}?`)) return;
    try {
      const res = await deleteSubAccessCode(subCode);
      if (res.ok && res.data) {
        setSubCodes(res.data);
        showAppNotification(`Đã xóa mã ${subCode}`, "success");
      }
    } catch (err) {
      showAppNotification("Không thể xóa mã phụ.", "error");
    }
  };

  const handleRenameSubCode = async (oldSub: string) => {
    if (!renameInput.trim()) return;
    try {
      const res = await renameSubAccessCode(oldSub, renameInput.trim());
      if (res.ok && res.data) {
        setSubCodes(res.data);
        setEditingSub(null);
        setRenameInput("");
        showAppNotification(`Đã đổi tên thành ${renameInput.trim()}`, "success");
      }
    } catch (err) {
      showAppNotification("Không thể đổi tên mã phụ.", "error");
    }
  };

  const handleUpdatePerms = async (item: SubAccessCodeItem, field: "permSignin" | "permReset" | "permCountry") => {
    const updatedParams = {
      subCode: item.subCode,
      permSignin: field === "permSignin" ? !item.permSignin : item.permSignin,
      permReset: field === "permReset" ? !item.permReset : item.permReset,
      permCountry: field === "permCountry" ? !item.permCountry : item.permCountry,
    };
    try {
      const res = await updateSubAccessCodePerms(updatedParams);
      if (res.ok && res.data) {
        setSubCodes(res.data);
        showAppNotification(`Đã cập nhật quyền cho ${item.subCode}`, "success");
      }
    } catch (err) {
      showAppNotification("Không thể cập nhật quyền.", "error");
    }
  };

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

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

  useEffect(() => {
    if (activeTab !== "outlook-fix") {
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

    socket.on("results", () => {
      setIsFixing(false);
      addLog("--- QUÁ TRÌNH HOÀN TẤT ---");
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl, activeTab]);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Quản lý Netflix & Outlook</h1>
        <p className="text-sm text-slate-400 mt-1">
          Hệ thống tích hợp lấy mã xác minh Netflix, quản lý Mã phụ VIVA và công cụ tự động sửa quy tắc Outlook.
        </p>
      </div>

      {/* Tabs Bar (5 tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {NETFLIX_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={netflixLoading || isFixing}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                isActive
                  ? `${tab.activeColor} border-opacity-100 shadow-lg scale-[1.02]`
                  : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-300"
              }`}
            >
              <Icon className={`h-5 w-5 mb-1.5 ${tab.color}`} />
              <span className="font-semibold text-xs sm:text-sm">{tab.label}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 hidden sm:inline text-center line-clamp-1">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* RENDER NETFLIX OTP TABS (household, otp, six-digit) */}
      {activeTab === "household" || activeTab === "otp" || activeTab === "six-digit" ? (
        <>
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
            </div>
          )}
        </>
      ) : activeTab === "sub-access" ? (
        /* RENDER TAB 5: SUB-ACCESS CODES (cust.php) */
        <div className="space-y-6">
          {/* Header & Main Code info */}
          <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-purple-200">VIVA Customer Panel</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Main Access Code cố định: <strong className="text-purple-400 font-mono">mvrk56</strong>
              </p>
            </div>
            <button
              onClick={loadSubCodes}
              disabled={loadingSubCodes}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loadingSubCodes ? "animate-spin" : ""}`} /> Làm mới danh sách
            </button>
          </div>

          {/* Form Generate Sub-Code */}
          <form onSubmit={handleGenerateSubCode} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Tạo Sub-Access Code mới</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Tên Sub-Code (Tối thiểu 4 ký tự, để trống để tự tạo)
                </label>
                <input
                  type="text"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="VD: mvrk03 (Tùy chọn)"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Quyền truy cập (Permissions)</label>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permSignin}
                      onChange={(e) => setPermSignin(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500/40 h-4 w-4"
                    />
                    Signin Code
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permReset}
                      onChange={(e) => setPermReset(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500/40 h-4 w-4"
                    />
                    Reset Link
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permCountry}
                      onChange={(e) => setPermCountry(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500/40 h-4 w-4"
                    />
                    Country
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {generating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
              Tạo Mã Phụ
            </button>
          </form>

          {/* Error notice */}
          {subCodeError && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-4 text-xs text-red-300">
              {subCodeError}
            </div>
          )}

          {/* Sub-Codes Table */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/60 flex justify-between items-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Danh sách Sub-Access Codes ({subCodes.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700/60">
                  <tr>
                    <th className="px-4 py-3">Sub Code</th>
                    <th className="px-4 py-3">Quyền hạn (Permissions)</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày tạo</th>
                    <th className="px-4 py-3 text-right">Thao tác (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {subCodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {loadingSubCodes ? "Đang tải danh sách..." : "Chưa có mã phụ nào."}
                      </td>
                    </tr>
                  ) : (
                    subCodes.map((item) => (
                      <tr key={item.subCode} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-200">
                          {editingSub === item.subCode ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 w-28 focus:outline-none"
                              />
                              <button
                                onClick={() => handleRenameSubCode(item.subCode)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                                title="Lưu tên mới"
                              >
                                <CheckIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSub(null)}
                                className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                title="Hủy"
                              >
                                <XMarkIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            item.subCode
                          )}
                        </td>

                        {/* Permissions checkbox edit */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer select-none" title="Signin Code">
                              <input
                                type="checkbox"
                                checked={item.permSignin}
                                onChange={() => handleUpdatePerms(item, "permSignin")}
                                className="rounded bg-slate-900 border-slate-700 text-purple-600 h-3.5 w-3.5"
                              />
                              <span>Signin</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer select-none" title="Reset Link">
                              <input
                                type="checkbox"
                                checked={item.permReset}
                                onChange={() => handleUpdatePerms(item, "permReset")}
                                className="rounded bg-slate-900 border-slate-700 text-purple-600 h-3.5 w-3.5"
                              />
                              <span>Reset</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer select-none" title="Country">
                              <input
                                type="checkbox"
                                checked={item.permCountry}
                                onChange={() => handleUpdatePerms(item, "permCountry")}
                                className="rounded bg-slate-900 border-slate-700 text-purple-600 h-3.5 w-3.5"
                              />
                              <span>Country</span>
                            </label>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              item.status === "Active"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-slate-700/30 border-slate-700 text-slate-400"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">{item.created}</td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleSubStatus(item.subCode)}
                              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                            >
                              {item.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => {
                                setEditingSub(item.subCode);
                                setRenameInput(item.subCode);
                              }}
                              className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200 transition-colors"
                              title="Đổi tên"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubCode(item.subCode)}
                              className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                              title="Xóa Sub-Code"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* RENDER TAB 4: OUTLOOK FIX */
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
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isConnected && isLoggedIn
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isConnected && isLoggedIn ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                {isConnected ? (isLoggedIn ? "Đã kết nhập" : "Đang kết nối") : "Mất kết nối"}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 h-72 overflow-y-auto font-mono text-xs leading-relaxed text-emerald-400/90 shadow-inner">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
