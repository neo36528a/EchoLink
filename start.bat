@echo off
TITLE EchoLink Application Launcher
COLOR 0A
CLS

echo =========================================================================
echo                       EchoLink Instant Launcher                          
echo      Ultra-Low Latency Voice ^& Text Rooms (React + Node.js + WebRTC)     
echo =========================================================================
echo.

echo [1/3] Starting EchoLink Backend Server (:5000)...
start "EchoLink Backend (:5000)" cmd /k "cd /d "%~dp0backend" && npm install && npm start"

echo [2/3] Starting EchoLink Frontend Server (:3000)...
start "EchoLink Frontend (:3000)" cmd /k "cd /d "%~dp0frontend" && npm install && npm run dev"

echo [3/3] Launching web app in browser at http://localhost:3000 in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo =========================================================================
echo  EchoLink is live and running! 
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://localhost:5000
echo  Keep the server console windows open while chatting.
echo =========================================================================
echo.
timeout /t 5 >nul
exit
