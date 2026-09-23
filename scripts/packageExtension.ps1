# Builds the zip file to upload to the Chrome Web Store.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File scripts/packageExtension.ps1
# The zip holds only the files that Chrome loads. The version in its name comes from manifest.json.
#
# The zip is written entry by entry, not with Compress-Archive: Windows PowerShell 5.1
# writes "\" into the entry names, and a zip with "\" paths is not a valid extension package.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$projectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$shippedPaths = @('manifest.json', 'src', 'noteDialog', 'notesPage', 'icons')

$version = (Get-Content (Join-Path $projectRoot 'manifest.json') -Raw | ConvertFrom-Json).version
$distDirectory = Join-Path $projectRoot 'dist'
$zipPath = Join-Path $distDirectory "margin-notes-$version.zip"

New-Item -ItemType Directory -Force -Path $distDirectory | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($shippedPath in $shippedPaths) {
    Get-ChildItem -Path (Join-Path $projectRoot $shippedPath) -File -Recurse | ForEach-Object {
      $entryName = $_.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
    }
  }
} finally {
  $zip.Dispose()
}
Write-Host "wrote $zipPath"
