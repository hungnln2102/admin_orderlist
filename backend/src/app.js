const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const helmet = require("helmet");
const { allowedOrigins, session: sessionConfig } = require("./config/appConfig");
const routes = require("./routes");
const { authGuard, AUTH_OPEN_PATHS } = require("./middleware/authGuard");
const formInfoRoutes = require("./routes/formInfoRoutes");
const {
  listForms,
  listInputs,
  getFormDetail,
} = require("./controllers/FormDescController");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const { generateToken, verifyToken, addTokenToResponse } = require("./middleware/csrfProtection");
const logger = require("./utils/logger");

const app = express();
app.set("trust proxy", 1);

// Security headers with Helmet
// Configure to work with CORS and session cookies
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for compatibility
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts if needed
        imgSrc: ["'self'", "data:", "https:"], // Allow images from any HTTPS source
        connectSrc: ["'self'", ...allowedOrigins], // Allow API calls to configured origins
      },
    },
    crossOriginEmbedderPolicy: false, // Disable to avoid breaking CORS
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
  })
);

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
app.use("/image_product", express.static(path.join(__dirname, "../image_product")));

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

// CSRF Protection (optional - enable via ENABLE_CSRF=true)
app.use("/api", generateToken);
app.use("/api", addTokenToResponse);
app.use("/api", verifyToken);

// Convenience ping + auth-open route hint
app.get("/api", (_req, res) => {
  res.json({ 
    ok: true, 
    authOpen: Array.from(AUTH_OPEN_PATHS),
    csrfEnabled: process.env.ENABLE_CSRF === "true" || process.env.ENABLE_CSRF === "1",
  });
});

app.use("/api", apiLimiter);
// Form info - đăng ký trực tiếp để tránh 404 (Express 5 router behavior)
app.get("/api/form-info/forms", authGuard, listForms);
app.get("/api/form-info/inputs", authGuard, listInputs);
app.get("/api/form-info/forms/:formId", authGuard, getFormDetail);
app.use("/api", routes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

module.exports = app;
