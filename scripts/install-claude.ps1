$ErrorActionPreference = "Stop"

$marketplaceRepo = "lyingbird/coding-academy"
$pluginName = "coding-academy"
$pluginFullName = "coding-academy@coding-academy"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Write-Host ""
Write-Host "== Coding Academy installer =="
Write-Host ""

Require-Command "claude"

$marketplaceList = claude plugin marketplace list 2>$null | Out-String
if ($marketplaceList -match "(?m)^\s*>\s+coding-academy\s*$") {
  Write-Host "Updating marketplace cache..."
  claude plugin marketplace update coding-academy | Out-Host
} else {
  Write-Host "Adding marketplace..."
  claude plugin marketplace add $marketplaceRepo --scope user --sparse .claude-plugin plugins | Out-Host
}

$pluginList = claude plugin list 2>$null | Out-String
if ($pluginList -match "coding-academy@coding-academy") {
  Write-Host "Refreshing installed plugin..."
  claude plugin uninstall $pluginFullName | Out-Null
}

Write-Host "Installing plugin..."
claude plugin install $pluginName | Out-Host

Write-Host ""
Write-Host "Coding Academy is ready."
Write-Host "Next:"
Write-Host "  1. Restart Claude Code"
Write-Host "  2. Enter /coding-academy"
Write-Host "  3. Keep coding normally"
Write-Host ""
