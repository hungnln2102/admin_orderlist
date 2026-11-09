import type { DetectedField } from "@/features/external-api/types";

export function getValueByPathFrontend(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const normalized = String(path).trim().replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = normalized.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = Array.isArray(current) && !/^\d+$/.test(key) ? current[0]?.[key] : current[key];
  }
  return current;
}

export function extractJsonPathsFrontend(value: any, path = "", depth = 0): DetectedField[] {
  if (depth > 5 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path, value: [], type: "array (empty)", sample: "[]", is_potential_otp: false }];
    return value.slice(0, 3).flatMap((item, index) => extractJsonPathsFrontend(item, `${path}[${index}]`, depth + 1));
  }
  if (typeof value !== "object") {
    return [{
      path,
      value,
      type: typeof value,
      sample: String(value).slice(0, 100),
      is_potential_otp: /otp|code|verify/i.test(path),
    }];
  }
  return Object.entries(value).flatMap(([key, entry]) => extractJsonPathsFrontend(entry, path ? `${path}.${key}` : key, depth + 1));
}