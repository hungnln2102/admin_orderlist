import { useCallback, useState } from "react";

export function useClipboard() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (value: string, key = value) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
  }, []);

  return { copied, copy, clearCopied: () => setCopied(null) };
}
