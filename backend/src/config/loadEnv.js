const path = require("path");
const dotenv = require("dotenv");

const backendRoot = path.join(__dirname, "..", "..");

const isProductionLike = () =>
  process.env.NODE_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  process.env.APP_ENV === "docker";

const configEnvFile = (fileName, options = {}) =>
  dotenv.config({
    path: path.join(backendRoot, fileName),
    quiet: true,
    ...options,
  });

function loadBackendEnv() {
  configEnvFile(".env");

  if (isProductionLike()) {
    configEnvFile(".env.docker", { override: true });
    return;
  }

  const explicitPath = (process.env.BACKEND_ENV_FILE || process.env.DOTENV_CONFIG_PATH || "").trim();
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(backendRoot, explicitPath);
    dotenv.config({ path: resolved, override: true, quiet: true });
    return;
  }

  configEnvFile(".env.local", { override: true });
}

module.exports = { loadBackendEnv, backendRoot };
