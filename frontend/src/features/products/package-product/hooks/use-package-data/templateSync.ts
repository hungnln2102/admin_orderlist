import type { PackageField, PackageRow, PackageTemplate } from "../../utils/packageHelpers";
import { syncActivationFieldInTemplateFields } from "../../utils/packageHelpers";

export const syncTemplatesFromRows = (
  prev: PackageTemplate[],
  packageNames: string[],
  rows: PackageRow[],
  defaultTemplateFields: PackageField[]
) => {
  const map = new Map(prev.map((tpl) => [tpl.name, tpl]));
  let changed = false;

  packageNames.forEach((name) => {
    if (!name) return;
    const firstRow = rows.find((row) => row.package === name);
    const productId = firstRow?.productId ?? null;
    const serverActivation = firstRow?.productRequiresActivation === true;
    const existing = map.get(name);

    if (!existing) {
      map.set(name, {
        name,
        productId,
        fields: syncActivationFieldInTemplateFields(defaultTemplateFields, serverActivation),
        isCustom: false,
      });
      changed = true;
      return;
    }

    const baseFields =
      existing.fields && existing.fields.length > 0 ? existing.fields : defaultTemplateFields;
    const mergedFields = syncActivationFieldInTemplateFields(baseFields, serverActivation);
    const prevFields =
      existing.fields && existing.fields.length > 0 ? existing.fields : defaultTemplateFields;
    const fieldsEqual =
      mergedFields.length === prevFields.length &&
      mergedFields.every((field, index) => field === prevFields[index]);

    if (!fieldsEqual) {
      map.set(name, {
        ...existing,
        fields: mergedFields,
        productId: existing.productId ?? productId,
      });
      changed = true;
      return;
    }

    if (existing.isCustom !== true && existing.productId == null && productId != null) {
      map.set(name, { ...existing, productId });
      changed = true;
    }
  });

  if (!changed) return prev;
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};
