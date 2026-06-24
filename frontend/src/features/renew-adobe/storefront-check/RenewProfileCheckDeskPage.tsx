import { useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { useStorefrontRenewCheck } from "./hooks/useStorefrontRenewCheck";
import { RenewStatusPanel } from "./components/RenewStatusPanel";
import { STOREFRONT_RENEW_CHECK_STYLES } from "./styles/storefrontRenewCheck.styles";
import { Link } from "react-router-dom";

/**
 * Kiểm tra / kích hoạt profile Renew qua API public storefront (`/api/renew-adobe/public/*`).
 */
function isServiceConnectionErrorMessage(message: string | null) {
  const normalized = String(message || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  return [
    "khong ket noi",
    "khong the ket noi",
    "khong goi duoc",
    "khong the kiem tra",
    "loi ket noi",
    "cannot connect",
    "network",
    "timeout",
    "failed to fetch",
  ].some((keyword) => normalized.includes(keyword));
}

export default function RenewProfileCheckDeskPage() {
  const {
    email,
    setEmail,
    loading,
    activating,
    syncing,
    resultType,
    message,
    profileName,
    canActivate,
    canSync,
    outsideOrderStatus,
    successNeedsProductLink,
    urlAccess,
    handleCheckSubmit,
    handleActivate,
    handleSyncFixAdes,
  } = useStorefrontRenewCheck();

  const [hintOpen, setHintOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const canShowSyncButton =
    resultType === "needs-sync" &&
    canSync &&
    !isServiceConnectionErrorMessage(message);
  const canShowActivateButton =
    resultType === "expired" &&
    canActivate &&
    !isServiceConnectionErrorMessage(message);

  const adobeFixSteps = [
    "Bước 1: Kiểm tra tài khoản trên web để xem profile đang active.",
    "Bước 2: Nếu có mục jointeam thì chọn jointeam trước.",
    "Bước 3: Chọn đúng profile đã kiểm tra ở bước 1.",
    "Bước 4: Thử lại thao tác kích hoạt / đăng nhập Adobe sau khi đã chọn đúng profile.",
    "Bước 5: Nếu làm đủ các bước trên mà vẫn lỗi, liên hệ Quản Trị Viên để kiểm tra.",
  ];

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
            className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-400/15"
            onClick={() => setGuideOpen(true)}
          >
            Hướng dẫn fix lỗi Adobe
          </button>
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

      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/60">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500" />
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Adobe guide</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Hướng dẫn fix lỗi Adobe</h2>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-full border border-white/10 p-2 text-white/65 hover:bg-white/5 hover:text-white"
                aria-label="Đóng hướng dẫn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm leading-6 text-white/70">
                Làm đúng thứ tự bên dưới để tránh chọn sai profile hoặc sai team khi fix Adobe.
              </p>

              <div className="space-y-3">
                {adobeFixSteps.map((step) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <p className="text-sm leading-6 text-white/80">{step}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-50/90">
                Nếu vẫn không xử lý được sau khi kiểm tra profile và jointeam, vui lòng liên hệ Quản Trị Viên để
                kiểm tra trạng thái tài khoản.
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-white/80 hover:bg-white/[0.06]"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuideOpen(false);
                    setHintOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                >
                  Xem lưu ý chờ
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                syncing={syncing}
                resultType={resultType}
                message={message}
                profileName={profileName}
                email={email}
                outsideOrderStatus={outsideOrderStatus}
                successNeedsProductLink={successNeedsProductLink}
                urlAccess={urlAccess}
              />

              {canShowSyncButton ? (
                <button
                  type="button"
                  onClick={handleSyncFixAdes}
                  disabled={syncing || loading || activating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-sky-500/45 disabled:opacity-60"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang đồng bộ dữ liệu...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 storefront-renew-refresh-nudge" strokeWidth={2} />
                      Đồng bộ dữ liệu Ades
                    </>
                  )}
                </button>
              ) : canShowActivateButton ? (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activating || syncing}
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
                  disabled={loading || activating || syncing}
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
                  ) : syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang đồng bộ dữ liệu...
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
