const express = require("express");
const publicArticles = require("../controllers/ContentController/handlers/publicArticles");

const router = express.Router();

router.get("/articles", publicArticles.listPublished);
router.get("/articles/slug/:slug", publicArticles.getBySlug);

module.exports = router;
