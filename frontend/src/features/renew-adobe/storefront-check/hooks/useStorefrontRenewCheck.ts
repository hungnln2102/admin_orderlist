import { useState } from "react";
import {
  activateStorefrontRenewProfile,
  checkStorefrontFixAdesStatus,
  fetchStorefrontRenewStatus,
  resolveStorefrontRenewSystem,
  syncStorefrontFixAdesAccount,
  type FixAdesCheckData,
} from "../api/storefrontRenewApi";
import type {
  AdobeSystemCode,
  RenewCheckResultKind,
  StorefrontRenewStatusCode,
  StorefrontRenewStatusPayload,
} from "../types/storefrontRenew.types";

function getAdesTransferResponse(data: FixAdesCheckData | null | undefined) {
  return data?.transferTeamResponse || data?.adesSource?.transferTeamResponse || null;
}

function hasAdesTransferData(data: FixAdesCheckData | null | undefined) {
  return Boolean(getAdesTransferResponse(data));
}

function isAdesSyncRequired(data: FixAdesCheckData | null | undefined) {
  const existedInSystem = Boolean(data?.existedInSystem || data?.adesSource?.existedInSystem);
  return existedInSystem && !hasAdesTransferData(data);
}

function getAdesSwitchTarget(data: FixAdesCheckData | null | undefined) {
  const transfer = getAdesTransferResponse(data) as
    | { switchTargetTeamName?: unknown }
    | null;
  return String(data?.switchTargetTeamName || transfer?.switchTargetTeamName || "").trim();
}

function isAdesProfileSwitchRequired(data: FixAdesCheckData | null | undefined) {
  const transfer = getAdesTransferResponse(data) as
    | { switchAvailable?: unknown }
    | null;
  const switchAvailable = data?.switchAvailable === true || transfer?.switchAvailable === true;
  return switchAvailable && Boolean(getAdesSwitchTarget(data));
}

function getAdesDisplayProfile(data: FixAdesCheckData | null | undefined) {
  const profile = String(
    getAdesSwitchTarget(data) || data?.teamName || data?.groupName || "",
  ).trim();
  return profile && profile.toLowerCase() !== "n/a" ? profile : null;
}

