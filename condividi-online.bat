@echo off
title Studio Grafica - Link Pubblico Cloudflare per Clienti
echo =================================================================
echo   COLLEGAMENTO PUBBLICO ULTRA-VELOCE PER CLIENTI E CELLULARI
echo =================================================================
echo Avvio del tunnel Cloudflare...
"%LOCALAPPDATA%\Programs\cloudflared.exe" tunnel --url http://localhost:3000
pause
