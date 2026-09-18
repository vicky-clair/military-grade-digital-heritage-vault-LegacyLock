@echo off
chcp 65001 >nul
title LegacyLock 遗产保险锁 (军规级数字遗产双保险箱)
echo ===================================================
echo   LegacyLock 遗产保险锁 · 正在为您打开桌面客户端与界面
echo ===================================================
echo.

:: 打开浏览器前端
start "" "http://localhost:5173"

:: 启动 Electron 桌面主窗口
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."

echo 已完成启动命令调用！
echo 若未自动弹出，请在任意浏览器中访问: http://localhost:5173
echo.
exit
