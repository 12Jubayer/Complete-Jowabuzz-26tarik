@echo off
echo ========================================
echo Building Xclone Application...
echo ========================================
echo.

cd /d "%~dp0"
call npm run dev

echo.
echo ========================================
echo dev Complete!
echo ========================================

start
