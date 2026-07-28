@echo off
title Price Alert - Frontend Deploy
color 0A

echo ============================================
echo   PRICE ALERT - FRONTEND DEPLOY SCRIPT
echo ============================================
echo.

:: ── Step 1: Build Expo Web ──────────────────────────────────────────────────
echo [1/3] Building Expo web bundle...
echo.
cd /d C:\Users\HP\PriceandStockAlertApplication

call npx expo export --platform web

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Build failed! Check the errors above.
    pause
    exit /b 1
)

echo.
echo [1/3] Build SUCCESS!
echo.

:: ── Step 2: Copy dist to Docker volume ──────────────────────────────────────
echo [2/3] Copying dist to price-alert-api...
echo.

xcopy /E /Y /I C:\Users\HP\PriceandStockAlertApplication\dist C:\xampp\htdocs\price-alert-api\dist

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Copy failed! Check folder paths.
    pause
    exit /b 1
)

echo.
echo [2/3] Copy SUCCESS!
echo.

:: ── Step 3: Restart Docker container ────────────────────────────────────────
echo [3/3] Restarting price_alert_web container...
echo.

docker restart price_alert_web

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Docker restart failed! Make sure Docker is running.
    pause
    exit /b 1
)

echo.
echo [3/3] Restart SUCCESS!
echo.

:: ── Done ────────────────────────────────────────────────────────────────────
color 0A
echo ============================================
echo   DEPLOY COMPLETE!
echo   Visit: https://web.priceandstockalert.online
echo   Do a hard refresh: Ctrl + Shift + R
echo ============================================
echo.
pause