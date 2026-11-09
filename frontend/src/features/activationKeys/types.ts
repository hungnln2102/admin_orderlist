export type ActivationKeyStatus = "AVAILABLE" | "ACTIVATED" | "REVOKED" | "EXPIRED";

export interface ActivationKeyItem {
  id: number;
  key_code: string;
  product_name_id: number;
  product_name?: string;
  id_order?: string | null;
  status: ActivationKeyStatus;
  account_slot_id?: number | null;
  assigned_account?: string | null;
  customer_info?: string | null;
  activated_at?: string | null;
  expired_at?: string | null;
  note?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  slot_index?: number | null;
  slot_password?: string | null;
}

export interface ActivationKeyCounts {
  total: number;
  available: number;
  activated: number;
  revoked: number;
  expired: number;
}

export interface CreateActivationKeyPayload {
  prefix?: string;
  product_name_id: number;
  product_id?: number | null;
  id_order?: string;
  customer_info?: string;
  quantity?: number;
  expired_at?: string;
  note?: string;
}

export interface CatalogProductOption {
  id: number;
  name: string;
}

