const express = require("express");
const {
  getWebsiteStatus,
  activateWebsiteUser,
} = require("../../controllers/RenewAdobeController");
const {
  resolveSystemByEmail,
} = require("../../controllers/RenewAdobeController/publicResolveSystem");
const {
  publicCheckFixAdes,
  publicRenewFixAdes,
} = require("../../controllers/RenewAdobeController/publicFixAdes");
const {
  requireRenewAdobePublicActivateKey,
} = require("../../middleware/renewAdobePublicActivateKey");

const router = express.Router();

router.get("/status", getWebsiteStatus);
router.get("/resolve-system", resolveSystemByEmail);
router.post("/activate", requireRenewAdobePublicActivateKey, activateWebsiteUser);

/**
 * Fix Ades public — verify email thuộc tracking system_note='fix_ades' rồi mới
 * forward sang api.ades.support. Tránh user public spam credit.
 */
router.post("/fix-ades/check", publicCheckFixAdes);
router.post("/fix-ades/renew", publicRenewFixAdes);

module.exports = router;
