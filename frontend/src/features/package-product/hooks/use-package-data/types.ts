import type { Dispatch, SetStateAction } from "react";
import type {
  AugmentedRow,
  PackageField,
  PackageRow,
  PackageTemplate,
  SlotLinkMode,
  StatusFilter,
} from "../../utils/packageHelpers";

export type UsePackageDataResult = {
  data: {
    rows: PackageRow[];
    templates: PackageTemplate[];
    computedRows: AugmentedRow[];
    filteredRows: AugmentedRow[];
    sortedRows: AugmentedRow[];
    scopedRows: AugmentedRow[];
    selectedPackage: string | null;
    selectedTemplate: PackageTemplate | null;
    packageSummaries: Array<{
      name: string;
      total: number;
      low: number;
      out: number;
    }>;
    slotStats: {
      total: number;
      low: number;
      out: number;
    };
    showCapacityColumn: boolean;
    tableColumnCount: number;
    loading: boolean;
    packagesLoading: boolean;
    ordersLoading: boolean;
    ordersReady: boolean;
    defaultTemplateFields: PackageField[];
  };
  filters: {
    searchTerm: string;
    categoryFilter: string;
    statusFilter: StatusFilter;
  };
  actions: {
    setSearchTerm: Dispatch<SetStateAction<string>>;
    setCategoryFilter: Dispatch<SetStateAction<string>>;
    setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
    setRows: Dispatch<SetStateAction<PackageRow[]>>;
    setTemplates: Dispatch<SetStateAction<PackageTemplate[]>>;
    persistSlotLinkPreference: (id: number | string, mode: SlotLinkMode) => void;
    applySlotLinkPrefs: (row: PackageRow) => PackageRow;
  };
};
