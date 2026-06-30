import { PlusIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";

type IpWhitelistPageHeaderProps = {
  onCreate: () => void;
};

export function IpWhitelistPageHeader({ onCreate }: IpWhitelistPageHeaderProps) {
  return (
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
            <ShieldCheckIcon className="h-4 w-4" />
            IP whitelist
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Quản lý IP whitelist
            </h1>
            <p className="mt-1 text-sm font-medium tracking-wide text-white/50">
              Thêm, chỉnh sửa và gỡ các địa chỉ IP được phép truy cập hệ thống.
            </p>
          </div>
        </div>

        <GradientButton
          icon={PlusIcon}
          onClick={onCreate}
          className="shrink-0"
        >
          Thêm IP whitelist
        </GradientButton>
      </div>
  );
}
