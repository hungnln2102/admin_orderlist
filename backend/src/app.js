const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const helmet = require("helmet");
const {
  allowedOrigins,
  allowedOriginSet,
  normalizeOrigin,
  session: sessionConfig,
} = require("./config/appConfig");
const routes = require("./routes");
const { AUTH_OPEN_PATHS } = require("./middleware/authGuard");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const {
  generateToken,
  verifyToken,
  addTokenToResponse,
} = require("./middleware/csrfProtection");
const logger = require("./utils/logger");

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOriginSet.has(normalizeOrigin(origin))) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined", { stream: logger.stream }));
} else {
  app.use(morgan("dev", { stream: logger.stream }));
}

app.use(express.json());
app.use("/image", express.static(path.join(__dirname, "../image")));
app.use(
  "/image_product",
  express.static(path.join(__dirname, "../image_product"))
);

app.use(
  session({
    name: sessionConfig.name,
    secret: sessionConfig.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: sessionConfig.cookieSameSite,
      secure: sessionConfig.cookieSecure,
      maxAge: 1000 * 60 * 60 * 1,
    },
  })
);

app.use("/api", generateToken);
app.use("/api", addTokenToResponse);
app.use("/api", verifyToken);

app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    authOpen: Array.from(AUTH_OPEN_PATHS),
    csrfEnabled:
      process.env.ENABLE_CSRF === "true" || process.env.ENABLE_CSRF === "1",
  });
});

app.use("/api", apiLimiter);
app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
