const isDev =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

const RAW_API_BASE: string = (() => {
  // Dev: always use same-origin /api via Vite proxy to avoid stale or mismatched
  // direct backend targets between shells, env files, and browser sessions.
  if (isDev) return "";

  const metaBase =
    typeof import.meta !== "undefined"
      ? ((import.meta as any).env?.VITE_API_BASE_URL as string) || ""
      : "";
  if (metaBase) return metaBase;

  const envBase =
    typeof process !== "undefined"
      ? ((process as any).env?.VITE_API_BASE_URL as string) || ""
      : "";
  if (envBase) return envBase;

  return "http://localhost:3001";
})();

function normalizeBaseUrl(value: string): string {
  const normalized = (value || "").trim();
  if (!normalized) return "";
  if (/^:\d+/.test(normalized)) return `http://localhost${normalized}`;
  if (/^localhost:\d+/.test(normalized)) return `http://${normalized}`;
  if (!/^https?:\/\//i.test(normalized)) return `http://${normalized}`;
  return normalized;
}

export const API_BASE_URL: string = normalizeBaseUrl(RAW_API_BASE);

let _csrfToken: string | null = null;

const buildUrl = (input: string): string => {
  if (input.startsWith("http")) return input;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = input.replace(/^\/+/, "");
  return `${base}/${path}`;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function injectCsrfHeader(init: RequestInit): RequestInit {
  const method = (init.method || "GET").toUpperCase();
  if (!_csrfToken || !MUTATING_METHODS.has(method)) return init;

  const headers = new Headers(init.headers);
  if (!headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", _csrfToken);
  }
  return { ...init, headers };
}

function captureCsrfToken(res: Response): void {
  const token = res.headers.get("X-CSRF-Token");
  if (token) _csrfToken = token;
}

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = buildUrl(input);
  const baseInit: RequestInit = {
    credentials: init?.credentials ?? "include",
    ...init,
  };
  const finalInit = injectCsrfHeader(baseInit);

  try {
    const res = await fetch(url, finalInit);
    captureCsrfToken(res);
    return res;
  } catch (error) {
    if (!input.startsWith("http")) {
      try {
        const res = await fetch(`http://127.0.0.1:3001${input}`, finalInit);
        captureCsrfToken(res);
        return res;
      } catch {}

      try {
        const res = await fetch(input, finalInit);
        captureCsrfToken(res);
        return res;
      } catch {}
    }

    throw error as Error;
  }
}
