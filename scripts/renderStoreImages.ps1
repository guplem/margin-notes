# Renders the Chrome Web Store images from the HTML sources in store/graphics/.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File scripts/renderStoreImages.ps1
# Needs Google Chrome installed. Writes 24-bit PNG files (no alpha) to store/images/,
# because the Web Store refuses a screenshot with an alpha channel.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$graphicsDirectory = Join-Path $projectRoot 'store/graphics'
$imagesDirectory = Join-Path $projectRoot 'store/images'

# Source page, output file, and the exact size the store asks for.
$storeImages = @(
  @{ Source = '01-simple.html'; Output = '1-simple-to-use.png'; Width = 1280; Height = 800 },
  @{ Source = '02-light.html'; Output = '2-light-fast-private.png'; Width = 1280; Height = 800 },
  @{ Source = '03-dialog.html'; Output = '3-add-a-note.png'; Width = 1280; Height = 800 },
  @{ Source = '04-notesPage.html'; Output = '4-notes-page.png'; Width = 1280; Height = 800 },
  @{ Source = 'promoTile.html'; Output = 'small-promo-tile-440x280.png'; Width = 440; Height = 280 }
)

$chromeCandidates = @(
  (Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google/Chrome/Application/chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe')
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Google Chrome was not found.' }

# A separate profile keeps the headless run away from the user's own Chrome profile.
$workDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'margin-notes-store-render'
New-Item -ItemType Directory -Force -Path $workDirectory, $imagesDirectory | Out-Null

foreach ($image in $storeImages) {
  $sourceUrl = 'file:///' + (Join-Path $graphicsDirectory $image.Source).Replace('\', '/')
  $rawPath = Join-Path $workDirectory 'raw.png'
  if (Test-Path $rawPath) { Remove-Item $rawPath }
  $chromeArguments = @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    "--user-data-dir=$(Join-Path $workDirectory 'profile')",
    "--window-size=$($image.Width),$($image.Height)", "--screenshot=$rawPath", $sourceUrl
  )
  Start-Process -FilePath $chrome -ArgumentList $chromeArguments -Wait -WindowStyle Hidden
  if (-not (Test-Path $rawPath)) { throw "Chrome did not render $($image.Source)" }

  # Redraw on a 24-bit canvas to drop the alpha channel.
  $raw = [System.Drawing.Image]::FromFile($rawPath)
  $flat = New-Object System.Drawing.Bitmap($image.Width, $image.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($flat)
  $graphics.DrawImage($raw, 0, 0, $image.Width, $image.Height)
  $flat.Save((Join-Path $imagesDirectory $image.Output), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $flat.Dispose(); $raw.Dispose()
  Write-Host "wrote store/images/$($image.Output)"
}
