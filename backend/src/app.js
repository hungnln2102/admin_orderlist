const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const { allowedOrigins, session: sessionConfig } = require("./config/appConfig");
const routes = require("./routes");
const { AUTH_OPEN_PATHS } = require("./middleware/authGuard");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

const app = express();
app.set("trust proxy", true);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Request logging using Winston
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined", { stream: logger.stream }));
} else {
  app.use(morgan("dev", { stream: logger.stream }));
}

app.use(express.json());
app.use("/image", express.static(path.join(__dirname, "../image")));

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
      maxAge: 1000 * 60 * 60 * 1, // 1 hour inactivity
    },
  })
);

// Convenience ping + auth-open route hint
app.get("/api", (_req, res) => {
  res.json({ ok: true, authOpen: Array.from(AUTH_OPEN_PATHS) });
});

app.use("/api", routes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

module.exports = app;
