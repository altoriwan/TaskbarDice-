@echo off
setlocal
cd /d "%~dp0"

:: 1. Activate or create virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found. Creating venv...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)

:: 2. Start Uvicorn background server
echo [BOOT] Starting Uvicorn backend on http://127.0.0.1:8000 ...
start /B uvicorn main:app --host 127.0.0.1 --port 8000
timeout /t 2 /nobreak >nul

:: 3. Launch borderless desktop app window with resilient browser detection
echo [LAUNCH] Detecting available browser for borderless app window...

:: Check Edge
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [LAUNCH] Found Microsoft Edge. Launching app mode...
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:8000
    goto :launched
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
