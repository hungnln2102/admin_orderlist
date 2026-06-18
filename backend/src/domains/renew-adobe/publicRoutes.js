const express = require("express");
const {
  getWebsiteStatus,
  activateWebsiteUser,
} = require("./controller");
const {
  resolveSystemByEmail,
} = require("./controller/publicResolveSystem");
const {
  publicCheckFixAdes,
  publicRenewFixAdes,
} = require("./controller/publicFixAdes");
const {
  publicGetOtp,
} = require("./controller/publicOtp");
const {
  requireRenewAdobePublicActivateKey,
} = require("../../middleware/renewAdobePublicActivateKey");

const router = express.Router();

router.get("/status", getWebsiteStatus);
router.get("/resolve-system", resolveSystemByEmail);
router.post("/get-otp", publicGetOtp);
router.post("/activate", requireRenewAdobePublicActivateKey, activateWebsiteUser);

/**
 * Fix Ades public — verify email thuộc tracking system_note='fix_ades' rồi mới
 * forward sang api.ades.support. Tránh user public spam credit.
 */
router.post("/fix-ades/check", publicCheckFixAdes);
router.post("/fix-ades/check-transfer-status", publicCheckFixAdes);
router.post("/fix-ades/renew", publicRenewFixAdes);

module.exports = router;
