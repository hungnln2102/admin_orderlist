export const API_BASE_URL: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith("http") ? input : `${API_BASE_URL}${input}`;
  return fetch(url, init);
}

