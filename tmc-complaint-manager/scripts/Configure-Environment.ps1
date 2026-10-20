$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$examplePath = Join-Path $projectRoot '.env.example'

if (Test-Path -LiteralPath $envPath) {
    throw 'A project .env already exists. It was left unchanged; update it privately if needed.'
}
if (-not (Test-Path -LiteralPath $examplePath)) {
    throw 'The project .env.example file is missing.'
}

$dbUsername = (Read-Host 'MySQL username for the tmc_complaints database').Trim()
if ([string]::IsNullOrWhiteSpace($dbUsername)) {
    throw 'The MySQL username cannot be blank.'
}

function Read-SecretText([string] $prompt) {
    $secureValue = Read-Host $prompt -AsSecureString
    if ($secureValue.Length -eq 0) {
        throw 'Secret values cannot be blank.'
    }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Format-ComposeEnvValue([string] $value) {
    if ($value.Contains("`r") -or $value.Contains("`n")) {
        throw 'Environment values cannot contain line breaks.'
    }
    return "'" + $value.Replace("'", "\'") + "'"
}

$dbPassword = Read-SecretText 'MySQL application-user password'
$rootPassword = Read-SecretText 'MySQL root password for Docker Compose (use the existing Compose root secret if its data volume already exists)'

$replacements = @{
    DB_USERNAME = (Format-ComposeEnvValue $dbUsername)
    DB_PASSWORD = (Format-ComposeEnvValue $dbPassword)
    MYSQL_ROOT_PASSWORD = (Format-ComposeEnvValue $rootPassword)
}
$outputLines = foreach ($line in Get-Content -LiteralPath $examplePath) {
    if ($line -match '^([A-Z0-9_]+)=') {
        $key = $Matches[1]
        if ($replacements.ContainsKey($key)) {
            "$key=$($replacements[$key])"
            continue
        }
    }
    $line
}

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllLines($envPath, [string[]]$outputLines, $utf8WithoutBom)
$env:DB_USERNAME = $dbUsername
$env:DB_PASSWORD = $dbPassword
$env:MYSQL_ROOT_PASSWORD = $rootPassword

Write-Output 'Created the ignored project .env and set database variables in this PowerShell process. Secret values were not displayed.'
Remove-Variable dbPassword, rootPassword, replacements, outputLines, utf8WithoutBom, dbUsername -ErrorAction SilentlyContinue
