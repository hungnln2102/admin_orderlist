export interface ActiveKeyItem {
  id: string;
  /** Mã đơn hàng (id_order) */
  account: string;
  product: string;
  systemName?: string;
  /** Key hiển thị dạng che (•••• + hint); full key chỉ trả khi tạo (plainKey). */
  key: string;
  expiry: string;
  status?: string;
}

export interface CreateKeyFormValues {
  order_code: string;
  plain_key: string;
  system_code: string;
}

export type CreateKeySuccessPayload = {
  item: ActiveKeyItem;
  plainKey: string;
};
