@echo off
title FinSight - Stopping...
color 0C

echo.
echo  ================================================================
echo    Stopping FinSight...
echo  ================================================================
echo.

:: Kill Python processes (API and frontend servers)
echo [1/2] Stopping servers...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq FinSight*" 2>nul
taskkill /F /FI "WINDOWTITLE eq FinSight API*" 2>nul
taskkill /F /FI "WINDOWTITLE eq FinSight Frontend*" 2>nul
echo [+] Servers stopped

:: Stop Docker containers
echo.
echo [2/2] Stopping database...
cd /d "%~dp0"
docker-compose down
echo [+] Database stopped

echo.
echo  ================================================================
echo    FinSight stopped successfully!
echo  ================================================================
echo.

timeout /t 3
