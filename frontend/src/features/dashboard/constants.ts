export const financeSummary: Array<{
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: "amber" | "emerald";
  icon: React.ElementType;
}> = [];

export const budgets = [
  { name: "Nha cua & Tien ich", used: 3_150_000, total: 4_500_000 },
  { name: "Thuc pham & Thiet yeu", used: 2_260_000, total: 4_500_000 },
  { name: "Cham soc ca nhan", used: 1_890_000, total: 4_500_000 },
  { name: "Phu kien", used: 1_520_000, total: 4_500_000 },
];

export const savingGoals = [
  {
    name: "Laptop moi",
    progress: 50,
    saved: 3_375_000,
    target: 6_750_000,
    accent: "#f8c573",
  },
  {
    name: "Du lich",
    progress: 70,
    saved: 4_740_000,
    target: 6_750_000,
    accent: "#9be7c4",
  },
];

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
