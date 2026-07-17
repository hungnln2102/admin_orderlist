const express = require("express");
const publicArticles = require("@/domains/content/controller/handlers/publicArticles");
const publicBanners = require("@/domains/content/controller/handlers/publicBanners");

const router = express.Router();

router.get("/articles", publicArticles.listPublished);
router.get("/articles/slug/:slug", publicArticles.getBySlug);
router.get("/banners", publicBanners.listActive);

module.exports = router;