export function useStorefrontRenewCheck() {
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resultType, setResultType] = useState<RenewCheckResultKind>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [canActivate, setCanActivate] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [currentSystem, setCurrentSystem] = useState<AdobeSystemCode | null>(null);
  const [outsideOrderStatus, setOutsideOrderStatus] = useState<
    Extract<StorefrontRenewStatusCode, "no_order" | "order_expired"> | null
  >(null);
  const [successNeedsProductLink, setSuccessNeedsProductLink] = useState(false);
  const [urlAccess, setUrlAccess] = useState<string | null>(null);

  const resetResult = (options?: { preserveProfileName?: boolean; preserveSystem?: boolean }) => {
    setResultType(null);
    setMessage(null);
    setCanActivate(false);
    setCanSync(false);
    setOutsideOrderStatus(null);
    setSuccessNeedsProductLink(false);
    setUrlAccess(null);
    if (!options?.preserveSystem) {
      setCurrentSystem(null);
    }
    if (!options?.preserveProfileName) {
      setProfileName(null);
    }
  };

  const applyStatusResult = (data: StorefrontRenewStatusPayload) => {
    setCurrentSystem(data.systemNote || "renew_adobe");
    setProfileName(data.profileName);
    setCanActivate(data.canActivate);
    setCanSync(false);

    if (data.status === "active") {
      setResultType("check-success");
      setOutsideOrderStatus(null);
      setMessage(data.message);
      const acc = data.account;
      const pending = Boolean(acc && acc.userHasProduct !== true);
      setSuccessNeedsProductLink(pending);
      const rawUrl = acc?.urlAccess != null ? String(acc.urlAccess).trim() : "";
      setUrlAccess(rawUrl || null);
      return;
    }

    if (data.status === "no_order" || data.status === "order_expired") {
      setResultType("outside-order");
      setOutsideOrderStatus(data.status);
      setSuccessNeedsProductLink(false);
      setUrlAccess(null);
      setMessage(null);
      return;
    }

    setOutsideOrderStatus(null);
    setSuccessNeedsProductLink(false);
    setUrlAccess(null);
    setResultType("expired");
    setMessage(data.message);
  };

  const applyFixAdesResult = (data: FixAdesCheckData) => {
    setCurrentSystem("fix_ades");
    setOutsideOrderStatus(null);
    setSuccessNeedsProductLink(false);
    setUrlAccess(null);
    setCanActivate(false);

    if (isAdesSyncRequired(data)) {
      setProfileName(getAdesDisplayProfile(data));
      setCanSync(true);
      setResultType("needs-sync");
      setMessage(
        "Tài khoản cần đồng bộ dữ liệu Ades trước khi kiểm tra/chuyển profile.",
      );
      return;
    }

    if (isAdesProfileSwitchRequired(data)) {
      const targetProfile = getAdesSwitchTarget(data);
      setProfileName(targetProfile);
      setCanSync(false);
      setResultType("needs-profile-switch");
      setMessage(
        `Tài khoản cần chuyển profile. Hãy đăng nhập lại Creative Cloud và chọn đúng profile ${targetProfile}.`,
      );
      return;
    }

    setProfileName(getAdesDisplayProfile(data));
    setCanSync(false);
    setResultType("check-success");
    setMessage("Tài khoản còn gói và đang hoạt động bình thường.");
  };

  const checkFixAdes = async (targetEmail: string) => {
    const response = await checkStorefrontFixAdesStatus(targetEmail);
    applyFixAdesResult(response.data || {});
  };

  const handleCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail) {
      setMessage("Vui lòng nhập email để kiểm tra.");
      setResultType("info");
      return;
    }

    setLoading(true);
    resetResult();

    try {
      const system = await resolveStorefrontRenewSystem(targetEmail);
      const systemNote = system.ok ? system.system_note || "renew_adobe" : "renew_adobe";
      setCurrentSystem(systemNote);

      if (systemNote === "fix_ades") {
        await checkFixAdes(targetEmail);
        return;
      }

      const data = await fetchStorefrontRenewStatus(targetEmail);
      applyStatusResult({ ...data, systemNote });
    } catch (err) {
      console.error("Storefront renew check error:", err);
      setResultType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Có lỗi kết nối tới máy chủ. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFixAdes = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || syncing) return;

    setSyncing(true);
    resetResult({ preserveProfileName: true, preserveSystem: true });

    try {
      await syncStorefrontFixAdesAccount(targetEmail);
      await checkFixAdes(targetEmail);
    } catch (err) {
      console.error("Storefront Fix Ades sync error:", err);
      setResultType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Có lỗi khi đồng bộ dữ liệu Ades. Vui lòng thử lại sau.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleActivate = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || activating || currentSystem === "fix_ades") return;

    setActivating(true);
    resetResult({ preserveProfileName: true, preserveSystem: true });

    try {
      const data = await activateStorefrontRenewProfile(targetEmail);
      setProfileName(data.profileName);
      setCanActivate(false);
      setCanSync(false);
      setResultType("activate-success");
      setMessage(
        data.message || `Profile đã được kích hoạt thành công cho ${targetEmail}.`,
      );
    } catch (err) {
      console.error("Storefront renew activate error:", err);
      setResultType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Có lỗi kết nối tới dịch vụ kích hoạt. Vui lòng thử lại sau.",
      );
    } finally {
      setActivating(false);
    }
  };

  return {
    email,
    setEmail,
    loading,
    activating,
    syncing,
    resultType,
    message,
    profileName,
    canActivate,
    canSync,
    currentSystem,
    outsideOrderStatus,
    successNeedsProductLink,
    urlAccess,
    handleCheckSubmit,
    handleActivate,
    handleSyncFixAdes,
  };
}