@echo off
title Studio Grafica - Piattaforma Completa
echo =================================================================
echo        AVVIO COMPLETO SITO GRAFICA + TUNNEL CLOUDFLARE
echo =================================================================
set "PATH=%LOCALAPPDATA%\Programs\node-standalone;%PATH%"

echo 1. Avvio server Node.js in background...
start /B node server.js

echo 2. Avvio tunnel pubblico Cloudflare per cellulari e clienti...
timeout /t 2 /nobreak >nul
start /B "" "%LOCALAPPDATA%\Programs\cloudflared.exe" tunnel --url http://localhost:3000

echo.
echo =================================================================
echo  Il sito e attivo sia sul tuo PC sia su Internet per i clienti!
echo  Per chiudere tutto ti basta chiudere questa finestra di comando.
echo =================================================================
echo.
pause
