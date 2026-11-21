import { useCallback, useState, useRef, useEffect } from "react";

/**
 * useClipboard — Hook sao chép clipboard chuẩn hóa, tự động reset trạng thái sau timer.
 * Thay thế triệt để các đoạn useState + setTimeout lặp lại trong hơn 12 files.
 */
export function useClipboard(defaultTimeout = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string, key = "default", timeout = defaultTimeout) => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCopiedKey(null);
        }, timeout);
        return true;
      } catch (err) {
        console.error("[useClipboard] Lỗi sao chép clipboard:", err);
        return false;
      }
    },
    [defaultTimeout]
  );

  const isCopied = useCallback(
    (key = "default") => {
      return copiedKey === key;
    },
    [copiedKey]
  );

  const clearCopied = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopiedKey(null);
  }, []);

  return {
    copiedKey,
    copy,
    isCopied,
    clearCopied,
  };
}
