import { apiClient } from "@/shared/api/apiClient";
import { apiEndpoints } from "@/shared/api/apiEndpoints";

export const externalApiClient = {
  request: apiClient,
  getProductApis: () => apiClient(apiEndpoints.productApis),
  assignProductApi: (body: Record<string, unknown>) => apiClient(apiEndpoints.productApis, { method: "POST", body }),
  setDefaultProductApi: (mappingId: number) => apiClient(`${apiEndpoints.productApis}/${mappingId}/default`, { method: "PUT" }),
  removeProductApi: (mappingId: number) => apiClient(`${apiEndpoints.productApis}/${mappingId}`, { method: "DELETE" }),
  getPortalSlots: () => apiClient(apiEndpoints.portalSlots),
  getSystemConfigs: () => apiClient(apiEndpoints.systemConfigs),
  savePortalSlots: (body: Record<string, unknown>) => apiClient(`${apiEndpoints.systemConfigs}/OTP_PORTAL_SLOTS_CONFIG`, { method: "PUT", body }),
  probeSlot: (body: Record<string, unknown>) => apiClient(apiEndpoints.portalSlotProbe, { method: "POST", body }),
};
