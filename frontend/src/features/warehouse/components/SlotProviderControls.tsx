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
  label,
  enabled,
  provider,
  status = false,
  providers = AVAILABLE_OTP_PROVIDERS,
  onToggle,
  onProviderChange,
}: Props) {
  const options = providers.filter(({ value }) => (value === "fix_ades_status") === status);

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
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`w-10 h-[22px] rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 ${
            enabled ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-slate-800 border border-slate-700/60"
          }`}
          title={`${enabled ? "Đang bật" : "Đang tắt"} - Bấm để chuyển`}
        >
          <span
            className={`absolute top-[2px] left-[2px] bg-white w-[18px] h-[18px] rounded-full shadow-md transition-transform duration-200 ease-in-out ${
              enabled ? "translate-x-[18px]" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <select
          aria-label={label}
          value={provider}
          onChange={(event) => onProviderChange(event.target.value)}
          className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
        >
          <option value="">Tự động điều phối</option>
          {provider && !options.some(({ value }) => value === provider) && (
            <option value={provider}>{provider}</option>
          )}
          {options.map(({ value, label: name }) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
