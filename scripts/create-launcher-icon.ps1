Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'launcher'
$iconPath = Join-Path $assetDirectory 'my-room.ico'
New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null

function New-RoundedRectanglePath {
    param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $Radius * 2
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = @()

foreach ($size in $sizes) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $margin = [Math]::Max(1.0, $size * 0.045)
    $corner = $size * 0.205
    $tile = New-RoundedRectanglePath $margin $margin ($size - 2 * $margin) ($size - 2 * $margin) $corner
    $shadow = New-RoundedRectanglePath ($margin + $size * 0.018) ($margin + $size * 0.025) ($size - 2 * $margin) ($size - 2 * $margin) $corner
    $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(34, 67, 48, 32)), $shadow)
    $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 247, 242, 232)), $tile)
    $graphics.DrawPath([System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 91, 70, 53), [Math]::Max(1.0, $size * 0.022)), $tile)

    $discX = $size * 0.185
    $discY = $size * 0.17
    $discSize = $size * 0.63
    $graphics.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 42, 38, 34)), $discX, $discY, $discSize, $discSize)
    $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 238, 219, 184), [Math]::Max(1.0, $size * 0.012))
    foreach ($insetRatio in @(0.10, 0.20, 0.30)) {
        $inset = $discSize * $insetRatio
        $graphics.DrawEllipse($ringPen, $discX + $inset, $discY + $inset, $discSize - 2 * $inset, $discSize - 2 * $inset)
    }

    $labelSize = $size * 0.19
    $labelX = ($size - $labelSize) / 2
    $labelY = $discY + ($discSize - $labelSize) / 2
    $graphics.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 202, 151, 83)), $labelX, $labelY, $labelSize, $labelSize)
    $graphics.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 247, 242, 232)), $size * 0.485, $size * 0.475, $size * 0.03, $size * 0.03)

    $doorPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 202, 151, 83), [Math]::Max(1.4, $size * 0.034))
    $doorPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $doorPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawArc($doorPen, $size * 0.65, $size * 0.29, $size * 0.18, $size * 0.36, 270, 180)
    $graphics.DrawLine($doorPen, $size * 0.74, $size * 0.47, $size * 0.74, $size * 0.73)

    $floorPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 116, 88, 64), [Math]::Max(1.0, $size * 0.022))
    $graphics.DrawLine($floorPen, $size * 0.25, $size * 0.83, $size * 0.75, $size * 0.83)

    $memory = [System.IO.MemoryStream]::new()
    $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($size -eq 256) {
        $bitmap.Save((Join-Path $assetDirectory 'my-room-icon-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $images += ,$memory.ToArray()

    $memory.Dispose()
    $floorPen.Dispose()
    $doorPen.Dispose()
    $ringPen.Dispose()
    $tile.Dispose()
    $shadow.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

$stream = [System.IO.File]::Create($iconPath)
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$images.Count)

$offset = 6 + 16 * $images.Count
for ($index = 0; $index -lt $images.Count; $index++) {
    $size = $sizes[$index]
    $writer.Write([Byte]$(if ($size -eq 256) { 0 } else { $size }))
    $writer.Write([Byte]$(if ($size -eq 256) { 0 } else { $size }))
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$images[$index].Length)
    $writer.Write([UInt32]$offset)
    $offset += $images[$index].Length
}

foreach ($image in $images) { $writer.Write($image) }
$writer.Dispose()
$stream.Dispose()

Write-Output $iconPath
