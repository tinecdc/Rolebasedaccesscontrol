@echo off
cd /d "%~dp0"

echo Starting frontend...
start "Frontend" cmd /k "npm run dev"

echo Starting backend...
start "Backend" cmd /k "npm run dev:server"

echo Both services started in separate windows.
