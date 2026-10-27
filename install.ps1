<#
.SYNOPSIS
    Installs Vencord with DiscordClassic into Discord, no build tools needed.

.DESCRIPTION
    Downloads the prebuilt files of this repo's "latest" release (Vencord + DiscordClassic,
    built by .github/workflows/release.yml) to %APPDATA%\DiscordClassic\dist, then patches
    Discord with the official Vencord installer pointed at that folder.
    Vencord's own updater (Settings > Vencord > Updater) then follows this repo's releases.
    Run it again to repair after a broken update, or with -Uninstall to remove it.

.EXAMPLE
    irm https://raw.githubusercontent.com/JaceTheBlu/DiscordClassic/main/install.ps1 | iex
    Installs or updates.

.EXAMPLE
    & ([scriptblock]::Create((irm https://raw.githubusercontent.com/JaceTheBlu/DiscordClassic/main/install.ps1))) -Uninstall
    Removes Vencord from Discord.
#>
[CmdletBinding()]
param(
    # Restore the original Discord instead of installing.
    [switch]$Uninstall,
    # Discord to patch: auto picks the first found among stable, ptb and canary.
    [ValidateSet("auto", "stable", "ptb", "canary")]
    [string]$Branch = "auto"
)

$ErrorActionPreference = "Stop"
# Windows PowerShell 5.1 defaults to TLS 1.0, which GitHub refuses.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# The progress bar makes Invoke-WebRequest many times slower on 5.1.
$ProgressPreference = "SilentlyContinue"

$release = "https://github.com/JaceTheBlu/DiscordClassic/releases/latest/download"
$installer = "https://github.com/Vencord/Installer/releases/latest/download/VencordInstallerCli.exe"
$baseDir = Join-Path $env:APPDATA "DiscordClassic"
$distDir = Join-Path $baseDir "dist"
$files = "patcher.js", "preload.js", "renderer.js", "renderer.css"

function Write-Step([string]$Label) {
    Write-Host "==> $Label" -ForegroundColor Cyan
}

# Discord is closed while its files are patched, stable is started again at the end.
$restart = [bool](Get-Process -Name "Discord" -ErrorAction SilentlyContinue)
$running = Get-Process -Name "Discord", "DiscordPTB", "DiscordCanary" -ErrorAction SilentlyContinue
if ($running) {
    Write-Step "Close Discord"
    $running | Stop-Process -Force
    Start-Sleep -Seconds 2
}

if (-not $Uninstall) {
    Write-Step "Download Vencord + DiscordClassic"
    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
    foreach ($file in $files) {
        Invoke-WebRequest -UseBasicParsing -Uri "$release/$file" -OutFile (Join-Path $distDir $file)
    }
    # Same as the official installer: stops node from reading a package.json in a parent folder.
    Set-Content -Path (Join-Path $distDir "package.json") -Value "{}" -Encoding ASCII
}

Write-Step "Download the Vencord installer"
$cli = Join-Path $env:TEMP "VencordInstallerCli.exe"
Invoke-WebRequest -UseBasicParsing -Uri $installer -OutFile $cli

# VENCORD_DEV_INSTALL keeps the installer from downloading official Vencord over our files.
$env:VENCORD_USER_DATA_DIR = $baseDir
$env:VENCORD_DEV_INSTALL = "1"
$action = if ($Uninstall) { "-uninstall" } else { "-install" }
Write-Step $(if ($Uninstall) { "Remove Vencord from Discord" } else { "Patch Discord" })
& $cli $action -branch $Branch
$code = $LASTEXITCODE
Remove-Item -Force $cli -ErrorAction SilentlyContinue
if ($code -ne 0) { throw "The Vencord installer failed (exit code $code)." }

if ($Uninstall) {
    Remove-Item -Recurse -Force $baseDir -ErrorAction SilentlyContinue
    Write-Host "Done. Discord is back to normal." -ForegroundColor Green
} else {
    Write-Host "Done. Open Discord: DiscordClassic is in Settings > Vencord > Plugins." -ForegroundColor Green
}

if ($restart) {
    $updater = Join-Path $env:LOCALAPPDATA "Discord\Update.exe"
    if (Test-Path $updater) { Start-Process $updater -ArgumentList "--processStart", "Discord.exe" }
}
