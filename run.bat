@echo off
setlocal
cd /d "%~dp0"

:: 1. Activate or create Python virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    goto :venv_ready
)
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
    goto :venv_ready
)

echo [SETUP] Virtual environment not found. Creating venv...
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt

:venv_ready
:: 2. Boot Uvicorn ASGI server in background
echo [BOOT] Starting Uvicorn backend on http://127.0.0.1:8000 ...
start /B uvicorn main:app --host 127.0.0.1 --port 8000

:: Reliable 2-second delay without timeout redirection quirks
ping -n 3 127.0.0.1 >nul

:: 3. Detect and launch borderless app window
echo [LAUNCH] Detecting available browser for borderless app window...

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" goto :launch_edge_64
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" goto :launch_edge_32
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" goto :launch_chrome_64
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" goto :launch_chrome_32
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" goto :launch_chrome_user

echo [LAUNCH] Launching default system browser...
start http://127.0.0.1:8000
goto :launched

:launch_edge_64
echo [LAUNCH] Found Microsoft Edge. Launching app mode...
start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:8000
goto :launched

:launch_edge_32
echo [LAUNCH] Found Microsoft Edge. Launching app mode...
start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:8000
goto :launched

:launch_chrome_64
echo [LAUNCH] Found Google Chrome. Launching app mode...
start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000
goto :launched

:launch_chrome_32
echo [LAUNCH] Found Google Chrome. Launching app mode...
start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000
goto :launched

:launch_chrome_user
echo [LAUNCH] Found Google Chrome User. Launching app mode...
start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000
goto :launched

:launched
echo [RUNNING] Application active on http://127.0.0.1:8000
