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
