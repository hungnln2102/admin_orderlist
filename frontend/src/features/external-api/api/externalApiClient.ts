import { apiClient } from "@/shared/api/apiClient";
import { apiEndpoints } from "@/shared/api/apiEndpoints";

export type PortalSlotChange =
  | { action: "addProvider"; serviceKey: string }
  | { action: "setEnabled"; enabled: boolean };

export const externalApiClient = {
  request: apiClient,
  getProviders: () => apiClient(apiEndpoints.providers),
  updateProviderDisplayName: (key: string, displayName: string | null) =>
    apiClient(`${apiEndpoints.providers}/${encodeURIComponent(key)}/display-name`, {
      method: "PATCH",
      body: { displayName },
    }),
  getProductApis: () => apiClient(apiEndpoints.productApis),
  assignProductApi: (body: Record<string, unknown>) => apiClient(apiEndpoints.productApis, { method: "POST", body }),
  setDefaultProductApi: (mappingId: number) => apiClient(`${apiEndpoints.productApis}/${mappingId}/default`, { method: "PUT" }),
  removeProductApi: (mappingId: number) => apiClient(`${apiEndpoints.productApis}/${mappingId}`, { method: "DELETE" }),
  getPortalSlots: () => apiClient(apiEndpoints.portalSlots),
  removePortalSlotProvider: (slotKey: string, serviceKey: string) => apiClient(
    `${apiEndpoints.systemConfigs}/otp-portal-slots/${encodeURIComponent(slotKey)}/providers/${encodeURIComponent(serviceKey)}`,
    { method: "DELETE" },
  ),
  getSystemConfigs: () => apiClient(apiEndpoints.systemConfigs),
  updatePortalSlot: (slotKey: string, body: PortalSlotChange) => apiClient(
    `${apiEndpoints.systemConfigs}/otp-portal-slots/${encodeURIComponent(slotKey)}`,
    { method: "PATCH", body },
  ),
  probeSlot: (body: Record<string, unknown>) => apiClient(apiEndpoints.portalSlotProbe, { method: "POST", body }),
  getRoutingRules: () => apiClient(`${apiEndpoints.productApis}/rules`),
  createRoutingRule: (body: Record<string, unknown>) => apiClient(`${apiEndpoints.productApis}/rules/variants`, { method: "POST", body }),
  updateRoutingRule: (id: number, body: Record<string, unknown>) => apiClient(`${apiEndpoints.productApis}/rules/${id}`, { method: "PUT", body }),
  deleteRoutingRule: (id: number) => apiClient(`${apiEndpoints.productApis}/rules/${id}`, { method: "DELETE" }),
  deleteSupplierVariant: (supplierCostId: number) => apiClient(`${apiEndpoints.productApis}/supplier-variants/${supplierCostId}`, { method: "DELETE" }),
};
