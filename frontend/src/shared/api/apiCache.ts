type CacheEntry<T> = {
  data: T;
  freshUntil: number;
  staleUntil: number;
};

type InFlightRequest<T> = {
  controller: AbortController;
  promise: Promise<T>;
};

export type CachedJsonResult<T> = {
  data: T;
  revalidate?: Promise<T>;
};

export type CachedJsonOptions = {
  ttlMs: number;
  staleWhileRevalidateMs?: number;
  init?: RequestInit;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, InFlightRequest<unknown>>();
let sessionEpoch = 0;

function getScopedKey(url: string) {
  return `${sessionEpoch}:${url}`;
}

async function requestJson<T>(url: string, init: RequestInit | undefined, key: string, ttlMs: number, staleWhileRevalidateMs: number) {
  const active = inFlight.get(key) as InFlightRequest<T> | undefined;
  if (active) return active.promise;

  const controller = new AbortController();
  const promise = fetch(url, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: { Accept: "application/json", ...init?.headers },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Không thể tải dữ liệu (${response.status}).`);
      }
      return response.json() as Promise<T>;
    })
    .then((data) => {
      const now = Date.now();
      cache.set(key, {
        data,
        freshUntil: now + ttlMs,
        staleUntil: now + ttlMs + staleWhileRevalidateMs,
      });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, { controller, promise });
  return promise;
}

export async function fetchCachedJson<T>(url: string, options: CachedJsonOptions): Promise<CachedJsonResult<T>> {
  const key = getScopedKey(url);
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  const staleWhileRevalidateMs = options.staleWhileRevalidateMs ?? 0;

  if (entry && entry.freshUntil > now) return { data: entry.data };

  if (entry && entry.staleUntil > now) {
    return {
      data: entry.data,
      revalidate: requestJson<T>(url, options.init, key, options.ttlMs, staleWhileRevalidateMs),
    };
  }

  return {
    data: await requestJson<T>(url, options.init, key, options.ttlMs, staleWhileRevalidateMs),
  };
}

export function invalidateApiCache(urlPrefixes: string[]) {
  for (const key of cache.keys()) {
    const [, url] = key.split(":", 2);
    if (urlPrefixes.some((prefix) => url.startsWith(prefix))) cache.delete(key);
  }
}

export function clearApiCache() {
  sessionEpoch += 1;
  cache.clear();
  for (const request of inFlight.values()) request.controller.abort();
  inFlight.clear();
}
