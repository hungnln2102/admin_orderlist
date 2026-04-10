import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiFetch } from "../api/client";

export interface PricingTier {
  id: number;
  key: string;
  prefix: string;
  label: string;
  pricing_rule: "markup" | "discount" | "fixed_zero" | "cost";
  base_tier_key: string | null;
  sort_order: number;
  is_active: boolean;
}

const STALE_MS = 10 * 60_000;

let _sharedCache: PricingTier[] | null = null;
let _sharedTs = 0;

export function usePricingTiers() {
  const [tiers, setTiers] = useState<PricingTier[]>(_sharedCache ?? []);
  const [loading, setLoading] = useState(!_sharedCache);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchTiers = useCallback(async (force = false) => {
    if (!force && _sharedCache && Date.now() - _sharedTs < STALE_MS) {
      setTiers(_sharedCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/pricing-tiers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PricingTier[] = await res.json();
      _sharedCache = data;
      _sharedTs = Date.now();
      if (mounted.current) {
        setTiers(data);
        setError(null);
      }
    } catch (err: any) {
      if (mounted.current) setError(err.message ?? "Fetch failed");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchTiers();
    return () => { mounted.current = false; };
  }, [fetchTiers]);

  const prefixMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tiers) {
      if (t.is_active) map[t.key] = t.prefix;
    }
    return map;
  }, [tiers]);

  const orderCodeOptions = useMemo(
    () =>
      tiers
        .filter((t) => t.is_active)
        .map((t) => ({ value: t.prefix, label: t.label })),
    [tiers]
  );

  return { tiers, loading, error, refetch: fetchTiers, prefixMap, orderCodeOptions };
}
