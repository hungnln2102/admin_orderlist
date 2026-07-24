const moneyFormatter = new Intl.NumberFormat("vi-VN");
export const formatMoney = (value: number) =>
  `${moneyFormatter.format(Math.round(value))}\xA0đ`;
