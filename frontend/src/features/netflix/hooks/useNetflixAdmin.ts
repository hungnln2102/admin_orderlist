import { useState, useCallback } from "react";
import { showAppNotification } from "@/lib/notifications";
import {
  fetchNetflixHouseholdLink,
  fetchNetflixOtp,
  fetchNetflixSixDigitCode,
} from "../api/netflixApi";

export type ActiveTab = "household" | "otp" | "six-digit";

export interface HouseholdResult {
  link?: string;
  message?: string;
}

export interface OtpResult {
  code?: string;
  message?: string;
  subject?: string;
  from?: string;
  date?: string;
}

export function useNetflixAdmin() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("household");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [householdResult, setHouseholdResult] = useState<HouseholdResult | null>(null);
  const [otpResult, setOtpResult] = useState<OtpResult | null>(null);
  const [sixDigitResult, setSixDigitResult] = useState<OtpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const clearResults = useCallback(() => {
    setHouseholdResult(null);
    setOtpResult(null);
    setSixDigitResult(null);
    setError(null);
  }, []);

  const handleTabChange = useCallback(
    (tab: ActiveTab) => {
      setActiveTab(tab);
      clearResults();
    },
    [clearResults]
  );

  const startCooldown = useCallback((seconds: number) => {
    if (!seconds) return;
    setCooldownSeconds(seconds);
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleFetchHousehold = useCallback(async () => {
    if (!email.trim()) {
      showAppNotification("Vui lòng nhập email.", "error");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const data = await fetchNetflixHouseholdLink(email.trim());
      if (data.ok) {
        setHouseholdResult({ link: data.link, message: data.message });
        showAppNotification(data.message || "Thành công!", "success");
      } else {
        setError(data.message || data.error || "Không lấy được liên kết hộ gia đình.");
        showAppNotification(data.message || data.error || "Thất bại.", "error");
      }
      if (data.cooldown) startCooldown(data.cooldown);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối server.";
      setError(msg);
      showAppNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [email, clearResults, startCooldown]);

  const handleFetchOtp = useCallback(async () => {
    if (!email.trim()) {
      showAppNotification("Vui lòng nhập email.", "error");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const data = await fetchNetflixOtp(email.trim());
      if (data.ok && data.code) {
        setOtpResult({
          code: data.code,
          message: data.message,
          subject: data.subject,
          from: data.from,
          date: data.date,
        });
        showAppNotification(`Mã OTP: ${data.code}`, "success");
      } else {
        setError(data.message || data.error || "Không lấy được mã OTP.");
        showAppNotification(data.message || data.error || "Thất bại.", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối server.";
      setError(msg);
      showAppNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [email, clearResults]);

  const handleFetchSixDigit = useCallback(async () => {
    if (!email.trim()) {
      showAppNotification("Vui lòng nhập email.", "error");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const data = await fetchNetflixSixDigitCode(email.trim());
      if (data.ok && data.code) {
        setSixDigitResult({
          code: data.code,
          message: data.message,
          subject: data.subject,
          from: data.from,
          date: data.date,
        });
        showAppNotification(`Mã 6 số: ${data.code}`, "success");
      } else {
        setError(data.message || data.error || "Không lấy được mã 6 số.");
        showAppNotification(data.message || data.error || "Thất bại.", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối server.";
      setError(msg);
      showAppNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [email, clearResults]);

  return {
    activeTab,
    email,
    loading,
    cooldownSeconds,
    householdResult,
    otpResult,
    sixDigitResult,
    error,
    setEmail,
    handleTabChange,
    handleFetchHousehold,
    handleFetchOtp,
    handleFetchSixDigit,
  };
}
