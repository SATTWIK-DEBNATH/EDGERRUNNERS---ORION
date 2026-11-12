@echo off
echo ===================================================
echo Starting AUTONOMOUS X Backend and Frontend Servers
echo ===================================================

start "AUTONOMOUS X - Backend (Port 8000)" cmd /k "cd /d "%~dp0AUTONOMOUS X\backend" && .venv\Scripts\python.exe -m uvicorn app.api.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

start "AUTONOMOUS X - Frontend (Port 5173)" cmd /k "cd /d "%~dp0AUTONOMOUS X\frontend" && npm run dev"

echo Servers started in separate windows!
echo Open your browser at: http://localhost:5173/?view=dashboard
pause

