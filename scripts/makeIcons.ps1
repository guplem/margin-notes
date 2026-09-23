# Draws the extension icons.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File scripts/makeIcons.ps1
# The artwork is a yellow note with a folded corner and three lines of text, on a dark rounded square.

Add-Type -AssemblyName System.Drawing

$source = 512
$bitmap = New-Object System.Drawing.Bitmap($source, $source)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

# Dark rounded square background.
$radius = [int]($source * 0.22)
$background = New-Object System.Drawing.Drawing2D.GraphicsPath
$background.AddArc(0, 0, $radius * 2, $radius * 2, 180, 90)
$background.AddArc($source - $radius * 2, 0, $radius * 2, $radius * 2, 270, 90)
$background.AddArc($source - $radius * 2, $source - $radius * 2, $radius * 2, $radius * 2, 0, 90)
$background.AddArc(0, $source - $radius * 2, $radius * 2, $radius * 2, 90, 90)
$background.CloseFigure()
$backgroundBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 32, 33, 36))
$graphics.FillPath($backgroundBrush, $background)

# The note: a square with its bottom right corner cut off, where the fold sits.
$fold = 110
$note = New-Object System.Drawing.Drawing2D.GraphicsPath
$note.AddLine(96, 96, 416, 96)
$note.AddLine(416, 96, 416, 416 - $fold)
$note.AddLine(416, 416 - $fold, 416 - $fold, 416)
$note.AddLine(416 - $fold, 416, 96, 416)
$note.CloseFigure()
$noteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 202, 40))
$graphics.FillPath($noteBrush, $note)

# The fold: a darker triangle in the cut corner.
$corner = New-Object System.Drawing.Drawing2D.GraphicsPath
$corner.AddLine(416, 416 - $fold, 416 - $fold, 416 - $fold)
$corner.AddLine(416 - $fold, 416 - $fold, 416 - $fold, 416)
$corner.CloseFigure()
$cornerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 214, 158, 0))
$graphics.FillPath($cornerBrush, $corner)

# Three lines of text, the last one shorter so it stays clear of the fold.
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 32, 33, 36)), 30
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($pen, 150, 170, 362, 170)
$graphics.DrawLine($pen, 150, 250, 362, 250)
$graphics.DrawLine($pen, 150, 330, 262, 330)

$outputDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'icons'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($size in 16, 32, 48, 128) {
  $scaled = New-Object System.Drawing.Bitmap($size, $size)
  $scaledGraphics = [System.Drawing.Graphics]::FromImage($scaled)
  $scaledGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $scaledGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $scaledGraphics.DrawImage($bitmap, 0, 0, $size, $size)
  $scaled.Save((Join-Path $outputDirectory "icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $scaledGraphics.Dispose()
  $scaled.Dispose()
  Write-Host "wrote icon$size.png"
}

$graphics.Dispose()
$bitmap.Dispose()
