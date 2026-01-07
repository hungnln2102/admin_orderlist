import { useCallback, useMemo, useState } from "react";

export type GoldPriceRow = {
  time: string;
  group: string;
  displayName: string;
  ask: number;
  bid: number;
  trendAsk?: string;
  trendBid?: string;
};

export const useGoldPrices = () => {
  const [goldPrices, setGoldPrices] = useState<GoldPriceRow[]>([]);
  const [goldLoading, setGoldLoading] = useState(false);
  const [goldError, setGoldError] = useState<string | null>(null);

  const fetchGoldPrices = useCallback(async () => {
    setGoldLoading(true);
    setGoldError(null);
    try {
      const url = "https://api.hanagold.vn/app/setting/get-chart-gold";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || json.signal !== 1 || !Array.isArray(json.data)) {
        throw new Error("Dữ liệu không hợp lệ");
      }
      const flattened: GoldPriceRow[] = [];
      json.data.forEach((entry: any) => {
        const timeLabel = entry?.time ?? "";
        const groups: any[] = Array.isArray(entry?.data) ? entry.data : [];
        groups.forEach((group) => {
          const mainPrices: any[] = Array.isArray(group?.main_gold_price)
            ? group.main_gold_price
            : [];
          mainPrices.forEach((price) => {
            const askRaw = Number(price?.ask ?? NaN);
            const bidRaw = Number(price?.bid ?? NaN);
            if (!Number.isFinite(askRaw) || !Number.isFinite(bidRaw)) return;
            const ask = askRaw * 1_000_000;
            const bid = bidRaw * 1_000_000;
            flattened.push({
              time: timeLabel,
              group: group?.name ?? "",
              displayName: price?.display_name ?? price?.name ?? "",
              ask,
              bid,
              trendAsk: price?.trend?.ask,
              trendBid: price?.trend?.bid,
            });
          });
        });
      });
      setGoldPrices(flattened);
    } catch (err) {
      console.error("Lỗi khi lấy giá vàng HanaGold:", err);
      setGoldError(err instanceof Error ? err.message : "Không thể lấy dữ liệu giá vàng.");
    } finally {
      setGoldLoading(false);
    }
  }, []);

  const selectedGoldRows = useMemo(() => {
    if (!goldPrices.length) return [];
    const kimRows = goldPrices.filter((item) => {
      const name = `${item.displayName || ""}`.toLowerCase();
      const group = `${item.group || ""}`.toLowerCase();
      return name.includes("kim kh") || name.includes("kht") || group.includes("kim kh");
    });
    if (!kimRows.length) return [];
    const latestTime = kimRows[kimRows.length - 1]?.time || "";
    return kimRows.filter((item) => item.time === latestTime);
  }, [goldPrices]);

  return {
    goldPrices,
    goldLoading,
    goldError,
    fetchGoldPrices,
    selectedGoldRows,
  };
};

