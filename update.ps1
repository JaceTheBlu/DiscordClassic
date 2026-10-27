<#
.SYNOPSIS
    Updates DiscordClassic (and optionally Vencord), then rebuilds Vencord.

.DESCRIPTION
    Paths come from the script location, so it works from any folder.
    Expected layout: <Vencord>\src\userplugins\DiscordClassic\update.ps1
    No re-inject needed: Discord loads Vencord's dist folder, a rebuild is enough.

.EXAMPLE
    .\src\userplugins\DiscordClassic\update.ps1
    Pulls the plugin and rebuilds.

.EXAMPLE
    .\src\userplugins\DiscordClassic\update.ps1 -Vencord -Restart
    Also pulls Vencord, then restarts Discord (stable) after the build.
#>
[CmdletBinding()]
param(
    # Also pull Vencord itself, and reinstall dependencies if its lockfile changed.
    [switch]$Vencord,
    # Restart Discord (stable channel) after the build.
    [switch]$Restart
)

$ErrorActionPreference = "Stop"

$pluginDir = $PSScriptRoot
$vencordDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

if (-not (Test-Path (Join-Path $vencordDir "src\userplugins"))) {
    throw "Vencord not found at $vencordDir. The plugin must live in <Vencord>\src\userplugins\DiscordClassic."
}

# Native commands do not throw on failure, so exit codes are checked by hand.
function Invoke-Step([string]$Label, [scriptblock]$Command) {
    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Label failed (exit code $LASTEXITCODE)" }
}

Push-Location $vencordDir
try {
    Invoke-Step "Pull DiscordClassic" { git -C $pluginDir pull --ff-only }

    if ($Vencord) {
        $lockfile = Join-Path $vencordDir "pnpm-lock.yaml"
        $before = (Get-FileHash $lockfile).Hash
        Invoke-Step "Pull Vencord" { git pull --ff-only }
        if ((Get-FileHash $lockfile).Hash -ne $before) {
            Invoke-Step "Install dependencies" { pnpm install --frozen-lockfile }
        }
    }

    Invoke-Step "Build Vencord" { pnpm build --dev }

    if ($Restart) {
        Write-Host "==> Restart Discord" -ForegroundColor Cyan
        Get-Process -Name "Discord" -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        Start-Process (Join-Path $env:LOCALAPPDATA "Discord\Update.exe") -ArgumentList "--processStart", "Discord.exe"
    } else {
        Write-Host "Done. Restart Discord (or press Ctrl+R in it) to load the new build." -ForegroundColor Green
    }
} finally {
    Pop-Location
}
