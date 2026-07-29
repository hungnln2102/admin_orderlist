import { apiPost } from "@/lib/api";

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
  return apiPost<SubAccessCodeListResponse>("/api/netflix/customer-panel/list", {});
}

export async function generateSubAccessCode(params: {
  subCode?: string;
  permSignin?: boolean;
  permReset?: boolean;
  permCountry?: boolean;
}): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/customer-panel/generate", params);
}

export async function toggleSubAccessCode(subCode: string): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/customer-panel/toggle", { subCode });
}

export async function deleteSubAccessCode(subCode: string): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/customer-panel/delete", { subCode });
}

export async function renameSubAccessCode(oldSub: string, newSub: string): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/customer-panel/rename", { oldSub, newSub });
}

export async function updateSubAccessCodePerms(params: {
  subCode: string;
  permSignin: boolean;
  permReset: boolean;
  permCountry: boolean;
}): Promise<SubAccessCodeListResponse> {
  return apiPost<SubAccessCodeListResponse>("/api/netflix/customer-panel/update-perms", params);
}
