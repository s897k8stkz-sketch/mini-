# C1 pipeline: one command to reproduce the whole translation repo.
# ASCII-only on purpose so Windows PowerShell 5.1 reads it correctly.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Write-Host "== C1 pipeline root: $root =="

Write-Host "`n--- step 1/3: fetch pinned upstream sources ---"
python "$PSScriptRoot\fetch_sources.py"
if ($LASTEXITCODE -ne 0) { throw "fetch_sources.py failed" }

Write-Host "`n--- step 2/3: build glossary + consistency scan ---"
python "$PSScriptRoot\build_glossary.py"
if ($LASTEXITCODE -ne 0) { throw "build_glossary.py failed" }

Write-Host "`n--- step 3/3: verify translation coverage ---"
python "$PSScriptRoot\verify_pipeline.py"
$verifyExit = $LASTEXITCODE
if ($verifyExit -ne 0) {
  Write-Host "verify_pipeline.py reported FAIL items (see reports/verify-report.json)"
  exit $verifyExit
}
Write-Host "`nAll good. Reports are in: $root\reports"
