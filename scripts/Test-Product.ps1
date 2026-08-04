[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Repo = Split-Path -Parent $PSScriptRoot

$RequiredFiles = @(
    "README.md",
    ".gitignore",
    "docs/PRODUCT-INTAKE.md",
    "docs/SECURITY-BASELINE.md",
    "docs/TECHNICAL-GAPS.md",
    "scripts/Test-Product.ps1"
)

foreach ($RelativePath in $RequiredFiles) {
    $FullPath = Join-Path $Repo $RelativePath

    if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        throw "Required bootstrap file is missing: $RelativePath"
    }

    if ((Get-Item -LiteralPath $FullPath).Length -le 0) {
        throw "Required bootstrap file is empty: $RelativePath"
    }
}

$ProductTestFullPath = [System.IO.Path]::GetFullPath(
    (Join-Path $Repo "scripts\Test-Product.ps1")
)

$TextFiles = Get-ChildItem `
    -LiteralPath $Repo `
    -Recurse `
    -File |
Where-Object {
    $_.FullName -notlike "*\.git\*" -and
    $_.Extension -in @(".md", ".ps1", ".json", ".js", ".ts") -and
    [System.IO.Path]::GetFullPath($_.FullName) -ne $ProductTestFullPath
}

$Combined = (
    $TextFiles |
    ForEach-Object {
        Get-Content -LiteralPath $_.FullName -Raw
    }
) -join "`n"

$ForbiddenPatterns = [ordered]@{
    "Ready-to-Launch claim" = "Ready-to-Launch"
    "All URLs permission" = "<all_urls>"
    "Unsafe DOM assignment" = "\.innerHTML\s*="
    "Groq key pattern" = "gsk_[A-Za-z0-9_-]{16,}"
    "Google API key pattern" = "AIza[A-Za-z0-9_-]{20,}"
    "Bearer token literal" = "Bearer\s+[A-Za-z0-9._-]{20,}"
    "Private key block" = "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY"
}

foreach ($Entry in $ForbiddenPatterns.GetEnumerator()) {
    if (
        [regex]::IsMatch(
            $Combined,
            [string]$Entry.Value,
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
    ) {
        throw "Forbidden bootstrap pattern detected: $($Entry.Key)"
    }
}

$Readme = Get-Content `
    -LiteralPath (Join-Path $Repo "README.md") `
    -Raw

foreach ($Marker in @(
    "Discovery / Pre-MVP",
    "FarsiSmart.ir",
    "Public release: Blocked",
    "Chrome Web Store: Blocked"
)) {
    if (-not $Readme.Contains($Marker)) {
        throw "README governance marker is missing: $Marker"
    }
}

$Security = Get-Content `
    -LiteralPath (
        Join-Path $Repo "docs/SECURITY-BASELINE.md"
    ) `
    -Raw

foreach ($Marker in @(
    "Safe DOM",
    "Permission",
    "Privacy disclosure",
    "Secret Scan"
)) {
    if (-not $Security.Contains($Marker)) {
        throw "Security baseline marker is missing: $Marker"
    }
}

Write-Host "AVA M0 SANITIZED BOOTSTRAP PRODUCT TEST" -ForegroundColor Cyan
Write-Host "Required files: PASS" -ForegroundColor Green
Write-Host "Governance markers: PASS" -ForegroundColor Green
Write-Host "Security baseline markers: PASS" -ForegroundColor Green
Write-Host "Forbidden-pattern scan: PASS" -ForegroundColor Green
Write-Host "Decision: AVA-M0-SANITIZED-BOOTSTRAP-PRODUCT-TEST-PASS" -ForegroundColor Green
