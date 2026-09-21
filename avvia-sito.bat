@echo off
title Studio Grafica - Server Prenotazioni
echo =================================================================
echo        PIATTAFORMA PRENOTAZIONI LAVORI GRAFICI ATTIVA
echo =================================================================
set "PATH=%LOCALAPPDATA%\Programs\node-standalone;%PATH%"
echo.
echo [1] DAL COMPUTER (Locale):
echo     http://localhost:3000
echo.
echo [2] DAL TUO CELLULARE (Stesso Wi-Fi):
echo     http://192.168.1.105:3000
echo.
echo [3] AREA RISERVATA GRAFICO (PIN: admin123):
echo     http://localhost:3000/admin.html
echo.
echo Apertura del browser in corso...
start http://localhost:3000
echo =================================================================
node server.js
pause
