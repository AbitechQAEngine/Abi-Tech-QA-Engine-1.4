@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   QAENGINE Frontend - by Abitech
echo ============================================
echo.

:: Use relative path from bat file location
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo Starting frontend from: %ROOT%\frontend
echo.

:: Check if node_modules exists
if not exist "%ROOT%\frontend\node_modules" (
    echo ERROR: node_modules not found!
    echo Please run install.bat first!
    pause
    exit /b
)

cd /d "%ROOT%\frontend"

echo Frontend running at http://localhost:3000
echo Press Ctrl+C to stop
echo.
npm start
pause
