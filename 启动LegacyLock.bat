@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LegacyLock 遗产保险锁 (1Password 级军规数字遗产箱)

echo =========================================================
echo    LegacyLock (遗产保险锁) · 1Password 级数字遗产保险箱
echo =========================================================
echo.
echo 正在为您打开界面与桌面应用...
echo.

:: 1. 在默认浏览器中直接打开界面
start "" "http://127.0.0.1:5173"

:: 2. 启动 Electron 原生桌面客户端
"%~dp0node_modules\electron\dist\electron.exe" .

pause
