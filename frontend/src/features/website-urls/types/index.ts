export type PortalRouteKey =
  | "adobe_account"
  | "adobe_otp"
  | "netflix_household"
  | "netflix_tv"
  | "netflix_otp"
  | "gpt_account"
  | "gpt_otp"
  | "two_factor";

export type PortalRouteGroup = "adobe" | "netflix" | "gpt" | "two_factor";

export interface PortalRouteItem {
  key: PortalRouteKey;
  slug: string;
  tab: PortalRouteGroup;
  subTab: number;
  group: PortalRouteGroup;
  label: string;
  description: string;
}

export interface PortalUrlsConfig {
  basePath: string;
  defaultRouteKey: PortalRouteKey;
  routes: Record<PortalRouteKey, PortalRouteItem>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PortalUrlsResponse {
  success: boolean;
  config: PortalUrlsConfig;
  defaults?: PortalUrlsConfig;
}
