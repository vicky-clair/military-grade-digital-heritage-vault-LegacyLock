@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LegacyLock 遗产保险锁 [军规数字遗产箱]

echo =========================================================
echo    LegacyLock 遗产保险锁 - 军规级数字遗产保险箱
echo =========================================================
echo.
echo 正在启动 LegacyLock 桌面应用与本地服务...
echo 本地访问地址: http://127.0.0.1:5173
echo.

REM 1. 检查前端静态资源
if not exist "%~dp0dist\index.html" (
    echo [提示] 正在构建前端界面，请稍候...
    call npm run build
)

REM 2. 启动 Electron 原生桌面客户端
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    "%~dp0node_modules\electron\dist\electron.exe" .
) else (
    echo [提示] 本地内置 Electron 未找到，尝试使用 npm 启动...
    call npm run electron
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [提示] 客户端运行结束或发生异常退出。
    pause
)
