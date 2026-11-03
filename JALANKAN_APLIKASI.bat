@echo off
title Menjalankan Kasir UMKM Sabu Raijua
color 0A

echo ========================================================
echo    MENJALANKAN SISTEM KASIR UMKM SABU RAIJUA (HAWUPAY)
echo ========================================================
echo.

REM Dapatkan IP LAN untuk akses HP/Mobile
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    set LAN_IP=%%a
    goto :ip_found
)
:ip_found
set LAN_IP=%LAN_IP: =%

REM 1. Cek Port 3306 (MySQL Laragon)
powershell -Command "$s = New-Object Net.Sockets.TcpClient; try { $s.Connect('127.0.0.1', 3306); Write-Host ' [OK] MySQL Laragon aktif di port 3306' -ForegroundColor Green } catch { Write-Host ' [PERINGATAN] MySQL port 3306 belum aktif! Pastikan Laragon sudah di-Start All.' -ForegroundColor Yellow } finally { $s.Close() }"

echo.
echo [1/3] Menjalankan Backend (FastAPI di port 8001)...
start "Backend Kasir UMKM (FastAPI :8001)" cmd /k "cd /d "%~dp0backend" && call .\.venv\Scripts\activate.bat && python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

echo [2/3] Menjalankan Frontend (Vite di port 5173)...
start "Frontend Kasir UMKM (Vite :5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0"

echo [3/3] Membuka halaman login di browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173/login

echo.
echo ========================================================
echo  APLIKASI BERHASIL DIJALANKAN!
echo.
echo  PILIHAN AKSES WEB:
echo  - Halaman Login     : http://localhost:5173/login
echo  - Dashboard Admin   : http://localhost:5173/admin
echo  - Kasir POS         : http://localhost:5173/kasir
echo.
echo  AKSES DARI HP / PERANGKAT LAIN (WI-FI SAMA):
echo  - Web di HP         : http://%LAN_IP%:5173/login
echo  - Backend API HP    : http://%LAN_IP%:8001
echo.
echo  KREDENSIAL LOGIN CEPAT:
echo  - Super Admin       : admin@umkm.id  (Password: admin123)
echo  - Kasir UMKM        : snack.hawu@umkm.id (Password: umkm123)
echo ========================================================
echo.
pause
