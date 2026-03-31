export interface IpWhitelistItem {
  id: number;
  ipAddress: string;
  description: string | null;
  isActive?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IpWhitelistPayload {
  ipAddress: string;
  description?: string | null;
}

export interface SiteMaintenanceStatus {
  enabled: boolean;
  value: "on" | "off";
  updatedAt: string | null;
}
