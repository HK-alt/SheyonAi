# Renames the project root folder from RigAi to SheyonAi.
# Close Cursor (or open a different folder) before running this script.

$parent = "C:\Users\binod katel\Videos"
$from = Join-Path $parent "RigAi"
$to = Join-Path $parent "SheyonAi"

if (-not (Test-Path $from)) {
  if (Test-Path $to) {
    Write-Host "Already renamed: $to"
    exit 0
  }
  Write-Error "Source folder not found: $from"
  exit 1
}

if (Test-Path $to) {
  Write-Error "Destination already exists: $to"
  exit 1
}

Set-Location $parent
Rename-Item -Path "RigAi" -NewName "SheyonAi"
Write-Host "Renamed to $to"
Write-Host "Reopen in Cursor: File -> Open Folder -> $to"
