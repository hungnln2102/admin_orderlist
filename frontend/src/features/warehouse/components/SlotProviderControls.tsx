import { AVAILABLE_OTP_PROVIDERS } from "../providerConstants";

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
  label, enabled, provider, status = false, providers = AVAILABLE_OTP_PROVIDERS, onToggle, onProviderChange,
}: Props) {
  const options = providers.filter(({ value }) => (value === "fix_ades_status") === status);
  return (
    <fieldset className="space-y-2 rounded-xl border border-slate-800 p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-slate-200">
        {label}
        <input type="checkbox" role="switch" checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="size-4 accent-cyan-500" />
      </label>
      {enabled && (
        <select aria-label={label} value={provider} onChange={(event) => onProviderChange(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100">
          <option value="">Tự động điều phối</option>
          {provider && !options.some(({ value }) => value === provider) && <option value={provider}>{provider}</option>}
          {options.map(({ value, label: name }) => <option key={value} value={value}>{name}</option>)}
        </select>
      )}
    </fieldset>
  );
}
