# MarkComm Platform — Dev Setup Script
# Run from repo root: powershell -ExecutionPolicy Bypass -File scripts\dev-setup.ps1

param(
  [switch]$SkipDocker,
  [switch]$SkipMigrate,
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "`n🚀 MarkComm Dev Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# ── Step 1: Docker ────────────────────────────────────────────────
if (-not $SkipDocker) {
  Write-Host "`n[1/4] Starting Docker services..." -ForegroundColor Yellow
  try {
    docker compose -f docker/docker-compose.dev.yml up -d
    Write-Host "  ✅ Docker services started" -ForegroundColor Green
    Write-Host "  ⏳ Waiting 10s for PostgreSQL to be ready..."
    Start-Sleep -Seconds 10
  } catch {
    Write-Host "  ⚠️  Docker not found or failed. Start Docker Desktop and retry." -ForegroundColor Red
    Write-Host "     Or run with -SkipDocker if services are already running."
    exit 1
  }
} else {
  Write-Host "`n[1/4] Docker — SKIPPED" -ForegroundColor DarkGray
}

# ── Step 2: Install dependencies ─────────────────────────────────
Write-Host "`n[2/4] Installing dependencies..." -ForegroundColor Yellow
pnpm install
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# ── Step 3: Migration ─────────────────────────────────────────────
if (-not $SkipMigrate) {
  Write-Host "`n[3/4] Running database migration..." -ForegroundColor Yellow
  Set-Location "$ProjectRoot\packages\db"
  $env:DATABASE_URL = "postgresql://markcomm:markcomm_local_dev@localhost:5432/markcomm_dev"
  pnpm prisma migrate dev --name "initial-setup"
  pnpm prisma generate
  Write-Host "  ✅ Migration complete" -ForegroundColor Green
  Set-Location $ProjectRoot
} else {
  Write-Host "`n[3/4] Migration — SKIPPED" -ForegroundColor DarkGray
}

# ── Step 4: Seed ──────────────────────────────────────────────────
if (-not $SkipSeed) {
  Write-Host "`n[4/4] Seeding database..." -ForegroundColor Yellow
  Set-Location "$ProjectRoot\packages\db"
  $env:DATABASE_URL = "postgresql://markcomm:markcomm_local_dev@localhost:5432/markcomm_dev"
  pnpm seed
  Write-Host "  ✅ Seed complete" -ForegroundColor Green
  Set-Location $ProjectRoot
} else {
  Write-Host "`n[4/4] Seed — SKIPPED" -ForegroundColor DarkGray
}

# ── Summary ───────────────────────────────────────────────────────
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✅ Setup complete! Start the dev servers:" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 1 (API):  cd apps\api  && pnpm dev" -ForegroundColor Cyan
Write-Host "  Terminal 2 (Web):  cd apps\web  && pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Web:      http://localhost:3000"
Write-Host "  🔌 API:      http://localhost:4000"
Write-Host "  📖 API Docs: http://localhost:4000/docs"
Write-Host "  📧 MailHog:  http://localhost:8025"
Write-Host "  🗄️  DB Studio: cd packages\db && pnpm studio"
Write-Host ""
Write-Host "  🔑 Login:    admin@markcomm.lk / Admin@1234"
Write-Host "               vendor@fashionlk.lk / Demo@1234"
Write-Host "               customer@demo.lk / Demo@1234"
Write-Host ""
