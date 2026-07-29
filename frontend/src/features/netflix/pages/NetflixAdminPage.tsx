import { useNetflixAdmin } from "../hooks/useNetflixAdmin";
import { NETFLIX_TABS } from "../constants";
import { ClipboardIcon, ArrowTopRightOnSquareIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { showAppNotification } from "@/lib/notifications";

export default function NetflixAdminPage() {
  const {
    activeTab,
    email,
    loading,
    cooldownSeconds,
    householdResult,
    otpResult,
    sixDigitResult,
    error,
    setEmail,
    handleTabChange,
    handleFetchHousehold,
    handleFetchOtp,
    handleFetchSixDigit,
  } = useNetflixAdmin();

  const currentResult =
    activeTab === "household"
      ? householdResult
      : activeTab === "otp"
      ? otpResult
      : sixDigitResult;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldownSeconds > 0) return;
    if (activeTab === "household") {
      handleFetchHousehold();
    } else if (activeTab === "otp") {
      handleFetchOtp();
    } else {
      handleFetchSixDigit();
    }
  };

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showAppNotification("Đã copy vào bộ nhớ tạm!", "success");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Quản lý OTP Netflix</h1>
        <p className="text-sm text-slate-400 mt-1">
          Lấy mã xác minh hộ gia đình, mã OTP đăng nhập từ Email Netflix của khách hàng.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {NETFLIX_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={loading}
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

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Email Netflix của khách hàng
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            disabled={loading || cooldownSeconds > 0}
            className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={loading || cooldownSeconds > 0 || !email}
          className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : cooldownSeconds > 0 ? (
            <span>Vui lòng chờ {cooldownSeconds}s</span>
          ) : (
            <span>Gửi yêu cầu lấy mã</span>
          )}
        </button>
      </form>

      {/* Result Section */}
      {error && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5 text-sm text-red-200/90 leading-relaxed">
          <p className="font-semibold text-red-400 mb-1">Đã xảy ra lỗi:</p>
          {error}
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
    </div>
  );
}
