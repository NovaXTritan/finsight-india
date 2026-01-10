@echo off
title FinSight - Starting...
color 0A

echo.
echo  ================================================================
echo    FinSight - AI Market Anomaly Detection
echo  ================================================================
echo.

:: Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo [!] Docker is not installed or not in PATH
    echo     Please install Docker Desktop from https://docker.com
    pause
    exit /b 1
)

:: Check if Docker daemon is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [*] Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul || start "" "%LOCALAPPDATA%\Docker\Docker Desktop.exe" 2>nul
    echo [*] Waiting for Docker to start (this may take a minute)...
    :wait_docker
    timeout /t 5 /nobreak >nul
    docker ps >nul 2>&1
    if errorlevel 1 goto wait_docker
    echo [+] Docker is ready!
)

echo.
echo [1/4] Starting database...
cd /d "%~dp0"
docker-compose up -d
if errorlevel 1 (
    echo [!] Failed to start database
    pause
    exit /b 1
)
echo [+] Database started

:: Wait for database to be ready
echo [*] Waiting for database to be ready...
timeout /t 5 /nobreak >nul

echo.
echo [2/4] Starting backend API...
start "FinSight API" cmd /c "cd /d %~dp0 && python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo [+] Backend API started on http://localhost:8000

echo.
echo [3/4] Starting frontend...
start "FinSight Frontend" cmd /c "cd /d %~dp0\frontend && python -m http.server 3000"
timeout /t 2 /nobreak >nul
echo [+] Frontend started on http://localhost:3000

echo.
echo [4/4] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000/index.html

echo.
echo  ================================================================
echo    FinSight is running!
echo  ================================================================
echo.
echo    Frontend:  http://localhost:3000
echo    API:       http://localhost:8000
echo    API Docs:  http://localhost:8000/docs
echo.
echo    To stop: Close the terminal windows or press Ctrl+C
echo  ================================================================
echo.

pause
