$ErrorActionPreference = "Stop"

$marketplaceName = "coding-academy"
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
  foreach ($name in @("claude", "Claude")) {
    if (Get-Process -Name $name -ErrorAction SilentlyContinue) {
      return $true
    }
  }
  return $false
}

function Ensure-Marketplace {
  $marketplaceList = claude plugin marketplace list 2>$null | Out-String
  if ($marketplaceList -match "(?m)^\s*>\s+$marketplaceName\s*$") {
    Write-Host "Refreshing marketplace..."
    claude plugin marketplace update $marketplaceName | Out-Host
    return
  }

  Write-Host "Adding marketplace..."
  claude plugin marketplace add $marketplaceRepo --scope user --sparse .claude-plugin plugins | Out-Host
}

function Refresh-Plugin {
  $pluginList = claude plugin list 2>$null | Out-String
  if ($pluginList -match [regex]::Escape($pluginFullName)) {
    Write-Host "Refreshing plugin..."
    claude plugin uninstall $pluginFullName | Out-Null
  } else {
    Write-Host "Installing plugin..."
  }

  claude plugin install $pluginName | Out-Host
}

Write-Host ""
Write-Host "Coding Academy setup"
Write-Host "--------------------"
Write-Host ""

Require-Command "claude"
Ensure-Marketplace
Refresh-Plugin

Write-Host ""
Write-Host "Done."
if (Test-ClaudeRunning) {
  Write-Host "Close every Claude window once so the new slash command refreshes."
}
Write-Host ""
Write-Host "Start in 3 steps:"
Write-Host "  1. Open any terminal"
Write-Host "  2. Run: claude"
Write-Host "  3. In Claude, type: /coding-academy"
Write-Host ""
Write-Host "When you want a payoff, type: /coding-academy-check-in"
Write-Host ""
