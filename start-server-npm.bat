@echo off
echo Starting eDM Helper SPA Server with Node.js...
echo.
echo Installing http-server if not present...
call npm install -g http-server
echo.
echo Server will run at: http://localhost:8080
echo Press Ctrl+C to stop
echo.
http-server -p 8080 -o
pause
