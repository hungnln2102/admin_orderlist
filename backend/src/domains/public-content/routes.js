const express = require("express");
const publicArticles = require("../content/controller/handlers/publicArticles");
const publicBanners = require("../content/controller/handlers/publicBanners");

const router = express.Router();

router.get("/articles", publicArticles.listPublished);
router.get("/articles/slug/:slug", publicArticles.getBySlug);
router.get("/banners", publicBanners.listActive);

module.exports = router;
