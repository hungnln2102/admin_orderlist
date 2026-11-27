import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, Globe, Minus, Plus, RotateCcw } from "lucide-react";

const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const OSM_DARK_RASTER_FALLBACK: StyleSpecification = {
  version: 8,
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "osm-bg", type: "background", paint: { "background-color": "#090f1d" } },
    {
      id: "osm-dark-tiles",
      type: "raster",
      source: "osm-raster",
      paint: {
        "raster-opacity": 0.45,
        "raster-saturation": -0.85,
        "raster-brightness-max": 0.45,
        "raster-contrast": 0.25,
      },
    },
  ],
};

const SOURCE_ID = "traffic-points";
const HEATMAP_LAYER_ID = "traffic-heatmap";
const HALO_LAYER_ID = "traffic-halo";
const BUBBLE_LAYER_ID = "traffic-bubbles";

const numberFmt = new Intl.NumberFormat("vi-VN");
const percentFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export interface MapMarkerFeature {
  id: string;
  lng: number;
  lat: number;
  label: string;
  country: string;
  countryCode: string;
  value: number;
  secondaryValue?: number;
  share?: number;
  precision: "city" | "country" | "ip-cluster";
  lastSeen?: string;
}

export interface MapFocusTarget {
  lng: number;
  lat: number;
  zoom: number;
  nonce: number;
}

export interface TrafficMapCanvasProps {
  features: MapMarkerFeature[];
  mode: "ga4" | "ip";
  showHeatmap: boolean;
  selectedId: string | null;
  selectedCountryCode: string | null;
  focusTarget: MapFocusTarget | null;
  onSelectFeature: (feature: MapMarkerFeature) => void;
  onResetView: () => void;
}

function hasWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function buildGeoJson(
  features: MapMarkerFeature[],
  selectedId: string | null,
  selectedCountryCode: string | null
) {
  const maxVal = Math.max(1, ...features.map((f) => f.value));
  return {
    type: "FeatureCollection" as const,
    features: features.map((f) => {
      const weight = Math.max(0.18, Math.sqrt(f.value / maxVal));
      const isSelected =
        (selectedId !== null && f.id === selectedId) ||
        (selectedId === null && selectedCountryCode !== null && f.countryCode === selectedCountryCode);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [f.lng, f.lat],
        },
        properties: {
          id: f.id,
          label: f.label,
          country: f.country,
          countryCode: f.countryCode,
          value: f.value,
          secondaryValue: f.secondaryValue ?? 0,
          share: f.share ?? -1,
          precision: f.precision,
          weight,
          selected: isSelected ? 1 : 0,
        },
      };
    }),
  };
}

/**
 * Bản đồ WebGL MapLibre GL JS nền tối với lớp Heatmap + Bubble phát sáng và tương tác flyTo mượt.
 */
