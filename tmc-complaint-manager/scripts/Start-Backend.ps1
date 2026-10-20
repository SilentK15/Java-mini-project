# CivicConnect Local Backend Launcher
# Automatically loads variables from .env into process environment and launches Spring Boot
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $envPath)) {
    throw 'No .env file found. Run Configure-Environment.ps1 or copy .env.example first.'
}

# Parse .env lines and set process environment variables
Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and ($line -match '^([A-Za-z0-9_]+)=(.*)$')) {
        $key = $matches[1]
        $val = $matches[2].Trim()
        # Strip surrounding quotes if present
        if (($val.StartsWith("'") -and $val.EndsWith("'")) -or ($val.StartsWith('"') -and $val.EndsWith('"'))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
    }
}

Write-Host "Environment variables loaded from .env. Starting CivicConnect backend..." -ForegroundColor Cyan
Set-Location -LiteralPath $projectRoot
& .\mvnw.cmd spring-boot:run
