# ====== Vendo full stack startup ======
$ErrorActionPreference = 'Continue'

Write-Host "=== 1. Killing any old servers ===" -ForegroundColor Cyan
taskkill /F /IM python.exe /T 2>$null | Out-Null
taskkill /F /IM supabase.exe /T 2>$null | Out-Null

Write-Host "`n=== 2. Starting frontend (Python http.server :5500) ===" -ForegroundColor Cyan
$frontend = Start-Process -FilePath python `
  -ArgumentList '-m','http.server','5500','--bind','127.0.0.1' `
  -WorkingDirectory 'E:\Project\Vendo' `
  -WindowStyle Hidden `
  -RedirectStandardOutput 'E:\Project\Vendo\_server.out.log' `
  -RedirectStandardError  'E:\Project\Vendo\_server.err.log' `
  -PassThru

Start-Sleep -Seconds 2
$listen = netstat -ano | findstr ":5500.*LISTENING"
if ($listen) {
  Write-Host "Frontend listening:" $listen -ForegroundColor Green
} else {
  Write-Host "!! Frontend failed to start. Check _server.err.log" -ForegroundColor Red
}

Write-Host "`n=== 3. Smoke-testing key URLs ===" -ForegroundColor Cyan
$urls = @(
  'http://127.0.0.1:5500/',
  'http://127.0.0.1:5500/public/login.html',
  'http://127.0.0.1:5500/public/customer/profile.html',
  'http://127.0.0.1:5500/public/customer/login.html',
  'http://127.0.0.1:5500/src/js/auth.js',
  'http://127.0.0.1:5500/src/js/supabaseClient.js',
  'http://127.0.0.1:5500/public/assets/logo.png'
)
foreach ($u in $urls) {
  $code = curl.exe -s -o nul -w "%{http_code}" $u 2>$null
  Write-Host ("  {0}  {1}" -f $code, $u)
}

Write-Host "`n=== 4. Checking Docker for backend ===" -ForegroundColor Cyan
docker ps 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Docker is running. Starting Supabase local stack..." -ForegroundColor Green
  Set-Location 'E:\Project\Vendo'
  supabase start 2>&1 | Out-File 'E:\Project\Vendo\_supabase.log'
  $startLines = Get-Content 'E:\Project\Vendo\_supabase.log' -Tail 25
  Write-Host "Supabase start tail:"
  $startLines | ForEach-Object { Write-Host "  $_" }

  Write-Host "`n=== 5. Starting Edge Functions server ===" -ForegroundColor Cyan
  Start-Process -FilePath supabase `
    -ArgumentList 'functions','serve','--no-verify-jwt' `
    -WorkingDirectory 'E:\Project\Vendo' `
    -WindowStyle Hidden `
    -RedirectStandardOutput 'E:\Project\Vendo\_functions.log' `
    -RedirectStandardError  'E:\Project\Vendo\_functions.err.log'
  Start-Sleep -Seconds 3
  Get-Content 'E:\Project\Vendo\_functions.log' -Tail 15 | ForEach-Object { Write-Host "  $_" }
  Write-Host "`nBackend endpoint: http://127.0.0.1:54321/functions/v1/get-live-token" -ForegroundColor Green
} else {
  Write-Host "!! Docker not running. Backend (Supabase local) skipped." -ForegroundColor Yellow
  Write-Host "   Start Docker Desktop, then re-run this script." -ForegroundColor Yellow
}

Write-Host "`n=== DONE ===" -ForegroundColor Cyan
Write-Host "Frontend URL: http://127.0.0.1:5500/" -ForegroundColor Green