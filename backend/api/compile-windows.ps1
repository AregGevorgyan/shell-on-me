# Compile TypeScript for Windows
# This is called by dev-windows.ps1 and nodemon

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Set-Location $PSScriptRoot
bunx tsc -b
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location "$root\common"
bunx tsc-alias
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location "$root\backend\shared"
bunx tsc-alias
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location "$root\backend\api"
bunx tsc-alias
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Compiled!" -ForegroundColor Green
