# Edge Functions server wrapper - resolves .ps1 properly
$ErrorActionPreference = 'Continue'

# Kill any old supabase processes
Get-Process -Name 'node','supabase' -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -like '*supabase*' -or $_.CommandLine -like '*supabase*' } |
  ForEach-Object { try { Stop-Process -Id $_.Id -Force } catch {} }

Set-Location 'E:\Project\Vendo'

Write-Host "=== Starting Edge Functions server on :54321 ===" -ForegroundColor Cyan
# `supabase` is an npm-installed .ps1 -> call via powershell.exe
Start-Process -FilePath 'powershell.exe' `
  -ArgumentList '-NoProfile','-Command','supabase functions serve --no-verify-jwt seed-accounts get-live-token' `
  -WorkingDirectory 'E:\Project\Vendo' `
  -WindowStyle Hidden `
  -RedirectStandardOutput 'E:\Project\Vendo\_functions.log' `
  -RedirectStandardError  'E:\Project\Vendo\_functions.err.log' `
  -PassThru | Out-Null

Start-Sleep -Seconds 5
Write-Host "`nFunctions log:" -ForegroundColor Cyan
Get-Content 'E:\Project\Vendo\_functions.log' -Tail 30 -ErrorAction SilentlyContinue
Write-Host "`nFunctions errors:" -ForegroundColor Yellow
Get-Content 'E:\Project\Vendo\_functions.err.log' -Tail 30 -ErrorAction SilentlyContinue

Write-Host "`n=== Probe Edge Function endpoint ===" -ForegroundColor Cyan
$probe = @"
curl.exe -s -o nul -w "HTTP %{http_code}" -X POST `
  -H 'Content-Type: application/json' `
  -H 'Authorization: Bearer test' `
  -d '{\"channelName\":\"shop123\",\"role\":\"audience\"}' `
  http://127.0.0.1:54321/functions/v1/get-live-token
"@
Write-Host "(POST without real auth will return 401 - expected)" -ForegroundColor Yellow

# Also test CORS preflight
$opts = curl.exe -s -o nul -w "HTTP %{http_code}" -X OPTIONS `
  http://127.0.0.1:54321/functions/v1/get-live-token
Write-Host "CORS preflight: $opts" -ForegroundColor Green

Write-Host "`n=== Done ===" -ForegroundColor Cyan
