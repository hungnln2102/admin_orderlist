import { useWarehouseProviderNames } from "./WarehouseProviderCatalog";
import { AVAILABLE_OTP_PROVIDERS } from "../providerConstants";
import { CustomSelect, ToggleSwitch } from "@/shared/components";

interface Props {
  label: string;
  enabled: boolean;
  provider: string;
  status?: boolean;
  providers?: { value: string; label: string }[];
  onToggle: (enabled: boolean) => void;
  onProviderChange: (key: string) => void;
}

export function SlotProviderControls({
  label,
  enabled,
  provider,
  status = false,
  providers,
  onToggle,
  onProviderChange,
}: Props) {
  const providerNames = useWarehouseProviderNames();
  const options = (providers ?? AVAILABLE_OTP_PROVIDERS.map(({ value }) => ({ value, label: providerNames[value] || value }))).filter(({ value }) => (value === "fix_ades_status") === status);

  return (
    <div
      className={`space-y-2 rounded-xl border p-3 transition-all ${
        enabled
          ? "border-cyan-500/40 bg-slate-900/90 shadow-sm shadow-cyan-500/10"
          : "border-slate-800 bg-slate-950/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-200">
        <span className="font-semibold text-slate-200">{label}</span>
        <ToggleSwitch
          checked={enabled}
          onChange={onToggle}
          variant="cyan"
          size="md"
        />
      </div>

      {enabled && (
        <CustomSelect
          ariaLabel={label}
          value={provider}
          onChange={onProviderChange}
          size="sm"
          accent="cyan"
          className="bg-slate-950"
          options={[
            { value: "", label: "Tự động điều phối" },
            ...(provider && !options.some(({ value }) => value === provider)
              ? [{ value: provider, label: provider }]
              : []),
            ...options.map(({ value, label: name }) => ({
              value,
              label: name,
            })),
          ]}
        />
      )}
    </div>
  );
}