export function TrafficMapCanvas({
  features,
  mode,
  showHeatmap,
  selectedId,
  selectedCountryCode,
  focusTarget,
  onSelectFeature,
  onResetView,
}: TrafficMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const featuresByIdRef = useRef<Map<string, MapMarkerFeature>>(new Map());
  const onSelectRef = useRef(onSelectFeature);
  const showHeatmapRef = useRef(showHeatmap);
  const usedFallbackRef = useRef(false);
  const autoFittedRef = useRef(false);

  const [zoom, setZoom] = useState(4.6);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<MapMarkerFeature | null>(null);

  onSelectRef.current = onSelectFeature;
  showHeatmapRef.current = showHeatmap;

  const geoJson = useMemo(
    () => buildGeoJson(features, selectedId, selectedCountryCode),
    [features, selectedId, selectedCountryCode]
  );
  const geoJsonRef = useRef(geoJson);
  geoJsonRef.current = geoJson;

  useEffect(() => {
    featuresByIdRef.current = new Map(features.map((item) => [item.id, item]));
  }, [features]);

  const activeFeature = useMemo(() => {
    if (hoveredFeature) return hoveredFeature;
    if (selectedId) return features.find((item) => item.id === selectedId) ?? null;
    return null;
  }, [hoveredFeature, selectedId, features]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!hasWebGLSupport()) {
      setMapError("Trình duyệt hiện tại không bật WebGL nên chưa thể hiển thị bản đồ tương tác.");
      return;
    }

    let disposed = false;
    usedFallbackRef.current = false;
    autoFittedRef.current = false;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_DARK_STYLE,
      center: [106.5, 16.0],
      zoom: 4.6,
      minZoom: 1.2,
      maxZoom: 13,
      attributionControl: false,
      renderWorldCopies: false,
    });
    mapRef.current = map;

    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    const mountTrafficLayers = () => {
      if (disposed) return;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geoJsonRef.current,
        });
      }

      if (!map.getLayer(HEATMAP_LAYER_ID)) {
        map.addLayer({
          id: HEATMAP_LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          layout: {
            visibility: showHeatmapRef.current ? "visible" : "none",
          },
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.25, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.85, 6, 1.5, 10, 2.0],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 24, 5, 38, 10, 56],
            "heatmap-opacity": 0.78,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(14, 165, 233, 0)",
              0.2, "rgba(2, 132, 199, 0.42)",
              0.45, "rgba(56, 189, 248, 0.68)",
              0.72, "rgba(52, 211, 153, 0.84)",
              1, "rgba(251, 191, 36, 0.95)",
            ],
          },
        });
      }

      if (!map.getLayer(HALO_LAYER_ID)) {
        map.addLayer({
          id: HALO_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1, ["+", 10, ["*", ["get", "weight"], 16]],
              6, ["+", 16, ["*", ["get", "weight"], 26]],
              10, ["+", 22, ["*", ["get", "weight"], 34]],
            ],
            "circle-color": [
              "case",
              ["==", ["get", "selected"], 1],
              "#34d399",
              "#38bdf8",
            ],
            "circle-opacity": [
              "case",
              ["==", ["get", "selected"], 1],
              0.42,
              0.24,
            ],
            "circle-blur": 0.75,
          },
        });
      }

      if (!map.getLayer(BUBBLE_LAYER_ID)) {
        map.addLayer({
          id: BUBBLE_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1, ["+", 4.5, ["*", ["get", "weight"], 9]],
              6, ["+", 6.5, ["*", ["get", "weight"], 13]],
              10, ["+", 9, ["*", ["get", "weight"], 17]],
            ],
            "circle-color": [
              "case",
              ["==", ["get", "selected"], 1],
              "#34d399",
              [
                "interpolate",
                ["linear"],
                ["get", "weight"],
                0.2, "#0ea5e9",
                0.6, "#38bdf8",
                1, "#67e8f9",
              ],
            ],
            "circle-opacity": 0.92,
            "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 2.5, 1.4],
            "circle-stroke-color": ["case", ["==", ["get", "selected"], 1], "#ffffff", "#e0f2fe"],
          },
        });
      }

      setMapReady(true);
      setMapError(null);
    };

    map.on("style.load", mountTrafficLayers);

    map.on("zoom", () => {
      if (!disposed) setZoom(map.getZoom());
    });

    map.on("mouseenter", BUBBLE_LAYER_ID, (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        setHoveredFeature(featuresByIdRef.current.get(id) ?? null);
      }
    });

    map.on("mousemove", BUBBLE_LAYER_ID, (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        setHoveredFeature(featuresByIdRef.current.get(id) ?? null);
      }
    });

    map.on("mouseleave", BUBBLE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
      setHoveredFeature(null);
    });

    map.on("click", BUBBLE_LAYER_ID, (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        const matched = featuresByIdRef.current.get(id);
        if (matched) onSelectRef.current(matched);
      }
    });

    map.on("error", () => {
      if (disposed || usedFallbackRef.current) return;
      // Nếu style vector OpenFreeMap không tải được, tự động chuyển sang raster OpenStreetMap làm tối
      if (!map.isStyleLoaded()) {
        usedFallbackRef.current = true;
        map.setStyle(OSM_DARK_RASTER_FALLBACK);
      }
    });

    return () => {
      disposed = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cập nhật dữ liệu GeoJSON khi đổi kỳ, đổi chế độ hoặc chọn điểm
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(geoJson);
    }

    // Tự căn khung nhìn ban đầu vào điểm lưu lượng lớn nhất khi dữ liệu tải lần đầu
    if (!autoFittedRef.current && features.length > 0) {
      autoFittedRef.current = true;
      const top = features[0];
      map.jumpTo({
        center: [top.lng, top.lat],
        zoom: top.countryCode === "VN" ? 4.9 : 3.2,
      });
      setZoom(map.getZoom());
    }
  }, [geoJson, mapReady, features]);

  // Bật/tắt lớp Heatmap tức thì
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(HEATMAP_LAYER_ID)) return;
    map.setLayoutProperty(HEATMAP_LAYER_ID, "visibility", showHeatmap ? "visible" : "none");
  }, [showHeatmap, mapReady]);

  // FlyTo mượt khi người dùng bấm chọn quốc gia/thành phố/cụm IP
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusTarget) return;
    map.flyTo({
      center: [focusTarget.lng, focusTarget.lat],
      zoom: focusTarget.zoom,
      duration: 850,
      essential: true,
    });
  }, [focusTarget, mapReady]);

  const handleZoomStep = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: Math.max(1.2, Math.min(13, map.getZoom() + delta)), duration: 280 });
  };

  const handleWorldView = () => {
    const map = mapRef.current;
    if (!map) return;
    onResetView();
    map.flyTo({ center: [20, 18], zoom: 1.5, duration: 800, essential: true });
  };

  const handleFocusTop = () => {
    const map = mapRef.current;
    if (!map) return;
    onResetView();
    const top = features[0];
    map.flyTo({
      center: top ? [top.lng, top.lat] : [106.5, 16.0],
      zoom: top?.countryCode === "VN" ? 4.9 : 3.2,
      duration: 750,
      essential: true,
    });
  };

  if (mapError) {
    return (
      <div className="flex h-[380px] sm:h-[430px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 p-6 text-center text-sm text-slate-400">
        {mapError}
      </div>
    );
  }

  return (
    <div className="relative h-[380px] sm:h-[430px] w-full overflow-hidden rounded-xl border border-slate-800/90 bg-[#090f1d]">
      <div ref={containerRef} className="h-full w-full" aria-label="Bản đồ tương tác phân bổ truy cập" />

      {/* Cụm điều khiển góc trên bên phải */}
      <div
        role="group"
        aria-label="Điều khiển góc nhìn bản đồ"
        className="pointer-events-auto absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/85 p-1 backdrop-blur-md shadow-lg"
      >
        <button
          type="button"
          aria-label="Thu nhỏ"
          onClick={() => handleZoomStep(-1)}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <output
          aria-live="polite"
          className="min-w-[3.2rem] text-center font-mono text-xs font-semibold tabular-nums text-sky-300"
        >
          {zoom.toFixed(1)}×
        </output>
        <button
          type="button"
          aria-label="Phóng to"
          onClick={() => handleZoomStep(1)}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="mx-0.5 h-4 w-px bg-slate-800" />
        <button
          type="button"
          title="Quay về vùng trọng tâm"
          aria-label="Quay về vùng trọng tâm"
          onClick={handleFocusTop}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-sky-300"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Xem toàn cầu"
          aria-label="Xem toàn cầu"
          onClick={handleWorldView}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-sky-300"
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Thẻ thông tin Glassmorphism cho điểm đang hover hoặc đang chọn */}
      {activeFeature && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[260px] rounded-xl border border-sky-500/35 bg-slate-950/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <p className="truncate font-semibold text-white">{activeFeature.label}</p>
          </div>
          {activeFeature.country && activeFeature.country !== activeFeature.label && (
            <p className="mt-0.5 text-[11px] text-slate-400">{activeFeature.country}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
            <span className="font-semibold text-sky-300">
              {numberFmt.format(activeFeature.value)} {mode === "ga4" ? "phiên" : "lượt"}
            </span>
            {activeFeature.secondaryValue !== undefined && activeFeature.secondaryValue > 0 && (
              <span className="text-slate-300">
                {numberFmt.format(activeFeature.secondaryValue)} {mode === "ga4" ? "khách" : "IP"}
              </span>
            )}
            {activeFeature.share !== undefined && activeFeature.share >= 0 && (
              <span className="text-emerald-300">{percentFmt.format(activeFeature.share)}%</span>
            )}
          </div>
          {activeFeature.precision === "country" && (
            <p className="mt-1 text-[10px] text-slate-500">Định vị theo tâm quốc gia</p>
          )}
        </div>
      )}

      {/* Chú giải mật độ (Legend) góc dưới trái */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-300 backdrop-blur-md">
        <Compass className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
        <span className="text-slate-400">Mật độ</span>
        <span className="h-2 w-16 rounded-full bg-gradient-to-r from-sky-700 via-sky-400 via-60% to-amber-400" />
        <span className="font-mono text-[10px] text-slate-400">
          {numberFmt.format(features.length)} điểm
        </span>
      </div>
    </div>
  );
}
