@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   QAENGINE Backend - by Abitech
echo ============================================
echo.

:: Use relative path from bat file location
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo Starting backend from: %ROOT%\backend
echo.

:: Check if venv exists, if not tell user to run install first
if not exist "%ROOT%\backend\venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run install.bat first!
    pause
    exit /b
)

cd /d "%ROOT%\backend"
call "%ROOT%\backend\venv\Scripts\activate.bat"

echo Backend running at http://127.0.0.1:8000
echo Press Ctrl+C to stop
echo.
uvicorn main:app --reload --port 8000
pause
