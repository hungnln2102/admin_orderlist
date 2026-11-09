import React, { Suspense, lazy } from "react";

const ExternalApiConfigController = lazy(() =>
  import("@/features/external-api/components/ExternalApiConfigController")
);

export const ExternalApiConfigFeature: React.FC = () => (
  <Suspense fallback={<div className="p-6 text-sm text-slate-400">Đang tải cấu hình API...</div>}>
    <ExternalApiConfigController />
  </Suspense>
);

export default ExternalApiConfigFeature;
