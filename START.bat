@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo        QAENGINE - by Abitech
echo ============================================
echo.

:: Set paths manually to avoid config parsing issues
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\Backend"
if not exist "%BACKEND%\main.py" set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
if not exist "%FRONTEND%\package.json" set "FRONTEND=%ROOT%\Frontend"

echo Backend:  "%BACKEND%"
echo Frontend: "%FRONTEND%"
echo.

:: ── CHECK VENV ──
if not exist "%BACKEND%\venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run install.bat first! 
    pause & exit /b
)

:: ── CHECK NODE MODULES ──
if not exist "%FRONTEND%\node_modules" (
    echo ERROR: node_modules not found!
    echo Please run install.bat first! 
    pause & exit /b
)

:: ── START BACKEND ──
echo Starting Backend...
start "QAENGINE Backend" cmd /k "cd /d "%BACKEND%" && call "%BACKEND%\venv\Scripts\activate.bat" && uvicorn main:app --reload --port 8000" 

:: Wait for backend
timeout /t 4 /nobreak >nul

:: ── START FRONTEND ──
echo Starting Frontend...
start "QAENGINE Frontend" cmd /k "cd /d "%FRONTEND%" && npm start" 

:: Wait then open browser
timeout /t 6 /nobreak >nul
echo Opening browser...
start http://localhost:3000

echo.
echo ============================================
echo  QAENGINE is running!
echo ============================================
pause >nul