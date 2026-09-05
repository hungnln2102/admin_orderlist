import { apiFetch, apiPost } from "@/shared/api";

export interface NetflixConfigItem {
  vivaBaseUrl: string;
  mainAccessCode: string;
  otpAccessCode: string;
}

export interface NetflixConfigResponse {
  ok: boolean;
  data?: NetflixConfigItem;
  message?: string;
  error?: string;
}

export async function fetchNetflixConfig(): Promise<NetflixConfigResponse> {
  return apiFetch<NetflixConfigResponse>("/api/netflix/public/config");
}

export async function updateNetflixConfig(params: {
  vivaBaseUrl?: string;
  mainAccessCode?: string;
  otpAccessCode?: string;
}): Promise<NetflixConfigResponse> {
  return apiPost<NetflixConfigResponse>("/api/netflix/public/config", params);
}

export interface NetflixHouseholdResponse {
  ok: boolean;
  link?: string;
  message?: string;
  cooldown?: number;
  error?: string;
}

export interface NetflixOtpResponse {
  ok: boolean;
  code?: string;
  subject?: string;
  from?: string;
  date?: string;
  message?: string;
  error?: string;
}

export interface NetflixSixDigitResponse {
  ok: boolean;
  code?: string;
  subject?: string;
  from?: string;
  date?: string;
  message?: string;
  error?: string;
}

export async function fetchNetflixHouseholdLink(
  email: string
): Promise<NetflixHouseholdResponse> {
  return apiPost<NetflixHouseholdResponse>("/api/netflix/public/household", {
    email,
  });
}

export async function fetchNetflixOtp(
  email: string
): Promise<NetflixOtpResponse> {
  return apiPost<NetflixOtpResponse>("/api/netflix/public/send-otp", {
    email,
  });
}

export async function fetchNetflixSixDigitCode(
  email: string
): Promise<NetflixSixDigitResponse> {
  return apiPost<NetflixSixDigitResponse>("/api/netflix/public/six-digit-login", {
    email,
  });
}

export interface SubAccessCodeItem {
  subCode: string;
  permissions: string;
  status: "Active" | "Inactive";
  created: string;
  permSignin: boolean;
  permReset: boolean;
  permCountry: boolean;
}

export interface SubAccessCodeListResponse {
  ok: boolean;
  data?: SubAccessCodeItem[];
  message?: string;
  error?: string;
}

export async function fetchSubAccessCodes(): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/public/customer-panel/list", {});
}

export async function generateSubAccessCode(params: {
  subCode?: string;
  permSignin?: boolean;
  permReset?: boolean;
  permCountry?: boolean;
}): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/public/customer-panel/generate", params);
}

export async function toggleSubAccessCode(subCode: string): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/public/customer-panel/toggle", { subCode });
}

export async function deleteSubAccessCode(subCode: string): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/public/customer-panel/delete", { subCode });
}

export async function renameSubAccessCode(oldSub: string, newSub: string): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/public/customer-panel/rename", { oldSub, newSub });
}

export async function updateSubAccessCodePerms(params: {
  subCode: string;
  permSignin: boolean;
  permReset: boolean;
  permCountry: boolean;
}): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/public/customer-panel/update-perms", params);
}
