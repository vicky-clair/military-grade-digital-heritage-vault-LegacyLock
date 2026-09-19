Set-Location -Path $PSScriptRoot
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   LegacyLock 遗产保险锁 - 军规级数字遗产保险箱" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "正在启动 LegacyLock 桌面应用与本地服务..." -ForegroundColor Green
Write-Host "本地访问地址: http://127.0.0.1:5173" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "$PSScriptRoot\dist\index.html")) {
    Write-Host "[提示] 正在构建前端界面..." -ForegroundColor Gray
    npm run build
}

if (Test-Path "$PSScriptRoot\node_modules\electron\dist\electron.exe") {
    & "$PSScriptRoot\node_modules\electron\dist\electron.exe" "$PSScriptRoot"
} else {
    npm run electron
}