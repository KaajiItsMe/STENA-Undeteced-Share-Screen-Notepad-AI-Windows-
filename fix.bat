@echo off
title Perbaikan Stealth Notepad
echo ==============================================
echo  MEMPERBAIKI SHORTCUT STEALTH NOTEPAD
echo ==============================================
echo.
echo Sedang membersihkan proses yang nyangkut di memori...
echo.

:: Tutup paksa jika berjalan sebagai Stena.exe
taskkill /F /IM "Stena.exe" /T 2>nul

:: Tutup paksa jika berjalan dalam mode development
taskkill /F /IM "electron.exe" /T 2>nul

echo.
echo Selesai! Sistem sudah bersih.
echo Silakan jalankan kembali aplikasi Anda.
echo.
pause
