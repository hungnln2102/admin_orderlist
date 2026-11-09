export const apiEndpoints = {
  orders: "/api/orders",
  orderDetail: (id: number | string) => `/api/orders/${id}`,
  orderProcess: (id: number | string) => `/api/orders/${id}/process`,
  orderComplete: (id: number | string) => `/api/orders/${id}/complete`,
  orderRenew: (id: number | string) => `/api/orders/${id}/renew`,
  orderPayCredit: (id: number | string) => `/api/orders/${id}/pay-credit`,
  productApis: "/api/system/product-apis",
  portalSlots: "/api/public/otp-portal-slots",
  portalSlotProbe: "/api/public/otp/probe-slot",
  systemConfigs: "/api/system/configs",
  providers: "/api/system/providers",
} as const;
