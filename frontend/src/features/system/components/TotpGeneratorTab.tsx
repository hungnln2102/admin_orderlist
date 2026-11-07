import React, { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";

interface TotpResult {
  code: string;
  remainingSeconds: number;
  expiresAt: string;
}

interface TotpGeneratorTabProps {
  onShowToast: (type: "success" | "error", text: string) => void;
}

export const TotpGeneratorTab: React.FC<TotpGeneratorTabProps> = ({ onShowToast }) => {
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [result, setResult] = useState<TotpResult | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!result) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [result]);

  const handleGenerate = async () => {
    if (!secret.trim()) {
      onShowToast("error", "Vui lòng nhập TOTP secret.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/system/totp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Không thể sinh mã TOTP.");
      }

      setResult(payload);
      setRemainingSeconds(payload.remainingSeconds);
      setSecret("");
      setShowSecret(false);
    } catch (error: any) {
      setResult(null);
      setRemainingSeconds(0);
      onShowToast("error", error.message || "Không thể sinh mã TOTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.code) return;
    await navigator.clipboard.writeText(result.code);
    onShowToast("success", "Đã sao chép mã TOTP.");
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-900/80 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Sinh mã Google Authenticator</h2>
            <p className="mt-1 text-xs text-slate-400">
              Nhập Base32 secret để sinh mã TOTP chuẩn, không lưu secret vào hệ thống và không gửi qua bên thứ ba.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label htmlFor="totp-secret" className="text-xs font-bold text-slate-300">
            TOTP Secret (Base32)
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="totp-secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleGenerate();
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Ví dụ: JBSWY3DPEHPK3PXP"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 cursor-pointer"
                aria-label={showSecret ? "Ẩn secret" : "Hiện secret"}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Đang sinh..." : "Sinh mã"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Secret chỉ được dùng trong request hiện tại và không được hiển thị trong kết quả.</p>
        </div>
      </div>

      {result && (
        <div className="p-6 bg-gradient-to-br from-emerald-950/60 to-slate-900/80 rounded-2xl border border-emerald-500/30 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">Mã hiện tại</span>
            </div>
            <span className={`text-xs font-bold ${remainingSeconds <= 5 ? "text-rose-300" : "text-emerald-300"}`}>
              Còn {remainingSeconds}s
            </span>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="text-5xl font-black tracking-[0.3em] text-white font-mono">{result.code}</div>
            <button
              type="button"
              onClick={handleCopy}
              className="self-start px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              {remainingSeconds === 0 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Sao chép
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Mã hết hạn lúc {new Date(result.expiresAt).toLocaleTimeString("vi-VN")}.</p>
        </div>
      )}
    </div>
  );
};