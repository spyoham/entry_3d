@echo off
chcp 65001 >nul
cd /d "%~dp0"
py -3 syosetu_translate.py %*
echo.
pause
