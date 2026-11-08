export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
};

export async function apiClient(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { body, headers, ...init } = options;
  const isJsonBody = body !== undefined && !(body instanceof FormData) && typeof body !== "string";
  const requestHeaders = new Headers(headers);

  if (isJsonBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: requestHeaders,
    body: isJsonBody ? JSON.stringify(body) : (body as BodyInit | undefined),
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("app:unauthorized"));
  }

  return response;
}
