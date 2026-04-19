Add-Type -AssemblyName System.Drawing

$size = 128
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::Transparent)

$bgColor = [System.Drawing.Color]::FromArgb(220, 53, 69)
$bgBrush = New-Object System.Drawing.SolidBrush $bgColor
$g.FillEllipse($bgBrush, 4, 4, $size - 8, $size - 8)

$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(160, 20, 30)), 4
$g.DrawEllipse($borderPen, 4, 4, $size - 8, $size - 8)

$font = New-Object System.Drawing.Font ('Arial Black', 38, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$rect = New-Object System.Drawing.RectangleF 0, 4, $size, $size
$g.DrawString('AD', $font, $textBrush, $rect, $sf)

$slashPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 10
$g.DrawLine($slashPen, 28, 100, 100, 28)
$slashInner = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 53, 69)), 4
$g.DrawLine($slashInner, 28, 100, 100, 28)

$g.Dispose()

$out = 'C:\Users\codho\Desktop\SimpleADBlocker\icon.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$bytes = [IO.File]::ReadAllBytes($out)
$b64 = [Convert]::ToBase64String($bytes)
[IO.File]::WriteAllText('C:\Users\codho\Desktop\SimpleADBlocker\icon.b64', $b64)
Write-Host "PNG: $($bytes.Length) bytes, Base64: $($b64.Length) chars"
