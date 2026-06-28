export const readJsonOrText = async <T = unknown>(
  response: Response
): Promise<{ data: T | null; rawText: string; contentType: string }> => {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as T;
      return { data: parsed, rawText, contentType };
    } catch {
      // Ignore parse errors and let the caller inspect raw text.
    }
  }

  return { data: null, rawText, contentType };
};
