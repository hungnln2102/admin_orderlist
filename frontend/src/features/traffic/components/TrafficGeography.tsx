import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Globe2, MapPin, Radio, ShieldAlert } from "lucide-react";
import { GlassCard, ToggleSwitch } from "@/shared/components";
import type { IpMapResponse, TrafficApiResponse } from "../types";
import { isUnknownGeoName, resolveCountryViewport, resolveLocationCoordinates } from "../geoCoordinates";
import type { MapFocusTarget, MapMarkerFeature } from "./TrafficMapCanvas";

const TrafficMapCanvas = lazy(() =>
  import("./TrafficMapCanvas").then((mod) => ({ default: mod.TrafficMapCanvas }))
);

type MapMode = "ga4" | "ip";

const numberFmt = new Intl.NumberFormat("vi-VN");
const percentFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function formatPlaceName(name?: string | null): string {
  return isUnknownGeoName(name) ? "Chưa xác định" : name!;
}

export function TrafficGeography({ data, days }: { data: TrafficApiResponse; days: number }) {
  const [mode, setMode] = useState<MapMode>("ga4");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);

  const [ipMap, setIpMap] = useState<IpMapResponse | null>(null);
  const [ipStatus, setIpStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const ipWindowDays = Math.min(days, 30);

  // Chỉ tải API cụm tọa độ IP khi người dùng chuyển sang chế độ Bản đồ IP
  useEffect(() => {
    if (mode !== "ip") return;
    const controller = new AbortController();
    setIpStatus("loading");
    fetch(`/api/traffic/ip-map?days=${ipWindowDays}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = await response.json();
        if (!controller.signal.aborted) {
          setIpMap(body.data);
          setIpStatus("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setIpStatus("error");
      });
    return () => controller.abort();
  }, [mode, ipWindowDays]);

  const countries = data.countryData ?? [];
  const locations = data.locationData ?? [];
  const byCode = useMemo(() => new Map(countries.map((row) => [row.countryCode, row])), [countries]);
  const selectedCountry = selectedCountryCode ? byCode.get(selectedCountryCode) : undefined;
  const countryCities = useMemo(
    () => (selectedCountry ? locations.filter((row) => row.countryCode === selectedCountry.countryCode) : []),
    [locations, selectedCountry]
  );

  // Chuyển đổi dữ liệu GA4 thành các điểm tọa độ (ưu tiên thành phố; quốc gia không có city rõ sẽ dùng tâm quốc gia)
  const ga4Features = useMemo<MapMarkerFeature[]>(() => {
    const merged = new Map<string, MapMarkerFeature>();
    const countriesWithCityPoint = new Set<string>();

    for (const row of locations) {
      if (isUnknownGeoName(row.city)) continue;
      const resolved = resolveLocationCoordinates(row.city, row.countryCode);
      if (!resolved) continue;
      if (resolved.precision === "city") {
        countriesWithCityPoint.add(row.countryCode);
      }

      const id =
        resolved.precision === "city"
          ? `ga4-city-${row.countryCode}-${row.city}`
          : `ga4-country-${row.countryCode}`;
      const existing = merged.get(id);
      if (existing) {
        existing.value += row.sessions;
        existing.secondaryValue = (existing.secondaryValue ?? 0) + row.users;
        existing.share = Number(((existing.share ?? 0) + row.share).toFixed(1));
      } else {
        merged.set(id, {
          id,
          lng: resolved.lng,
          lat: resolved.lat,
          label: resolved.precision === "city" ? row.city : formatPlaceName(row.country),
          country: formatPlaceName(row.country),
          countryCode: row.countryCode,
          value: row.sessions,
          secondaryValue: row.users,
          share: row.share,
          precision: resolved.precision,
        });
      }
    }

    // Bổ sung điểm tâm quốc gia cho các quốc gia có phiên nhưng chưa có thành phố định vị được
    for (const row of countries) {
      if (countriesWithCityPoint.has(row.countryCode)) continue;
      const id = `ga4-country-${row.countryCode}`;
      if (merged.has(id)) continue;
      const vp = resolveCountryViewport(row.countryCode);
      if (!vp) continue;
      merged.set(id, {
        id,
        lng: vp.lng,
        lat: vp.lat,
        label: formatPlaceName(row.country),
        country: formatPlaceName(row.country),
        countryCode: row.countryCode,
        value: row.sessions,
        share: row.share,
        precision: "country",
      });
    }

    return [...merged.values()].sort((a, b) => b.value - a.value);
  }, [locations, countries]);

  const ipFeatures = useMemo<MapMarkerFeature[]>(() => {
    const points = ipMap?.points ?? [];
    const totalHits = Math.max(1, ipMap?.totalHits ?? 0);
    return points.map((pt, idx) => ({
      id: `ip-cluster-${pt.lat}-${pt.lng}-${idx}`,
      lng: pt.lng,
      lat: pt.lat,
      label: formatPlaceName(pt.city ?? pt.country),
      country: formatPlaceName(pt.country),
      countryCode: pt.countryCode ?? "",
      value: pt.hits,
      secondaryValue: pt.ipCount,
      share: Number(((pt.hits / totalHits) * 100).toFixed(1)),
      precision: "ip-cluster",
      lastSeen: pt.lastSeen,
    }));
  }, [ipMap]);

  const activeFeatures = mode === "ga4" ? ga4Features : ipFeatures;

  const triggerFlyTo = (lng: number, lat: number, zoom: number) => {
    setFocusTarget({ lng, lat, zoom, nonce: Date.now() });
  };

  const handleSelectCountry = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setSelectedFeatureId(null);

    const countryViewport = resolveCountryViewport(countryCode);
    if (countryViewport) {
      triggerFlyTo(countryViewport.lng, countryViewport.lat, countryViewport.zoom);
      return;
    }

    const fallbackFeature = ga4Features.find((f) => f.countryCode === countryCode);
    if (fallbackFeature) {
      triggerFlyTo(fallbackFeature.lng, fallbackFeature.lat, 5.2);
    }
  };

  const handleSelectCity = (city: string, countryCode: string) => {
    const exactId = `ga4-city-${countryCode}-${city}`;
    const matched = ga4Features.find((f) => f.id === exactId);
    if (matched) {
      setSelectedFeatureId(matched.id);
      triggerFlyTo(matched.lng, matched.lat, 8.2);
      return;
    }

    const resolved = resolveLocationCoordinates(city, countryCode);
    if (resolved) {
      setSelectedFeatureId(`ga4-country-${countryCode}`);
      triggerFlyTo(resolved.lng, resolved.lat, resolved.precision === "city" ? 8.2 : 5.0);
    }
  };

  const handleSelectMapFeature = (feature: MapMarkerFeature) => {
    setSelectedFeatureId(feature.id);
    if (mode === "ga4" && feature.countryCode) {
      setSelectedCountryCode(feature.countryCode);
    }
    triggerFlyTo(feature.lng, feature.lat, feature.precision === "country" ? 5.2 : 8.0);
  };

  const handleResetSelection = () => {
    setSelectedCountryCode(null);
    setSelectedFeatureId(null);
  };

  const handleSwitchMode = (nextMode: MapMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSelectedFeatureId(null);
    if (nextMode === "ip") setSelectedCountryCode(null);
  };

  const maxCountrySessions = Math.max(1, ...countries.map((row) => row.sessions));
  const maxCitySessions = Math.max(1, ...countryCities.map((row) => row.sessions));
  const maxClusterHits = Math.max(1, ...ipFeatures.map((row) => row.value));

  return (
    <GlassCard className="p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Khách truy cập đến từ đâu?</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {mode === "ga4"
              ? "Phân bổ theo số phiên Google Analytics trong kỳ đã chọn"
              : `Cụm tọa độ ước lượng từ nhật ký IP (MaxMind GeoIP) trong ${ipWindowDays} ngày gần nhất`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Nguồn dữ liệu bản đồ"
            className="inline-flex rounded-xl border border-slate-800 bg-slate-950/80 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ga4"}
              onClick={() => handleSwitchMode("ga4")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "ga4"
                  ? "bg-sky-500/20 text-sky-300 shadow-sm ring-1 ring-sky-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Phiên GA4</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ip"}
              onClick={() => handleSwitchMode("ip")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "ip"
                  ? "bg-emerald-500/20 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bản đồ IP</span>
            </button>
          </div>

          <ToggleSwitch
            checked={showHeatmap}
            onChange={setShowHeatmap}
            label="Heatmap"
            size="sm"
            variant="cyan"
          />
        </div>
      </div>

      {mode === "ga4" && countries.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">Chưa có dữ liệu khu vực trong kỳ.</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2.1fr)_minmax(18rem,1fr)]">
          {/* Cột trái: Bản đồ MapLibre GL JS */}
          <div className="min-w-0">
            <Suspense
              fallback={
                <div className="flex h-[380px] sm:h-[430px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 text-sm text-slate-400">
                  Đang khởi tạo bản đồ tương tác…
                </div>
              }
            >
              <TrafficMapCanvas
                features={activeFeatures}
                mode={mode}
                showHeatmap={showHeatmap}
                selectedId={selectedFeatureId}
                selectedCountryCode={selectedCountryCode}
                focusTarget={focusTarget}
                onSelectFeature={handleSelectMapFeature}
                onResetView={handleResetSelection}
              />
            </Suspense>
          </div>

          {/* Cột phải: Bảng điều hướng quốc gia / thành phố hoặc cụm IP */}
          <div className="flex min-w-0 flex-col rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
            {mode === "ga4" ? (
              selectedCountry ? (
                <>
                  <button
                    type="button"
                    className="mb-3 inline-flex items-center gap-1.5 self-start text-xs font-medium text-sky-300 transition-colors hover:text-sky-200 hover:underline"
                    onClick={handleResetSelection}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tất cả quốc gia</span>
                  </button>
                  <div className="mb-3 border-b border-slate-800/80 pb-2.5">
                    <h3 className="text-base font-semibold text-white">
                      {formatPlaceName(selectedCountry.country)}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      <span className="font-mono font-semibold text-sky-300">
                        {numberFmt.format(selectedCountry.sessions)}
                      </span>{" "}
                      phiên · {percentFmt.format(selectedCountry.share)}%
                    </p>
                  </div>
                  <ul className="max-h-[300px] flex-1 space-y-1.5 overflow-auto pr-1 text-sm">
                    {countryCities.map((row) => {
                      const unknown = isUnknownGeoName(row.city);
                      const cityId = `ga4-city-${row.countryCode}-${row.city}`;
                      const isActive = selectedFeatureId === cityId;
                      const widthPct = Math.max(4, Math.round((row.sessions / maxCitySessions) * 100));
                      return (
                        <li key={`${row.countryCode}-${row.city}`}>
                          <button
                            type="button"
                            disabled={unknown}
                            onClick={() => handleSelectCity(row.city, row.countryCode)}
                            className={`group w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-sky-500/15 ring-1 ring-sky-400/40"
                                : unknown
                                ? "cursor-default opacity-75"
                                : "hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-200 group-hover:text-white">
                                <MapPin
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    isActive
                                      ? "text-emerald-400"
                                      : unknown
                                      ? "text-slate-600"
                                      : "text-sky-400/80"
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{formatPlaceName(row.city)}</span>
                              </span>
                              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-sky-300">
                                {numberFmt.format(row.sessions)}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800/90">
                              <div
                                className={`h-full rounded-full ${
                                  isActive
                                    ? "bg-gradient-to-r from-emerald-400 to-cyan-300"
                                    : "bg-gradient-to-r from-sky-600 to-cyan-400"
                                }`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                    {countryCities.length === 0 && (
                      <li className="py-2 text-xs text-slate-400">Chưa có dữ liệu tỉnh/thành.</li>
                    )}
                  </ul>
                </>
              ) : (
                <>
                  <div className="mb-2.5 flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Quốc gia / Vùng lãnh thổ</span>
                    <span className="font-mono">{countries.length} khu vực</span>
                  </div>
                  <ul className="max-h-[345px] flex-1 space-y-1.5 overflow-auto pr-1">
                    {countries.map((row) => {
                      const widthPct = Math.max(4, Math.round((row.sessions / maxCountrySessions) * 100));
                      return (
                        <li key={row.countryCode}>
                          <button
                            type="button"
                            onClick={() => handleSelectCountry(row.countryCode)}
                            className="group w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-800/60"
                          >
                            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2.5 text-sm">
                              <span className="truncate font-medium text-slate-200 group-hover:text-sky-300">
                                {formatPlaceName(row.country)}
                              </span>
                              <span className="font-mono text-xs tabular-nums text-slate-200">
                                {numberFmt.format(row.sessions)}
                              </span>
                              <span className="w-12 text-right font-mono text-xs tabular-nums text-sky-300">
                                {percentFmt.format(row.share)}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800/90">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )
            ) : (
              /* Cột phải cho chế độ Bản đồ IP (MaxMind GeoIP) */
              <div className="flex flex-1 flex-col">
                <div className="mb-2.5 flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Cụm tọa độ IP</span>
                  {ipStatus === "ready" && ipMap?.available && (
                    <span className="font-mono text-emerald-300">
                      {numberFmt.format(ipMap.mappedIps ?? 0)}/{numberFmt.format(ipMap.totalIps ?? 0)} IP
                    </span>
                  )}
                </div>

                {ipStatus === "loading" && (
                  <p role="status" className="py-6 text-center text-xs text-slate-400">
                    Đang tổng hợp tọa độ IP…
                  </p>
                )}

                {ipStatus === "error" && (
                  <p role="alert" className="py-4 text-xs text-amber-300">
                    Không thể tải dữ liệu tọa độ IP. Vui lòng thử chuyển lại tab sau ít giây.
                  </p>
                )}

                {ipStatus === "ready" && !ipMap?.available && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-400">
                    <ShieldAlert className="h-6 w-6 text-slate-500" aria-hidden="true" />
                    <p>Chưa kết nối nhật ký truy cập IP (`TRAFFIC_ACCESS_LOG_DIR`).</p>
                    <p className="text-[11px] text-slate-500">
                      Bạn vẫn có thể xem bản đồ tương tác ở chế độ Phiên GA4.
                    </p>
                  </div>
                )}

                {ipStatus === "ready" && ipMap?.available && !ipMap.geoAvailable && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-400">
                    <ShieldAlert className="h-6 w-6 text-amber-400/80" aria-hidden="true" />
                    <p>Đã có {numberFmt.format(ipMap.totalIps ?? 0)} IP nhưng chưa cấu hình cơ sở dữ liệu MaxMind GeoIP.</p>
                  </div>
                )}

                {ipStatus === "ready" && ipMap?.available && ipMap.geoAvailable && (
                  <ul className="max-h-[345px] flex-1 space-y-1.5 overflow-auto pr-1 text-sm">
                    {ipFeatures.map((pt) => {
                      const isActive = selectedFeatureId === pt.id;
                      const widthPct = Math.max(4, Math.round((pt.value / maxClusterHits) * 100));
                      return (
                        <li key={pt.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectMapFeature(pt)}
                            className={`group w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-emerald-500/15 ring-1 ring-emerald-400/40"
                                : "hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium text-slate-200 group-hover:text-white">
                                {pt.label}
                                {pt.country && pt.country !== pt.label ? (
                                  <span className="ml-1 text-xs font-normal text-slate-400">
                                    · {pt.country}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-emerald-300">
                                {numberFmt.format(pt.value)} lượt
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
                              <span>{numberFmt.format(pt.secondaryValue ?? 0)} IP ước lượng</span>
                              <span className="font-mono">{percentFmt.format(pt.share ?? 0)}%</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800/90">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                    {ipFeatures.length === 0 && (
                      <li className="py-4 text-center text-xs text-slate-400">
                        Chưa có IP nào định vị được tọa độ trong kỳ.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
