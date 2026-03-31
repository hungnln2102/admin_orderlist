const {
  IP_WHITELISTS_DEF,
  listIpWhitelists,
  findIpWhitelistById,
  findIpWhitelistByAddress,
  createIpWhitelist,
  updateIpWhitelist,
  deleteIpWhitelist,
} = require("../repositories/ipWhitelistRepository");
const {
  createHttpError,
  validateCreatePayload,
  validateUpdatePayload,
  validateDeletePayload,
} = require("../validators/ipWhitelistValidator");

const ensureDefinition = () => {
  if (!IP_WHITELISTS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng ip_whitelist trong ADMIN_SCHEMA."
    );
  }
};

const listIpWhitelistItems = async () => {
  ensureDefinition();
  return listIpWhitelists();
};

const createIpWhitelistItem = async (payload) => {
  ensureDefinition();
  const sanitizedPayload = validateCreatePayload(payload);

  const existingItem = await findIpWhitelistByAddress(sanitizedPayload.ipAddress);
  if (existingItem) {
    throw createHttpError(409, "IP whitelist đã tồn tại.");
  }

  return createIpWhitelist(sanitizedPayload);
};

const updateIpWhitelistItem = async (id, payload) => {
  ensureDefinition();
  const { id: normalizedId, updatePayload } = validateUpdatePayload(id, payload);

  const currentItem = await findIpWhitelistById(normalizedId);
  if (!currentItem) {
    throw createHttpError(404, "Không tìm thấy IP whitelist.");
  }

  if (updatePayload.ipAddress) {
    const existingItem = await findIpWhitelistByAddress(updatePayload.ipAddress);
    if (existingItem && Number(existingItem.id) !== normalizedId) {
      throw createHttpError(409, "IP whitelist đã tồn tại.");
    }
  }

  return updateIpWhitelist(normalizedId, updatePayload);
};

const deleteIpWhitelistItem = async (id) => {
  ensureDefinition();
  const normalizedId = validateDeletePayload(id);

  const currentItem = await findIpWhitelistById(normalizedId);
  if (!currentItem) {
    throw createHttpError(404, "Không tìm thấy IP whitelist.");
  }

  await deleteIpWhitelist(normalizedId);
  return {
    success: true,
  };
};

module.exports = {
  listIpWhitelistItems,
  createIpWhitelistItem,
  updateIpWhitelistItem,
  deleteIpWhitelistItem,
};
