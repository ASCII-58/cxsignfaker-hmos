Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$media = 'E:\deveco\chaoxingsignfaker-for-harmony-OS-NEXT\entry\src\main\resources\base\media'

# ---------- shade: 560x280 演示验证码背景（含缺口） ----------
$shade = New-Object System.Drawing.Bitmap 560, 280
$g = [System.Drawing.Graphics]::FromImage($shade)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$rect = New-Object System.Drawing.Rectangle 0, 0, 560, 280
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 205, 222, 240), [System.Drawing.Color]::FromArgb(255, 150, 178, 212), 55.0)
$g.FillRectangle($grad, $rect)

# 装饰性气泡，模拟验证码底图
$rand = New-Object System.Random 7
for ($i = 0; $i -lt 16; $i++) {
    $x = $rand.Next(0, 540); $y = $rand.Next(0, 260)
    $d = $rand.Next(18, 60)
    $a = $rand.Next(30, 90)
    $b = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, 255, 255, 255))
    $g.FillEllipse($b, $x, $y, $d, $d)
    $b.Dispose()
}

# 文字
$dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110, 70, 100, 140))
$font = New-Object System.Drawing.Font 'Microsoft YaHei', 24, ([System.Drawing.FontStyle]::Bold)
$g.DrawString('演 示 验 证 码', $font, $dark, 130, 40)
$font.Dispose(); $dark.Dispose()

# 缺口（与 cutout 拼图块对应）：本体 + 右侧凸起
$gapFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(150, 60, 90, 130))
$gapEdge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 245, 250, 255)), 3
$gapEdge.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.FillRectangle($gapFill, 380, 105, 70, 70)
$g.FillEllipse($gapFill, 434, 122, 36, 36)
$g.DrawRectangle($gapEdge, 380, 105, 70, 70)
$gapFill.Dispose(); $gapEdge.Dispose()
$g.Dispose()
$shade.Save("$media\captcha_demo_shade.png", [System.Drawing.Imaging.ImageFormat]::Png)
$shade.Dispose()

# ---------- cutout: 98x280 透明底，中间为拼图块 ----------
$cut = New-Object System.Drawing.Bitmap 98, 280
$g = [System.Drawing.Graphics]::FromImage($cut)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(215, 250, 252, 255))
$edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 70, 110, 160)), 4
# 拼图块本体 + 右侧凸起（与 shade 缺口同形）
$g.FillRectangle($fill, 8, 105, 70, 70)
$g.FillEllipse($fill, 62, 122, 36, 36)
$g.DrawRectangle($edge, 8, 105, 70, 70)
$g.DrawEllipse($edge, 62, 122, 36, 36)
$inner = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(130, 70, 110, 160))
$g.FillEllipse($inner, 32, 130, 22, 22)
$inner.Dispose()
$fill.Dispose(); $edge.Dispose()
$g.Dispose()
$cut.Save("$media\captcha_demo_cutout.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cut.Dispose()

Write-Output 'generated:'
Get-ChildItem "$media\captcha_demo_*.png" | ForEach-Object { Write-Output ("{0}  {1} bytes" -f $_.Name, $_.Length) }
