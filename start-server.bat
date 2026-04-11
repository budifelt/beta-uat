@echo off
echo Starting eDM Helper SPA Server...
echo.
echo Server will run at: http://localhost:8000
echo Press Ctrl+C to stop
echo.
python -m http.server 8000
pause
