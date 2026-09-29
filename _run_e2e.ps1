# Vendo — End-to-end test runner (PowerShell)
# 1. Seeds 3 demo accounts via the seed-accounts Edge Function
# 2. Runs the Python Playwright smoke test
# 3. Prints where the report lives

$ErrorActionPreference = 'Continue'
Set-Location 'E:\Project\Vendo'

$FRONTEND  = 'http://127.0.0.1:5500'
$FUNCTIONS = 'http://127.0.0.1:54321/functions/v1'
$SEED_KEY  = 'vendo-dev-seed'

Write-Host '=== Vendo E2E Test ===' -ForegroundColor Cyan

# 0. Sanity: frontend + functions reachable
$fe = try { (Invoke-WebRequest -Uri $FRONTEND -UseBasicParsing -TimeoutSec 4).StatusCode } catch { 0 }
if ($fe -ne 200) {
  Write-Host "Frontend not responding at $FRONTEND (got $fe). Start python -m http.server 5500 first." -ForegroundColor Red
  exit 2
}
$fn = try { (Invoke-WebRequest -Uri "$FUNCTIONS/get-live-token" -Method OPTIONS -UseBasicParsing -TimeoutSec 4).StatusCode } catch { 0 }
if ($fn -lt 200 -or $fn -ge 500) {
  Write-Host "Functions not responding at $FUNCTIONS (got $fn). Start supabase functions serve first." -ForegroundColor Red
  exit 3
}
Write-Host "Frontend OK ($fe) · Functions OK ($fn)" -ForegroundColor Green

# 1. Seed accounts
Write-Host "`n[1/2] Seeding accounts..." -ForegroundColor Cyan
$seedHeaders = @{ 'x-seed-key' = $SEED_KEY; 'Content-Type' = 'application/json' }
$seedBody = '{}'
try {
  $seedResp = Invoke-WebRequest -Uri "$FUNCTIONS/seed-accounts" -Method POST -Headers $seedHeaders -Body $seedBody -UseBasicParsing -TimeoutSec 15
  Write-Host "seed-accounts HTTP $($seedResp.StatusCode)" -ForegroundColor Green
  $seedResp.Content | Out-File -Encoding utf8 'public\_e2e_seed.json'
} catch {
  Write-Host "seed-accounts FAILED: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Run Python e2e
Write-Host "`n[2/2] Running Python e2e..." -ForegroundColor Cyan
try {
  python _e2e_test.py
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`nE2E complete. Open report: $FRONTEND/_e2e_report.html" -ForegroundColor Green
  } else {
    Write-Host "`nE2E finished with failures. Open report: $FRONTEND/_e2e_report.html" -ForegroundColor Yellow
  }
} catch {
  Write-Host "python _e2e_test.py failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Run these first:" -ForegroundColor Yellow
  Write-Host "  python -m pip install playwright" -ForegroundColor Yellow
  Write-Host "  python -m playwright install chromium" -ForegroundColor Yellow
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan