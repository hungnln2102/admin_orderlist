const express = require("express");
const publicArticles = require("../controllers/ContentController/handlers/publicArticles");
const publicBanners = require("../controllers/ContentController/handlers/publicBanners");

const router = express.Router();

router.get("/articles", publicArticles.listPublished);
router.get("/articles/slug/:slug", publicArticles.getBySlug);
router.get("/banners", publicBanners.listActive);

module.exports = router;
