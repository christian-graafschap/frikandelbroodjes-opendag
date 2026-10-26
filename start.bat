@echo off
cd /d "%~dp0"
rem Draait er nog een (oude) server op poort 3000, stop die dan eerst.
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
start "Open dag server" cmd /k npm start
timeout /t 3 /nobreak >nul
start "" http://localhost:3000/rapport-eigen
start "" http://localhost:3000
