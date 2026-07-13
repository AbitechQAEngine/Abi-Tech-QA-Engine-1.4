@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo        QAENGINE - by Abitech
echo        Full Auto Setup Installation
echo ============================================
echo.

:: Get root folder
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo Project folder: %ROOT%
echo.

:: ── CHECK PYTHON ──
echo [1/7] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python NOT found! Opening download page...
    start https://python.org/downloads
    echo Install Python and check "Add Python to PATH" then run again.
    pause & exit /b
)
echo Python found!

:: ── CHECK NODE ──
echo.
echo [2/7] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js NOT found! Opening download page...
    start https://nodejs.org
    echo Install Node.js then run again.
    pause & exit /b
)
echo Node.js found!

:: ── DETECT BACKEND FOLDER ──
echo.
echo [3/7] Detecting backend folder...
if exist "%ROOT%\Backend\main.py" (
    set "BACKEND=%ROOT%\Backend"
) else if exist "%ROOT%\backend\main.py" (
    set "BACKEND=%ROOT%\backend"
) else (
    echo ERROR: Cannot find main.py in Backend or backend folder!
    pause & exit /b
)
echo Backend folder: %BACKEND%

:: ── DETECT FRONTEND FOLDER ──
if exist "%ROOT%\frontend\package.json" (
    set "FRONTEND=%ROOT%\frontend"
) else if exist "%ROOT%\Frontend\package.json" (
    set "FRONTEND=%ROOT%\Frontend"
) else (
    echo ERROR: Cannot find package.json in frontend folder!
    pause & exit /b
)
echo Frontend folder: %FRONTEND%

:: ── CREATE VENV ──
echo.
echo [4/7] Creating Python virtual environment...
cd /d "%BACKEND%"
if exist venv rmdir /s /q venv
python -m venv venv
if errorlevel 1 ( echo ERROR: Failed to create venv! & pause & exit /b )
echo Virtual environment created!

:: ── INSTALL PYTHON PACKAGES ──
echo.
echo [5/7] Installing Python packages...
set "VENV_PYTHON=%BACKEND%\venv\Scripts\python.exe"

"%VENV_PYTHON%" -m pip install --upgrade pip --quiet
"%VENV_PYTHON%" -m pip install fastapi==0.109.0 uvicorn==0.27.0 groq==0.11.0 httpx==0.27.0 python-multipart==0.0.7 pandas==2.2.0 openpyxl==3.1.2 python-dotenv==1.0.0 pydantic==2.5.3 --quiet
echo Python packages installed!

:: ── INSTALL NODE PACKAGES ──
echo.
echo [6/7] Installing Node packages...
cd /d "%FRONTEND%"
call npm install
if errorlevel 1 ( echo ERROR: npm install failed! & pause & exit /b )
echo Node packages installed!

:: ── SAVE PATHS TO CONFIG ──
echo BACKEND=%BACKEND%> "%ROOT%\qaengine.config"
echo FRONTEND=%FRONTEND%>> "%ROOT%\qaengine.config"
echo ROOT=%ROOT%>> "%ROOT%\qaengine.config"

echo.
echo ============================================
echo   INSTALLATION COMPLETE!
echo ============================================
echo.
echo Now double-click START.bat to launch the app!
echo.
pause