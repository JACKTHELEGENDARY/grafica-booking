@echo off
title Configura Avvio Automatico Windows
echo =================================================================
echo   CONFIGURAZIONE AVVIO AUTOMATICO ALL''ACCENSIONE DEL PC
echo =================================================================
echo Creazione script invisibile di avvio...

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_FILE=%STARTUP_FOLDER%\avvia_grafica_silenzioso.vbs"

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "C:\Users\ulqui.DESKTOP-3LOFF3C\.gemini\antigravity\scratch\grafica-booking"
echo WshShell.Run "cmd /c avvia-tutto.bat", 0, False
) > "%VBS_FILE%"

echo.
echo [FATTO!] Ora il sito si avviera da solo ogni volta che accendi il computer,
echo in modalita silenziosa in sottofondo.
echo.
pause
