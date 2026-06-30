import { Loader2, RefreshCw, Search } from "lucide-react";

type RenewProfileCheckActionButtonProps = {
  loading: boolean;
  activating: boolean;
  syncing: boolean;
  canShowSyncButton: boolean;
  canShowActivateButton: boolean;
  onSyncFixAdes: () => void;
  onActivate: () => void;
};

export function RenewProfileCheckActionButton({
  loading,
  activating,
  syncing,
  canShowSyncButton,
  canShowActivateButton,
  onSyncFixAdes,
  onActivate,
}: RenewProfileCheckActionButtonProps) {
  if (canShowSyncButton) {
    return (
      <button
        type="button"
        onClick={onSyncFixAdes}
        disabled={syncing || loading || activating}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-sky-500/45 disabled:opacity-60"
      >
        {syncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            ??ang ?????ng b??? d??? li???u...
          </>
        ) : (
          <>
            <RefreshCw
              className="h-4 w-4 storefront-renew-refresh-nudge"
              strokeWidth={2}
            />
            ?????ng b??? d??? li???u Ades
          </>
        )}
      </button>
    );
  }

  if (canShowActivateButton) {
    return (
      <button
        type="button"
        onClick={onActivate}
        disabled={activating || syncing}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/45 disabled:opacity-60"
      >
        {activating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            ??ang k??ch ho???t...
          </>
        ) : (
          <>
            <RefreshCw
              className="h-4 w-4 storefront-renew-refresh-nudge"
              strokeWidth={2}
            />
            K??ch ho???t l???i ngay
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={loading || activating || syncing}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-purple-500/35 transition-all hover:shadow-purple-500/50 disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          ??ang ki???m tra...
        </>
      ) : activating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          ??ang k??ch ho???t...
        </>
      ) : syncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          ??ang ?????ng b??? d??? li???u...
        </>
      ) : (
        <>
          <Search
            className="h-4 w-4 storefront-renew-search-btn"
            strokeWidth={2}
          />
          Ki???m tra Profile
        </>
      )}
    </button>
  );
}
