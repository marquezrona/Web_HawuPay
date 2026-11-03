@echo off
title Menghentikan Kasir UMKM
color 0C

echo Menghentikan server backend (port 8001) dan frontend (port 5173)...

powershell -NoProfile -Command "$ports = @(8001, 5173); foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"
taskkill /F /IM uvicorn.exe /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Backend Kasir UMKM*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend Kasir UMKM*" 2>nul

echo Server backend dan frontend telah dihentikan.
pause
