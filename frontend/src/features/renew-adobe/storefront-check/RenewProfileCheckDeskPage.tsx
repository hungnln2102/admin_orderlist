import { useState } from "react";
import { Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useStorefrontRenewCheck } from "./hooks/useStorefrontRenewCheck";
import { RenewStatusPanel } from "./components/RenewStatusPanel";
import { STOREFRONT_RENEW_CHECK_STYLES } from "./styles/storefrontRenewCheck.styles";
import { Link } from "react-router-dom";

/**
 * Kiểm tra / kích hoạt profile Renew qua API public storefront (`/api/renew-adobe/public/*`).
 */
export default function RenewProfileCheckDeskPage() {
  const {
    email,
    setEmail,
    loading,
    activating,
    resultType,
    message,
    profileName,
    canActivate,
    outsideOrderStatus,
    successNeedsProductLink,
    urlAccess,
    handleCheckSubmit,
    handleActivate,
  } = useStorefrontRenewCheck();

  const [hintOpen, setHintOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Kiểm tra Renew Adobe</h1>
          <p className="mt-1 text-sm text-white/55">
            Public API{" "}
            <code className="rounded bg-white/10 px-1 text-[11px] text-white/80">
              /api/renew-adobe/public/*
            </code>{" "}
            — cùng hợp đồng với cửa hàng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 hover:bg-white/[0.06]"
            onClick={() => setHintOpen((o) => !o)}
          >
            {hintOpen ? "Ẩn lưu ý" : "Lưu ý thời gian chờ"}
          </button>
          <Link
            to="/renew-orders"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.08]"
          >
            Đơn Renew (bàn làm việc)
          </Link>
        </div>
      </div>

      {hintOpen && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
          Kích hoạt có thể mất nhiều phút (Playwright). Client / proxy cần timeout đủ dài (~10–11
          phút) như storefront.
        </p>
      )}

      <div className="mx-auto w-full max-w-xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-900/80 to-slate-950/90 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-36 w-80 -translate-x-1/2 rounded-full bg-purple-600/12 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent" />

          <div className="relative p-8 sm:p-10">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <Search
                  className="h-5 w-5 shrink-0 text-purple-400 storefront-renew-search-title"
                  strokeWidth={2}
                />
                <h2 className="text-xl font-bold text-white">Kiểm tra &amp; Kích hoạt</h2>
              </div>
              <p className="mt-1 text-sm text-white/55">
                Nhập email Adobe để kiểm tra trạng thái profile.
              </p>
            </div>

            <form onSubmit={handleCheckSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/45">
                  Email Adobe
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 text-sm text-white placeholder:text-white/35 outline-none ring-1 ring-transparent transition-all focus:border-purple-500 focus:ring-purple-500/40"
                />
              </div>

              <RenewStatusPanel
                loading={loading}
                activating={activating}
                resultType={resultType}
                message={message}
                profileName={profileName}
                email={email}
                outsideOrderStatus={outsideOrderStatus}
                successNeedsProductLink={successNeedsProductLink}
                urlAccess={urlAccess}
              />

              {resultType === "expired" && canActivate ? (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/45 disabled:opacity-60"
                >
                  {activating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kích hoạt...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 storefront-renew-refresh-nudge" strokeWidth={2} />
                      Kích hoạt lại ngay
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || activating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-purple-500/35 transition-all hover:shadow-purple-500/50 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : activating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kích hoạt...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 storefront-renew-search-btn" strokeWidth={2} />
                      Kiểm tra Profile
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-white/40">
          <span>Renew Adobe • API public storefront</span>
          <span className="text-white/25">·</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500/90" />
            Cùng cổng cửa hàng
          </span>
        </div>
      </div>

      <style>{STOREFRONT_RENEW_CHECK_STYLES}</style>
    </div>
  );
}
