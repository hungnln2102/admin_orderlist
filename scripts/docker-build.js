#!/usr/bin/env node
/**
 * Gọi `docker compose build` với BuildKit bật (cache Playwright/apt trong backend/Dockerfile).
 * Mọi tham số thừa được chuyển vào build: npm run docker:build -- --no-cache backend
 */
process.env.DOCKER_BUILDKIT = "1";
process.env.COMPOSE_DOCKER_CLI_BUILD = "1";

const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const extra = process.argv.slice(2);

const result = spawnSync(
  "docker",
  ["compose", "-f", "docker-compose.yml", "build", ...extra],
  { stdio: "inherit", cwd: repoRoot, shell: process.platform === "win32" }
);

process.exit(result.status === null ? 1 : result.status);
