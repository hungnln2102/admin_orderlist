# Build images với BuildKit (cache apt trong backend/Dockerfile).
# Từ thư mục repo:
#   .\scripts\docker-build.ps1
#   .\scripts\docker-build.ps1 --no-cache
#   .\scripts\docker-build.ps1 backend

$ErrorActionPreference = "Stop"
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "docker not found in PATH"
}

& docker compose -f docker-compose.yml build @args
