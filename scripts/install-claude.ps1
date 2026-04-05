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

function Test-ClaudeRunning {
  $candidates = @("claude", "Claude")
  foreach ($name in $candidates) {
    if (Get-Process -Name $name -ErrorAction SilentlyContinue) {
      return $true
    }
  }
  return $false
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
if (Test-ClaudeRunning) {
  Write-Host "Claude Code appears to be running right now."
  Write-Host "Please fully close all Claude windows first so the new commands refresh cleanly."
  Write-Host ""
}
Write-Host "First run:"
Write-Host "  1. Open any terminal"
Write-Host "  2. Run: claude"
Write-Host "  3. Enter: /coding-academy"
Write-Host "  4. Keep coding normally while the buddy pushes maps on the side"
Write-Host "  5. Cash out with: /coding-academy-check-in"
Write-Host ""
