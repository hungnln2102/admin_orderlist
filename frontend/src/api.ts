export const API_ENDPOINTS = {
  ORDERS: "/api/orders",
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,
  ORDER_RENEW: (orderCode: string) => `/api/orders/${encodeURIComponent(orderCode)}/renew`,
  ORDER_EXPRIED: "/api/orders/expired",
  ORDERS_EXPIRED: "/api/orders/expired",
  ORDERS_CANCELED: "/api/orders/canceled",
  ORDER_CANCELED_REFUND: (id: number) => `/api/orders/canceled/${id}/refund`,

  SUPPLIES: "/api/supplies",
  PRODUCTS_BY_SUPPLY: (supplyId: number) => `/api/supplies/${supplyId}/products`,

  CALCULATE_PRICE: "/api/orders/calculate-price",

  PRODUCTS_ALL: "/api/products",
  PRODUCT_DESCRIPTIONS: "/api/product-descriptions",
  PRODUCT_PRICES: "/api/product-prices",
  PRODUCT_PRICE_DETAIL: (productId: number) => `/api/product-prices/${productId}`,

  SUPPLIES_BY_PRODUCT: (productName: string) =>
    `/api/products/supplies-by-name/${encodeURIComponent(productName)}`,
  SUPPLY_PRICES_BY_PRODUCT_NAME: (productName: string) =>
    `/api/products/all-prices-by-name/${encodeURIComponent(productName)}`,

  UPDATE_SUPPLY_PRICE: (productId: number, sourceId: number) =>
    `/api/products/${productId}/suppliers/${sourceId}/price`,
  CREATE_SUPPLY_PRICE: (productId: number) => `/api/product-prices/${productId}/suppliers`,
  DELETE_SUPPLY_PRICE: (productId: number, sourceId: number) =>
    `/api/products/${productId}/suppliers/${sourceId}`,

  PAYMENT_RECEIPTS: "/api/payment-receipts",
  PURCHASE_ORDERS: "/api/purchase-orders",
  REFUNDS: "/api/refunds",
  BANK_LIST: "/api/banks",
  WAREHOUSE: "/api/warehouse",
};
