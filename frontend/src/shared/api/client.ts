const RAW_API_BASE: string = (() => {
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

  // Dev: use same-origin via Vite proxy when no explicit base URL is provided.
  const isDev =
    typeof import.meta !== "undefined" &&
    (import.meta as any).env?.DEV === true;
  if (isDev) return "";

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

const buildUrl = (input: string): string => {
  if (input.startsWith("http")) return input;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = input.replace(/^\/+/, "");
  return `${base}/${path}`;
};

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = buildUrl(input);
  const finalInit: RequestInit = {
    credentials: init?.credentials ?? "include",
    ...init,
  };

  try {
    return await fetch(url, finalInit);
  } catch (error) {
    if (!input.startsWith("http")) {
      try {
        return await fetch(`http://127.0.0.1:3001${input}`, finalInit);
      } catch {}

      try {
        return await fetch(input, finalInit);
      } catch {}
    }

    throw error as Error;
  }
}
