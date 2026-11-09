export interface ProductApiMappingItem {
  mapping_id: number;
  product_id: number;
  provider_key: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  note: string;
  mapped_at: string;
  service_key: string;
  service_name: string;
  category: string;
  base_url: string;
  description: string;
  api_active: boolean;
}

export interface ProductItem {
  id: number;
  package_name: string;
  is_active: boolean;
  variants_count: number;
  active_variants_count: number;
  variants: Array<{ id: number; product_id: number; variant_name: string; display_name: string; base_price: number; is_active: boolean }>;
  apis: ProductApiMappingItem[];
}

export interface FieldMappingItem { key: string; label: string; path: string; is_primary?: boolean; color?: "cyan" | "emerald" | "amber" | "slate" | "purple"; }

export interface ExternalApiConfig {
  id: number;
  service_key: string;
  service_name: string;
  category: "OTP" | "PAYMENT" | "NOTIFY" | "SYSTEM";
  description: string;
  base_url: string;
  execution_mode?: string;
  endpoints: Record<string, string>;
  auth_config: Record<string, any>;
  field_mapping: FieldMappingItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PingResult { status: number; statusText: string; responseTimeMs: number | null; contentType: string | null; reachable: boolean; }
export interface DetectedField { path: string; value: any; sample: string; type: string; is_potential_otp: boolean; }
export interface AvailableFieldPreset { key: string; label: string; path: string; is_primary?: boolean; description: string; icon?: string; sampleValue?: string; }

export interface PortalSlotItem {
  slot_key: string;
  name: string;
  category: "adobe" | "netflix" | "gpt" | "2fa" | string;
  assigned_services?: string[];
  primary_service_key?: string;
  fallback_service_key?: string | null;
  cooldown_seconds?: number;
  btn_text?: string;
  input_placeholder?: string;
  enabled: boolean;
}
