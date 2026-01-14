export type RefreshScope =
  | "all"
  | "orders"
  | "packages"
  | "products"
  | "categories"
  | "supplies"
  | "wallets"
  | "storage"
  | "dashboard";

type RefreshDetail = {
  scopes: RefreshScope[];
};

const EVENT_NAME = "app:data-refresh";

const normalizeScopes = (scopes?: RefreshScope[] | null): RefreshScope[] => {
  if (!scopes || scopes.length === 0) {
    return ["all"];
  }
  return scopes;
};

const matchesScopes = (
  incoming: RefreshScope[],
  watch: RefreshScope[]
): boolean =>
  incoming.includes("all") || watch.some((scope) => incoming.includes(scope));

export const emitRefresh = (scopes: RefreshScope[] = ["all"]) => {
  if (typeof window === "undefined") return;
  const detail: RefreshDetail = { scopes: normalizeScopes(scopes) };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
};

export const onRefresh = (
  watchScopes: RefreshScope[],
  handler: () => void
) => {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<RefreshDetail>).detail;
    const incoming = normalizeScopes(detail?.scopes);
    if (matchesScopes(incoming, watchScopes)) {
      handler();
    }
  };
  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener as EventListener);
  };
};
