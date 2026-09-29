<#
Vendo — Connectivity patch runner.

Run once:
    powershell -NoProfile -ExecutionPolicy Bypass -File _apply_connectivity.ps1

What it does:
  1. Patches src/js/data.js (global orders registry + notif bus)
  2. Patches customer/checkout.html (fires customer+vendor notifs)
  3. Patches vendor/orders.html (reads globalForVendor + subscribes)
  4. Patches vendor/messages.html (notif bus listener)
  5. Patches admin/disputes.html + admin/payouts.html (read globalAll)
  6. Runs python _e2e_graph.py to confirm 0 R2/R3/R7 gaps

Idempotent. Safe to re-run.
#>

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Run-Step {
  param([string]$Label, [string]$Script)
  Write-Host ""
  Write-Host "=== $Label ===" -ForegroundColor Cyan
  Write-Host "        $Script" -ForegroundColor DarkGray
  & python $Script
  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: $Label" -ForegroundColor Red
    exit 1
  }
}

Run-Step "Applying connectivity patches" "$PSScriptRoot\_apply_connectivity_patches.py"
Run-Step "Running dependency graph"      "$PSScriptRoot\_e2e_graph.py"

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Open: http://127.0.0.1:5500/_graph_report.html" -ForegroundColor Green
