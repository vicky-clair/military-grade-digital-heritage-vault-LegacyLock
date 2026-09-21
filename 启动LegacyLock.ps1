Set-Location -Path $PSScriptRoot
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   LegacyLock 数字遗产密库 · LVCF 3" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "正在启动 LegacyLock 桌面应用（加载本机静态文件）..." -ForegroundColor Green
Write-Host ""

if (-not (Test-Path "$PSScriptRoot\dist\index.html")) {
    Write-Host "[提示] 正在构建前端界面..." -ForegroundColor Gray
    npm run build
    if ($LASTEXITCODE -ne 0) { throw '构建失败，已停止启动。' }
}

if (Test-Path "$PSScriptRoot\node_modules\electron\dist\electron.exe") {
    & "$PSScriptRoot\node_modules\electron\dist\electron.exe" "$PSScriptRoot"
} else {
    npm run electron
}
