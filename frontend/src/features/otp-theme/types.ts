export type SeasonFilter = "all" | "spring" | "summer" | "autumn" | "winter" | "modern";

export interface ThemeItem {
  id: string;
  season: SeasonFilter;
  name: string;
  icon: string;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
}
